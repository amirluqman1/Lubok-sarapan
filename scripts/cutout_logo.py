"""Round logo → transparent WebP + favicons, using an exact anti-aliased circular mask
fitted to the yellow disc.  media/assets/logo.jpg → public/img/hero/logo.webp, public/favicon.png, public/apple-touch-icon.png"""
import numpy as np
from PIL import Image, ImageDraw

im = Image.open('media/assets/logo.jpg').convert('RGB')
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
yellow = (r > 200) & (g > 120) & (g < 215) & (b < 110)
ys, xs = np.nonzero(yellow)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
rad = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 4
S = 4  # supersampled mask for smooth edges
m = Image.new('L', (im.width * S, im.height * S), 0)
ImageDraw.Draw(m).ellipse([(cx - rad) * S, (cy - rad) * S, (cx + rad) * S, (cy + rad) * S], fill=255)
m = m.resize(im.size, Image.LANCZOS)
rgba = im.copy(); rgba.putalpha(m)
rgba = rgba.crop((int(cx - rad) - 1, int(cy - rad) - 1, int(cx + rad) + 2, int(cy + rad) + 2))
rgba.save('public/img/hero/logo.webp', 'WEBP', quality=90, method=6)
rgba.resize((64, 64), Image.LANCZOS).save('public/favicon.png')
bg = Image.new('RGBA', (180, 180), (255, 255, 255, 255)); bg.alpha_composite(rgba.resize((172, 172), Image.LANCZOS), (4, 4))
bg.convert('RGB').save('public/apple-touch-icon.png')
print('centre', cx, cy, 'radius', rad, 'size', rgba.size)
