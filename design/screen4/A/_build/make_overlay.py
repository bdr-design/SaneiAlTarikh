"""Make the map overlay used by this variant: the approved D1 overlay with one change.

The shared overlay draws its city labels with text-anchor="start" 10 px left of the city dot,
which is the right-to-left placement (label to the west of the dot). Rendered through <img> the
SVG is left-to-right, so the label «القاهرة» lands on top of the Cairo governorate itself and
would hide the selection outline. Here only that label gets direction="rtl", so it sits west of
its dot as intended and the selected province stays readable. Everything else is byte-identical.

Usage: python3 -I make_overlay.py   (writes ../map_overlay_cairo.svg)
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parents[2] / "shared" / "map_mena_d1_overlay.svg"
DST = HERE.parent / "map_overlay_cairo.svg"

svg = SRC.read_text(encoding="utf-8")
old = '<text x="767" y="484"'
assert svg.count(old) == 1, "Cairo label not found exactly once"
end = svg.index(">", svg.index(old))
tag = svg[svg.index(old):end]
assert tag.endswith('text-anchor="start"') and "القاهرة" in svg[end:end + 20], "unexpected Cairo label"
svg = svg[:end] + ' direction="rtl"' + svg[end:]
DST.write_text(svg, encoding="utf-8")
print("wrote", DST, len(svg), "bytes")
