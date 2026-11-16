# Architecture (Phase 1: product hero + menu switcher)

```
index.html                 header (glass pill nav), hero: copy · stage (plate + floating ingredients) · menu cards
media/assets/*.jpg         original AI-generated photos on white (source of truth)
scripts/cutout.py          ingredient photos → transparent, trimmed WebP (rembg, isnet-general-use)
scripts/cutout_plate.py    plate photos (hidangan-*) → WebP via border flood-fill (keeps the pale plate rim intact)
public/img/hero/*.webp     cut-outs used by the page
src/
  main.js                  menu switching (GSAP), floating ingredients (enter / idle bob / leave),
                           pointer + device-tilt parallax, swipe & keyboard navigation
  config/menu.js           menus (title, description, colours, plate image, signature ingredient)
                           + floating-ingredient layout (x/y/size in plate widths, depth, blur, front/back)
  config/restaurant.js     business data (name, WhatsApp, …)
  ui/site.js               Phase-2 sections (menu list, story, promos, location) — not loaded yet
  styles/main.css
tests/hero.cjs             Playwright screenshots (390×844, 1440×900) + error / overflow check
```

## Adding a menu photo
1. Save the photo as `media/assets/hidangan-<id>.jpg` (and the signature ingredient as `media/assets/<img>.jpg`).
2. `python scripts/cutout_plate.py hidangan-<id>` and `python scripts/cutout.py <img>`.
3. In `src/config/menu.js` set `plate: \`${base}hidangan-<id>.webp\`` and add `<img>` to `availableImages`.

## Each floating ingredient = 3 nested transforms
`.floater` (enter/leave fly-in) → `.floater__par` (parallax by depth) → `img` (idle bob + rotation).
Far items are blurred once with CSS and only ever transformed, so they stay cheap on phones.
