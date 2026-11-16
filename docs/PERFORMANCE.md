# Performance notes

* No WebGL / 3D engine: the page ships ~126 kB JS (GSAP + app) and draws pre-rendered frames to a canvas.
* Frames are WebP. HD set ≈ 7 MB (152 × ~46 kB), lite set ≈ 2 MB (76 × ~27 kB).
  Lite is chosen automatically for Save-Data, 2G/3G connections or ≤ 2 GB RAM; force with `?frames=lite|hd`.
* Loading is progressive: frame 0 is preloaded in `<head>`, then the last frame, then every 16th, 8th,
  4th, 2nd and finally every frame (6 parallel requests). Scrubbing works before everything has loaded —
  the nearest loaded frame is shown, and a small "Memuatkan N%" label appears bottom-right.
* Images are decoded (`img.decode()`) before use, so drawing a frame never blocks on decoding.
* Canvas backing size = displayed size × min(devicePixelRatio, 2). The blurred backdrop is a 96 px-wide
  canvas scaled and blurred by CSS (cheap).
* Height-only resizes from the mobile address bar are ignored to avoid flicker; ScrollTrigger uses
  `ignoreMobileResize`.
* `prefers-reduced-motion`: scroll is followed directly (no smoothing) and caption transitions are instant.

## Scroll smoothness pass (measured with `node tests/perf.cjs`: 390×844, 4× CPU throttle, software rendering)
| | avg FPS | frames > 33 ms |
|---|---|---|
| Before | 21 | 54 % |
| After | 33–35 | 28–32 % |

Changes: canvas backing store = native frame size (no resampling), backdrop is a 24 px canvas upscaled
(no CSS blur) and redrawn only every 6 frames, no CSS masks / blend modes / backdrop-filter on anything
that changes per frame, video clipped by an `overflow:hidden` window with a static edge-fade overlay,
adjacent frames cross-faded for sub-frame motion, ScrollTrigger scrub 0.9 s.
The sandbox has no GPU, so absolute numbers are pessimistic; real phones composite canvas on the GPU.
