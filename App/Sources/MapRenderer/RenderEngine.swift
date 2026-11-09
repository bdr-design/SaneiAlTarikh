import Foundation
import Metal
import QuartzCore
import SaneiRuntime

/// What the render engine did since the last drain.
struct FrameStats: Sendable {
    /// Frames encoded while continuous (the recorder's load).
    var frames = 0
    /// Frames encoded while idle (one per request): 0 a second when nothing changes proves the link is paused (L1).
    var idleFrames = 0
    /// Continuous refreshes that showed a stale frame against the requested 60 a second, each counted once, from
    /// presentation times alone: a gap of g sixtieths of a second between two presented frames counts
    /// floor(g + 0.25) - 1 (from 1.75 sixtieths on, clear of a ProMotion half-step), whatever made it (a skipped refresh,
    /// a late callback, a GPU-late or dropped frame). A run at 30 a second therefore reads 30 a second. Booked in the row
    /// of the second the later frame is presented, about two refreshes after it was encoded.
    var hitches = 0
    /// The spacing of presented continuous frames, in ms (mean and worst).
    var intervalMeanMs = 0.0
    var intervalMaxMs = 0.0
    /// Where a stall comes from, from the display link's own times (continuous frames only):
    /// how far past its deadline (`targetTimestamp`) a callback ran, in ms (the render thread or the link was late);
    var linkLateMaxMs = 0.0
    /// refreshes the link skipped between consecutive callbacks' `targetPresentationTimestamp`s (60 a second);
    var linkSkipped = 0
    /// how much later than its target presentation time a frame was shown, in ms (the compositor or the display);
    var presentLateMaxMs = 0.0
    /// drawables that were never shown (presentedTime 0).
    /// The link's two are booked when the callback runs; the presentation's two and the hitches when the frame is shown,
    /// about two refreshes later: a stall near a second's edge can show in two adjacent rows, read together.
    var dropped = 0
}

/// The render engine (ADR 0001): its own thread `sanei.render` with its own run loop, driven by CAMetalDisplayLink
/// (iOS 17) on the view's CAMetalLayer. Every Metal object is made and used on that thread; the main thread only sizes
/// the layer and asks for frames. Paused when nothing changes (L1, L6): one frame per request, continuous only while the
/// recorder runs, paused in the background. Each frame's encode time is metered under `.render`.
final class RenderEngine: NSObject, @unchecked Sendable {
    static let shared = RenderEngine()

    let device: MTLDevice? = MTLCreateSystemDefaultDevice()

    // guarded by `lock`: the run loop once the thread is up, the blocks waiting for it, the counters (the presented
    // handlers run on Metal's own thread)
    private let lock = NSLock()
    private var runLoop: CFRunLoop?
    private var pending: [@Sendable () -> Void] = []
    private var thread: Thread?
    private var stats = FrameStats()
    private var intervalSum = 0.0
    private var intervalCount = 0
    private var lastPresented: CFTimeInterval = 0
    private var framesSinceLaunch = 0
    private var stallLines = 0          // stall lines logged since the last drain (at most `maxStallLines` a second)
    private static let maxStallLines = 3

    // used only on the render thread
    private var link: CAMetalDisplayLink?
    private var queue: MTLCommandQueue?
    private var pipeline: MTLRenderPipelineState?
    private var angle: Float = 0
    private var continuous = false
    private var lastTarget: CFTimeInterval = 0
    /// Set when the app goes to the background: nothing unpauses the link until `resume()`.
    private var backgrounded = false

    /// Starts the render thread (once).
    func start() {
        lock.lock()
        defer { lock.unlock() }
        guard thread == nil else { return }
        let t = Thread { [self] in self.threadMain() }
        t.name = "sanei.render"
        t.qualityOfService = .userInteractive
        thread = t
        t.start()
    }

    private func threadMain() {
        Thread.current.name = "sanei.render"
        let loop = RunLoop.current
        loop.add(NSMachPort(), forMode: .default)          // keeps the run loop alive with nothing scheduled
        lock.lock()
        runLoop = CFRunLoopGetCurrent()
        let waiting = pending
        pending.removeAll()
        lock.unlock()
        for block in waiting { autoreleasepool { block() } }
        loop.run()
    }

    /// Runs `block` on the render thread (queued until the thread is up), inside its own autorelease pool.
    private func perform(_ block: @escaping @Sendable () -> Void) {
        lock.lock()
        guard let loop = runLoop else {
            pending.append(block)
            lock.unlock()
            return
        }
        lock.unlock()
        CFRunLoopPerformBlock(loop, CFRunLoopMode.defaultMode.rawValue) { autoreleasepool { block() } }
        CFRunLoopWakeUp(loop)
    }

    /// Attaches the view's layer (sized and configured on the main thread); the display link is made on the render thread.
    func attach(_ layer: CAMetalLayer) {
        let box = Unchecked(layer)
        perform { [self] in self.setUp(box.value) }
    }

    /// Asks for one frame (ignored in the background).
    func requestFrame() {
        perform { [self] in if !self.backgrounded { self.link?.isPaused = false } }
    }

    /// Frames every display refresh while on (the recorder), one per request otherwise. Turning it off never unpauses
    /// the link: a running link draws one idle frame and pauses itself, a paused one stays paused.
    func setContinuous(_ on: Bool) {
        perform { [self] in
            self.continuous = on && !self.backgrounded
            self.lastTarget = 0
            self.lock.lock()
            self.lastPresented = 0
            self.lock.unlock()
            if self.continuous { self.link?.isPaused = false }
        }
    }

    /// Stops drawing (the app went to the background) until `resume()`.
    func pause() {
        perform { [self] in
            self.backgrounded = true
            self.continuous = false
            self.link?.isPaused = true
        }
    }

    /// Back in the foreground: one frame, then idle.
    func resume() {
        perform { [self] in
            self.backgrounded = false
            self.link?.isPaused = false
        }
    }

    /// What happened since the last call, then reset.
    func drainFrames() -> FrameStats {
        lock.lock()
        defer {
            stats = FrameStats()
            intervalSum = 0
            intervalCount = 0
            stallLines = 0
            lock.unlock()
        }
        var s = stats
        s.intervalMeanMs = intervalCount > 0 ? intervalSum / Double(intervalCount) * 1_000 : 0
        return s
    }

    /// Every frame encoded since launch (the overlay shows it on request).
    var totalFrames: Int {
        lock.lock()
        defer { lock.unlock() }
        return framesSinceLaunch
    }

    private func setUp(_ layer: CAMetalLayer) {
        guard let device else { RingLog.shared.log("render: no Metal device"); return }
        if queue == nil { queue = device.makeCommandQueue() }
        if pipeline == nil {
            do {
                guard let library = device.makeDefaultLibrary() else { RingLog.shared.log("render: no default library"); return }
                let d = MTLRenderPipelineDescriptor()
                d.vertexFunction = library.makeFunction(name: "triangle_vertex")
                d.fragmentFunction = library.makeFunction(name: "triangle_fragment")
                d.colorAttachments[0].pixelFormat = layer.pixelFormat
                pipeline = try device.makeRenderPipelineState(descriptor: d)
            } catch {
                RingLog.shared.log("render: pipeline failed: \(error)")
                return
            }
        }
        link?.invalidate()
        let l = CAMetalDisplayLink(metalLayer: layer)
        l.delegate = self
        l.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 120, preferred: 60)
        l.preferredFrameLatency = 2
        l.add(to: .current, forMode: .default)
        link = l
        RingLog.shared.log("render: display link on \(Thread.current.name ?? "?") (\(device.name))")
    }

    /// Called on Metal's thread when a continuous frame was presented (or dropped: presentedTime 0). `target` is the
    /// presentation time the link aimed at.
    private func presented(at time: CFTimeInterval, target: CFTimeInterval) {
        var stall: (CFTimeInterval, Int, CFTimeInterval)?
        lock.lock()
        if time > 0 {
            let late = max(0, time - target)
            stats.presentLateMaxMs = max(stats.presentLateMaxMs, late * 1_000)
            if lastPresented > 0 {
                let gap = time - lastPresented
                let stale = max(0, Int((gap * 60 + 0.25).rounded(.down)) - 1)
                stats.hitches += stale
                intervalSum += gap
                intervalCount += 1
                stats.intervalMaxMs = max(stats.intervalMaxMs, gap * 1_000)
                // a stall of 2 or more stale refreshes goes to the log with its time (a few a second at most, so a run
                // throttled to 30 a second cannot push the launch lines out of the ring)
                if stale >= 2 && stallLines < Self.maxStallLines {
                    stallLines += 1
                    stall = (gap, stale, late)
                }
            }
            lastPresented = time
        } else {
            stats.dropped += 1                  // the gap to the next presented frame counts it as stale
        }
        lock.unlock()
        if let (gap, stale, late) = stall {
            RingLog.shared.log(String(format: "render: %.1f ms between presented frames (%ld stale), shown %.1f ms after its target",
                                      gap * 1_000, stale, late * 1_000))
        }
    }
}

extension RenderEngine: CAMetalDisplayLinkDelegate {
    func metalDisplayLink(_ link: CAMetalDisplayLink, needsUpdate update: CAMetalDisplayLink.Update) {
        autoreleasepool {
            let start = DispatchTime.now().uptimeNanoseconds
            var late = 0.0, skipped = 0
            if continuous {
                late = max(0, CACurrentMediaTime() - update.targetTimestamp)
                let target = update.targetPresentationTimestamp
                if lastTarget > 0 { skipped = max(0, Int(((target - lastTarget) * 60 + 0.25).rounded(.down)) - 1) }   // as hitches
                lastTarget = target
                angle += 0.02
                update.drawable.addPresentedHandler { [self] d in self.presented(at: d.presentedTime, target: target) }
            }
            encode(into: update.drawable)
            EngineMeter.shared.record(.render, nanoseconds: DispatchTime.now().uptimeNanoseconds &- start)
            var logSkip = false
            lock.lock()
            if continuous {
                stats.frames += 1
                stats.linkLateMaxMs = max(stats.linkLateMaxMs, late * 1_000)
                stats.linkSkipped += skipped
                if skipped >= 2 && stallLines < Self.maxStallLines {
                    stallLines += 1
                    logSkip = true
                }
            } else {
                stats.idleFrames += 1
            }
            framesSinceLaunch += 1
            lock.unlock()
            if logSkip {
                RingLog.shared.log(String(format: "render: the link skipped %ld refreshes; the callback ran %.1f ms after its deadline",
                                          skipped, late * 1_000))
            }
            if !continuous { link.isPaused = true }
        }
    }

    private func encode(into drawable: CAMetalDrawable) {
        guard let pipeline, let queue, let buffer = queue.makeCommandBuffer() else { return }
        let pass = MTLRenderPassDescriptor()
        pass.colorAttachments[0].texture = drawable.texture
        pass.colorAttachments[0].loadAction = .clear
        pass.colorAttachments[0].storeAction = .store
        pass.colorAttachments[0].clearColor = MTLClearColor(red: 0.043, green: 0.071, blue: 0.094, alpha: 1)   // #0B1218
        guard let encoder = buffer.makeRenderCommandEncoder(descriptor: pass) else { return }
        var a = angle
        encoder.setRenderPipelineState(pipeline)
        encoder.setVertexBytes(&a, length: MemoryLayout<Float>.size, index: 0)
        encoder.drawPrimitives(type: .triangle, vertexStart: 0, vertexCount: 3)
        encoder.endEncoding()
        buffer.present(drawable)
        buffer.commit()
    }
}

/// Carries a non-Sendable reference to the render thread, where it is used alone (the layer is configured before).
struct Unchecked<T>: @unchecked Sendable {
    let value: T
    init(_ value: T) { self.value = value }
}
