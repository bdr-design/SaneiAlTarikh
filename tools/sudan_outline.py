"""Build design/screen28/A/_build/sudan.json: the tapped country's outline for screen 28 (Sudan on 1 January 2011, before
South Sudan's independence on 9 July 2011: Natural Earth's SDN and SDS as one, as tools/mapgen.py makes the 2011 maps),
clipped to the MENA base's box (lon 5 to 62, lat 10 to 44) and projected into its Miller space (1688 wide), the same
projector as tools/mapgen.py. Writes d (the path), box (its bounds) and north (the country's part from its northern edge
down to 15° N: the map's focus on screen 28, Khartoum and its name included); sdn_only is Sudan without the south (as
after 9 July 2011), only for the checker's plant of that defect.
Usage: python3 -I tools/sudan_outline.py <ne_10m_admin_0_countries.geojson> <out sudan.json>"""
import json
import math
import sys

from shapely.geometry import shape, box
from shapely.ops import unary_union, transform

SRC, OUT = sys.argv[1:3]
LON0, LON1, LAT0, LAT1, WIDTH = 5, 62, 10, 44, 1688


def miller(lon, lat):
    return math.radians(lon), 1.25 * math.log(math.tan(math.pi / 4 + 0.4 * math.radians(lat)))


X0, YB = miller(LON0, LAT0)
X1, YT = miller(LON1, LAT1)
K = WIDTH / (X1 - X0)


def proj(xs, ys, zs=None):
    px, py = zip(*(miller(lon, lat) for lon, lat in zip(xs, ys)))
    return [(x - X0) * K for x in px], [(YT - y) * K for y in py]


fs = json.load(open(SRC))['features']


def outline(codes):
    g = unary_union([shape(f['geometry']) for f in fs if f['properties'].get('ADM0_A3') in codes]).intersection(box(LON0, LAT0, LON1, LAT1))
    p = transform(proj, g).simplify(0.6, preserve_topology=True)
    polys = [p] if p.geom_type == 'Polygon' else list(p.geoms)
    return g, p, ''.join('M' + 'L'.join('%.1f,%.1f' % c for c in list(q.exterior.coords)[:-1]) + 'Z' for q in polys if q.area > 4)


g, p, d = outline(('SDN', 'SDS'))
polys = [p] if p.geom_type == 'Polygon' else list(p.geoms)
x0, y0, x1, y1 = p.bounds
n15 = (YT - miller(0, 15)[1]) * K
nb = p.intersection(box(x0 - 1, y0 - 1, x1 + 1, n15)).bounds
json.dump({'d': d, 'box': dict(zip(('x0', 'y0', 'x1', 'y1'), (x0, y0, x1, y1))),
           'north': dict(zip(('x0', 'y0', 'x1', 'y1'), nb[:3] + (n15,))), 'sdn_only': outline(('SDN',))[2]}, open(OUT, 'w'), indent=1)
print('area deg2', round(g.area, 3), 'bounds', [round(v, 1) for v in p.bounds], 'north', [round(v, 1) for v in nb[:3] + (n15,)], 'rings', len(polys), 'chars', len(d))
