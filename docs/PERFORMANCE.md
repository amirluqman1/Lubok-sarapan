> ⚠️ Dokumen sejarah — kebanyakannya tentang versi lama (3D / filem skrol). Rujuk README.md untuk keadaan semasa.

# Performance notes (Phase 1 hero)

* JS ≈ 79 kB (31 kB gzip): GSAP + app. No WebGL, no video.
* Images: plate 250 kB WebP, 7 ingredient cut-outs 30–110 kB each (≈ 0.7 MB total for the first menu).
* All motion is `transform`/`opacity` on pre-rendered layers; blur is applied once to far ingredients.
* Parallax uses `pointermove` (mouse only) and `deviceorientation` on phones; disabled with
  `prefers-reduced-motion`, which also removes idle bobbing and transition durations.
