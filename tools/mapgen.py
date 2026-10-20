"""Generate 2011 map illustrations (SVG) for the design mockups from Natural Earth (public domain)."""
import hashlib
import json
import math
import sys
from pathlib import Path

from shapely.geometry import shape, box, mapping, Polygon, MultiPolygon, LineString
from shapely.ops import unary_union, transform

NE = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

SEA = "#132231"
BORDER = "#0B121A"
PALETTE = {1: "#3F5868", 2: "#56664A", 3: "#6A5847", 4: "#4B5B78", 5: "#66505E", 6: "#4C665F", 7: "#6B6747"}
PLAYER_FILL = "#2E8B85"
PLAYER_EDGE = "#8FE3D9"
FONT = "-apple-system, 'SF Arabic', 'Geeza Pro', 'Noto Sans Arabic', sans-serif"
DISPUTED = {"SOL", "CYN", "SAH", "KOS", "PSX"}


def load(name):
    return json.load(open(NE / name))["features"]


def miller(lon, lat):
    lat = max(min(lat, 84.0), -58.0)
    x = math.radians(lon)
    y = 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))
    return x, y


def projector(lon0, lon1, lat0, lat1, width):
    x0, y_bottom = miller(lon0, lat0)
    x1, y_top = miller(lon1, lat1)
    scale = width / (x1 - x0)
    height = (y_top - y_bottom) * scale

    def f(xs, ys, zs=None):
        out_x, out_y = [], []
        for lon, lat in zip(xs, ys):
            x, y = miller(lon, lat)
            out_x.append((x - x0) * scale)
            out_y.append((y_top - y) * scale)
        return out_x, out_y

    return f, height


def path_d(geom):
    parts = []
    polys = [geom] if isinstance(geom, Polygon) else list(getattr(geom, "geoms", []))
    for p in polys:
        if not isinstance(p, Polygon) or p.is_empty:
            continue
        for ring in [p.exterior, *p.interiors]:
            pts = list(ring.coords)
            if len(pts) < 4:
                continue
            seg = "M" + "L".join(f"{x:.0f},{y:.0f}" for x, y in pts[:-1]) + "Z"
            parts.append(seg)
    return "".join(parts)


def line_d(geom):
    lines = []
    for g in getattr(geom, "geoms", [geom]):
        if isinstance(g, (Polygon,)):
            g = g.exterior
        coords = list(getattr(g, "coords", []))
        if len(coords) >= 2:
            lines.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in coords))
    return "".join(lines)


def polys_only(g):
    if g.is_empty:
        return g
    if isinstance(g, (Polygon, MultiPolygon)):
        return g
    ps = [x for x in getattr(g, "geoms", []) if isinstance(x, (Polygon, MultiPolygon))]
    return unary_union(ps) if ps else Polygon()


def stable_rand(key):
    return int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


# ---------- data ----------
a0 = load("ne_50m_admin_0_countries.geojson")
disp = load("ne_10m_admin_0_disputed_areas.geojson")
crimea = unary_union([shape(f["geometry"]) for f in disp if f["properties"].get("NAME") == "Crimea"])

countries = {}
colors = {}
names_ar = {}
for f in a0:
    p = f["properties"]
    code = p["ADM0_A3"]
    g = shape(f["geometry"])
    countries[code] = g if code not in countries else countries[code].union(g)
    colors[code] = PALETTE.get(p.get("MAPCOLOR7") or 1, PALETTE[1])
    names_ar[code] = p.get("NAME_AR") or p.get("NAME")

# 2011 adjustments: one Sudan, Crimea in Ukraine.
if "SDS" in countries:
    countries["SDN"] = countries["SDN"].union(countries.pop("SDS"))
countries["RUS"] = polys_only(countries["RUS"].difference(crimea.buffer(0.01)))
countries["UKR"] = countries["UKR"].union(crimea)
countries.pop("ATA", None)


def world_svg(fname, fill_for, width=2000, player="EGY", labels=None, legend=None):
    lon0, lon1, lat0, lat1 = -180, 180, -58, 84
    proj, height = projector(lon0, lon1, lat0, lat1, width)
    clip = box(lon0, lat0, lon1, lat1)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height:.0f}" width="{width}" height="{height:.0f}">',
           f'<rect width="{width}" height="{height:.0f}" fill="{SEA}"/>']
    for code, g in sorted(countries.items()):
        g = g.intersection(clip)
        if g.is_empty:
            continue
        pg = transform(proj, g).simplify(0.45, preserve_topology=True)
        d = path_d(pg)
        if not d:
            continue
        fill = fill_for(code)
        dash = ' stroke-dasharray="3 2"' if code in DISPUTED else ""
        if code == player:
            out.append(f'<path d="{d}" fill="{PLAYER_FILL}" stroke="{PLAYER_EDGE}" stroke-width="1.6"/>')
        else:
            out.append(f'<path d="{d}" fill="{fill}" stroke="{BORDER}" stroke-width="0.9"{dash}/>')
    out.append("</svg>")
    (OUT / fname).write_text("".join(out), encoding="utf-8")
    return height


# Political world.
h_world = world_svg("world_political_2011.svg", lambda c: colors.get(c, PALETTE[1]))

# Diplomacy world (illustrative relations with Egypt): blue = good, orange = poor.
REL = {
    "SAU": 70, "ARE": 70, "KWT": 65, "QAT": 40, "BHR": 60, "OMN": 55, "JOR": 65, "MAR": 55, "DZA": 30, "TUN": 50,
    "LBY": 20, "SDN": 40, "USA": 60, "GBR": 45, "FRA": 45, "DEU": 40, "ITA": 45, "CHN": 45, "RUS": 35, "JPN": 40,
    "ISR": -10, "IRN": -55, "SYR": 10, "LBN": 30, "IRQ": 20, "TUR": 35, "ETH": -25, "PSX": 55, "YEM": 35,
}


def dip_color(code):
    v = REL.get(code)
    if v is None:
        return "#3A4552"
    if v >= 0:
        t = v / 100
        a, b = (0x3A, 0x45, 0x52), (0x3E, 0x82, 0xC4)
    else:
        t = -v / 100
        a, b = (0x3A, 0x45, 0x52), (0xD0, 0x7A, 0x2E)
    return "#%02X%02X%02X" % tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


world_svg("world_diplomacy_egypt_2011.svg", dip_color)

# ---------- regional maps with provinces ----------
a1 = load("ne10_admin1.geojson")


def region_svg(fname, lon0, lon1, lat0, lat1, width, fill_for, player="EGY", controller=None, extras=None,
               city_codes=None, country_labels=True):
    proj, height = projector(lon0, lon1, lat0, lat1, width)
    clip = box(lon0 - 1, lat0 - 1, lon1 + 1, lat1 + 1)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height:.0f}" width="{width}" height="{height:.0f}">',
           f'<rect width="{width}" height="{height:.0f}" fill="{SEA}"/>']
    by_country = {}
    prov_paths = []
    for f in a1:
        p = f["properties"]
        code = p["adm0_a3"]
        if code == "SDS":
            code = "SDN"
        if p["adm1_code"] in ("RUS-283", "RUS-5482"):
            code = "UKR"
        g = shape(f["geometry"])
        if not g.intersects(clip):
            continue
        g = g.intersection(clip)
        if g.is_empty:
            continue
        pg = polys_only(transform(proj, g)).simplify(2.0, preserve_topology=True)
        if pg.is_empty:
            continue
        by_country.setdefault(code, []).append(pg)
        prov_paths.append((code, p["adm1_code"], p.get("name_ar") or p.get("name"), pg))
    for code, parts in by_country.items():
        base = unary_union([x.buffer(0.6, quad_segs=1) for x in parts]).buffer(-0.6, quad_segs=1).simplify(1.5, preserve_topology=True)
        out.append(f'<path d="{path_d(base)}" fill="{fill_for(code, code)}"/>')
    for code, adm1, name, pg in prov_paths:
        fill = fill_for(code, adm1)
        if controller and adm1 in controller:
            fill = controller[adm1]
        out.append(f'<path d="{path_d(pg)}" fill="{fill}" stroke="#FFFFFF" stroke-opacity="0.13" stroke-width="0.7"/>')
    for code, parts in by_country.items():
        outline = unary_union([x.buffer(0.3, quad_segs=1) for x in parts]).buffer(-0.3, quad_segs=1).simplify(1.5, preserve_topology=True)
        outline = unary_union([Polygon(q.exterior) for q in ([outline] if isinstance(outline, Polygon) else list(getattr(outline, "geoms", []))) if isinstance(q, Polygon) and q.area > 30])
        edge = PLAYER_EDGE if code == player else BORDER
        sw = 2.2 if code == player else 1.6
        dash = ' stroke-dasharray="5 3"' if code in DISPUTED else ""
        out.append(f'<path d="{path_d(outline)}" fill="none" stroke="{edge}" stroke-width="{sw}"{dash}/>')
    if extras:
        out.extend(extras(proj))
    if country_labels:
        for code, parts in by_country.items():
            if code not in LABELS:
                continue
            lon, lat = LABELS[code][1]
            if not (lon0 <= lon <= lon1 and lat0 <= lat <= lat1):
                continue
            (x,), (y,) = proj([lon], [lat])
            weight = "700" if code == player else "600"
            fill = "#EAF7F5" if code == player else "#D5DEE6"
            out.append(f'<text x="{x:.0f}" y="{y:.0f}" font-family="{FONT}" font-size="{LABEL_SIZE}" font-weight="{weight}" '
                       f'fill="{fill}" fill-opacity="0.92" text-anchor="middle">{LABELS[code][0]}</text>')
    for name, lon, lat in (city_codes or []):
        if not (lon0 <= lon <= lon1 and lat0 <= lat <= lat1):
            continue
        (x,), (y,) = proj([lon], [lat])
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#E6EDF3" stroke="{BORDER}" stroke-width="1.5"/>')
        out.append(f'<text x="{x + 8:.0f}" y="{y + 5:.0f}" font-family="{FONT}" font-size="{CITY_SIZE}" fill="#E6EDF3" '
                   f'fill-opacity="0.9" text-anchor="end">{name}</text>')
    out.append("</svg>")
    (OUT / fname).write_text("".join(out), encoding="utf-8")
    return height


LABELS = {
    "EGY": ("مصر", (29.8, 26.6)), "LBY": ("ليبيا", (17.5, 27.0)), "SDN": ("السودان", (30.0, 13.5)),
    "SAU": ("السعودية", (44.5, 24.0)), "TUR": ("تركيا", (34.5, 39.0)), "IRN": ("إيران", (54.0, 32.5)),
    "IRQ": ("العراق", (43.5, 33.0)), "SYR": ("سوريا", (38.5, 35.2)), "JOR": ("الأردن", (37.3, 30.9)),
    "TUN": ("تونس", (9.4, 34.0)), "DZA": ("الجزائر", (2.5, 28.0)),
    "YEM": ("اليمن", (47.5, 15.6)), "OMN": ("عمان", (56.5, 21.0)), "ARE": ("الإمارات", (54.3, 23.6)),
    "TCD": ("تشاد", (18.7, 15.5)), "NER": ("النيجر", (9.5, 17.5)), "ETH": ("إثيوبيا", (39.5, 9.0)),
    "ERI": ("إريتريا", (38.6, 15.6)), "GRC": ("اليونان", (22.0, 39.5)), "ITA": ("إيطاليا", (13.5, 42.5)),
    "KWT": ("الكويت", (47.6, 29.3)), "QAT": ("قطر", (51.2, 25.3)), "CYP": ("قبرص", (33.0, 35.0)), }
LABEL_SIZE = 28
CITY_SIZE = 21
CITIES = [("القاهرة", 31.24, 30.04), ("الإسكندرية", 29.92, 31.20), ("أسوان", 32.90, 24.09), ("طرابلس", 13.19, 32.89),
          ("بنغازي", 20.07, 32.12), ("الخرطوم", 32.53, 15.59), ("الرياض", 46.72, 24.69), ("بغداد", 44.37, 33.31), ("تونس", 10.18, 36.80), ("صنعاء", 44.21, 15.35),
          ("أنقرة", 32.86, 39.93), ("طهران", 51.39, 35.69)]

h_mena = region_svg("mena_provinces_2011.svg", 5, 62, 10, 44, 1688,
                    lambda c, a: (PLAYER_FILL if c == "EGY" else colors.get(c, PALETTE[1])), city_codes=CITIES)

# Unrest map mode (illustrative values only).
UNREST = {"TUN": 78, "EGY": 62, "LBY": 55, "YEM": 70, "SYR": 48, "BHR": 58, "JOR": 40, "DZA": 42, "MAR": 36, "IRQ": 52,
          "SDN": 50, "IRN": 38, "SAU": 18, "ARE": 8, "QAT": 6, "KWT": 15, "OMN": 30, "TUR": 25, "ISR": 22, "PSX": 55,
          "LBN": 35, "GRC": 45, "ITA": 20, "ETH": 40, "ERI": 35, "TCD": 45, "NER": 40, "CYP": 15}


def unrest_color(code, adm1):
    base = UNREST.get(code, 20)
    v = max(0, min(100, base + (stable_rand(adm1) - 0.5) * 30))
    stops = [(0, (0x2C, 0x4A, 0x5A)), (40, (0x6B, 0x6A, 0x4E)), (60, (0xC8, 0x8A, 0x32)), (80, (0xD9, 0x5F, 0x3B)), (100, (0xB8, 0x3A, 0x2E))]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if v <= p1:
            t = (v - p0) / (p1 - p0)
            return "#%02X%02X%02X" % tuple(int(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))
    return "#B83A2E"


region_svg("mena_unrest_2011.svg", 5, 62, 10, 44, 1688, unrest_color, city_codes=CITIES)

# Libya front (illustrative mid-2011 situation): east held by the opposition council.
EAST = set()
for f in a1:
    p = f["properties"]
    if p["adm0_a3"] == "LBY" and ((p.get("longitude") and float(p["longitude"]) > 19.6) or "Misrat" in (p.get("name") or "")):
        EAST.add(p["adm1_code"])
REBEL = "#8A6A3A"


def libya_extras(proj):
    front = [(19.95, 30.62), (20.15, 30.25), (20.35, 29.75), (20.45, 29.2)]
    xs, ys = proj([p[0] for p in front], [p[1] for p in front])
    d = "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in zip(xs, ys))
    items = [f'<path d="{d}" fill="none" stroke="#E46A4E" stroke-width="4" stroke-dasharray="10 6" stroke-linecap="round"/>']
    return items


region_svg("libya_front_2011.svg", 8.5, 26.5, 18.5, 34.5, 1688,
           lambda c, a: (PLAYER_FILL if c == "LBY" else colors.get(c, PALETTE[1])),
           player="LBY", controller={a: REBEL for a in EAST},
           extras=libya_extras,
           city_codes=[("طرابلس", 13.19, 32.89), ("بنغازي", 20.07, 32.12), ("مصراتة", 15.09, 32.38), ("سرت", 16.59, 31.21),
                       ("أجدابيا", 20.22, 30.76), ("البريقة", 19.58, 30.40), ("سبها", 14.43, 27.04), ("طبرق", 23.96, 32.08)])

for p in sorted(OUT.glob("*.svg")):
    print(p.name, p.stat().st_size)
print("heights", round(h_world), round(h_mena))
