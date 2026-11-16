# Visual audit (render sebenar, Chromium + WebGL)

Semua pemerhatian di bawah dibuat pada tangkapan skrin sebenar aplikasi yang berjalan
(`artifacts/screenshots/`, `artifacts/screenshots/closeups/`). Persekitaran ujian ialah
**renderer perisian SwiftShader** (tiada GPU) — kualiti imej sama seperti GPU sebenar,
tetapi FPS di sini tidak mewakili telefon.

Sasaran: iklan makanan nasi lemak yang realistik. Skala: 10 = setaraf foto iklan.

## Pusingan 1 (binaan pertama) → Pusingan 3 (selepas penambahbaikan)

| Aspek | P1 | Akhir | Bukti / pemerhatian |
|---|---|---|---|
| Realisme nasi | 6 | **7** | Ribuan butir panjang berinstans kelihatan jelas, warna krim + oklusi kedalaman. Masih terlalu "kering"/seragam berbanding nasi santan berkilat & melekit. |
| Realisme sambal | 3 | **6** | P1: merah ceri terang macam jem, butir nasi tembus, bintik cili macam semut. Akhir: merah bata gelap, tepi minyak oren, ketulan, kepingan cili, duduk di atas lapisan butir. Masih agak licin/berkilat seperti jeli dari dekat. |
| Realisme ayam | 4 | **7** | P1: serbuk tepung berbucu macam batu low-poly. Akhir: kerak rabung (ridged noise) + ketulan, celah gelap, serbuk kecil licin, tulang terdedah. Corak kerak sedikit berulang (seperti sarang lebah). |
| Geometri bahan | 5 | **7** | Telur (kulit asimetri, potongan bercerun, kuning berkubah), timun (elips potong serong, biji 3-lobus, berlapis bersandar), kacang (separuh dengan muka krim). Ikan bilis masih lebih mirip kepingan kentang/kacang panjang daripada ikan. |
| Kualiti bahan (material) | 5 | **6.5** | Seramik bergelasir berbintik, daun pisang berkilat, clearcoat minyak pada sambal/ayam. Daun pisang dari atas masih agak rata/berlumut. |
| Pencahayaan | 6 | **7** | Kunci hangat dari belakang-kiri + rim + kolam cahaya; bayang lembut (PCF) + bayang sentuhan. Tiada pantulan "hero" kuat pada sambal seperti studio sebenar. |
| Animasi | 7 | **8** | Pinggan → nasi jatuh & mampat → sambal turun lalu melimpah atas nasi → telur → timun satu-satu → bilis & kacang hujan → ayam → reveal kamera. Boleh diundur tepat (diuji). |
| Komposisi kamera | 6 | **7.5** | Pose kamera berbingkai mengikut nisbah skrin; hidangan dianjak jauh dari teks. Reveal desktop sebelum ini bertindih tajuk — dibetulkan. |
| Prestasi mudah alih | – | **? (belum diukur)** | ~45 draw calls; 113k segi tiga (Rendah) hingga ~730k (Tinggi). Telefon lalai = Sederhana. FPS sebenar di Android **belum diuji** (tiada peranti di persekitaran ini). |
| Impak visual keseluruhan | 5.5 | **7** | Kelihatan premium & menyelerakan dari jarak sederhana; dari dekat masih kelihatan "CG prosedur", belum foto-real. |

## Tiga kawasan paling lemah (selepas pusingan 1) dan tindakan

1. **Sambal** — warna, tembus butir, bintik → warna bata gelap, tepi minyak, ketebalan + ketulan
   bertingkat, terletak di atas lapisan butir, kepingan cili lebih besar & kurang kontras.
2. **Ayam goreng** — serbuk berbucu → ikosahedron licin & leper, lebih kecil, palet perang lebih dalam,
   bump lebih halus.
3. **Ikan bilis & kacang** — bertimbun jadi menara (pepijat solver) + bentuk "mi" → solver graviti
   (rehat paling rendah + golek ke ruang kosong), badan lebih pendek/leper, kacang lebih kecil.

## Kelemahan yang masih ada (jujur)

* Ikan bilis masih bukan ikan yang meyakinkan dari dekat (tiada mata/sirip jelas, terlalu licin).
* Nasi tiada kilauan basah santan & butir tidak melekat berkelompok.
* Daun pisang & meja kayu: tekstur prosedur kanvas — kelihatan "dilukis", bukan foto.
* Tiada subsurface scattering sebenar (nasi, telur, timun guna emisif kecil sebagai tipuan).
* Tiada kedalaman medan (DOF) / bokeh — gaya iklan sebenar biasanya ada; ditinggalkan demi prestasi mudah alih.
