from PIL import Image

im = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('RGB')
px = im.load()
w, h = im.size

def is_bg(c):
    r, g, b = c
    return r > 225 and g > 222 and b > 222

# vertical bar check: fraction of non-bg rows per column in top-section band
print('--- column non-bg fraction (y615-1050), x=68..150 ---')
for x in range(68, 151, 4):
    n = 0; tot = 0
    for y in range(615, 1050, 3):
        tot += 1
        if not is_bg(px[x, y]):
            n += 1
    print(x, round(n / tot, 2))

# horizontal rules: fraction non-bg per row across content width
print('--- rows with >80% non-bg (candidate rules), y=495..1300 ---')
for y in range(495, 1300):
    n = 0; tot = 0
    for x in range(90, 620, 4):
        tot += 1
        if not is_bg(px[x, y]):
            n += 1
    if n / tot > 0.75:
        print(y, round(n / tot, 2))

# text left edges per section band, precise
print('--- precise left edge per band (dark text r+g+b<450) ---')
bands = [('title', 508, 535), ('name', 555, 577), ('contact', 577, 592),
         ('PROF', 605, 622), ('prof-body', 625, 690), ('EDU', 697, 714),
         ('edu-body', 715, 745), ('EXP', 750, 766), ('exp-body', 768, 1050),
         ('SKILLS', 1058, 1078), ('skills-body', 1080, 1158),
         ('CERTS', 1165, 1184), ('certs-body', 1185, 1222),
         ('ACH', 1226, 1244), ('ach-body', 1246, 1290)]
for name, y0, y1 in bands:
    minx, maxx = 10**9, -1
    for y in range(y0, y1):
        for x in range(70, 640):
            r, g, b = px[x, y]
            if r + g + b < 450:
                minx = min(minx, x); maxx = max(maxx, x)
    print(f'{name:12s} left={minx} right={maxx}')

# skills columns: left edges of dark runs within skills-body
print('--- skills columns (x-run clusters, y1080-1158) ---')
cols = {}
for x in range(70, 640):
    cnt = 0
    for y in range(1080, 1158):
        r, g, b = px[x, y]
        if r + g + b < 500:
            cnt += 1
    if cnt > 0:
        cols[x] = cnt
# find gaps
xs = sorted(cols)
groups = []
cur = [xs[0]]
for x in xs[1:]:
    if x - cur[-1] <= 25:
        cur.append(x)
    else:
        groups.append((cur[0], cur[-1])); cur = [x]
groups.append((cur[0], cur[-1]))
print(groups)
