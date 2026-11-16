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
