# Architecture

```
index.html                     page skeleton (all 10 site sections)
vite.config.js                 normal build → dist/, single-file build → dist-single/
src/
  main.js                      boot: WebGL check, loader, ScrollTrigger choreography, UI ↔ 3D sync
  config/restaurant.js         ALL business data (name, WhatsApp, address, hours, menu, promos, copy)
  styles/main.css              mobile-first design system + WebGL fallback + reduced-motion rules
  ui/site.js                   renders config-driven sections, nav drawer, cart → WhatsApp message
  three/
    experience.js              orchestrator: renderer, scene, dish, timeline, camera, controls,
                               quality, render loop (render-on-demand), snapshots, dispose()
    core/
      scene.js                 renderer settings (ACES, sRGB, PCF soft shadows), studio lights,
                               PMREM RoomEnvironment reflections, walnut table, fog
      camera.js                orbit-pose rig, keyframes vs. assembly progress, aspect-aware fit,
                               view-offset framing (dish shifted away from text)
      assembly.js              GSAP master timeline (0–100 ↔ scroll %), seek-only → reversible
      controls.js              360° turntable: pointer drag + inertia, pitch clamp, reset, nudge,
                               "free rotate" mode (touch-action none) vs default pan-y
      quality.js               Low / Medium / High tiers, GPU/device detection, FPS auto-downgrade
      textures.js              procedural canvas textures (wood, glaze, banana leaf, cucumber face,
                               tileable bump, steam, contact shadow) — no image files anywhere
    food/
      layout.js                final arrangement (single source of truth), plate profile,
                               plateTopY(r), foodY(x,z) surface used by every ingredient
      settle.js                restOnFood(): lifts an object until no vertex is below the surface
      plate.js                 lathe stoneware plate (+ wobble, speckled glaze) & banana-leaf liner
      rice.js                  dome core + up to 7 600 instanced grains (MeshSurfaceSampler)
      sambal.js                draped sauce sheet over the rice heightfield + chilli flakes/seeds
      egg.js                   halved egg: asymmetric shell, bevelled cut face, domed yolk
      cucumber.js              diagonal slices shingled with a 2D rest solver
      pile.js                  ikan bilis + kacang: instanced variants on a height-field pile solver
      chicken.js               drumstick: lathe + lumps/ridged crust displacement, crumbs, bone
      steam.js                 soft steam sprites
      dish.js                  builds everything (async, reports progress), contact shadows,
                               apply(state) → per-ingredient setProgress(p)
    util/
      noise.js                 seeded simplex 3D, fbm, ridged multifractal
      random.js                mulberry32 PRNG (deterministic dish), math helpers
      ease.js                  easing + dropCurve() (fall → impact → damped settle)
tests/                         Playwright scripts (real Chromium + WebGL) — see README
```

## Data flow

```
scroll ─► ScrollTrigger(hero)      ─► target.hero (1 → 0)
       └► ScrollTrigger(assembly)  ─► target.asm  (0 → 1), section pinned for 5 × viewport
                                         │ smoothed per frame (exp. decay; instant if reduced-motion)
                                         ▼
           P = max(asm, hero) ─► tl.progress(P) ─► state{plate…chicken, reveal} ─► dish.apply()
           camera pose = mix(poseAt(asm), HERO_POSE, hero) + user pitch
           turntable.rotation.y = user yaw (showcase only)
```

* **Hero** shows the finished dish. Scrolling out of the hero rewinds the same timeline to the
  empty plate; the pinned section then rebuilds it 0→100 %. One timeline, two drivers, no state drift.
* Every ingredient exposes `setProgress(p)`; all motion is an analytic function of `p`
  (no physics integration), so scrolling backwards is exact and frame-rate independent.
* No interpenetration: final poses are solved at build time against the plate/leaf surface
  (`restOnFood`), the rice heightfield (sambal), slice-on-slice rests (cucumber) and a
  height-field pile with "lowest rest" + local rolling search (anchovies, peanuts).
  Drops are vertical / from outside the plate onto free space, in the timeline order.

## Ingredient groups (all separately controllable `THREE.Group`s)
`plate` (+leaf) · `rice` · `sambal` · `egg` · `cucumber` · `anchovies` · `peanuts` · `chicken` · `steam`
