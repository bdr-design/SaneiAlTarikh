import sys, json, math, heapq, runpy
import numpy as np
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
import shapely
R=6371.0088
d=json.load(open(sys.argv[1])); g=open(sys.argv[2]).read().split("\n"); pp=json.load(open(sys.argv[3])); a0=json.load(open(sys.argv[4]))
N,E=map(int,g[0].split())
edges=[tuple(map(int,l.split())) for l in g[1+N:1+N+E] if l.strip()]
feats=d["features"]
def ea(c):
    c=np.asarray(c); return np.column_stack([R*np.radians(c[:,0]), R*np.sin(np.radians(c[:,1]))])
geoms=[]; area=[]; cc=[]
for f in feats:
    geom=shape(f["geometry"]) if f["geometry"] else None
    geoms.append(geom); area.append(shapely.transform(geom, ea).area if geom is not None else 0.0)
    cc.append(f["properties"].get("adm0_a3"))
area=np.array(area)
cpopc={}
for f in a0["features"]:
    p=f["properties"]; cpopc[p.get("ADM0_A3")]=p.get("POP_EST") or 0
tree=STRtree([gg if gg is not None else Point(0,0).buffer(1e-9) for gg in geoms])
cpop=np.zeros(N); prot=np.zeros(N,bool)
for f in pp["features"]:
    p=f["properties"]; pt=Point(p["LONGITUDE"],p["LATITUDE"])
    idx=tree.query(pt, predicate="intersects")
    if len(idx)==0: continue
    i=int(idx[0]); pm=p.get("POP_MAX") or 0
    cpop[i]+=pm
    if pm>=1_000_000 or p.get("ADM0CAP")==1: prot[i]=True
# rural remainder by area share
from collections import defaultdict
ca=defaultdict(float); cs=defaultdict(float)
for i in range(N): ca[cc[i]]+=area[i]; cs[cc[i]]+=cpop[i]
pop=np.array([cpop[i]+max(0.0,cpopc.get(cc[i],0)-cs[cc[i]])*(area[i]/ca[cc[i]] if ca[cc[i]]>0 else 0) for i in range(N)])
print("world pop est %.2e"%pop.sum())
adj=[set() for _ in range(N)]
for a,b in edges:
    if cc[a]==cc[b]: adj[a].add(b); adj[b].add(a)
def run(scale_area=6000.0, scale_pop=1.5e6):
    s=area/scale_area + pop/scale_pop
    ar=area.copy(); pq=pop.copy(); nb=[set(x) for x in adj]; alive=[True]*N; pr=prot.copy()
    h=[(s[i],i) for i in range(N)]; heapq.heapify(h)
    while h:
        v,i=heapq.heappop(h)
        if not alive[i] or v!=s[i] or v>=1 or pr[i]: continue
        cand=[j for j in nb[i] if alive[j]]
        if not cand: continue
        j=min(cand,key=lambda k:s[k])
        alive[i]=False; ar[j]+=ar[i]; pq[j]+=pq[i]; s[j]+=s[i]
        for k in nb[i]:
            if k!=j and alive[k]: nb[j].add(k); nb[k].discard(i); nb[k].add(j)
        nb[j].discard(i); heapq.heappush(h,(s[j],j))
    ids=[i for i in range(N) if alive[i]]
    n_split=sum(max(1,math.ceil(ar[i]/(400000 if pq[i]<200000 else 200000))) for i in ids)
    return len(ids), n_split
print("full rule (area/6000 + pop/1.5M, protected cities/capitals, splits):", run())
