# Estimate shipped map size per LOD with lightness-first encoding:
# Miller projection (km), Douglas-Peucker per polygon, 8-byte vertices (int16 x,y chunk-local + uint16 province id + uint16 flags),
# uint16 indices per chunk, triangles ~= vertices - 2 + 2*holes per polygon part. Border segments: unique edges.
import json, sys, math, zlib, time
import numpy as np
import shapely
from shapely.geometry import shape
src = sys.argv[1]
t0=time.time()
fc = json.load(open(src))
R=6371.0
def miller(lon, lat):
    x = R*np.radians(lon)
    y = R*1.25*np.log(np.tan(np.pi/4 + 0.4*np.radians(np.clip(lat,-85,85))))
    return x, y
geoms=[]
for f in fc['features']:
    g = shape(f['geometry'])
    geoms.append(g)
arr = np.array(geoms, dtype=object)
proj = shapely.transform(arr, lambda c: np.column_stack(miller(c[:,0], c[:,1])))
print('load+project s', round(time.time()-t0,2))
CH = 512.0  # chunk size km -> int16 step = 512/65536 km = 7.8 m
for tol in [0.5, 1.0, 2.0, 5.0, 10.0]:
    simp = shapely.simplify(proj, tol, preserve_topology=True)
    nverts=0; ntris=0; parts=0; edges={}
    vbuf=[]; ibuf_tris=0
    for pid,g in enumerate(simp):
        if g.is_empty: continue
        polys = [g] if g.geom_type=='Polygon' else list(g.geoms)
        for p in polys:
            if p.is_empty or p.area < (tol*tol*0.5): continue
            parts+=1
            rings=[p.exterior]+list(p.interiors)
            nv=0
            for r in rings:
                c=np.asarray(r.coords)[:-1]
                nv+=len(c)
                q=np.round(c/0.5).astype(np.int64)  # 0.5 km grid key for edge dedupe
                for i in range(len(q)):
                    a=tuple(q[i]); b=tuple(q[(i+1)%len(q)])
                    k=(a,b) if a<b else (b,a)
                    edges[k]=edges.get(k,0)+1
                # quantize chunk-local
                ox=np.floor(c[:,0]/CH)*CH; oy=np.floor(c[:,1]/CH)*CH
                qx=np.clip(np.round((c[:,0]-ox)/CH*65535)-32768,-32768,32767).astype(np.int16)
                qy=np.clip(np.round((c[:,1]-oy)/CH*65535)-32768,-32768,32767).astype(np.int16)
                v=np.zeros((len(c),4),dtype=np.int16); v[:,0]=qx; v[:,1]=qy; v[:,2]=np.int16(pid-32768); 
                vbuf.append(v.tobytes())
            nverts+=nv; ntris+= nv-2+2*(len(rings)-1)
    vb=b''.join(vbuf)
    # fake but realistic index buffer: fan-ish local indices (compressibility proxy)
    idx=np.zeros(ntris*3,dtype=np.uint16)
    base=np.arange(ntris,dtype=np.int64)
    idx[0::3]=(base%65535); idx[1::3]=((base+1)%65535); idx[2::3]=((base+2)%65535)
    ib=idx.tobytes()
    nb=len(edges)
    bb=nb*12  # border segment instance: 2x int16x2 endpoints (8B) + 2x uint16 province ids (4B)
    raw=len(vb)+len(ib)+bb
    zv=len(zlib.compress(vb,6)); 
    print(f'tol {tol:>4} km | parts {parts:6d} | verts {nverts:8d} | tris {ntris:8d} | unique edges {nb:8d} | verts {len(vb)/1e6:5.2f} MB idx {len(ib)/1e6:5.2f} MB borders {bb/1e6:5.2f} MB | raw total {raw/1e6:5.2f} MB | verts zlib {zv/1e6:5.2f} MB')
print('total s', round(time.time()-t0,1))
