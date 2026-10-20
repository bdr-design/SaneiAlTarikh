import csv, sys, collections
rows = list(csv.DictReader(open(sys.argv[1], encoding='utf-8')))
print('rows', len(rows))
for lvl in ['ADM0','ADM1','ADM2','ADM3']:
    r = [x for x in rows if x['boundaryType']==lvl]
    c = collections.Counter(x['boundaryLicense'] for x in r)
    print(lvl, len(r), c.most_common())
adm1 = [x for x in rows if x['boundaryType']=='ADM1']
nonby = [ (x['boundaryISO'], x['boundaryLicense'], x['boundarySource'][:40]) for x in adm1 if 'CC BY 4.0' not in x['boundaryLicense'] and 'Public Domain' not in x['boundaryLicense']]
print('ADM1 not CC BY/PD:', nonby)
for iso in ['DEU','YEM','ZAF','NAM','NGA','CMR','TCD','EGY','SDN','ISR','PSE','MAR','ESH','GBR','RUS','CHN','USA','IND']:
    for x in rows:
        if x['boundaryISO']==iso and x['boundaryType'] in ('ADM1','ADM2','ADM3'):
            print(iso, x['boundaryType'], x['admUnitCount'], x['boundaryLicense'], '|', x['boundarySource'][:50], '|', x['boundaryYearRepresented'])
