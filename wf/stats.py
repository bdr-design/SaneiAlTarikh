import sys, json, time, math
t=time.time()
d=json.load(open(sys.argv[1]))
print("parse s", round(time.time()-t,2))
feats=d["features"]
print("features", len(feats))
def rings(geom):
    if geom is None: return []
    if geom["type"]=="Polygon": return [geom["coordinates"]]
    if geom["type"]=="MultiPolygon": return geom["coordinates"]
    return []
nverts=0; npolys=0; nholes=0; nrings=0
allpolys=[]
for f in feats:
    for poly in rings(f["geometry"]):
        npolys+=1
        for i,r in enumerate(poly):
            nrings+=1
            if i>0: nholes+=1
            nverts+=len(r)-1
        allpolys.append(poly)
print("polygons(parts)",npolys,"rings",nrings,"holes",nholes,"vertices",nverts)
print("approx triangles", nverts - 2*npolys + 2*nholes)
# unique edges (shared borders) at full res
edges={}
for poly in allpolys:
    for r in poly:
        for a,b in zip(r,r[1:]):
            ka=(round(a[0],6),round(a[1],6)); kb=(round(b[0],6),round(b[1],6))
            k=(ka,kb) if ka<kb else (kb,ka)
            edges[k]=edges.get(k,0)+1
shared=sum(1 for v in edges.values() if v>=2)
print("unique edges",len(edges),"shared(interior) edges",shared,"coast/outer edges",len(edges)-shared)
# Douglas-Peucker per ring (in degrees, approximate)
def dp(pts,eps):
    if len(pts)<3: return pts
    stack=[(0,len(pts)-1)]; keep=[False]*len(pts); keep[0]=keep[-1]=True
    while stack:
        s,e=stack.pop()
        ax,ay=pts[s]; bx,by=pts[e]; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy)
        best=-1; bi=-1
        for i in range(s+1,e):
            px,py=pts[i]
            if L==0: dist=math.hypot(px-ax,py-ay)
            else: dist=abs(dy*px-dx*py+bx*ay-by*ax)/L
            if dist>best: best=dist; bi=i
        if best>eps and bi>0:
            keep[bi]=True; stack.append((s,bi)); stack.append((bi,e))
    return [p for p,k in zip(pts,keep) if k]
for eps_km in (0.5,2,5,10):
    eps=eps_km/111.0
    tv=0; tp=0
    for poly in allpolys:
        r=poly[0]
        s=dp(r,eps)
        if len(s)>=4:
            tv+=len(s)-1; tp+=1
            for h in poly[1:]:
                sh=dp(h,eps)
                if len(sh)>=4: tv+=len(sh)-1
    print(f"DP eps {eps_km} km: vertices {tv}, polygon parts kept {tp}")
