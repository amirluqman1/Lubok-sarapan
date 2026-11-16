# Architecture

```
index.html                 all sections: scroll sequence, menu, story, promos, location, WhatsApp order, footer
media/nasi-lemak-assembly.mp4   source video (empty plate → complete dish, 720×1280, 152 frames)
scripts/extract-frames.sh  video → public/frames/{hd,lite}/NNN.webp + public/img/menu-*.webp crops
public/frames/hd/          152 frames, 720 px wide (~7 MB total)
public/frames/lite/        76 frames (every 2nd), 480 px wide (~2 MB) for slow connections / save-data
src/
  main.js                  ScrollTrigger pin + scrub → player frame, step captions, ingredient chips, CTA
  sequence/player.js       canvas image-sequence player: progressive coarse-to-fine loading,
                           nearest-loaded-frame fallback, portrait/landscape layout, blurred backdrop
  config/sequence.js       frame sets, scroll length, frame index where each step starts
  config/restaurant.js     ALL business data + caption copy
  ui/site.js               config-driven sections, nav drawer, cart → WhatsApp message
  styles/main.css          mobile-first styles
tests/screenshots.cjs      Playwright: drives the real scroll, records frame/step per position, reverse check
```

## How the animation works
1. The page opens on frame 0 (empty plate) with the title and first caption already visible.
2. `#sequence` is pinned for 4.5 viewport heights. Scroll progress p (0–1, smoothed by `scrub: 0.4`)
   selects frame `round(p × (count−1))`, drawn to a canvas. Scrolling up plays it backwards.
3. Caption, step number and ingredient chips change at the frame indices in `config/sequence.js`
   while the frames play; "Order Sekarang" appears on the finished dish.

## Swapping the video
Replace `media/nasi-lemak-assembly.mp4`, run `npm run frames`, then update `count` and the `at` frame
numbers in `src/config/sequence.js` (open a few frames in `public/frames/hd/` to find them).
