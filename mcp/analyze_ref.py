from PIL import Image
from collections import Counter

im = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('RGB')
w, h = im.size
px = im.load()
print('size', im.size)

c = Counter()
for y in range(600, 1300, 3):
    for x in range(60, 660, 3):
        c[px[x, y]] += 1
print('top colors resume area:', c.most_common(8))

for y in [500, 520, 545, 561, 580, 600, 612, 700, 755, 1065, 1170, 1230, 1300, 1320, 1400]:
    row = [px[x, y] for x in range(w)]
    segs = []
    cur = row[0]
    start = 0
    for x in range(1, w):
        if sum(abs(row[x][i] - cur[i]) for i in range(3)) > 40:
            if x - start > 6:
                segs.append((start, x, cur))
            cur = row[x]
            start = x
    segs.append((start, w, cur))
    print(y, [(s, e, col) for s, e, col in segs if e - s > 8][:12])

# Column extent of non-background (text/dark) pixels per band
def content_bounds(y0, y1):
    minx, maxx, miny, maxy = 10**9, -1, 10**9, -1
    for y in range(y0, y1):
        for x in range(w):
            r, g, b = px[x, y]
            if r < 150 and g < 150 and b < 150:
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)
    return (minx, maxx, miny, maxy)

print('header band content:', content_bounds(545, 600))
print('section head content:', content_bounds(605, 625))
print('body content:', content_bounds(760, 900))
EOF = None
