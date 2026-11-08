import QuartzCore
import SwiftUI
import UIKit

/// The view that hosts the render engine's CAMetalLayer. On the main thread it only sizes and configures the layer and
/// asks for a frame when its size changes; drawing happens on the render thread (ADR 0001).
final class MetalHostView: UIView {
    override class var layerClass: AnyClass { CAMetalLayer.self }
    private var attached = false
    private var lastSize = CGSize.zero

    private var metalLayer: CAMetalLayer {
        guard let l = layer as? CAMetalLayer else { fatalError("the layer class is CAMetalLayer") }
        return l
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let scale = traitCollection.displayScale
        let size = CGSize(width: bounds.width * scale, height: bounds.height * scale)
        guard size.width > 0, size.height > 0, size != lastSize else { return }
        lastSize = size
        metalLayer.contentsScale = scale
        metalLayer.drawableSize = size
        if !attached {
            metalLayer.device = RenderEngine.shared.device
            metalLayer.pixelFormat = .bgra8Unorm
            metalLayer.framebufferOnly = true
            metalLayer.isOpaque = true
            attached = true
            RenderEngine.shared.attach(metalLayer)
        }
        RenderEngine.shared.requestFrame()
    }
}

struct MetalHost: UIViewRepresentable {
    func makeUIView(context: Context) -> MetalHostView { MetalHostView() }
    func updateUIView(_ view: MetalHostView, context: Context) {}
}
