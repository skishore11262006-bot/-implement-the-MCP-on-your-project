from PIL import Image
import os

im = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('RGB')
out = r'C:\Users\ELCOT\AppData\Local\Temp\opencode\crops'
os.makedirs(out, exist_ok=True)
regions = {
    'top': (0, 60, 717, 495),
    'header': (60, 495, 655, 640),
    'mid1': (60, 640, 655, 900),
    'mid2': (60, 900, 655, 1160),
    'bottom': (60, 1160, 655, 1300),
    'below': (0, 1300, 717, 1600),
}
for name, box in regions.items():
    im.crop(box).save(os.path.join(out, name + '.png'))
    print(name, box)

# saturation analysis: find strongly colored pixels
from collections import Counter
px = im.load()
w, h = im.size
c = Counter()
for y in range(495, 1300, 2):
    for x in range(68, 644, 2):
        r, g, b = px[x, y]
        mx, mn = max(r, g, b), min(r, g, b)
        if mx - mn > 45 and mx < 250:
            c[(r // 40 * 40, g // 40 * 40, b // 40 * 40)] += 1
print('colored pixels buckets:', c.most_common(12))
