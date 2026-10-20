"""Render four map style samples of the same region so the user can pick a visual direction."""
import json
import math
import sys
from pathlib import Path

from shapely.geometry import shape, box, Polygon, MultiPolygon
from shapely.ops import unary_union, transform

NE = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
FONT = "-apple-system, 'SF Arabic', 'Geeza Pro', 'Noto Sans Arabic', sans-serif"

STYLES = {
    "A_modern_command": dict(
        title="أ — قيادة عصرية بألوان واضحة",
        sea="#0C2036", palette=["#4F7FAE", "#5E9C80", "#B8975A", "#A86F84", "#6F79B8", "#4E9A9A", "#B5805C"],
        prov="#FFFFFF", prov_op=0.16, border="#DCE8F2", border_op=0.75, border_w=1.6,
        player_fill="#1FA7A0", player_edge="#7FF5EA", player_w=3.2,
        label="#FFFFFF", halo="#0C2036", city="#FFFFFF"),
    "B_realistic_atlas": dict(
        title="ب — أطلس واقعي فاتح",
        sea="#7FA6C2", palette=["#E4D6B0", "#C9DBB0", "#EBC9A2", "#D3C6E0", "#BCD5E3", "#EADB9A", "#DDB7AE"],
        prov="#6B6150", prov_op=0.22, border="#5A5146", border_op=0.9, border_w=1.5,
        player_fill="#F2C46B", player_edge="#8A4B12", player_w=3.0,
        label="#2B2620", halo="#F4EEE0", city="#2B2620"),
    "C_night_tactical": dict(
        title="ج — تكتيكي ليلي",
        sea="#071019", palette=["#17222E", "#192634", "#1B2531", "#162330", "#1A2836", "#18242F", "#1C2733"],
        prov="#3FD0E0", prov_op=0.10, border="#3FD0E0", border_op=0.65, border_w=1.4,
        player_fill="#0F4A55", player_edge="#5FF0FF", player_w=3.0,
        label="#BFF6FF", halo="#071019", city="#BFF6FF"),
    "D_classic_strategy": dict(
        title="د — استراتيجي كلاسيكي (ألوان دول قوية)",
        sea="#2A4A68", palette=["#4A7FB5", "#5FA35A", "#D4A93C", "#B5524A", "#8E6BB8", "#3E9C9C", "#D07A3C"],
        prov="#000000", prov_op=0.18, border="#10161C", border_op=0.95, border_w=1.6,
        player_fill="#E8E8E8", player_edge="#FFFFFF", player_w=3.0,
        label="#FFFFFF", halo="#10161C", city="#FFFFFF"),
}

LABELS = {
    "EGY": ("مصر", (29.8, 26.6)), "LBY": ("ليبيا", (17.5, 27.0)), "SDN": ("السودان", (30.0, 13.5)),
    "SAU": ("السعودية", (44.5, 24.0)), "TUR": ("تركيا", (34.5, 39.0)), "IRN": ("إيران", (54.0, 32.5)),
    "IRQ": ("العراق", (43.5, 33.0)), "SYR": ("سوريا", (38.5, 35.2)), "JOR": ("الأردن", (37.3, 30.9)),
    "TUN": ("تونس", (9.4, 34.0)), "DZA": ("الجزائر", (2.5, 28.0)), "YEM": ("اليمن", (47.5, 15.6)),
    "OMN": ("عمان", (56.5, 21.0)), "ARE": ("الإمارات", (54.3, 23.6)), "TCD": ("تشاد", (18.7, 15.5)),
    "NER": ("النيجر", (9.5, 17.5)), "ERI": ("إريتريا", (38.6, 15.6)), "GRC": ("اليونان", (22.0, 39.5)),
    "ITA": ("إيطاليا", (13.5, 42.5)), "KWT": ("الكويت", (47.6, 29.3)), "QAT": ("قطر", (51.2, 25.3)),
}
CITIES = [("القاهرة", 31.24, 30.04), ("الإسكندرية", 29.92, 31.20), ("أسوان", 32.90, 24.09), ("طرابلس", 13.19, 32.89),
          ("بنغازي", 20.07, 32.12), ("الخرطوم", 32.53, 15.59), ("الرياض", 46.72, 24.69), ("بغداد", 44.37, 33.31),
          ("تونس", 10.18, 36.80), ("صنعاء", 44.21, 15.35), ("أنقرة", 32.86, 39.93), ("طهران", 51.39, 35.69)]


def miller(lon, lat):
    lat = max(min(lat, 84.0), -58.0)
    return math.radians(lon), 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))


def projector(lon0, lon1, lat0, lat1, width):
    x0, yb = miller(lon0, lat0)
    x1, yt = miller(lon1, lat1)
    scale = width / (x1 - x0)

    def f(xs, ys, zs=None):
        ox, oy = [], []
        for lon, lat in zip(xs, ys):
            x, y = miller(lon, lat)
            ox.append((x - x0) * scale)
            oy.append((yt - y) * scale)
        return ox, oy

    return f, (yt - yb) * scale


def polys_only(g):
    if isinstance(g, (Polygon, MultiPolygon)):
        return g
    ps = [x for x in getattr(g, "geoms", []) if isinstance(x, (Polygon, MultiPolygon))]
    return unary_union(ps) if ps else Polygon()


def path_d(geom, holes=True):
    out = []
    for p in ([geom] if isinstance(geom, Polygon) else list(getattr(geom, "geoms", []))):
        if not isinstance(p, Polygon) or p.is_empty:
            continue
        for ring in ([p.exterior, *p.interiors] if holes else [p.exterior]):
            pts = list(ring.coords)
            if len(pts) >= 4:
                out.append("M" + "L".join(f"{x:.0f},{y:.0f}" for x, y in pts[:-1]) + "Z")
    return "".join(out)


a0 = json.load(open(NE / "ne_50m_admin_0_countries.geojson"))["features"]
color_idx = {f["properties"]["ADM0_A3"]: (f["properties"].get("MAPCOLOR7") or 1) - 1 for f in a0}
a1 = json.load(open(NE / "ne10_admin1.geojson"))["features"]

lon0, lon1, lat0, lat1, width = 5, 62, 10, 44, 1688
proj, height = projector(lon0, lon1, lat0, lat1, width)
clip = box(lon0 - 1, lat0 - 1, lon1 + 1, lat1 + 1)
provs, by_country = [], {}
for f in a1:
    p = f["properties"]
    code = "SDN" if p["adm0_a3"] == "SDS" else p["adm0_a3"]
    g = shape(f["geometry"])
    if not g.intersects(clip):
        continue
    pg = polys_only(transform(proj, g.intersection(clip))).simplify(2.0, preserve_topology=True)
    if pg.is_empty:
        continue
    provs.append((code, pg))
    by_country.setdefault(code, []).append(pg)
outlines = {}
for code, parts in by_country.items():
    o = unary_union([x.buffer(0.6, quad_segs=1) for x in parts]).buffer(-0.6, quad_segs=1).simplify(1.5, preserve_topology=True)
    o = unary_union([Polygon(q.exterior) for q in ([o] if isinstance(o, Polygon) else list(getattr(o, "geoms", [])))
                     if isinstance(q, Polygon) and q.area > 30])
    outlines[code] = o

for key, st in STYLES.items():
    fill = lambda c: st["player_fill"] if c == "EGY" else st["palette"][color_idx.get(c, 0) % 7]
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height:.0f}" width="{width}" height="{height:.0f}">',
           f'<rect width="{width}" height="{height:.0f}" fill="{st["sea"]}"/>']
    for code, o in outlines.items():
        out.append(f'<path d="{path_d(o)}" fill="{fill(code)}"/>')
    for code, pg in provs:
        out.append(f'<path d="{path_d(pg)}" fill="{fill(code)}" stroke="{st["prov"]}" stroke-opacity="{st["prov_op"]}" stroke-width="0.8"/>')
    for code, o in outlines.items():
        if code == "EGY":
            continue
        out.append(f'<path d="{path_d(o)}" fill="none" stroke="{st["border"]}" stroke-opacity="{st["border_op"]}" stroke-width="{st["border_w"]}"/>')
    out.append(f'<path d="{path_d(outlines["EGY"])}" fill="none" stroke="{st["player_edge"]}" stroke-width="{st["player_w"]}"/>')
    for code, (name, (lon, lat)) in LABELS.items():
        (x,), (y,) = proj([lon], [lat])
        size = 34 if code == "EGY" else 27
        out.append(f'<text x="{x:.0f}" y="{y:.0f}" font-family="{FONT}" font-size="{size}" font-weight="700" fill="{st["label"]}" '
                   f'stroke="{st["halo"]}" stroke-width="5" stroke-opacity="0.85" paint-order="stroke" text-anchor="middle">{name}</text>')
    for name, lon, lat in CITIES:
        (x,), (y,) = proj([lon], [lat])
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="5" fill="{st["city"]}" stroke="{st["halo"]}" stroke-width="2"/>')
        out.append(f'<text x="{x - 10:.0f}" y="{y + 7:.0f}" font-family="{FONT}" font-size="21" font-weight="600" fill="{st["city"]}" '
                   f'stroke="{st["halo"]}" stroke-width="4" stroke-opacity="0.8" paint-order="stroke" text-anchor="start">{name}</text>')
    out.append(f'<rect x="0" y="0" width="{width}" height="64" fill="#000000" fill-opacity="0.55"/>')
    out.append(f'<text x="{width - 28}" y="44" font-family="{FONT}" font-size="32" font-weight="700" fill="#FFFFFF" text-anchor="end">{st["title"]}</text>')
    out.append("</svg>")
    (OUT / f"style_{key}.svg").write_text("".join(out), encoding="utf-8")
    print(key, (OUT / f"style_{key}.svg").stat().st_size)
