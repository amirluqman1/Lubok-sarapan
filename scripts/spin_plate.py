"""Turn a phone/AI video of the nasi lemak plate (camera orbiting the plate on a table) into a
transparent, stabilised "spinning plate" clip for the hero.

Output: an H.264 MP4 (+ a VP9 .webm twin) with the colour on the top half and the alpha mask (grey) on the bottom half
("stacked alpha"). src/hero/spin.js draws it to a WebGL canvas. Works on every browser incl. iOS
Safari, which cannot play transparent WebM.

Steps per frame:
  1. find the plate rim ellipse (maximise contrast: bright ceramic inside vs dark table outside)
  2. smooth the ellipse over time (cyclic) and warp the plate onto the static cut-out's geometry
     (public/img/hero/hidangan-<id>.webp), so video and still line up exactly
  3. the video frame is narrower than the plate: the left/right rim strips that are never visible
     are filled from the static cut-out's (clean) left rim, mirrored, colour-matched per frame
  4. alpha = the static cut-out's alpha
Then frames LOOP_START..LOOP_END are encoded (chosen so the end flows back into the start).

Needs: ffmpeg, python venv with opencv-python-headless numpy scipy pillow
  python -m venv /tmp/cv && /tmp/cv/bin/pip install opencv-python-headless numpy scipy pillow
  /tmp/cv/bin/python scripts/spin_plate.py media/hidangan-ayam-pusing-sumber.mp4 \
      public/img/hero/hidangan-ayam.webp public/video/hidangan-ayam-pusing.mp4
"""
import json, os, subprocess, sys, tempfile
import cv2
import numpy as np
from scipy.optimize import minimize

SRC, STATIC, OUT = sys.argv[1:4]
OUT_W = 750                    # output width (px); height follows the static cut-out's ratio
RIM_ADJ = (8.0, 4.0, 2.0)      # fitted ellipse → plate silhouette: +a, +b, +dy (px, source frame)
LOOP = (1, 138)                # 1-based frame range to keep (frame 139 ≈ frame 1 → smooth loop)
CRF = 24

tmp = tempfile.mkdtemp(prefix='spin_')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, f'{tmp}/%04d.png'], check=True)
frames = sorted(f for f in os.listdir(tmp) if f.endswith('.png'))
first = cv2.imread(f'{tmp}/{frames[0]}')
FH, FW = first.shape[:2]

# ---------- 1. rim ellipse per frame
th = np.linspace(0, 2 * np.pi, 360, endpoint=False)

def cost(p, V):
    cx, cy, a, b = p
    xi, yi = cx + a * 0.975 * np.cos(th), cy + b * 0.975 * np.sin(th)
    xo, yo = cx + (a + 14) * np.cos(th), cy + (b + 14) * np.sin(th)
    ok = (xi > 2) & (xi < FW - 3) & (xo > 2) & (xo < FW - 3) & (yo > 2) & (yo < FH - 3)
    if ok.sum() < 60:
        return 0
    s = lambda X, Y: cv2.remap(V, X[ok].astype(np.float32)[None], Y[ok].astype(np.float32)[None], cv2.INTER_LINEAR)
    return -np.clip(s(xi, yi) - s(xo, yo), -40, 80).mean()

ell, p = [], np.array([FW * 0.55, FH * 0.51, FW * 0.6, FH * 0.26])
for f in frames:
    V = cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{tmp}/{f}'), cv2.COLOR_BGR2HSV)[..., 2].astype(np.float32), (5, 5), 0)
    best = None
    for d in ([0, 0, 0, 0], [15, 0, 0, 0], [-15, 0, 0, 0], [0, 0, 20, 0], [0, 0, -20, 0]):
        r = minimize(cost, p + np.array(d), args=(V,), method='Nelder-Mead', options=dict(xatol=0.3, fatol=0.01, maxiter=600))
        if best is None or r.fun < best.fun:
            best = r
    p = best.x
    ell.append(p)
e = np.array(ell)
N, w = len(e), 7
pad = np.vstack([e[-w:], e, e[:w]])
e = np.stack([np.convolve(pad[:, j], np.ones(2 * w + 1) / (2 * w + 1), 'valid') for j in range(4)], 1)[:N]
json.dump(e.tolist(), open(f'{tmp}/ellipses.json', 'w'))

# ---------- 2-4. warp, fill, alpha
st = cv2.imread(STATIC, cv2.IMREAD_UNCHANGED)
sh, sw = st.shape[:2]
H0 = round(OUT_W * sh / sw)
H = H0 + (H0 % 2)
st = cv2.resize(st, (OUT_W, H0), interpolation=cv2.INTER_AREA)
stp = np.zeros((H, OUT_W, 4), np.uint8); stp[:H0] = st
cs, _ = cv2.findContours((stp[..., 3] > 128).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
(scx, scy), (sa2, sb2), _ = cv2.fitEllipse(max(cs, key=len))
sa, sb = max(sa2, sb2) / 2, min(sa2, sb2) / 2
yy, xx = np.mgrid[0:H, 0:OUT_W].astype(np.float32)
u, v = (xx - scx) / sa, (yy - scy) / sb
r = np.sqrt(u * u + v * v)
fill = cv2.remap(stp[..., :3], (scx - np.abs(xx - scx)).astype(np.float32), yy, cv2.INTER_LINEAR).astype(np.float32)
band = (r > 0.8) & (r < 0.95)
fill_hsv = cv2.cvtColor(fill.astype(np.uint8), cv2.COLOR_BGR2HSV)

os.makedirs(f'{tmp}/out', exist_ok=True)
for k, f in enumerate(frames[LOOP[0] - 1:LOOP[1]]):
    cx, cy, a, b = e[LOOP[0] - 1 + k]
    a += RIM_ADJ[0]; b += RIM_ADJ[1]; cy += RIM_ADJ[2]
    fr = cv2.imread(f'{tmp}/{f}')
    sx, sy = (cx + u * a).astype(np.float32), (cy + v * b).astype(np.float32)
    img = cv2.remap(fr, sx, sy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    dist = np.minimum(sx - 1, FW - 2 - sx)
    vis = np.clip((dist - 2) / 12, 0, 1); vis = vis * vis * (3 - 2 * vis)
    out = img.copy()
    hi = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2HSV)
    ceramic = (hi[..., 1] < 80) & (hi[..., 2] > 110) & (fill_hsv[..., 1] < 80) & (fill_hsv[..., 2] > 110)
    for side in (u < 0, u >= 0):
        # colour: one gain per side; brightness: per-row factor measured on plain ceramic just
        # inside the seam (food pixels excluded), smoothed vertically
        m0 = band & side & (dist > 30) & ceramic
        g0 = (img[m0].mean(0) + 1) / (fill[m0].mean(0) + 1) if m0.sum() > 200 else np.ones(3)
        L_img, L_fill = img.mean(2), (fill * g0).mean(2)
        m = side & (dist > 14) & (dist < 70) & (r > 0.62) & (stp[..., 3] > 200) & ceramic
        G = np.ones(H); have = np.zeros(H, bool)
        for y in range(H):
            mm = m[y]
            if mm.sum() >= 8:
                G[y] = np.median((L_img[y, mm] + 1) / (L_fill[y, mm] + 1)); have[y] = True
        if have.any():
            ys = np.arange(H); G = np.interp(ys, ys[have], G[have])
        kern = np.exp(-0.5 * (np.arange(-60, 61) / 20) ** 2); kern /= kern.sum()
        G = np.clip(np.convolve(np.pad(G, 60, mode="edge"), kern, "valid"), 0.7, 1.3)
        G = g0[None, :] * G[:, None]
        f2 = fill * G[:, None, :]
        out[side] = img[side] * vis[side, None] + f2[side] * (1 - vis[side, None])
    rgb = np.clip(out, 0, 255).astype(np.uint8)
    al = stp[..., 3]
    cv2.imwrite(f'{tmp}/out/{k + 1:04d}.png', np.vstack([rgb, cv2.cvtColor(al, cv2.COLOR_GRAY2BGR)]))

os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', f'{tmp}/out/%04d.png',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', str(CRF), '-pix_fmt', 'yuv420p',
                '-profile:v', 'high', '-movflags', '+faststart', '-an', OUT], check=True)
webm = os.path.splitext(OUT)[0] + '.webm'   # fallback for browsers without H.264 (e.g. plain Chromium)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', f'{tmp}/out/%04d.png',
                '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-an', webm], check=True)
print(f'{webm}: {os.path.getsize(webm) / 1e6:.2f} MB')
print(f'{OUT}: {len(frames[LOOP[0] - 1:LOOP[1]])} frames, {OUT_W}x{H * 2} (colour on top, alpha below), '
      f'{os.path.getsize(OUT) / 1e6:.2f} MB  — work files in {tmp}')
