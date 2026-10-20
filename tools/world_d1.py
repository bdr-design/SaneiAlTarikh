"""World map in the approved D1 style (Miller), plus a 2011 country overlay.

Imagery: NASA Blue Marble tiles (public domain). Relief/bathymetry: AWS Terrain Tiles (Terrarium).
Vectors: Natural Earth 50m admin-0 (public domain), with 2011 fixes (one Sudan, Crimea in Ukraine).
Usage: python3 world_d1.py <sat_z4_dir> <dem_z4_dir> <ne_dir> <out_dir> [selected_iso3]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union, transform

SAT, DEM, NE, OUT = (Path(p) for p in sys.argv[1:5])
SELECTED = sys.argv[5] if len(sys.argv) > 5 else "EGY"
OUT.mkdir(parents=True, exist_ok=True)
Z, TX0, TX1, TY0, TY1 = 4, 0, 15, 0, 11
LON0, LON1, LAT0, LAT1, WIDTH = -180.0, 180.0, -58.0, 84.0, 2400
FONT = "-apple-system, 'SF Arabic', 'IBM Plex Sans Arabic', 'Geeza Pro', sans-serif"


def miller_y(lat):
    return 1.25 * np.log(np.tan(np.pi / 4 + 0.4 * np.radians(lat)))


xmin, xmax = np.radians(LON0), np.radians(LON1)
ytop, ybot = miller_y(LAT1), miller_y(LAT0)
scale = WIDTH / (xmax - xmin)
HEIGHT = int(round((ytop - ybot) * scale))
lon = LON0 + (np.arange(WIDTH) + 0.5) / WIDTH * (LON1 - LON0)
lat = np.degrees(2.5 * np.arctan(np.exp(0.8 * (ytop - (np.arange(HEIGHT) + 0.5) / scale))) - 0.625 * np.pi)
LON, LAT = np.meshgrid(lon, lat)
n = 2 ** Z * 256
MX = (LON + 180) / 360 * n - TX0 * 256
MY = (1 - np.arcsinh(np.tan(np.radians(LAT))) / np.pi) / 2 * n - TY0 * 256


def bilinear(img, x, y):
    x0 = np.clip(np.floor(x).astype(int), 0, img.shape[1] - 2)
    y0 = np.clip(np.floor(y).astype(int), 0, img.shape[0] - 2)
    fx, fy = np.clip(x - x0, 0, 1), np.clip(y - y0, 0, 1)
    if img.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    a, b, c, d = img[y0, x0], img[y0, x0 + 1], img[y0 + 1, x0], img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


nx, ny = TX1 - TX0 + 1, TY1 - TY0 + 1
sat = np.zeros((ny * 256, nx * 256, 3), dtype=np.float32)
dem = np.zeros((ny * 256, nx * 256), dtype=np.float32)
for x in range(TX0, TX1 + 1):
    for y in range(TY0, TY1 + 1):
        sl = np.s_[(y - TY0) * 256:(y - TY0 + 1) * 256, (x - TX0) * 256:(x - TX0 + 1) * 256]
        sat[sl] = np.asarray(Image.open(SAT / f"{x}_{y}.jpg").convert("RGB")).astype(np.float32)
        t = np.asarray(Image.open(DEM / f"{x}_{y}.png").convert("RGB")).astype(np.float32)
        dem[sl] = t[..., 0] * 256 + t[..., 1] + t[..., 2] / 256 - 32768

rgb = bilinear(sat, MX, MY)
elev = bilinear(dem, MX, MY)
dx_m = (LON1 - LON0) / WIDTH * 111320 * np.cos(np.radians(LAT))
dy_m = -np.gradient(LAT, axis=0) * 111320
gy, gx = np.gradient(elev)
sx, sy = gx / dx_m * 4.0, gy / dy_m * 4.0
slope = np.arctan(np.hypot(sx, sy))
aspect = np.arctan2(sy, -sx)
az, alt = np.radians(315), np.radians(40)
hs = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
land = (elev > 0) | (rgb.mean(axis=2) > 60)

# D1 grade (same parameters as the approved MENA map).
relief = rgb * (0.45 + 1.0 * hs)[..., None]
depth = np.clip(-elev / 4000, 0, 1)[..., None]
sea = rgb * (1.05 - 0.45 * depth) * (0.9 + 0.2 * hs)[..., None]
shallow = np.clip(1 - (-elev) / 120, 0, 1)[..., None] * (elev < 0)[..., None]
sea = sea * (1 - 0.35 * shallow) + np.array([70, 150, 165], dtype=np.float32) * 0.35 * shallow
base = np.where(land[..., None], relief, sea)
img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
img = ImageEnhance.Color(img).enhance(0.78)
img = ImageEnhance.Brightness(img).enhance(0.72)
graded = np.asarray(img).astype(np.float32) * np.array([0.94, 0.98, 1.06], dtype=np.float32)
Image.fromarray(np.clip(graded, 0, 255).astype(np.uint8), "RGB").save(OUT / "world_d1.jpg", quality=86, optimize=True, progressive=True)

# ---------- 2011 overlay ----------
def to_px(xs, ys, zs=None):
    xs, ys = np.asarray(xs, dtype=float), np.asarray(ys, dtype=float)
    return list((np.radians(xs) - xmin) * scale), list((ytop - miller_y(np.clip(ys, LAT0, LAT1))) * scale)


def polys_only(g):
    if isinstance(g, (Polygon, MultiPolygon)):
        return g
    ps = [q for q in getattr(g, "geoms", []) if isinstance(q, (Polygon, MultiPolygon))]
    return unary_union(ps) if ps else Polygon()


def path_d(geom):
    out = []
    for p in ([geom] if isinstance(geom, Polygon) else list(getattr(geom, "geoms", []))):
        if not isinstance(p, Polygon) or p.is_empty:
            continue
        for ring in [p.exterior, *p.interiors]:
            pts = list(ring.coords)
            if len(pts) >= 4:
                out.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts[:-1]) + "Z")
    return "".join(out)


a0 = json.load(open(NE / "ne_50m_admin_0_countries.geojson"))["features"]
disp = json.load(open(NE / "ne_10m_admin_0_disputed_areas.geojson"))["features"]
crimea = unary_union([shape(f["geometry"]) for f in disp if f["properties"].get("NAME") == "Crimea"])
geo, meta = {}, {}
for f in a0:
    p = f["properties"]
    code = p["ADM0_A3"]
    g = shape(f["geometry"])
    geo[code] = g if code not in geo else geo[code].union(g)
    meta[code] = p
geo["SDN"] = geo["SDN"].union(geo.pop("SDS"))
geo["RUS"] = polys_only(geo["RUS"].difference(crimea.buffer(0.01)))
geo["UKR"] = geo["UKR"].union(crimea)
geo.pop("ATA", None)
clip = box(LON0, LAT0, LON1, LAT1)

out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}">']
sel = None
for code, g in sorted(geo.items()):
    pg = polys_only(transform(to_px, g.intersection(clip))).simplify(0.35, preserve_topology=True)
    if pg.is_empty:
        continue
    d = path_d(pg)
    if code == SELECTED:
        sel = d
        continue
    out.append(f'<path d="{d}" fill="none" stroke="#7FE9FF" stroke-opacity="0.55" stroke-width="0.9"/>')
if sel:
    out.append(f'<path d="{sel}" fill="#3FE0D0" fill-opacity="0.16"/>')
    out.append(f'<path d="{sel}" fill="none" stroke="#7FF5EA" stroke-opacity="0.35" stroke-width="7"/>')
    out.append(f'<path d="{sel}" fill="none" stroke="#7FF5EA" stroke-width="2"/>')
for code, p in meta.items():
    if code in ("SDS", "ATA") or code not in geo:
        continue
    rank = p.get("LABELRANK") or 9
    if rank > 3 and code != SELECTED:
        continue
    name = p.get("NAME_AR") or p.get("NAME")
    (x,), (y,) = to_px([p["LABEL_X"]], [p["LABEL_Y"]])
    size = {1: 22, 2: 18, 3: 15}.get(rank, 15)
    if code == SELECTED:
        size = 22
    out.append(f'<text x="{x:.0f}" y="{y:.0f}" font-family="{FONT}" font-size="{size}" font-weight="700" fill="#FFFFFF" '
               f'stroke="#0B1218" stroke-width="4" stroke-opacity="0.75" paint-order="stroke" text-anchor="middle">{name}</text>')
out.append("</svg>")
(OUT / "world_d1_overlay.svg").write_text("".join(out), encoding="utf-8")
print(WIDTH, HEIGHT, (OUT / "world_d1.jpg").stat().st_size, (OUT / "world_d1_overlay.svg").stat().st_size)
