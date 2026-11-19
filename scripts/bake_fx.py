"""Bake the hero's drop-shadows / depth blur into images, so the browser no longer runs CSS
`filter: drop-shadow()/blur()` on every animation frame (that made the floating ingredients stutter
on phones: GPU draw time ~12ms/frame with CSS filters vs ~3ms without).

Outputs (public/img/hero/fx/):
  <name>.webp            ingredient + soft shadow below it, canvas padded by PAD on every side
  <name>-b<blur>.webp    ingredient blurred + darkened (far "out of focus" layer), same padding, no shadow
  plate-shadow.webp      soft shadow of the plate (shared by all plates; same plate shape)
The JS/CSS enlarge the <img> by the same PAD so the ingredient keeps its on-screen size.

  python scripts/bake_fx.py          (needs: pillow)
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public/img/hero'
OUT = SRC / 'fx'
PAD = 0.25            # padding on each side, × the image's longest side  (keep in sync with src/main.js FX_PAD)

# CSS it replaces: drop-shadow(0 16px 18px rgba(0,0,0,.35)) on items ~100–130 px wide
SHADOW_DY, SHADOW_SIGMA, SHADOW_ALPHA = 0.12, 0.08, 0.35   # × longest side
# CSS it replaces: blur(Npx) brightness(.82) — N px at the item's typical on-screen size
BLURS = {('daun-pandan', 5), ('daun-pandan', 4), ('cili', 1.5), ('timun', 3), ('kacang', 2)}
SIZE_PX = {'daun-pandan': 150, 'cili': 90, 'timun': 70, 'kacang': 55}   # typical on-screen width for those


def padded(im, pad):
    c = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    c.paste(im, (pad, pad))
    return c


def save(im, name):
    im.save(OUT / f'{name}.webp', 'WEBP', quality=86, method=6)


OUT.mkdir(exist_ok=True)
names = ['daun-pandan', 'cili', 'timun', 'kacang', 'ikan-bilis', 'telur', 'ayam', 'udang', 'paru', 'kerang', 'telur-mata', 'sotong']
for n in names:
    im = Image.open(SRC / f'{n}.webp').convert('RGBA')
    L = max(im.size)
    pad = round(PAD * L)
    base = padded(im, pad)
    # shadow: alpha → black, blurred, shifted down
    a = base.getchannel('A').point(lambda v: int(v * SHADOW_ALPHA))
    sh = Image.new('RGBA', base.size, (0, 0, 0, 0))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(SHADOW_SIGMA * L))
    shifted = Image.new('RGBA', base.size, (0, 0, 0, 0))
    shifted.paste(sh, (0, round(SHADOW_DY * L)))
    save(Image.alpha_composite(shifted, base), n)

for n, b in sorted(BLURS):
    im = Image.open(SRC / f'{n}.webp').convert('RGBA')
    L = max(im.size)
    base = padded(im, round(PAD * L))
    sigma = b * L / SIZE_PX[n]              # CSS blur(r): r = gaussian std-dev in CSS px; image px per CSS px = L / on-screen width
    # blur premultiplied colour so edges don't go dark/grey
    r, g, bl, a = base.split()
    pm = Image.merge('RGB', [Image.composite(c, Image.new('L', base.size, 0), a) for c in (r, g, bl)])
    pm = pm.filter(ImageFilter.GaussianBlur(sigma)); a2 = a.filter(ImageFilter.GaussianBlur(sigma))
    px, pa = pm.load(), a2.load()
    out = Image.new('RGBA', base.size)
    po = out.load()
    for y in range(base.height):
        for x in range(base.width):
            al = pa[x, y]
            if al:
                c = px[x, y]
                po[x, y] = (min(255, c[0] * 255 // al), min(255, c[1] * 255 // al), min(255, c[2] * 255 // al), al)
    out = Image.merge('RGBA', [*ImageEnhance.Brightness(out.convert('RGB')).enhance(0.82).split(), out.getchannel('A')])
    out = out.resize((out.width // 2, out.height // 2), Image.LANCZOS)   # already blurred: half size is enough
    save(out, f'{n}-b{str(b).replace(".", "_")}')

# plate shadow, from the plate silhouette (all plates share it). CSS it replaces:
# drop-shadow(0 30px 40px rgba(0,0,0,.45)) on a ~330–520 px wide plate.
pl = Image.open(SRC / 'hidangan-ayam.webp').getchannel('A')
w = 400
pl = pl.resize((w, round(pl.height * w / pl.width)), Image.LANCZOS)
pad = round(PAD * w)
c = Image.new('L', (w + 2 * pad, pl.height + 2 * pad), 0)
c.paste(pl.point(lambda v: int(v * 0.45)), (pad, pad + round(0.075 * w)))
c = c.filter(ImageFilter.GaussianBlur(0.05 * w))
sh = Image.new('RGBA', c.size, (0, 0, 0, 0)); sh.putalpha(c)
save(sh, 'plate-shadow')
print('ok:', sorted(p.name for p in OUT.iterdir()))
