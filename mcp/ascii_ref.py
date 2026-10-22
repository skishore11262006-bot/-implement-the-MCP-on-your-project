from PIL import Image

im = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('L')
w, h = im.size
# ASCII brightness map: 100 cols
cols, rows = 90, 100
small = im.resize((cols, rows))
chars = ' .:-=+*#%@'
px = small.load()
print('ASCII map (dark=space, light=@):')
for y in range(rows):
    line = ''.join(chars[min(9, (255 - px[x, y]) * 10 // 256)] for x in range(cols))
    print(f'{y*h//rows:4d} {line}')

# check light pixels in top region
im2 = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('RGB')
p2 = im2.load()
light = 0
for y in range(70, 490, 2):
    for x in range(0, 717, 2):
        r, g, b = p2[x, y]
        if r > 190 and g > 190 and b > 190:
            light += 1
print('light pixels in top region:', light)
