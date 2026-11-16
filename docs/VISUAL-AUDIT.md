# Visual audit

## v2 — scroll video (current)
The 3D procedural version (v1) scored ~7/10 against the reference photo; close-ups still read as CG.
v2 replaces it with the owner's generated video, played frame-by-frame by scroll.

* Realism: matches the source video (photographic look, real steam, shallow depth of field).
* Flow: starts on an empty plate and only fills up — no "complete → rewind → rebuild".
* Text: title + caption for the current ingredient + ingredient chips are visible throughout the animation.
* Verified (Playwright, real Chromium): frames 0 → 151 follow scroll, captions match frames
  (see `artifacts/screenshots/report.json`), reverse scroll returns to the same frame, no horizontal
  overflow at 390×844 and 1440×900, no console errors.

## Known limitations
* Source video is 720×1280; on large desktop screens it is shown at full height and is slightly soft.
  A 1080×1920 (or 4K) export would sharpen it.
* The video is portrait; desktop shows it on the right with a blurred backdrop rather than full-bleed.
  A separate 16:9 export would allow full-width on desktop.
* No 360° rotation in v2 (the video has one camera angle). An orbit video could be added the same way.
* Not yet measured on a physical Android phone.
