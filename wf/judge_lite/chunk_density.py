# Per-chunk vertex density check: do 16-bit per-chunk indices hold, and what is the worst visible-vertex load?
import json, sys, time
import numpy as np, shapely
from shapely.geometry import shape
fc = json.load(open(sys.argv[1]))
R=6371.0
def miller(lon, lat):
    x = R*np.radians(lon)
    y = R*1.25*np.log(np.tan(np.pi/4 + 0.4*np.radians(np.clip(lat,-85,85))))
    return x, y
arr = np.array([shape(f['geometry']) for f in fc['features']], dtype=object)
proj = shapely.transform(arr, lambda c: np.column_stack(miller(c[:,0], c[:,1])))
x0,y0 = miller(np.array([-180.0]), np.array([-60.0])); x1,y1 = miller(np.array([180.0]), np.array([84.0]))
print('Miller extent km: %.0f x %.0f' % (x1[0]-x0[0], y1[0]-y0[0]))
def run(tol, chunk_km, label):
    simp = shapely.simplify(proj, tol, preserve_topology=True)
    pts=[]
    for g in simp:
        if g.is_empty: continue
        for p in ([g] if g.geom_type=='Polygon' else list(g.geoms)):
            if p.is_empty or p.area < tol*tol*0.5: continue
            for r in [p.exterior]+list(p.interiors):
                pts.append(np.asarray(r.coords)[:-1])
    P=np.vstack(pts)
    cx=np.floor((P[:,0]-x0[0])/chunk_km).astype(int); cy=np.floor((P[:,1]-y0[0])/chunk_km).astype(int)
    key=cx*10000+cy
    _,cnt=np.unique(key,return_counts=True)
    top=np.sort(cnt)[::-1]
    print(f'{label}: tol {tol} km, chunk {chunk_km} km: total verts {len(P)}, nonempty chunks {len(cnt)}, max/chunk {top[0]}, top5 {top[:5].tolist()}, chunks>65535: {(cnt>65535).sum()}')
    return P
# A: L2 1km @1024km, L1 2km @2048km ; C: 0.5km @ 16x8 grid (2502 km x ~?)
t=time.time()
run(1.0,1024,'A-L2'); run(2.0,2048,'A-L1')
P=run(0.5,(x1[0]-x0[0])/16,'C-LOD0.5 16x8 cols')
# B: 8x4 tiles at 0.5 km
run(0.5,(x1[0]-x0[0])/8,'B-LOD3 8-col tiles (square approx)')
print('s', round(time.time()-t,1))
