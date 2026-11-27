"""Generates the original Invoice Jot app icon and splash images (no default Capacitor art)."""
from PIL import Image, ImageDraw, ImageFilter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GREEN = (31, 111, 92)
GREEN_DARK = (20, 78, 64)
PAPER = (255, 253, 247)
LINE = (203, 213, 207)
ORANGE = (245, 158, 11)

def icon(size=1024):
    S = size * 4
    img = Image.new('RGB', (S, S), GREEN)
    d = ImageDraw.Draw(img)
    # vertical gradient
    for y in range(S):
        t = y / S
        c = tuple(int(GREEN[i] * (1 - t) + GREEN_DARK[i] * t) for i in range(3))
        d.line([(0, y), (S, y)], fill=c)
    # shadow
    sh = Image.new('L', (S, S), 0)
    sd = ImageDraw.Draw(sh)
    px, py, pw, ph = int(S*0.25), int(S*0.17), int(S*0.50), int(S*0.66)
    sd.rounded_rectangle([px+S*0.015, py+S*0.03, px+pw+S*0.015, py+ph+S*0.03], radius=int(S*0.05), fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(S*0.02))
    img.paste((8, 40, 32), mask=sh)
    # paper with folded corner
    fold = int(S*0.12)
    d.rounded_rectangle([px, py, px+pw, py+ph], radius=int(S*0.05), fill=PAPER)
    bgc = tuple(int(GREEN[i] * (1 - py / S) + GREEN_DARK[i] * (py / S)) for i in range(3))
    d.polygon([(px+pw-fold, py-2), (px+pw+2, py-2), (px+pw+2, py+fold)], fill=bgc)
    d.polygon([(px+pw-fold, py), (px+pw-fold, py+fold), (px+pw, py+fold)], fill=(222, 232, 226))
    # text lines
    lw = int(S*0.03)
    lx = px + int(S*0.07)
    for i, frac in enumerate([0.62, 0.78, 0.70, 0.50]):
        y = py + int(S*0.17) + i * int(S*0.085)
        d.rounded_rectangle([lx, y, lx + int((pw - S*0.14) * frac), y + lw], radius=lw//2, fill=LINE)
    # total bar
    ty = py + ph - int(S*0.15)
    d.rounded_rectangle([lx, ty, px + pw - int(S*0.07), ty + int(S*0.07)], radius=int(S*0.02), fill=GREEN)
    # jot check mark (orange) crossing the corner of the page
    cw = int(S*0.075)
    pts = [(px + pw*0.52, py + ph*0.80), (px + pw*0.74, py + ph*1.00), (px + pw*1.22, py + ph*0.50)]
    pts = [(int(x), int(y)) for x, y in pts]
    d.line(pts, fill=(255, 255, 255), width=cw + int(S*0.04), joint='curve')
    for x, y in pts:
        r = (cw + int(S*0.04)) // 2
        d.ellipse([x-r, y-r, x+r, y+r], fill=(255, 255, 255))
    d.line(pts, fill=ORANGE, width=cw, joint='curve')
    for x, y in pts:
        r = cw // 2
        d.ellipse([x-r, y-r, x+r, y+r], fill=ORANGE)
    return img.resize((size, size), Image.LANCZOS)

def splash(size=2732):
    img = Image.new('RGB', (size, size), (246, 244, 239))
    ic = icon(512)
    m = Image.new('L', (512, 512), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 511, 511], radius=115, fill=255)
    img.paste(ic, ((size-512)//2, (size-512)//2), m)
    return img

if __name__ == '__main__':
    appicon = os.path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
    splashset = os.path.join(ROOT, 'ios/App/App/Assets.xcassets/Splash.imageset')
    i = icon(1024)
    i.save(os.path.join(appicon, 'AppIcon-512@2x.png'))
    i.save(os.path.join(ROOT, 'design/invoice-jot-icon-1024.png'))
    i.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'mobile/public/icon.png'))
    icons = os.path.join(ROOT, 'public/icons')
    for n in [192, 512]:
        i.resize((n, n), Image.LANCZOS).save(os.path.join(icons, f'icon-{n}.png'))
        i.resize((n, n), Image.LANCZOS).save(os.path.join(icons, f'icon-{n}-maskable.png'))
    i.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'apple-touch-icon.png'))
    s = splash()
    for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
        s.save(os.path.join(splashset, n))
    print('ok')
