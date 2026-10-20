import json, sys, os, collections
base = sys.argv[1]
def load(n): return json.load(open(os.path.join(base, n+'.geojson')))['features']
pp = load('ne_10m_populated_places')
n85 = [x for x in pp if (x['properties'].get('POP1985') or 0) > 0]
print('places with POP1985>0:', len(n85))
print('sample', [(x['properties']['NAME'], x['properties']['NAME_AR'], x['properties']['POP1985']) for x in sorted(n85, key=lambda x:-x['properties']['POP1985'])[:8]])
dis = load('ne_10m_admin_0_disputed_areas')
for x in dis:
    p = x['properties']
    if p.get('NAME') in ('Golan Heights','Halayib Triangle','West Bank','Gaza','East Jerusalem','Crimea','W. Sahara','Siachen Glacier','UNDOF Zone','Shebaa Farms','Bir Tawil','S. Sudan','Sudan'):
        print(p.get('NAME'), p.get('SOVEREIGNT'), p.get('ADMIN'), p.get('TYPE'), p.get('NOTE_BRK') or p.get('NOTE_ADM0'))
a1 = load('admin1')
c = collections.Counter(x['properties']['adm0_a3'] for x in a1)
print('countries with 1 unit:', sum(1 for k,v in c.items() if v==1))
print('top:', c.most_common(15))
print('Crimea row:', [(x['properties']['name'], x['properties']['adm0_a3'], x['properties']['FCLASS_UA'], x['properties']['FCLASS_RU'], x['properties']['FCLASS_ISO']) for x in a1 if x['properties']['name'] in ('Crimea','Sevastopol')])
print('NE gadm/check cols sample:', [(x['properties']['name'], x['properties']['gadm_level']) for x in a1[:3]])
