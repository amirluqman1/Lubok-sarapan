# Nasi Lemak — laman web restoran

Laman web restoran nasi lemak (mobile-first). **Fasa 1 (sekarang): hero produk.**
Pinggan nasi lemak di tengah dengan bahan terapung (ayam, telur, timun, ikan bilis, kacang, cili, pandan)
yang bergerak ikut tetikus / kecondongan telefon, dan penukar menu: tukar menu → warna latar,
pinggan, tajuk dan bahan terapung bertukar dengan animasi.

**Laman langsung:** https://amirluqman1.github.io/Lubok-sarapan/ (dikemas kini automatik setiap push)

**Stack:** HTML · CSS · JavaScript · GSAP 3 · Vite 7 · Python + rembg (potong latar gambar)

## Jalankan

```bash
npm install
npm run dev       # http://localhost:5173 (juga di rangkaian Wi-Fi yang sama)
npm run build     # → dist/
npm run preview   # hidang dist/ di http://localhost:4173
```

## Tukar maklumat kedai
Semua data dalam **`src/config/restaurant.js`**: nama, WhatsApp, alamat, waktu, menu & harga, promosi,
kapsyen setiap bahan. Medan kosong dipaparkan sebagai "akan dikemas kini".

## Tambah gambar menu
Lihat [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) → "Adding a menu photo".

## Ujian
```bash
npm run build && npm run preview &
node tests/hero.cjs artifacts/screenshots
```

Dokumen: [ARCHITECTURE](docs/ARCHITECTURE.md) · [PERFORMANCE](docs/PERFORMANCE.md) · [VISUAL-AUDIT](docs/VISUAL-AUDIT.md)

Versi 3D prosedur (Three.js) yang lama masih ada dalam sejarah git (commit `172711a`).
