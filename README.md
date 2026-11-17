# Restoran Lubok Sarapan — laman menu

Laman paparan menu (mobile-first) untuk **Restoran Lubok Sarapan** + **panel admin** untuk pemilik
menanda menu *Habis hari ini* / *Tutup*. Tiada sistem order (sengaja dibuang).

- **Laman langsung:** https://amirluqman1.github.io/Lubok-sarapan/
- **Panel admin:** https://amirluqman1.github.io/Lubok-sarapan/admin/
- **Repo / branch:** `amirluqman1/Lubok-sarapan`, branch **`ccr-185feef6-akq7ae`** (satu-satunya branch = default).
  Setiap push → GitHub Actions (`.github/workflows/pages.yml`) build & deploy ke GitHub Pages (~1 minit).

> **Session baru: baca bahagian "Serah tugas" di bawah dahulu.**

---

## Serah tugas (keadaan pada 17 Nov 2026)

### Apa yang sudah siap
| Bahagian | Status |
|---|---|
| Skrin pembukaan: logo + ayat beranimasi "Sarapan sedap, / setiap hari." + "Leret ke bawah" | ✅ |
| Hero nasi lemak gaya "product launch": pinggan tengah, bahan terapung (parallax tetikus / condong telefon), penukar 6 menu (Ayam, Paru, Udang, Sotong, Kerang, Telur Mata) dengan warna latar berbeza | ✅ |
| "Menu Lain": 6 kategori dari pangkalan data (Roti Canai, Kuah-Kuahan, Kuih-Muih [kosong], Sarapan Ringan, Minuman, Lempeng), pilihan (kuah / ais-panas dll.), harga jika ada, lencana Habis/Tutup | ✅ |
| Panel admin `/admin/`: log masuk, lupa kata laluan (OTP emel), butang **Ada · Habis · Tutup** setiap menu, "Buka semua yang habis", carian | ✅ diuji oleh pemilik di telefon |
| "Habis hari ini" kembali "Ada" sendiri selepas tengah malam (waktu Malaysia) | ✅ |
| Logo + favicon | ✅ |

### Belum dibuat / cadangan seterusnya (ikut pilihan pemilik)
1. **Fasa 4 – urus menu dari panel:** tukar harga/nama/penerangan, tambah/padam menu, susun semula.
   (RLS insert/update/delete untuk admin sudah wujud; hanya UI yang belum.)
2. **Fasa 5 – upload gambar dari panel** (cadangan: Neon storage bucket, mampat ke WebP di pelayar).
3. **Senarai kuih** (kategori `kuih` kosong — pemilik akan beri nama kuih).
4. **Seksyen "Kisah"** (soalan sudah dihantar kepada pemilik: bila/siapa/kenapa nama "Lubok"/resipi istimewa/gambar).
5. **Harga** (lajur `price` kosong untuk semua menu).
6. **Gambar sebenar untuk menu lain** — pemilik akan hantar foto telefon sebenar (bukan AI). Papar sebagai foto penuh dalam kad, mampat ke WebP ~150–300 KB.
7. Footer: no. pendaftaran `2025030610931 003705782-H` (RA World Resources) disimpan dalam `src/config/restaurant.js` tetapi **belum dipaparkan — tunggu pemilik sahkan**.
8. Pinggan berpusing: **✅ Ayam Goreng sahaja** (video kedua pemilik, 17 Nov). Menu lain masih gambar statik —
   jika pemilik hantar video serupa untuk menu lain: `scripts/spin_plate.py` + tambah `spin:` dalam `src/config/menu.js`.
   Had: video asal lebih sempit dari pinggan, jadi ~10% tepi kiri/kanan rim ditampal dari gambar statik;
   makanan yang betul-betul di tepi (timun/kacang kanan) kadang nampak terpotong lembut di situ.

### Keputusan & citarasa pemilik (penting)
- Bahasa: Bahasa Melayu santai; mahu penerangan jelas, berfasa, **terangkan dulu sebelum kerja besar**.
- Mahu rupa **premium** gaya laman produk (rujukan: laman "Diet Soda" dalam repo `amirluqman1/Repo-kosong`).
- **Tidak mahu**: filem skrol (video frame-by-frame), animasi "siap → undur → siap", butang order, daun pisang.
- Gambar hidangan/bahan: dijana AI (Nano Banana) oleh pemilik dengan **latar putih**, hidangan menu baru dibuat guna **Edit** pada gambar ayam supaya pinggan/sudut/cahaya sama.
- Jangan reka fakta perniagaan (harga, alamat, cerita). Penerangan menu dibiar kosong kecuali nasi lemak.
- Nasi lemak hanya di hero (kategori `nasi-lemak` mempunyai `in_list = false`).

---

## Pangkalan data (Neon)

| | |
|---|---|
| Organisasi | `org-odd-unit-48575671` (pelan percuma) |
| Projek | **`lubok-sarapan`** — id `lucky-truth-90617919`, region `aws-ap-southeast-1` (Singapura), PG 17 |
| Branch | `main` — `br-square-darkness-a1z79buw`, database `neondb` |
| Data API | `https://ep-dry-bonus-a10qc1ys.apirest.ap-southeast-1.aws.neon.tech/neondb/rest/v1` |
| Neon Auth (Better Auth) | `https://ep-dry-bonus-a10qc1ys.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth` |
| ⚠️ Jangan sentuh | projek lain dalam akaun: `adminflow-v1` (`hidden-cherry-82892649`) — bukan untuk laman ini |

Skema penuh + sejarah migrasi: **`db/schema.sql`**. Ringkas:
- `categories(id, name, sort_order, options_label, options[], in_list)`
- `menu_items(id, category→categories, name, description, price, image, options[], sort_order, sold_out_on date, closed bool, updated_at)`
- View `menu_public` → tambah `sold_out_today` (= `sold_out_on >= hari ini waktu MY`). Laman awam membaca view ini.
- `admins(email, user_id)` + fungsi `is_admin()` (security definer): admin = `auth.user_id()` sepadan `admins.user_id`, emel sama, emel disahkan, tidak di-ban.
- RLS: semua orang **baca**; hanya admin **tulis** (`menu_items`, `categories`). `admins` tidak boleh dibaca melalui API.
- Auth: emel + kata laluan, **OTP pengesahan emel wajib**, **pendaftaran ditutup** (`disable_sign_up = true`).
- Admin sekarang: `bodobodoahh@gmail.com` → user_id `edb73b82-7f67-4a14-81ba-06f8fd565388`.

**Tambah admin baru** (hanya jika pemilik minta): buka sementara pendaftaran → orang itu daftar + sahkan OTP →
`insert into public.admins(email, user_id) values (...)` selepas semak `neon_auth."user"` → tutup semula pendaftaran.

**Status menu:** Ada = `closed=false, sold_out_on=null` · Habis hari ini = `sold_out_on = tarikh MY hari ini` · Tutup = `closed=true`.

---

## Struktur kod

```
index.html                  laman awam: #intro → #hero → #menu-lain → footer
admin/index.html            panel admin (Vite multi-page, lihat vite.config.js)
src/main.js                 laman awam: animasi intro (GSAP), hero (penukar menu, bahan terapung,
                            parallax, swipe), muat menu langsung → render "Menu Lain" + lencana hero
src/data/menu-store.js      baca menu (fetch biasa, TANPA SDK): token anonim Neon Auth → Data API;
                            fallback: salinan localStorage hari ini → src/data/menu-snapshot.json
src/data/menu-snapshot.json salinan menu (dijana dari DB; kemas kini bila menu berubah besar)
src/admin/main.js           panel admin guna SDK @neon/neon-js (log masuk, OTP, reset, kemas kini status)
src/config/menu.js          visual hero: 6 menu nasi lemak (gambar pinggan, warna, tajuk, lauk khas)
                            + susun atur bahan terapung (unit = lebar pinggan)
src/config/restaurant.js    nama, tagline, ayat intro, pemilik, no. pendaftaran (belum dipapar)
src/config/backend.js       URL awam Neon (bukan rahsia)
src/styles/main.css         gaya laman awam · src/admin/admin.css gaya panel
src/ui/site.js              ⚠️ LAMA, tidak digunakan (kod fasa awal) — boleh dibuang
media/assets/*.jpg          gambar asal dari pemilik (latar putih) — sumber
public/img/hero/*.webp      potongan lutsinar yang digunakan laman
src/hero/spin.js            pinggan berpusing: video "stacked alpha" (atas = warna, bawah = topeng) → kanvas WebGL
                            di atas gambar pinggan; gagal/reduced-motion/data-saver → gambar statik kekal
public/video/hidangan-*-pusing.{mp4,webm}  video pusing siap (MP4 H.264 utama, WebM VP9 sandaran)
media/hidangan-ayam-pusing-sumber.mp4      video asal pemilik (kamera mengelilingi pinggan atas meja kayu)
scripts/spin_plate.py       video asal → video pusing: cari elips pinggan setiap frame, stabilkan, buang latar,
                            tampal rim yang terkeluar frame, gelung frame 1–138
media/nasi-lemak-assembly.mp4  ⚠️ LAMA (filem skrol yang ditolak) — tidak digunakan
scripts/cutout.py           bahan → WebP lutsinar (rembg, model isnet-general-use)
scripts/cutout_plate.py     pinggan `hidangan-*` → WebP (flood-fill latar putih; rembg merosakkan rim pinggan)
scripts/cutout_logo.py      logo bulat → WebP + favicon (topeng bulatan tepat)
tests/hero.cjs              Playwright: intro → hero (6 menu) → menu lain, telefon + desktop
tests/menu.cjs              Playwright dengan respons Neon TIRUAN: lencana Habis/Tutup, fallback, skrin admin
db/schema.sql               skema + migrasi + nota ujian
```

### Tambah gambar
- **Bahan / lauk terapung:** simpan `media/assets/<nama>.jpg` → `python scripts/cutout.py <nama>` → tambah `<nama>`
  dalam `availableImages` (`src/config/menu.js`).
- **Pinggan menu nasi lemak:** `media/assets/hidangan-<id>.jpg` → `python scripts/cutout_plate.py hidangan-<id>`.
- **Foto sebenar menu lain:** mampat ke `public/img/menu/<id>.webp` (~1200px, kualiti ~78), isi lajur `image` di DB
  (`img/menu/<id>.webp`); render sudah sokong `image` (thumbnail dalam senarai).
- **Pinggan berpusing:** `python -m venv /tmp/cv && /tmp/cv/bin/pip install opencv-python-headless numpy scipy pillow`
  → `/tmp/cv/bin/python scripts/spin_plate.py media/<video>.mp4 public/img/hero/hidangan-<id>.webp public/video/hidangan-<id>-pusing.mp4`
  (pemalar `RIM_ADJ` / `LOOP` dalam skrip mungkin perlu dilaras untuk video lain; semak frame dalam folder kerja yang dicetak).
- rembg: `python -m venv /tmp/rbg && /tmp/rbg/bin/pip install "rembg[cpu]"` (model dimuat turun dari GitHub, ~180 MB).

## Jalankan & uji
```bash
npm install
npm run dev                         # http://localhost:5173 (+ /admin/)
npm run build && npm run preview    # http://localhost:4173
node tests/hero.cjs /tmp/out        # aliran penuh
node tests/menu.cjs /tmp/out        # Neon ditiru (mock)
```

## Gotcha untuk session seterusnya
- **Rangkaian sandbox Claude menyekat domain Neon** (`*.neon.tech`), `github.io`, `getlayers.ai`, unpkg/cdnjs.
  Uji Neon melalui **MCP Neon `run_sql`** (simulasi peranan:
  `select set_config('request.jwt.claims','{"sub":"<uuid>","role":"authenticated"}',true); set local role authenticated; ...`)
  dan uji UI dengan **mock** (`tests/menu.cjs`). Ralat `token/anonymous ... TUNNEL_CONNECTION_FAILED` dalam ujian = dijangka.
- Jangan uji `is_admin()` dalam transaksi yang sama dengan `update admins` (memberi keputusan palsu "false").
- Arahan shell dengan heredoc kompleks / `git rm` + `rm` kadang disekat oleh pemeriksa keselamatan — guna alat Edit/Write.
- `@neon/neon-js` (~60 KB gzip) hanya dimuat oleh `/admin/`; laman awam guna fetch biasa (kekal ringan).
- Base Vite = `./` (laman di bawah `/Lubok-sarapan/`); laluan aset dalam `admin/index.html` guna `../`.
- Commit berakhir dengan baris Co-Authored-By / Claude-Session; jangan letak ID model dalam commit.

## Sejarah ringkas
v1 3D prosedur Three.js → v2 filem skrol video → v3 (sekarang) hero produk + gambar AI + Neon.
Kod lama ada dalam sejarah git (cth. commit `172711a` = versi 3D). `docs/PERFORMANCE.md` & `docs/VISUAL-AUDIT.md`
kebanyakannya tentang versi lama.
