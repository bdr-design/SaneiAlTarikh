"""Satellite base maps (Miller) from NASA Blue Marble tiles + elevation relief, plus vector overlays.

Imagery: NASA Blue Marble (public domain) via Web Mercator tiles.
Elevation/bathymetry: AWS Terrain Tiles (Terrarium; ETOPO1/GMTED/SRTM at this zoom).
Vectors: Natural Earth (public domain).
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance
from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union, transform

SAT, DEM, NE, OUT = (Path(p) for p in sys.argv[1:5])
OUT.mkdir(parents=True, exist_ok=True)
Z, TX0, TX1, TY0, TY1 = 6, 32, 43, 22, 31
LON0, LON1, LAT0, LAT1, WIDTH = 5.0, 62.0, 10.0, 44.0, 1688
FONT = "-apple-system, 'SF Arabic', 'Geeza Pro', 'Noto Sans Arabic', sans-serif"


def miller_y(lat):
    return 1.25 * np.log(np.tan(np.pi / 4 + 0.4 * np.radians(lat)))


xmin, xmax = np.radians(LON0), np.radians(LON1)
ytop, ybot = miller_y(LAT1), miller_y(LAT0)
scale = WIDTH / (xmax - xmin)
HEIGHT = int(round((ytop - ybot) * scale))
lon = LON0 + (np.arange(WIDTH) + 0.5) / WIDTH * (LON1 - LON0)
ym = ytop - (np.arange(HEIGHT) + 0.5) / scale
lat = np.degrees(2.5 * np.arctan(np.exp(0.8 * ym)) - 0.625 * np.pi)
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

# Relief shading from elevation (land and sea floor).
dx_m = (LON1 - LON0) / WIDTH * 111320 * np.cos(np.radians(LAT))
dy_m = -np.gradient(LAT, axis=0) * 111320
gy, gx = np.gradient(elev)
sx, sy = gx / dx_m * 6.0, gy / dy_m * 6.0
slope = np.arctan(np.hypot(sx, sy))
aspect = np.arctan2(sy, -sx)
az, alt = np.radians(315), np.radians(40)
hs = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
land = (elev > 0) | (rgb.mean(axis=2) > 60)


def save(arr, name):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").save(OUT / name, quality=88, optimize=True, progressive=True)


# A: natural true color.
save(rgb, "sat_natural.jpg")

# B: true color with relief and sea depth.
relief = rgb * (0.70 + 0.55 * hs)[..., None]
depth = np.clip(-elev / 4000, 0, 1)[..., None]
sea = rgb * (1.05 - 0.45 * depth) * (0.9 + 0.2 * hs)[..., None]
shallow = np.clip(1 - (-elev) / 120, 0, 1)[..., None] * (elev < 0)[..., None]
sea = sea * (1 - 0.35 * shallow) + np.array([70, 150, 165], dtype=np.float32) * 0.35 * shallow
relief_rgb = np.where(land[..., None], relief, sea)
save(relief_rgb, "sat_relief.jpg")

# D: operations-room grade (darker, calmer, cooler) for long sessions.
img = Image.fromarray(np.clip(relief_rgb, 0, 255).astype(np.uint8), "RGB")
img = ImageEnhance.Color(img).enhance(0.78)
img = ImageEnhance.Brightness(img).enhance(0.72)
ops = np.asarray(img).astype(np.float32) * np.array([0.94, 0.98, 1.06], dtype=np.float32)
save(ops, "sat_ops.jpg")

# ---------- overlays ----------
def to_px(xs, ys):
    xs, ys = np.asarray(xs), np.asarray(ys)
    return list((np.radians(xs) - xmin) * scale), list((ytop - miller_y(ys)) * scale)


def proj(xs, ys, zs=None):
    return to_px(xs, ys)


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
                out.append("M" + "L".join(f"{x:.0f},{y:.0f}" for x, y in pts[:-1]) + "Z")
    return "".join(out)


a0 = json.load(open(NE / "ne_50m_admin_0_countries.geojson"))["features"]
cidx = {f["properties"]["ADM0_A3"]: (f["properties"].get("MAPCOLOR7") or 1) - 1 for f in a0}
a1 = json.load(open(NE / "ne10_admin1.geojson"))["features"]
clip = box(LON0 - 1, LAT0 - 1, LON1 + 1, LAT1 + 1)
provs, byc = [], {}
for f in a1:
    p = f["properties"]
    code = "SDN" if p["adm0_a3"] == "SDS" else p["adm0_a3"]
    g = shape(f["geometry"])
    if not g.intersects(clip):
        continue
    pg = polys_only(transform(proj, g.intersection(clip))).simplify(2.0, preserve_topology=True)
    if not pg.is_empty:
        provs.append((code, pg))
        byc.setdefault(code, []).append(pg)
outl = {}
for code, parts in byc.items():
    o = unary_union([q.buffer(0.6, quad_segs=1) for q in parts]).buffer(-0.6, quad_segs=1).simplify(1.5, preserve_topology=True)
    outl[code] = unary_union([Polygon(q.exterior) for q in ([o] if isinstance(o, Polygon) else list(getattr(o, "geoms", [])))
                              if isinstance(q, Polygon) and q.area > 30])

LABELS = {"EGY": ("مصر", (29.8, 26.6)), "LBY": ("ليبيا", (17.5, 27.0)), "SDN": ("السودان", (30.0, 13.5)),
          "SAU": ("السعودية", (44.5, 24.0)), "TUR": ("تركيا", (34.5, 39.0)), "IRN": ("إيران", (54.0, 32.5)),
          "IRQ": ("العراق", (43.2, 32.6)), "SYR": ("سوريا", (38.5, 35.2)), "JOR": ("الأردن", (37.3, 30.9)),
          "TUN": ("تونس", (9.4, 34.0)), "DZA": ("الجزائر", (2.5, 28.0)), "YEM": ("اليمن", (47.5, 15.6)),
          "OMN": ("عمان", (56.5, 21.0)), "ARE": ("الإمارات", (54.3, 23.6)), "TCD": ("تشاد", (18.7, 15.5)),
          "NER": ("النيجر", (9.5, 17.5)), "ERI": ("إريتريا", (38.6, 15.6)), "GRC": ("اليونان", (22.0, 39.5)),
          "ITA": ("إيطاليا", (13.5, 42.5)), "KWT": ("الكويت", (47.6, 29.3)), "QAT": ("قطر", (51.2, 25.3))}
CITIES = [("القاهرة", 31.24, 30.04), ("الإسكندرية", 29.92, 31.20), ("أسوان", 32.90, 24.09), ("طرابلس", 13.19, 32.89),
          ("بنغازي", 20.07, 32.12), ("الخرطوم", 32.53, 15.59), ("الرياض", 46.72, 24.69), ("بغداد", 44.37, 33.31),
          ("صنعاء", 44.21, 15.35), ("أنقرة", 32.86, 39.93), ("طهران", 51.39, 35.69)]
STRATEGY = ["#4A7FB5", "#5FA35A", "#D4A93C", "#B5524A", "#8E6BB8", "#3E9C9C", "#D07A3C"]


def overlay(name, fill_op, prov_col, prov_op, border, border_op, player_fill, player_fill_op, player_edge, title):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}">']
    if fill_op > 0:
        for code, o in outl.items():
            if code != "EGY":
                out.append(f'<path d="{path_d(o)}" fill="{STRATEGY[cidx.get(code, 0) % 7]}" fill-opacity="{fill_op}"/>')
    out.append(f'<path d="{path_d(outl["EGY"])}" fill="{player_fill}" fill-opacity="{player_fill_op}"/>')
    for code, pg in provs:
        out.append(f'<path d="{path_d(pg)}" fill="none" stroke="{prov_col}" stroke-opacity="{prov_op}" stroke-width="0.9"/>')
    for code, o in outl.items():
        if code != "EGY":
            out.append(f'<path d="{path_d(o)}" fill="none" stroke="{border}" stroke-opacity="{border_op}" stroke-width="1.8"/>')
    out.append(f'<path d="{path_d(outl["EGY"])}" fill="none" stroke="{player_edge}" stroke-opacity="0.35" stroke-width="9"/>')
    out.append(f'<path d="{path_d(outl["EGY"])}" fill="none" stroke="{player_edge}" stroke-width="3"/>')
    for code, (nm, (lo, la)) in LABELS.items():
        (x,), (y,) = to_px([lo], [la])
        sz = 36 if code == "EGY" else 28
        out.append(f'<text x="{x:.0f}" y="{y:.0f}" font-family="{FONT}" font-size="{sz}" font-weight="700" fill="#FFFFFF" '
                   f'stroke="#0B1218" stroke-width="5" stroke-opacity="0.75" paint-order="stroke" text-anchor="middle">{nm}</text>')
    for nm, lo, la in CITIES:
        (x,), (y,) = to_px([lo], [la])
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="#FFFFFF" stroke="#0B1218" stroke-width="2"/>')
        out.append(f'<text x="{x - 10:.0f}" y="{y + 7:.0f}" font-family="{FONT}" font-size="21" font-weight="600" fill="#FFFFFF" '
                   f'stroke="#0B1218" stroke-width="4" stroke-opacity="0.7" paint-order="stroke" text-anchor="start">{nm}</text>')
    out.append(f'<rect x="0" y="0" width="{WIDTH}" height="64" fill="#000000" fill-opacity="0.55"/>')
    out.append(f'<text x="{WIDTH - 28}" y="44" font-family="{FONT}" font-size="32" font-weight="700" fill="#FFFFFF" text-anchor="end">{title}</text>')
    out.append("</svg>")
    (OUT / name).write_text("".join(out), encoding="utf-8")


overlay("ov_A.svg", 0, "#FFFFFF", 0.18, "#FFFFFF", 0.75, "#3FE0D0", 0.12, "#7FF5EA", "أ — قمر صناعي طبيعي + حدود")
overlay("ov_B.svg", 0, "#FFFFFF", 0.18, "#FFFFFF", 0.8, "#3FE0D0", 0.14, "#7FF5EA", "ب — قمر صناعي + تضاريس مجسمة وأعماق بحر")
overlay("ov_C.svg", 0.30, "#FFFFFF", 0.15, "#111820", 0.9, "#FFFFFF", 0.22, "#FFFFFF", "ج — قمر صناعي + ألوان الدول شفافة")
overlay("ov_D.svg", 0, "#7FE9FF", 0.14, "#7FE9FF", 0.6, "#3FE0D0", 0.16, "#7FF5EA", "د — قمر صناعي بدرجة غرفة عمليات (مريح للعين)")
print(WIDTH, HEIGHT)
