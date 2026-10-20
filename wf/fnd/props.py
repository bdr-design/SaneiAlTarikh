import sys, json
d=json.load(open(sys.argv[1]))
f=d["features"]
keys=sorted(f[0]["properties"].keys())
print(len(keys), [k for k in keys if k.lower().startswith("name")][:40])
ar=sum(1 for x in f if (x["properties"].get("name_ar") or "").strip())
print("name_ar filled", ar, "of", len(f))
for x in f[:3]: print(x["properties"].get("name"), "|", x["properties"].get("name_ar"), "|", x["properties"].get("adm1_code"), x["properties"].get("ne_id"))
