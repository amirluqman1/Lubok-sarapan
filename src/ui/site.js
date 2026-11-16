// Config-driven website UI: menu cards, story, promos, location, hours, WhatsApp order builder, nav.
import { restaurant as R } from '../config/restaurant.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtPrice = (p) => (typeof p === 'number' ? `${R.currency} ${p.toFixed(2)}` : null);

const cart = new Map(); // id -> qty
const allItems = () => [...R.menu, ...R.drinks];

function priceHTML(p) {
  const f = fmtPrice(p);
  return f ? `<span class="price">${f}</span>` : '<span class="price price--tbd">Harga akan dikemas kini</span>';
}

function qtyHTML(id) {
  const q = cart.get(id) || 0;
  if (!q) return `<button class="add-btn" data-add="${id}">+ Tambah</button>`;
  return `<span class="qty"><button data-dec="${id}" aria-label="Kurang">−</button><output>${q}</output><button data-add="${id}" aria-label="Tambah">+</button></span>`;
}

export function renderSite() {
  document.querySelectorAll('[data-cfg="name"]').forEach((el) => { el.textContent = R.name; });
  document.title = `${R.name} — Nasi Lemak Istimewa`;

  // menu
  $('#menu-grid').innerHTML = R.menu.map((m) => `
    <article class="card" data-id="${m.id}">
      <div class="card__img">${m.tag ? `<span class="card__tag">${esc(m.tag)}</span>` : ''}${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}" loading="lazy" decoding="async" width="800" height="600" />` : ''}</div>
      <div class="card__body">
        <h3>${esc(m.name)}</h3>
        <p>${esc(m.desc)}</p>
        <div class="card__foot">${priceHTML(m.price)}<span data-qty="${m.id}">${qtyHTML(m.id)}</span></div>
      </div>
    </article>`).join('');
  $('#drinks').innerHTML = `<h3>Minuman</h3>` + R.drinks.map((d) => `
    <div class="drink"><span>${esc(d.name)}</span><span class="card__foot" style="margin:0;padding:0">${priceHTML(d.price)}<span data-qty="${d.id}">${qtyHTML(d.id)}</span></span></div>`).join('');

  // story
  $('[data-cfg="story.title"]').textContent = R.story.title;
  $('#story-body').innerHTML = R.story.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
  $('#pillars').innerHTML = R.story.pillars.map((p) => `<li><strong>${esc(p.title)}</strong><span>${esc(p.text)}</span></li>`).join('');

  // promos
  $('#promos').innerHTML = R.promotions.length
    ? R.promotions.map((p) => `<article class="promo">${p.example ? '<span class="badge">Contoh</span>' : ''}<h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p></article>`).join('')
    : '<p class="tbd">Tiada promosi buat masa ini.</p>';

  // location & hours
  const addr = $('#addr');
  if (R.address) addr.textContent = R.address;
  else addr.innerHTML = '<span class="tbd">Alamat akan dikemas kini.</span>';
  const maps = $('#maps-link');
  const mapsUrl = R.mapsUrl || (R.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(R.address)}` : '');
  if (mapsUrl) { maps.href = mapsUrl; maps.hidden = false; }
  $('#hours').innerHTML = R.hours.length
    ? R.hours.map((h) => `<dt>${esc(h.days)}</dt><dd>${esc(h.time)}</dd>`).join('')
    : '<dt class="tbd">Waktu operasi akan diumumkan.</dt><dd></dd>';

  $('#footer-copy').textContent = `© ${new Date().getFullYear()} ${R.name}.`;

  bindCart();
  bindNav();
  updateOrder();
}

function bindCart() {
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]'), dec = e.target.closest('[data-dec]');
    if (!add && !dec) return;
    const id = (add || dec).dataset.add || (add || dec).dataset.dec;
    const q = (cart.get(id) || 0) + (add ? 1 : -1);
    if (q <= 0) cart.delete(id); else cart.set(id, q);
    document.querySelectorAll(`[data-qty="${id}"]`).forEach((el) => { el.innerHTML = qtyHTML(id); });
    updateOrder();
  });
}

function updateOrder() {
  const items = allItems().filter((i) => cart.has(i.id));
  const total = items.reduce((n, i) => n + cart.get(i.id), 0);
  const summary = $('#order-summary');
  summary.innerHTML = items.length
    ? `<strong>Pesanan anda</strong><ul>${items.map((i) => `<li>${cart.get(i.id)} × ${esc(i.name)}</li>`).join('')}</ul>`
    : 'Belum ada item dipilih — anda masih boleh terus mesej kami.';
  const bar = $('#cartbar');
  bar.hidden = total === 0;
  $('#cart-count').textContent = `${total} item`;

  const wa = $('#wa-btn'), note = $('#wa-note');
  const lines = items.map((i) => `- ${cart.get(i.id)} x ${i.name}`);
  const msg = `Salam ${R.name}, saya nak order:\n${lines.length ? lines.join('\n') : '- (sila nyatakan)'}\n\nNama:\nAmbil sendiri / hantar:`;
  if (R.whatsapp) {
    wa.href = `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(msg)}`;
    wa.removeAttribute('aria-disabled');
    note.textContent = 'Mesej akan dibuka dalam WhatsApp — semak sebelum hantar.';
  } else {
    wa.removeAttribute('href');
    wa.setAttribute('aria-disabled', 'true');
    note.textContent = 'Nombor WhatsApp belum ditetapkan (src/config/restaurant.js → whatsapp).';
  }
}

function bindNav() {
  const nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer');
  const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const close = () => { drawer.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Buka menu'); };
  burger.addEventListener('click', () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  });
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
