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
    /// Continuous frames that missed their target: dropped (never presented) or presented more than half a refresh late.
    var hitches = 0
    /// The spacing of presented continuous frames, in ms (mean and worst).
    var intervalMeanMs = 0.0
    var intervalMaxMs = 0.0
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

    // used only on the render thread
    private var link: CAMetalDisplayLink?
    private var queue: MTLCommandQueue?
    private var pipeline: MTLRenderPipelineState?
    private var angle: Float = 0
    private var continuous = false
    private var lastTarget: CFTimeInterval = 0

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

    /// Asks for one frame.
    func requestFrame() {
        perform { [self] in self.link?.isPaused = false }
    }

    /// Frames every display refresh while on (the recorder), one per request otherwise.
    func setContinuous(_ on: Bool) {
        perform { [self] in
            self.continuous = on
            self.lastTarget = 0
            self.lock.lock()
            self.lastPresented = 0
            self.lock.unlock()
            self.link?.isPaused = false
        }
    }

    /// Stops drawing (the app went to the background); the next request draws again.
    func pause() {
        perform { [self] in
            self.continuous = false
            self.link?.isPaused = true
        }
    }

    /// What happened since the last call, then reset.
    func drainFrames() -> FrameStats {
        lock.lock()
        defer {
            stats = FrameStats()
            intervalSum = 0
            intervalCount = 0
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

    /// Called on Metal's thread when a continuous frame was presented (or dropped: presentedTime 0).
    private func presented(at time: CFTimeInterval, target: CFTimeInterval, period: CFTimeInterval) {
        lock.lock()
        defer { lock.unlock() }
        if time == 0 || time - target > period / 2 { stats.hitches += 1 }
        guard time > 0 else { return }
        if lastPresented > 0 {
            let gap = time - lastPresented
            intervalSum += gap
            intervalCount += 1
            stats.intervalMaxMs = max(stats.intervalMaxMs, gap * 1_000)
        }
        lastPresented = time
    }
}

extension RenderEngine: CAMetalDisplayLinkDelegate {
    func metalDisplayLink(_ link: CAMetalDisplayLink, needsUpdate update: CAMetalDisplayLink.Update) {
        autoreleasepool {
            let start = DispatchTime.now().uptimeNanoseconds
            let target = update.targetPresentationTimestamp
            if continuous {
                // the refresh period from consecutive targets, kept within the link's range (30 to 120 a second)
                let period = lastTarget > 0 ? min(max(target - lastTarget, 1.0 / 120), 1.0 / 30) : 1.0 / 60
                lastTarget = target
                angle += 0.02
                update.drawable.addPresentedHandler { [self] d in
                    self.presented(at: d.presentedTime, target: target, period: period)
                }
            }
            encode(into: update.drawable)
            EngineMeter.shared.record(.render, nanoseconds: DispatchTime.now().uptimeNanoseconds &- start)
            lock.lock()
            if continuous { stats.frames += 1 } else { stats.idleFrames += 1 }
            framesSinceLaunch += 1
            lock.unlock()
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
