// ─────────────────────────────────────────────────────────────────────────────
//  KONFIGURASI KEDAI — ubah fail ini sahaja untuk maklumat perniagaan sebenar.
//  Nilai kosong ('' / null / []) dipaparkan sebagai "akan dikemas kini" di laman web,
//  supaya tiada maklumat palsu (harga, alamat, nombor telefon) dipaparkan.
// ─────────────────────────────────────────────────────────────────────────────
export const restaurant = {
  name: 'Lubok Sarapan',              // nama kedai (diambil daripada nama repo; tukar jika perlu)
  shortTagline: 'Nasi lemak, dibina dengan teliti.',

  // Format antarabangsa tanpa '+' atau sengkang, cth: '60123456789'. Kosong = butang WhatsApp dimatikan.
  whatsapp: '',
  phone: '',
  email: '',

  address: '',                         // cth: 'No. 1, Jalan Contoh, 12345 Bandar, Negeri'
  mapsUrl: '',                         // pautan Google Maps (pilihan). Jika kosong & ada alamat, pautan carian dijana.
  hours: [
    // { days: 'Isnin – Jumaat', time: '7:00 pagi – 12:00 tengah hari' },
  ],
  social: { instagram: '', facebook: '', tiktok: '' },
  currency: 'RM',

  // image = gambar dalam public/img/ (dipotong daripada frame video sebenar)
  menu: [
    { id: 'nl-ayam', name: 'Nasi Lemak Ayam Goreng', desc: 'Nasi santan, sambal, telur rebus, timun, ikan bilis, kacang dan ayam goreng berempah.', price: null, image: 'img/menu-full.webp', tag: 'Pilihan utama' },
    { id: 'nl-biasa', name: 'Nasi Lemak Biasa', desc: 'Nasi santan, sambal, telur rebus, timun, ikan bilis dan kacang.', price: null, image: 'img/menu-biasa.webp' },
    { id: 'ayam', name: 'Ayam Goreng Berempah', desc: 'Ayam goreng rangup berempah — tambahan untuk mana-mana pinggan.', price: null, image: 'img/menu-chicken.webp' },
    { id: 'sambal', name: 'Sambal Tambah', desc: 'Satu senduk lagi sambal pekat yang berkilat minyak.', price: null, image: 'img/menu-sambal.webp' },
    { id: 'telur', name: 'Telur Rebus', desc: 'Separuh atau sebiji penuh, untuk yang mahu lebih.', price: null, image: 'img/menu-egg.webp' },
  ],
  drinks: [
    { id: 'teh-tarik', name: 'Teh Tarik', price: null },
    { id: 'kopi-o', name: 'Kopi O', price: null },
    { id: 'milo-ais', name: 'Milo Ais', price: null },
  ],

  // Promosi contoh: tandakan example:true supaya lencana "Contoh" dipaparkan sehingga diganti.
  promotions: [
    { title: 'Set Sarapan Pagi', desc: 'Nasi lemak + minuman panas pada waktu pagi.', example: true },
    { title: 'Tambah Ayam', desc: 'Naik taraf mana-mana nasi lemak dengan ayam goreng berempah.', example: true },
    { title: 'Tempahan Pukal', desc: 'Untuk majlis, pejabat dan kenduri — hubungi kami melalui WhatsApp.', example: true },
  ],

  story: {
    title: 'Sarapan kebanggaan, satu pinggan.',
    paragraphs: [
      'Nasi lemak bukan sekadar makanan — ia rutin pagi, bekal ke tempat kerja, dan rasa rumah bagi ramai rakyat Malaysia.',
      'Di sini, setiap pinggan disusun lapis demi lapis: nasi yang lemak berlemak dengan santan, sambal yang ditumis sabar, dan lauk yang digoreng sehingga rangup.',
    ],
    pillars: [
      { title: 'Nasi santan', text: 'Wangi pandan, lembut dan berbutir.' },
      { title: 'Sambal', text: 'Pedas, manis, pekat — jiwa nasi lemak.' },
      { title: 'Lauk rangup', text: 'Ayam, ikan bilis dan kacang yang garing.' },
    ],
  },

  // Kapsyen setiap langkah animasi (urutan sama dengan src/config/sequence.js → steps).
  assemblySteps: [
    { title: 'Pinggan kosong', text: 'Pinggan seramik hangat — sedia untuk diisi.' },
    { title: 'Nasi santan', text: 'Beras wangi ditanak bersama santan dan daun pandan.' },
    { title: 'Sambal', text: 'Sambal cili ditumis perlahan sehingga pecah minyak — pedas, manis, berkilat.' },
    { title: 'Telur rebus', text: 'Telur rebus dibelah dua, kuning telurnya keemasan.' },
    { title: 'Timun', text: 'Hirisan timun segar untuk rasa sejuk yang mengimbangi sambal.' },
    { title: 'Ikan bilis', text: 'Ikan bilis digoreng garing hingga keemasan.' },
    { title: 'Kacang tanah', text: 'Kacang goreng — rangup dan sedikit masin.' },
    { title: 'Ayam goreng', text: 'Ayam diperap rempah, digoreng hingga kulitnya rangup keemasan.' },
    { title: 'Siap dihidang', text: 'Setiap suapan, penuh rasa.' },
  ],
};
