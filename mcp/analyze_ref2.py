from PIL import Image
from collections import Counter

im = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('RGB')
w, h = im.size
px = im.load()

# 1. Is there a sidebar / colored band? sample columns across resume area
print('--- column profile (avg color) at y 600-1250 ---')
for x in range(60, 660, 20):
    acc = [0, 0, 0]
    n = 0
    for y in range(600, 1250, 5):
        r, g, b = px[x, y]
        acc[0] += r; acc[1] += g; acc[2] += b; n += 1
    print(x, tuple(a // n for a in acc))

# 2. heading colors - darkest pixels in heading boxes
heads = {
    'PROFESSIONAL': (105, 610, 186, 620),
    'EDUCATION': (102, 701, 167, 711),
    'EXPERIENCE': (101, 753, 168, 763),
    'SKILLS': (88, 1063, 127, 1074),
    'CERTIFICATIONS': (84, 1169, 181, 1182),
    'ACHIEVEMENTS': (82, 1229, 174, 1242),
    'NAME': (304, 561, 374, 575),
    'PHONE': (275, 579, 365, 588),
    'BODY1': (122, 799, 550, 807),
    'DATE1': (482, 715, 581, 724),
    'ROLE1': (144, 771, 315, 781),
}
print('--- heading pixel colors (most common non-bg) ---')
for k, (x0, y0, x1, y1) in heads.items():
    c = Counter()
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b = px[x, y]
            if r + g + b < 560:  # not background
                c[(r // 30 * 30, g // 30 * 30, b // 30 * 30)] += 1
    print(k, c.most_common(4))

# 3. leftmost text pixel per text row band (detect margins/columns)
print('--- left/right text bounds per 10px band ---')
for y0 in range(545, 1290, 10):
    minx, maxx = 10**9, -1
    for y in range(y0, y0 + 10):
        for x in range(68, 645):
            r, g, b = px[x, y]
            if r + g + b < 480:
                minx = min(minx, x); maxx = max(maxx, x)
    if maxx > 0:
        print(y0, minx, maxx)
