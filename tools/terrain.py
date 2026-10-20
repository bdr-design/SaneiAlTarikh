"""Realistic terrain base (Miller projection) from Terrarium elevation tiles + Natural Earth vectors.

Elevation: AWS Terrain Tiles (Terrarium encoding; sources incl. ETOPO1/GMTED/SRTM, public domain at this zoom).
Vectors: Natural Earth (public domain).
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from shapely.geometry import shape, box, Polygon, MultiPolygon, LineString, MultiLineString
from shapely.ops import unary_union

TILES = Path(sys.argv[1])
NE = Path(sys.argv[2])
OUT = Path(sys.argv[3])
Z, TX0, TX1, TY0, TY1 = 6, 32, 43, 22, 31
LON0, LON1, LAT0, LAT1, WIDTH = 5.0, 62.0, 10.0, 44.0, 1688


def miller_y(lat):
    return 1.25 * np.log(np.tan(np.pi / 4 + 0.4 * np.radians(lat)))


# ---- mosaic ----
nx, ny = TX1 - TX0 + 1, TY1 - TY0 + 1
mosaic = np.zeros((ny * 256, nx * 256), dtype=np.float32)
for x in range(TX0, TX1 + 1):
    for y in range(TY0, TY1 + 1):
        im = np.asarray(Image.open(TILES / f"{x}_{y}.png").convert("RGB")).astype(np.float32)
        e = im[..., 0] * 256 + im[..., 1] + im[..., 2] / 256 - 32768
        mosaic[(y - TY0) * 256:(y - TY0 + 1) * 256, (x - TX0) * 256:(x - TX0 + 1) * 256] = e

# ---- output grid in Miller ----
xmin, xmax = np.radians(LON0), np.radians(LON1)
ytop, ybot = miller_y(LAT1), miller_y(LAT0)
scale = WIDTH / (xmax - xmin)
HEIGHT = int(round((ytop - ybot) * scale))
px = np.arange(WIDTH) + 0.5
py = np.arange(HEIGHT) + 0.5
lon = LON0 + px / WIDTH * (LON1 - LON0)
ym = ytop - py / scale
lat = np.degrees(2.5 * np.arctan(np.exp(0.8 * ym)) - 0.625 * np.pi)
LON, LAT = np.meshgrid(lon, lat)

n = 2 ** Z * 256
mx = (LON + 180) / 360 * n - TX0 * 256
my = (1 - np.arcsinh(np.tan(np.radians(LAT))) / np.pi) / 2 * n - TY0 * 256


def bilinear(img, x, y):
    x0 = np.clip(np.floor(x).astype(int), 0, img.shape[1] - 2)
    y0 = np.clip(np.floor(y).astype(int), 0, img.shape[0] - 2)
    fx, fy = np.clip(x - x0, 0, 1), np.clip(y - y0, 0, 1)
    a, b = img[y0, x0], img[y0, x0 + 1]
    c, d = img[y0 + 1, x0], img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


elev = bilinear(mosaic, mx, my)

# ---- hillshade ----
km_per_deg = 111.32
dx_m = (LON1 - LON0) / WIDTH * km_per_deg * 1000 * np.cos(np.radians(LAT))
dy_m = np.gradient(LAT, axis=0) * km_per_deg * 1000 * -1
gy, gx = np.gradient(elev)
ex = 7.0
slope_x = gx / dx_m * ex
slope_y = gy / dy_m * ex
slope = np.arctan(np.hypot(slope_x, slope_y))
aspect = np.arctan2(slope_y, -slope_x)
az, alt = np.radians(315.0), np.radians(42.0)
hs = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
hs = np.clip(hs, 0, 1)


# ---- vector rasterization helpers (Miller pixel space) ----
def to_px(lonv, latv):
    x = (np.radians(lonv) - xmin) * scale
    y = (ytop - miller_y(latv)) * scale
    return x, y


def draw_geom(draw, geom, fill=None, outline=None, width=1):
    geoms = [geom] if isinstance(geom, (Polygon, LineString)) else list(getattr(geom, "geoms", []))
    for g in geoms:
        if isinstance(g, Polygon):
            xs, ys = to_px(np.array(g.exterior.xy[0]), np.array(g.exterior.xy[1]))
            draw.polygon(list(zip(xs, ys)), fill=fill, outline=outline)
            for hole in g.interiors:
                hx, hy = to_px(np.array(hole.xy[0]), np.array(hole.xy[1]))
                draw.polygon(list(zip(hx, hy)), fill=0)
        elif isinstance(g, LineString):
            xs, ys = to_px(np.array(g.xy[0]), np.array(g.xy[1]))
            draw.line(list(zip(xs, ys)), fill=outline, width=width, joint="curve")


clip = box(LON0 - 2, LAT0 - 2, LON1 + 2, LAT1 + 2)


def load(name):
    return json.load(open(NE / name))["features"]


land = unary_union([shape(f["geometry"]).intersection(clip) for f in load("ne_10m_admin_0_countries.geojson")
                    if shape(f["geometry"]).intersects(clip)])
mask_img = Image.new("L", (WIDTH, HEIGHT), 0)
draw_geom(ImageDraw.Draw(mask_img), land, fill=255)
lakes = [shape(f["geometry"]) for f in load("ne_10m_lakes.geojson") if shape(f["geometry"]).intersects(clip)]
for lk in lakes:
    draw_geom(ImageDraw.Draw(mask_img), lk.intersection(clip), fill=0)
landmask = np.asarray(mask_img.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255

# Deserts and green river valleys.
desert_img = Image.new("L", (WIDTH, HEIGHT), 0)
dd = ImageDraw.Draw(desert_img)
for f in load("ne_10m_geography_regions_polys.geojson"):
    if f["properties"].get("FEATURECLA") in ("Desert", "Erg") and shape(f["geometry"]).intersects(clip):
        draw_geom(dd, shape(f["geometry"]).intersection(clip), fill=255)
desert = np.asarray(desert_img.filter(ImageFilter.GaussianBlur(14))).astype(np.float32) / 255

green_img = Image.new("L", (WIDTH, HEIGHT), 0)
gd = ImageDraw.Draw(green_img)
rivers = [f for f in load("ne_10m_rivers_lake_centerlines.geojson") if shape(f["geometry"]).intersects(clip)]
for f in rivers:
    name = (f["properties"].get("name") or "")
    if any(k in name for k in ("Nile", "Tigris", "Euphrates", "Shatt", "Jordan", "Orontes", "Karun")):
        draw_geom(gd, shape(f["geometry"]).intersection(clip).buffer(0.07), fill=255)
draw_geom(gd, Polygon([(29.9, 31.35), (31.0, 30.0), (31.25, 30.0), (32.35, 31.3), (31.6, 31.6), (30.5, 31.55)]), fill=255)
green = np.asarray(green_img.filter(ImageFilter.GaussianBlur(3))).astype(np.float32) / 255

# ---- colors ----
def ramp(v, stops):
    v = np.asarray(v, dtype=np.float32)
    out = np.zeros(v.shape + (3,), dtype=np.float32)
    xs = np.array([s[0] for s in stops], dtype=np.float32)
    for ch in range(3):
        out[..., ch] = np.interp(v, xs, np.array([s[1][ch] for s in stops], dtype=np.float32))
    return out


def hexrgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


steppe = ramp(elev, [(-200, hexrgb("#A9A27C")), (300, hexrgb("#A7A07A")), (900, hexrgb("#9E9372")), (1800, hexrgb("#8E8069")),
                     (3000, hexrgb("#9A9083")), (4200, hexrgb("#E4E2DC"))])
sand = ramp(elev, [(-200, hexrgb("#D9C397")), (400, hexrgb("#D6BC8C")), (1000, hexrgb("#C7A97C")), (2000, hexrgb("#A99273")),
                   (3200, hexrgb("#B0A493"))])
north = np.clip((LAT - 34) / 6, 0, 1)[..., None]
temperate = ramp(elev, [(-200, hexrgb("#7F9460")), (500, hexrgb("#869862")), (1200, hexrgb("#8E8F68")), (2200, hexrgb("#8B806C")),
                        (3500, hexrgb("#D9D6CF"))])
base = steppe * (1 - north) + temperate * north
base = base * (1 - desert[..., None]) + sand * desert[..., None]
nile_green = np.array(hexrgb("#5F7F45"), dtype=np.float32)
base = base * (1 - green[..., None] * 0.85) + nile_green * green[..., None] * 0.85

shade = (0.62 + 0.62 * hs)[..., None]
land_rgb = np.clip(base * shade, 0, 255)

depth = np.minimum(elev, 0)
sea_rgb = ramp(depth, [(-5500, hexrgb("#10304D")), (-3000, hexrgb("#163C5E")), (-1200, hexrgb("#1F4D73")),
                        (-200, hexrgb("#2D6488")), (-40, hexrgb("#3E7A9C")), (0, hexrgb("#4F8AAA"))])
sea_rgb = np.clip(sea_rgb * (0.88 + 0.24 * hs)[..., None], 0, 255)

rgb = land_rgb * landmask[..., None] + sea_rgb * (1 - landmask[..., None])
img = Image.fromarray(rgb.astype(np.uint8), "RGB")

# Rivers on top.
rd = ImageDraw.Draw(img)
for f in rivers:
    sr = f["properties"].get("scalerank") or 10
    if sr > 7:
        continue
    w = 3 if sr <= 3 else 2
    draw_geom(rd, shape(f["geometry"]).intersection(clip), outline=(70, 120, 160), width=w)
for lk in lakes:
    draw_geom(rd, lk.intersection(clip), fill=(70, 125, 160))

OUT.mkdir(parents=True, exist_ok=True)
img.save(OUT / "terrain_mena.jpg", quality=86, optimize=True, progressive=True)
print("terrain", WIDTH, HEIGHT, (OUT / "terrain_mena.jpg").stat().st_size)
