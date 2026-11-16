// Hero menu switcher. Each menu: plate photo (cut out, public/img/hero/), title lines,
// background colours and its floating ingredients.
// `plate: null` = photo not supplied yet → card shows "Akan datang" and cannot be selected.

const base = 'img/hero/';

// Floating ingredient layout, in units of the plate's width (W), relative to the plate centre.
// depth: parallax strength (0 = far, 1+ = near). blur: px (far layers). size: × W. rot: degrees.
// front: true → drawn above the plate.
const common = [
  { img: 'daun-pandan', x: -0.5, y: -0.2, size: 0.4, rot: -38, depth: 0.25, blur: 5 },
  { img: 'daun-pandan', x: 0.48, y: -0.5, size: 0.32, rot: 142, depth: 0.3, blur: 4 },
  { img: 'cili', x: -0.18, y: -0.54, size: 0.24, rot: 32, depth: 0.55, blur: 1.5 },
  { img: 'timun', x: 0.5, y: -0.36, size: 0.22, rot: 24, depth: 0.7 },
  { img: 'timun', x: -0.56, y: 0.42, size: 0.15, rot: -30, depth: 0.35, blur: 3 },
  { img: 'kacang', x: 0.18, y: 0.5, size: 0.17, rot: 10, depth: 1.1, front: true },
  { img: 'kacang', x: 0.6, y: 0.08, size: 0.11, rot: -40, depth: 0.4, blur: 2 },
  { img: 'ikan-bilis', x: -0.5, y: 0.12, size: 0.26, rot: -12, depth: 0.85, front: true },
  { img: 'telur', x: -0.38, y: -0.36, size: 0.24, rot: 14, depth: 0.9, front: true },
];

export const menus = [
  {
    id: 'ayam', kicker: 'Nasi Lemak', line1: 'Ayam', line2: 'Goreng',
    desc: 'Ayam goreng rangup bersama nasi santan, sambal, telur rebus, timun, ikan bilis dan kacang.',
    plate: `${base}hidangan-ayam.webp`, price: null,
    colors: { inner: '#cf6a2c', mid: '#6e2a0f', outer: '#1a0904' },
    signature: { img: 'ayam', x: 0.4, y: 0.36, size: 0.34, rot: -24, depth: 1.25, front: true },
  },
  {
    id: 'paru', kicker: 'Nasi Lemak', line1: 'Sambal', line2: 'Paru',
    desc: 'Paru goreng bersalut sambal pekat, dihidang dengan nasi santan dan lauk lengkap.',
    plate: `${base}hidangan-paru.webp`, price: null,
    colors: { inner: '#a8402c', mid: '#561710', outer: '#160504' },
    signature: { img: 'paru', x: 0.46, y: 0.32, size: 0.3, rot: -18, depth: 1.25, front: true },
  },
  {
    id: 'udang', kicker: 'Nasi Lemak', line1: 'Sambal', line2: 'Udang',
    desc: 'Udang besar dimasak sambal merah berkilat, dengan nasi santan dan lauk lengkap.',
    plate: `${base}hidangan-udang.webp`, price: null,
    colors: { inner: '#e0663c', mid: '#842a14', outer: '#200905' },
    signature: { img: 'udang', x: 0.46, y: 0.32, size: 0.3, rot: -18, depth: 1.25, front: true },
  },
  {
    id: 'sotong', kicker: 'Nasi Lemak', line1: 'Sambal', line2: 'Sotong',
    desc: 'Sotong lembut dalam sambal pedas manis, dengan nasi santan dan lauk lengkap.',
    plate: `${base}hidangan-sotong.webp`, price: null,
    colors: { inner: '#bb2a30', mid: '#5c0f16', outer: '#180305' },
    signature: { img: 'sotong', x: 0.46, y: 0.32, size: 0.28, rot: -18, depth: 1.25, front: true },
  },
  {
    id: 'kerang', kicker: 'Nasi Lemak', line1: 'Sambal', line2: 'Kerang',
    desc: 'Kerang segar dimasak sambal, dengan nasi santan dan lauk lengkap.',
    plate: `${base}hidangan-kerang.webp`, price: null,
    colors: { inner: '#a3613a', mid: '#4d2914', outer: '#130904' },
    signature: { img: 'kerang', x: 0.46, y: 0.32, size: 0.28, rot: -18, depth: 1.25, front: true },
  },
  {
    id: 'telur-mata', kicker: 'Nasi Lemak', line1: 'Telur', line2: 'Mata',
    desc: 'Telur mata goreng bertepi rangup, kuning cair, dengan nasi santan dan sambal.',
    plate: `${base}hidangan-telur-mata.webp`, price: null,
    colors: { inner: '#dba236', mid: '#835012', outer: '#211204' },
    exclude: ['telur'], // no boiled egg on this plate
    signature: { img: 'telur-mata', x: 0.46, y: 0.32, size: 0.3, rot: -12, depth: 1.25, front: true },
  },
];

export function floatersFor(menu) {
  const ex = new Set(menu.exclude || []);
  return [...common.filter((f) => !ex.has(f.img)), menu.signature].map((f) => ({ ...f, src: `${base}${f.img}.webp` }));
}

/** Ingredient images that exist (signature images of menus without a photo are skipped). */
export const availableImages = new Set(['daun-pandan', 'cili', 'timun', 'kacang', 'ikan-bilis', 'telur', 'ayam', 'udang', 'paru', 'kerang', 'telur-mata', 'sotong']);

// "Menu Lain" section below the hero. image: cut-out in public/img/hero/ (null = elegant text tile).
// price: number in RM, or null to hide.
export const otherMenus = [
  { id: 'bakso', name: 'Bakso', desc: 'Bebola daging dalam kuah panas yang beraroma.', image: null, price: null },
  { id: 'mee-kari', name: 'Mee Kari', desc: 'Mee dalam kuah kari pekat dan berempah.', image: null, price: null },
  { id: 'roti-canai', name: 'Roti Canai', desc: 'Roti canai rangup di luar, lembut di dalam, dengan kuah.', image: null, price: null },
];
