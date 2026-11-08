import Foundation
import Metal
import QuartzCore
import SaneiRuntime

/// The render engine (ADR 0001): its own thread `sanei.render` with its own run loop, driven by CAMetalDisplayLink
/// (iOS 17) on the view's CAMetalLayer. Every Metal object is made and used on that thread; the main thread only sizes
/// the layer and asks for frames. Paused when nothing changes (L1, L6): one frame per request, continuous only while the
/// recorder runs. Each frame's encode time is metered under `.render`.
final class RenderEngine: NSObject, @unchecked Sendable {
    static let shared = RenderEngine()

    let device: MTLDevice? = MTLCreateSystemDefaultDevice()

    // guarded by `lock`: the run loop once the thread is up, and the blocks waiting for it
    private let lock = NSLock()
    private var runLoop: CFRunLoop?
    private var pending: [@Sendable () -> Void] = []
    private var thread: Thread?
    private var frames = 0
    private var hitches = 0

    // used only on the render thread
    private var link: CAMetalDisplayLink?
    private var queue: MTLCommandQueue?
    private var pipeline: MTLRenderPipelineState?
    private var angle: Float = 0
    private var continuous = false
    private var lastCallback: CFTimeInterval = 0

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
        for block in waiting { block() }
        loop.run()
    }

    /// Runs `block` on the render thread (queued until the thread is up).
    private func perform(_ block: @escaping @Sendable () -> Void) {
        lock.lock()
        guard let loop = runLoop else {
            pending.append(block)
            lock.unlock()
            return
        }
        lock.unlock()
        CFRunLoopPerformBlock(loop, CFRunLoopMode.defaultMode.rawValue, block)
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
            self.lastCallback = 0
            self.link?.isPaused = false
        }
    }

    /// Frames and hitches since the last call (a hitch: a callback over 1.5 x 1/60 s after the previous one).
    func drainFrames() -> (frames: Int, hitches: Int) {
        lock.lock()
        defer { frames = 0; hitches = 0; lock.unlock() }
        return (frames, hitches)
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
}

extension RenderEngine: CAMetalDisplayLinkDelegate {
    func metalDisplayLink(_ link: CAMetalDisplayLink, needsUpdate update: CAMetalDisplayLink.Update) {
        let start = DispatchTime.now().uptimeNanoseconds
        let now = CACurrentMediaTime()
        var hitch = false
        if continuous {
            if lastCallback > 0, now - lastCallback > 1.5 / 60 { hitch = true }
            lastCallback = now
            angle += 0.02
        }
        encode(into: update.drawable)
        EngineMeter.shared.record(.render, nanoseconds: DispatchTime.now().uptimeNanoseconds &- start)
        lock.lock()
        frames += 1
        if hitch { hitches += 1 }
        lock.unlock()
        if !continuous { link.isPaused = true }
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
        buffer.commit()
        drawable.present()
    }
}

/// Carries a non-Sendable reference to the render thread, where it is used alone (the layer is configured before).
struct Unchecked<T>: @unchecked Sendable {
    let value: T
    init(_ value: T) { self.value = value }
}
