"""Cut out white-background asset photos → trimmed transparent WebP for the hero.
Usage: python scripts/cutout.py  (needs `pip install "rembg[cpu]"`)
media/assets/<name>.jpg  →  public/img/hero/<name>.webp
"""
import sys, pathlib
from PIL import Image
from rembg import remove, new_session

SRC, OUT = pathlib.Path('media/assets'), pathlib.Path('public/img/hero')
OUT.mkdir(parents=True, exist_ok=True)
session = new_session('isnet-general-use')
only = set(sys.argv[1:])
for f in sorted(SRC.glob('*.jpg')):
    if only and f.stem not in only:
        continue
    im = Image.open(f).convert('RGB')
    cut = remove(im, session=session, post_process_mask=True)
    bbox = cut.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    cut = cut.crop(bbox)
    maxside = 1500 if f.stem.startswith('hidangan') else 720
    cut.thumbnail((maxside, maxside), Image.LANCZOS)
    cut.save(OUT / f'{f.stem}.webp', 'WEBP', quality=86, method=6)
    print(f.stem, cut.size)
