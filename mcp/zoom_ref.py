from PIL import Image

im = Image.open(r'C:\Users\ELCOT\Downloads\WhatsApp Image 2026-10-19 at 5.09.07 PM.jpeg').convert('L')
px = im.load()
w, h = im.size

def zoom(y0, y1, x0=60, x1=660, step=4):
    print(f'=== region y={y0}-{y1}, x={x0}-{x1} (each char= {step}x{step}px) ===')
    chars = ' .:-=+*#%@'
    for y in range(y0, y1, step):
        line = ''
        for x in range(x0, x1, step):
            # average block
            acc = 0; n = 0
            for dy in range(step):
                for dx in range(step):
                    if y+dy < h and x+dx < w:
                        acc += px[x+dx, y+dy]; n += 1
            v = acc // max(1, n)
            line += chars[min(9, (255 - v) * 10 // 256)]
        print(f'{y:4d} {line}')

zoom(495, 640)
zoom(1055, 1165)
zoom(1165, 1300)
