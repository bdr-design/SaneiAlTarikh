"""Make a map-mode overlay (§6.6) for the MENA mockup map: every admin-1 province filled by its band, translucent over the
satellite base (fill-opacity 0.55, the doc's upper bound 0.35-0.55), in the projection of design/shared/map_mena_d1.jpg
(Miller, lon 5..62, lat 10..44, 1688 px wide). The palette is sequential and colour-blind safe: five bands that only rise
in lightness, dark purple to yellow (inferno). Values are illustrative (1 January 2011); Egypt's governorates follow screen 8.
Mode «security» (الأمن): unrest 0-100 with §5.2's thresholds as band edges (25, 40 protests, 60 mass protests, 75
insurgency).
Usage: python3 -I tools/mapmode.py <Natural Earth GeoJSON dir> <out.svg>   (needs shapely; NE is public domain)"""
import hashlib
import json
import math
import sys
from pathlib import Path

from shapely.geometry import shape, box
from shapely.ops import transform

NE, OUT = Path(sys.argv[1]), Path(sys.argv[2])
LON0, LON1, LAT0, LAT1, WIDTH = 5.0, 62.0, 10.0, 44.0, 1688
BANDS = [(25, '#320A5E'), (40, '#781C6D'), (60, '#BC3754'), (75, '#ED6925'), (101, '#FBB61A')]   # inferno: lightness only rises
# illustrative national unrest, 1 January 2011 (Egypt's national 45 from screen 8; Tunisia already high)
NATION = {'TUN': 78, 'EGY': 45, 'LBY': 38, 'YEM': 62, 'SYR': 34, 'BHR': 44, 'JOR': 36, 'DZA': 46, 'MAR': 33, 'IRQ': 55,
          'SDN': 52, 'SDS': 58, 'IRN': 40, 'SAU': 18, 'ARE': 8, 'QAT': 6, 'KWT': 15, 'OMN': 24, 'TUR': 26, 'ISR': 22, 'PSX': 55,
          'LBN': 35, 'GRC': 42, 'ITA': 20, 'ETH': 40, 'ERI': 30, 'TCD': 45, 'NER': 40, 'CYP': 15, 'MLT': 10, 'ALB': 30,
          'MKD': 28, 'BGR': 25, 'ARM': 30, 'AZE': 32, 'GEO': 34, 'TKM': 20, 'AFG': 74, 'PAK': 66, 'DJI': 35, 'SOM': 82, 'SOL': 60,
          'CYN': 20, 'MNE': 22, 'SRB': 28, 'KOS': 35, 'BIH': 30, 'HRV': 18, 'SVN': 10, 'ROU': 22, 'UKR': 30, 'RUS': 30,
          'KAZ': 22, 'UZB': 30, 'TJK': 35, 'MRT': 40, 'MLI': 42, 'NGA': 55, 'CMR': 40, 'CAF': 65, 'SAH': 40, 'ESP': 18, 'FRA': 20,
          'CHE': 8, 'AUT': 8, 'HUN': 20, 'SVK': 15, 'POL': 14, 'MDA': 28, 'CZE': 12, 'DEU': 10}
# screen 8's governorates (unrest tab) and its «21 محافظة أخرى بين 32 و48»
EGYPT = {'Al Qahirah': 64, 'As Suways': 63, 'Al Iskandariyah': 61, 'Al Gharbiyah': 58, 'Al Jizah': 55, 'Bur Sa`id': 52,
         'Al Isma`iliyah': 50, "Shamal Sina'": 49}


def miller(lon, lat):
    lat = max(min(lat, 84.0), -58.0)
    return math.radians(lon), 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))


X0, YB = miller(LON0, LAT0)
X1, YT = miller(LON1, LAT1)
S = WIDTH / (X1 - X0)
H = round((YT - YB) * S)


def proj(xs, ys, zs=None):
    out = [miller(x, y) for x, y in zip(xs, ys)]
    return [(x - X0) * S for x, _ in out], [(YT - y) * S for _, y in out]


def rnd(key):
    return int(hashlib.sha1(key.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def value(p):
    a3, nm = p['adm0_a3'], p.get('name') or ''
    if a3 == 'EGY':
        return EGYPT.get(nm, 32 + round(rnd(nm) * 16))
    base = NATION.get(a3)
    return None if base is None else max(0, min(100, round(base + (rnd(p['adm1_code']) - 0.5) * 20)))


def band(v):
    return next(c for edge, c in BANDS if v < edge)


feats = json.load(open(NE / 'ne_10m_admin_1_states_provinces.geojson'))['features']
frame = box(0, 0, WIDTH, H).buffer(4)
out = []
for f in feats:
    p = f['properties']
    v = value(p)
    if v is None:
        continue
    g = transform(proj, shape(f['geometry'])).intersection(frame).simplify(0.6)
    if g.is_empty:
        continue
    polys = [g] if g.geom_type == 'Polygon' else [x for x in getattr(g, 'geoms', []) if x.geom_type == 'Polygon']
    d = ''.join('M' + 'L'.join(f'{x:.0f},{y:.0f}' for x, y in poly.exterior.coords) + 'Z' for poly in polys if poly.area > 1)
    if d:
        out.append(f'<path d="{d}" fill="{band(v)}"/>')
OUT.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {H}" width="{WIDTH}" height="{H}"><g fill-opacity="0.55">' + ''.join(out) + '</g></svg>', encoding='utf-8')
print(OUT, len(out), 'provinces,', H, 'px high')
