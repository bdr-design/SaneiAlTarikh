"""Map layers for screen 4 variant C (province panel, compact card).

1. (No longer writes a copy of the overlay: the page loads the shared overlay, whose city names tools/city_labels.py
   places beside their dots, «القاهرة» west of it. This only checks that.)
2. Prints the Cairo governorate outline (Natural Earth admin-1, public domain) in the map image's
   pixel space (Miller, lon 5..62, lat 10..44, 1688 px wide: the same projection as tools/satellite.py),
   plus the bounding boxes of Cairo, the Nile delta governorates and Egypt. index.html embeds them.

Usage: python3 -I make_map_layers.py <ne10_admin1.geojson>
"""
import json
import math
import sys
from pathlib import Path

from shapely.geometry import shape, Polygon
from shapely.ops import unary_union, transform

HERE = Path(__file__).resolve().parent
SHARED = HERE.parents[2] / "shared"

# 1. the shared overlay places every city name beside its dot (tools/city_labels.py)
svg = (SHARED / "map_mena_d1_overlay.svg").read_text(encoding="utf-8")
assert svg.count('direction="rtl"') == 11, "run tools/city_labels.py first"

# 2. Cairo outline + boxes in image pixels
LON0, LON1, LAT0, LAT1, WIDTH = 5.0, 62.0, 10.0, 44.0, 1688


def my(lat):
    return 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))


XMIN, YTOP = math.radians(LON0), my(LAT1)
SCALE = WIDTH / (math.radians(LON1) - XMIN)


def proj(xs, ys, zs=None):
    return [(math.radians(x) - XMIN) * SCALE for x in xs], [(YTOP - my(y)) * SCALE for y in ys]


feats = json.load(open(sys.argv[1]))["features"]
egy = {f["properties"]["adm1_code"]: transform(proj, shape(f["geometry"])) for f in feats if f["properties"]["adm0_a3"] == "EGY"}
cairo = egy["EGY-1533"].simplify(0.35, preserve_topology=True)
assert isinstance(cairo, Polygon)
d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in list(cairo.exterior.coords)[:-1]) + "Z"
# delta: Cairo plus the governorates of the Nile delta proper
DELTA = ["EGY-1533", "EGY-1534", "EGY-1532", "EGY-1530", "EGY-1547", "EGY-1537", "EGY-1539", "EGY-1535"]
delta = unary_union([egy[k] for k in DELTA])
out = {
    "cairo_d": d,
    "cairo_box": [round(v, 1) for v in cairo.bounds],
    "delta_box": [round(v, 1) for v in delta.bounds],
    "egypt_box": [round(v, 1) for v in unary_union(list(egy.values())).bounds],
}
print(json.dumps(out, ensure_ascii=False))
