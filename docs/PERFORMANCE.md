# Performance notes

| | Low | Medium | High |
|---|---|---|---|
| Max device-pixel-ratio | 1.0 | 1.5 | 2.0 |
| Shadow map | off (contact-shadow textures only) | 1024² | 2048² |
| Rice grains drawn | 2 400 | 4 800 | 7 600 |
| Triangles / grain | ~30 | ~48 | ~70 |
| Chicken crust grid | 56×70 | 96×120 | 150×190 |
| Chicken crumbs | 120 | 260 | 420 |
| Anchovies / peanuts | 30 / 16 | 44 / 24 | 56 / 32 |
| Steam sprites | off | on | on |
| MSAA | off | on | on |

* **Automatic tier**: desktop → High, phones → Medium; weak GPUs (Mali-G5x and older, Adreno ≤ 5xx,
  PowerVR, software renderers) or ≤ 2–3 GB RAM → Low. Flagship phone GPUs with ≥ 6 GB → High.
  Override: the "3D" selector in the nav (saved in `localStorage`) or `?q=low|medium|high`.
* **FPS guard**: while rendering, if the average falls below 30 fps over 2.5 s (Auto mode only),
  the runtime drops one tier (DPR, shadows, grain count, crumbs, steam) without reloading.
* **Draw calls ≈ 45**: grains, crumbs, chilli flakes, anchovies and peanuts are `InstancedMesh`es;
  geometries/materials are shared; per-frame code allocates nothing (scratch vectors are reused).
* **Render on demand**: the loop skips `render()` when nothing changed (no scroll delta, no drag,
  not in hero/showcase). The canvas is hidden and the loop idles once the menu covers it.
* Shaders are pre-compiled with `renderer.compileAsync()` behind the loader to avoid first-scroll hitches.
* All GPU resources (geometries, materials, textures, PMREM target, renderer) are disposed on `pagehide`.
* No post-processing pass (keeps mobile fill-rate low); the vignette is a CSS gradient.
* `prefers-reduced-motion`: no smoothing lag, no idle camera drift, no steam, no auto-rotate.
* No WebGL → the page falls back to a static, fully readable layout (`html.no-webgl`).

Measured in this sandbox (software SwiftShader renderer, no GPU) the numbers are not representative
of a phone; real-device FPS must be checked on hardware (see README → Android testing).
