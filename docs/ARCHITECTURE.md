# Architecture (v3 — product hero + Neon menu control)

```
Visitor ──▶ GitHub Pages (static: index.html, admin/, assets, img)
   │
   ├─ public page: GET {auth}/token/anonymous ──▶ GET {dataApi}/categories, /menu_public   (read-only via RLS)
   │      fallback: localStorage copy saved today → bundled src/data/menu-snapshot.json
   │
Owner ──▶ /admin/ (SDK @neon/neon-js): sign in (Neon Auth, email OTP) → rpc is_admin()
                                       → PATCH /menu_items (closed / sold_out_on)            (admin-only via RLS)
```

## Page flow (index.html)
1. `#intro` — logo pops in (GSAP), sentence rises word by word; header hidden until the intro scrolls away.
2. `#hero` — starts animating only when scrolled into view (IntersectionObserver). Plate photo + floating
   ingredients (3 nested transforms each: fly in/out · parallax by depth · idle bob). Menu switch = colour tween
   of `--bg-*`, plate swap, title swap, floaters leave/enter. Cards, ← →, keyboard, swipe.
   Live data adds price + "Habis hari ini"/"Tidak tersedia" badge + greyed card.
3. `#menu-lain` — categories with `in_list = true`, sticky category chips, items sorted available-first,
   options as tags, category-level options (e.g. *Pilihan kuah*).
4. footer.

## Data (Neon) — see db/schema.sql
`categories`, `menu_items`, view `menu_public` (computes `sold_out_today` in Asia/Kuala_Lumpur), `admins`,
`is_admin()`. RLS: everyone reads, only the linked + email-verified admin writes. Sign-up is disabled.

## Images
Owner supplies AI photos on white → `scripts/cutout.py` (rembg) for ingredients, `scripts/cutout_plate.py`
(border flood-fill) for plates, `scripts/cutout_logo.py` (circular mask) for the logo → `public/img/hero/*.webp`.
