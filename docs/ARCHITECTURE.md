# Architecture (Phase 1: scroll film only)

```
index.html                 one pinned "film" section: intro → 7 ingredient chapters → finale
media/nasi-lemak-assembly.mp4   source video (720×1280, 152 frames)
scripts/extract-frames.sh  video → public/frames/{hd,lite}/NNN.webp + public/img/*.webp
src/
  main.js                  builds captions from config; ONE GSAP master timeline scrubbed by ScrollTrigger
  sequence/player.js       canvas image-sequence player (progressive loading, layout, blurred backdrop)
  config/sequence.js       choreography: frame range, scroll weight, camera focus/zoom, captions per ingredient
  config/restaurant.js     business data (name, WhatsApp, …) — menu/promo/location data kept for Phase 2
  ui/site.js               Phase-2 sections (menu, story, promos, location, order) — not loaded yet
  styles/main.css
tests/screenshots.cjs      Playwright: real scroll at each chapter, records frame + visible caption
```

## The film timeline (all scroll-scrubbed, so reverse scrolling plays it backwards)
| Part | What happens |
|---|---|
| Intro | Empty plate. Giant "Nasi / Lemak" splits apart, letterbox bars open. |
| Chapter × 7 | Video frames for that ingredient; camera pushes in on where it lands; numbered caption + notes slide in, stay readable, slide out; a giant ghost word drifts behind (blend: overlay); progress segment fills. |
| Finale | Last frames settle, camera pulls back (desktop: dish slides right), "Nasi Lemak Istimewa", tagline, Order Sekarang + Tonton semula. |

Each chapter's scroll length comes from its `weight`, not from how many video frames it has, so short
moments (egg, peanuts) still give time to read.
