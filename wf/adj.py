import sys, json
d=json.load(open(sys.argv[1]))
feats=d["features"]
edge_owner={}
pairs=set()
def rings(g):
    if g is None: return []
    return [g["coordinates"]] if g["type"]=="Polygon" else g["coordinates"]
for fi,f in enumerate(feats):
    for poly in rings(f["geometry"]):
        for r in poly:
            for a,b in zip(r,r[1:]):
                ka=(round(a[0],5),round(a[1],5)); kb=(round(b[0],5),round(b[1],5))
                k=(ka,kb) if ka<kb else (kb,ka)
                o=edge_owner.get(k)
                if o is None: edge_owner[k]=fi
                elif o!=fi: pairs.add((min(o,fi),max(o,fi)))
# per-feature centroid (approx)
cent=[]
for f in feats:
    xs=[];ys=[]
    for poly in rings(f["geometry"]):
        for p in poly[0]: xs.append(p[0]); ys.append(p[1])
    cent.append((sum(xs)/len(xs), sum(ys)/len(ys)) if xs else (0,0))
deg=[0]*len(feats)
for a,b in pairs: deg[a]+=1; deg[b]+=1
iso=sum(1 for x in deg if x==0)
print("nodes",len(feats),"adjacent pairs",len(pairs),"avg degree",round(2*len(pairs)/len(feats),2),"isolated(no land neighbor)",iso,"max degree",max(deg))
countries=set(f["properties"].get("adm0_a3") for f in feats)
print("distinct adm0_a3",len(countries))
with open(sys.argv[2],"w") as o:
    o.write(f"{len(feats)} {len(pairs)}\n")
    for c in cent: o.write(f"{c[0]:.4f} {c[1]:.4f}\n")
    for a,b in sorted(pairs): o.write(f"{a} {b}\n")
