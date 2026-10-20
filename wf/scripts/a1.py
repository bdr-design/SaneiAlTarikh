import json, sys, collections
d = json.load(open(sys.argv[1]))
f = d['features']
print('features', len(f))
p = f[0]['properties']
print('fields', len(p)); print(sorted(p.keys()))
cnt = collections.Counter(x['properties'].get('adm0_a3') for x in f)
print('countries', len(cnt))
ar = sum(1 for x in f if x['properties'].get('name_ar'))
print('with name_ar', ar)
wd = sum(1 for x in f if x['properties'].get('wikidataid'))
print('with wikidataid', wd)
pts = 0
for x in f:
    g = x['geometry']
    def c(a):
        if isinstance(a[0], (int,float)): return 1
        return sum(c(b) for b in a)
    pts += c(g['coordinates'])
print('total vertices', pts)
for cc in ['DEU','YEM','SDN','SSD','ETH','ERI','RUS','UKR','SRB','KOS','CZE','SVK','NAM','ZAF','IDN','TLS','ISR','PSX','SYR','MAR','SAH','CHN','HKG','MAC','FSM','MHL','PLW','MNP','IND','PAK','NGA','CMR','TCD','LBY','EGY','CYP','CYN','SOM','SOL','GEO','MDA','AZE']:
    names = [x['properties']['name'] for x in f if x['properties'].get('adm0_a3')==cc]
    print(cc, len(names), names[:40])
