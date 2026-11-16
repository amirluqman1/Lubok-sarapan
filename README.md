# Nasi Lemak Istimewa — laman web restoran 3D sinematik

Laman web restoran (mobile-first) dengan pengalaman **3D interaktif sepenuhnya prosedur**:
pinggan seramik, daun pisang, nasi santan (ribuan butir sebenar), sambal, telur rebus, timun,
ikan bilis, kacang dan ayam goreng berempah — semuanya geometri Three.js sebenar, tiada foto,
tiada model AI berbayar. Skrol untuk menyusun nasi lemak lapis demi lapis (GSAP ScrollTrigger),
kemudian pusing 360° dengan jari atau tetikus.

**Stack:** HTML · CSS · JavaScript · Three.js r181 · GSAP 3.13 + ScrollTrigger · Vite 7

## Jalankan

```bash
npm install
npm run dev          # pelayan pembangunan (http://localhost:5173, juga di rangkaian tempatan)
npm run build        # binaan produksi → dist/
npm run preview      # hidang dist/ (http://localhost:4173)
npm run build:single # SATU fail HTML (semua JS/CSS disisipkan) → dist-single/index.html
```

Parameter URL berguna: `?q=low|medium|high` (paksa kualiti) · `?still` (tiada animasi berterusan,
untuk tangkapan skrin) · `?nowebgl` (uji paparan sandaran tanpa WebGL).

## Tukar maklumat kedai

Semua data perniagaan ada dalam **`src/config/restaurant.js`**: nama, nombor WhatsApp, alamat,
pautan Maps, waktu operasi, menu & harga, promosi, kapsyen animasi dan teks kisah.
Medan kosong dipaparkan sebagai "akan dikemas kini" — tiada harga, alamat atau nombor palsu.
Promosi bertanda `example: true` memaparkan lencana **Contoh** sehingga diganti.

## Uji di telefon Android

1. **Paling mudah (rangkaian Wi-Fi sama):** `npm run dev` di komputer → buka alamat
   `Network: http://192.168.x.x:5173` yang dipaparkan, di Chrome Android.
2. **Satu fail:** `npm run build:single` → hantar `dist-single/index.html` ke telefon dan buka
   dengan Chrome (Fonts Google perlu internet; selebihnya luar talian).
3. **Hosting statik** (pilihan anda, tidak dibuat automatik): folder `dist/` boleh dihoskan di mana-mana
   hos statik. GitHub Pages untuk repo peribadi memerlukan pelan berbayar atau repo awam — ini
   keputusan anda.

Semak di telefon: skrol perlahan ke atas/bawah dalam bahagian susunan, seret pinggan di bahagian
"Pusing 360°", dan cuba pemilih **3D** (Auto/Rendah/Sederhana/Tinggi) di bar navigasi.

## Ujian automatik (Playwright, Chromium sebenar + WebGL)

```bash
npm run build && npm run preview &        # port 4173
node tests/screenshots.cjs artifacts/screenshots   # skrol sebenar, desktop 1440×900 + mudah alih 390×844
node tests/closeups.cjs artifacts/screenshots/closeups
```

`tests/screenshots.cjs` memandu skrol halaman sebenar (ScrollTrigger), menyemak skrol undur,
seret 360° + butang set semula, limpahan mendatar, ralat konsol, dan menulis `report.json`.

## Dokumen

* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — struktur modul & aliran data
* [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — tier kualiti, strategi mudah alih
* [docs/VISUAL-AUDIT.md](docs/VISUAL-AUDIT.md) — audit visual, skor & had
* `artifacts/screenshots/` — tangkapan skrin render sebenar
