import sys, json, time, collections
t=time.time()
d=json.load(open(sys.argv[1]))
feats=d["features"]
nv=0; parts=0
by=collections.Counter()
for f in feats:
    g=f["geometry"]; p=f["properties"]
    by[p.get("adm0_a3") or p.get("ADM0_A3")]+=1
    if not g: continue
    polys=[g["coordinates"]] if g["type"]=="Polygon" else g["coordinates"]
    for poly in polys:
        parts+=1
        for r in poly: nv+=len(r)-1
print("features",len(feats),"parts",parts,"vertices",nv,"countries",len(by),"parse+scan s",round(time.time()-t,2))
print("top", by.most_common(8))
print("keys sample", sorted(feats[0]["properties"].keys())[:25])
