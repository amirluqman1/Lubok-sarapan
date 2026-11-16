"""Plate photos: remove the white studio background by flood-filling near-white pixels that are
connected to the image border (the brown plate rim stops the fill), then feather the edge.
More reliable than ML matting for a pale plate on white.  media/assets/hidangan-*.jpg → public/img/hero/
"""
import sys, pathlib
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC, OUT = pathlib.Path('media/assets'), pathlib.Path('public/img/hero')
for f in sorted(SRC.glob('hidangan-*.jpg')):
    if sys.argv[1:] and f.stem not in sys.argv[1:]:
        continue
    im = Image.open(f).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    mn, mx = a.min(2), a.max(2)
    cand = (mn > 222) & ((mx - mn) < 22)           # near-white, unsaturated
    lab, _ = ndimage.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg = ndimage.binary_opening(bg, iterations=2)
    fg = ndimage.binary_fill_holes(~bg)
    lab2, n2 = ndimage.label(fg)                     # keep only the plate (largest blob)
    if n2 > 1:
        sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
        fg = lab2 == (1 + int(np.argmax(sizes)))
    mask = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
    rgba = im.copy(); rgba.putalpha(mask)
    bbox = mask.point(lambda v: 255 if v > 8 else 0).getbbox()
    rgba = rgba.crop(bbox)
    rgba.thumbnail((1500, 1500), Image.LANCZOS)
    rgba.save(OUT / f'{f.stem}.webp', 'WEBP', quality=86, method=6)
    print(f.stem, rgba.size)
