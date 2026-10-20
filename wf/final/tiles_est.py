import json, math, sys
from shapely.geometry import shape, box
from shapely.ops import unary_union
from shapely.prepared import prep
d = json.load(open(sys.argv[1]))
geoms = [shape(f['geometry']) for f in d['features']]
land = unary_union(geoms)
def my(lat): return 1.25*math.log(math.tan(math.pi/4+0.4*math.radians(lat)))
def inv(y): return math.degrees(2.5*math.atan(math.exp(0.8*y))-0.625*math.pi)
top, bot = my(84), my(-60)
W = 2*math.pi
print("height/width", (top-bot)/W)
pl = prep(land)
for lvl, width in [(2,8192),(3,16384),(4,32768)]:
    nx = width//256
    ny = math.ceil((top-bot)/W*width/256)
    tot=0; landt=0
    for j in range(ny):
        y0 = top - j*256*W/width; y1 = top-(j+1)*256*W/width
        la0, la1 = inv(max(y1,bot)), inv(y0)
        for i in range(nx):
            lo0 = -180 + i*360/nx; lo1 = lo0+360/nx
            tot+=1
            if pl.intersects(box(lo0, la0, lo1, la1)): landt+=1
    for name, bpt in [("ASTC8x8",16384),("ASTC6x6",43*43*16),("ASTC10x10",26*26*16)]:
        pass
    print(f"I{lvl} width {width}px km/px@eq {40075/width:.2f} tiles {tot} land-tiles {landt} ({landt/tot:.0%}) "
          f"ASTC8x8 {landt*16384/1e6:.1f}MB ASTC6x6 {landt*43*43*16/1e6:.1f}MB ASTC10x10 {landt*26*26*16/1e6:.1f}MB all-tiles8x8 {tot*16384/1e6:.1f}MB")
