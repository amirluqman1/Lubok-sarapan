# Nasi Lemak Istimewa — laman web restoran

Laman web restoran nasi lemak (mobile-first). **Fasa 1 (sekarang): animasi "filem" ikut skrol sahaja.**
Pinggan kosong diisi nasi, sambal, telur, timun, ikan bilis, kacang dan ayam bila pengguna skrol.
Setiap bahan ada babak sendiri: kapsyen bernombor, perkataan gergasi, dan kamera zoom ke bahan itu.
Skrol ke atas = animasi berundur. Menu, kisah, promosi, lokasi & order dibuat dalam Fasa 2.

**Laman langsung:** https://amirluqman1.github.io/Lubok-sarapan/ (dikemas kini automatik setiap push)

**Stack:** HTML · CSS · JavaScript · GSAP 3 + ScrollTrigger · Vite 7 · ffmpeg (untuk pecah video)

## Jalankan

```bash
npm install
npm run dev       # http://localhost:5173 (juga di rangkaian Wi-Fi yang sama)
npm run build     # → dist/
npm run preview   # hidang dist/ di http://localhost:4173
npm run frames    # tukar media/nasi-lemak-assembly.mp4 → public/frames + gambar menu
```

## Tukar maklumat kedai
Semua data dalam **`src/config/restaurant.js`**: nama, WhatsApp, alamat, waktu, menu & harga, promosi,
kapsyen setiap bahan. Medan kosong dipaparkan sebagai "akan dikemas kini".

## Tukar video
1. Ganti `media/nasi-lemak-assembly.mp4` (satu shot, pinggan kosong → lengkap, tegak 9:16).
2. `npm run frames`
3. Kemas kini `count`, julat frame (`from`/`to`) dan titik fokus kamera dalam `src/config/sequence.js`.

## Ujian
```bash
npm run build && npm run preview &
node tests/screenshots.cjs artifacts/screenshots
```

Dokumen: [ARCHITECTURE](docs/ARCHITECTURE.md) · [PERFORMANCE](docs/PERFORMANCE.md) · [VISUAL-AUDIT](docs/VISUAL-AUDIT.md)

Versi 3D prosedur (Three.js) yang lama masih ada dalam sejarah git (commit `172711a`).
