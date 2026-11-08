// M0's Metal triangle: three vertices from the vertex id (no buffers), turned by one angle, teal to cyan.
#include <metal_stdlib>
using namespace metal;

struct VOut { float4 position [[position]]; float4 color; };

vertex VOut triangle_vertex(uint vid [[vertex_id]], constant float &angle [[buffer(0)]]) {
    const float2 p[3] = { float2(0.0, 0.62), float2(-0.54, -0.31), float2(0.54, -0.31) };
    const float4 c[3] = { float4(0.25, 0.88, 0.82, 1.0), float4(0.50, 0.91, 1.00, 1.0), float4(0.92, 0.95, 0.97, 1.0) };
    float s = sin(angle), k = cos(angle);
    float2 q = float2(p[vid].x * k - p[vid].y * s, p[vid].x * s + p[vid].y * k);
    VOut o;
    o.position = float4(q, 0.0, 1.0);
    o.color = c[vid];
    return o;
}

fragment float4 triangle_fragment(VOut in [[stage_in]]) { return in.color; }
