import './styles/main.css';
import { gsap } from 'gsap';
import { restaurant as R } from './config/restaurant.js';
import { menus, floatersFor, availableImages } from './config/menu.js';
import { loadMenu, statusOf } from './data/menu-store.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- config-driven bits
$$('[data-cfg]').forEach((el) => { if (R[el.dataset.cfg]) el.textContent = R[el.dataset.cfg]; });
$('#foot-copy').textContent = `© ${new Date().getFullYear()} ${R.fullName || R.name}`;
const price = (p) => (p != null && p !== '' && !Number.isNaN(Number(p)) ? `${R.currency} ${Number(p).toFixed(2)}` : '');
const STATUS_TEXT = { habis: 'Habis hari ini', tutup: 'Tidak tersedia' };

// ---------- live menu data (Neon) — statuses, prices, full "Menu Lain" list
let menuData = null;

function renderMenuLain(data) {
  const cats = data.categories.filter((c) => c.in_list);
  $('#more-nav').innerHTML = cats.map((c) => `<a class="more__chip" href="#cat-${esc(c.id)}">${esc(c.name)}</a>`).join('');
  $('#more-grid').innerHTML = cats.map((c, ci) => {
    const items = data.items.filter((i) => i.category === c.id);
    // available first, sold-out / unavailable last
    items.sort((a, b) => (statusOf(a) !== 'ada') - (statusOf(b) !== 'ada') || a.sort_order - b.sort_order);
    const rows = items.map((i) => {
      const st = statusOf(i);
      return `
        <li class="mi${st !== 'ada' ? ' mi--off' : ''}">
          ${i.image ? `<img class="mi__img" src="${esc(i.image)}" alt="" loading="lazy" decoding="async" />` : ''}
          <div class="mi__main">
            <p class="mi__name">${esc(i.name)}${st !== 'ada' ? ` <span class="badge badge--${st}">${STATUS_TEXT[st]}</span>` : ''}</p>
            ${i.description ? `<p class="mi__desc">${esc(i.description)}</p>` : ''}
            ${i.options.length ? `<p class="mi__opts">${i.options.map((o) => `<span>${esc(o)}</span>`).join('')}</p>` : ''}
          </div>
          ${price(i.price) ? `<p class="mi__price">${price(i.price)}</p>` : ''}
        </li>`;
    }).join('');
    return `
      <article class="cat" id="cat-${esc(c.id)}" style="--i:${ci}">
        <header class="cat__head">
          <h3 class="cat__name">${esc(c.name)}</h3>
          ${c.options?.length ? `<p class="cat__opts"><span class="cat__opts-label">${esc(c.options_label || 'Pilihan')}:</span> ${c.options.map((o) => `<span>${esc(o)}</span>`).join('')}</p>` : ''}
        </header>
        ${items.length ? `<ul class="cat__list">${rows}</ul>` : '<p class="cat__empty">Senarai akan dikemas kini.</p>'}
      </article>`;
  }).join('');
  const obs = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); obs.unobserve(e.target); }
  }), { threshold: 0.08 });
  $$('.cat').forEach((d) => obs.observe(d));
  $('#more-status').textContent = data.source === 'live' ? 'Status menu dikemas kini secara langsung.' : '';
}

function applyHeroStatus() {
  if (!menuData) return;
  $$('.card').forEach((c) => {
    const st = statusOf(menuData.byId[menus[+c.dataset.i]?.id]);
    c.classList.toggle('is-off', st !== 'ada');
    let b = c.querySelector('.card__badge');
    if (st !== 'ada') {
      if (!b) { b = document.createElement('span'); b.className = 'card__badge'; c.querySelector('.card__img').appendChild(b); }
      b.textContent = st === 'habis' ? 'Habis' : 'Tiada';
    } else b?.remove();
  });
}

loadMenu().then((data) => {
  menuData = data;
  renderMenuLain(data);
  applyHeroStatus();
  if (current >= 0) setStatus(menus[current]);
});

// ---------- menu cards
const cardsEl = $('#cards');
cardsEl.innerHTML = menus.map((m, i) => `
  <button class="card${m.plate ? '' : ' is-soon'}" role="option" data-i="${i}" ${m.plate ? '' : 'aria-disabled="true"'}>
    <span class="card__img">${m.plate ? `<img src="${m.plate}" alt="" loading="lazy" width="160" height="118" />` : '<span class="card__soon">Akan<br />datang</span>'}</span>
    <span class="card__name">${esc(m.line1)} ${esc(m.line2)}</span>
  </button>`).join('');
$('#total').textContent = String(menus.length).padStart(2, '0');

// ---------- floating ingredients
const stage = $('#stage'), back = $('#layer-back'), front = $('#layer-front');
const plate = $('#plate'), plateImg = $('#plate-img');
let floaters = [];
let W = 400; // plate width in px (layout unit for floaters)

function measure() { W = plate.getBoundingClientRect().width / (gsap.getProperty(plate, 'scale') || 1); }

function buildFloaters(menu) {
  const list = floatersFor(menu).filter((f) => availableImages.has(f.img));
  return list.map((f, k) => {
    const wrap = document.createElement('div');
    wrap.className = 'floater';
    const par = document.createElement('div'); // parallax layer
    par.className = 'floater__par';
    const img = document.createElement('img');  // bob + rotation layer
    img.src = f.src; img.alt = ''; img.decoding = 'async';
    if (f.blur) img.style.filter = `blur(${f.blur}px) brightness(.82)`;
    par.appendChild(img);
    wrap.appendChild(par);
    (f.front ? front : back).appendChild(wrap);
    const o = { el: wrap, par, img, f, k };
    gsap.set(par, { x: px.x * f.depth * 26, y: px.y * f.depth * 26 });
    place(o);
    return o;
  });
}
function place(o) {
  const { f } = o;
  const size = f.size * W;
  Object.assign(o.el.style, { width: `${size}px`, height: `${size}px`, left: `calc(50% + ${f.x * W - size / 2}px)`, top: `calc(50% + ${f.y * W - size / 2}px)` });
}

function idle(o) {
  if (reduced) return;
  const amp = 6 + 10 * o.f.depth;
  o.bob = gsap.to(o.img, { y: `+=${amp}`, rotation: `+=${(o.k % 2 ? -1 : 1) * (3 + 3 * o.f.depth)}`, duration: 2.6 + (o.k % 5) * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: (o.k % 7) * 0.2 });
}

function enter(list, from = 0.35) {
  list.forEach((o) => {
    gsap.set(o.img, { rotation: o.f.rot });
    gsap.fromTo(o.el, { x: -o.f.x * W * from, y: -o.f.y * W * from, scale: 0.3, autoAlpha: 0 },
      { x: 0, y: 0, scale: 1, autoAlpha: 1, duration: reduced ? 0 : 1.1, ease: 'expo.out', delay: reduced ? 0 : 0.05 * o.k, onComplete: () => idle(o) });
  });
}
function leave(list) {
  return Promise.all(list.map((o) => new Promise((res) => {
    o.bob?.kill();
    gsap.to(o.el, { x: o.f.x * W * 0.6, y: o.f.y * W * 0.6, scale: 0.6, autoAlpha: 0, duration: reduced ? 0 : 0.45, ease: 'power2.in', delay: reduced ? 0 : 0.015 * o.k, onComplete: () => { o.el.remove(); res(); } });
  })));
}

// ---------- parallax (pointer on desktop, device tilt on phones)
const px = { x: 0, y: 0 };
function parallaxTo(nx, ny) {
  px.x = nx; px.y = ny;
  if (reduced) return;
  for (const o of floaters) {
    const d = o.f.depth * 26;
    gsap.to(o.par, { x: nx * d, y: ny * d, duration: 0.9, ease: 'power3.out', overwrite: 'auto' });
  }
  gsap.to(plate, { rotationY: nx * 6, rotationX: -ny * 6, x: nx * 6, y: ny * 6, duration: 1, ease: 'power3.out', overwrite: 'auto' });
}
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  parallaxTo((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
}, { passive: true });
window.addEventListener('deviceorientation', (e) => {
  if (e.gamma == null) return;
  parallaxTo(Math.max(-1, Math.min(1, e.gamma / 25)), Math.max(-1, Math.min(1, (e.beta - 45) / 25)));
}, { passive: true });

// ---------- switching menus
let current = -1, busy = false;
const root = document.documentElement;

function setCopy(m) {
  $('#kicker').textContent = m.kicker;
  $('#line1').textContent = m.line1;
  $('#line2').textContent = m.line2;
  $('#desc').textContent = m.desc;
  setStatus(m);
  plateImg.alt = `${m.kicker} ${m.line1} ${m.line2}`;
  $('#idx').textContent = String(current + 1).padStart(2, '0');
  $$('.card').forEach((c, i) => { c.classList.toggle('is-active', i === current); c.setAttribute('aria-selected', String(i === current)); });
  // keep the active card visible in the horizontal scroller (phones) without scrolling the page
  const act = cardsEl.children[current];
  if (act && cardsEl.scrollWidth > cardsEl.clientWidth) {
    const left = act.offsetLeft - (cardsEl.clientWidth - act.offsetWidth) / 2;
    cardsEl.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
  }
}

// price + "habis hari ini" badge for the menu shown in the hero (data from Neon when available)
function setStatus(m) {
  const live = menuData?.byId[m.id];
  $('#price').textContent = price(live?.price ?? m.price);
  const st = statusOf(live);
  const el = $('#hero-status');
  el.textContent = st === 'ada' ? '' : STATUS_TEXT[st];
  el.className = `copy__status${st !== 'ada' ? ` badge badge--${st}` : ''}`;
}

async function show(i, dir = 1) {
  const m = menus[i];
  if (!m || !m.plate || busy || i === current) return;
  busy = true;
  const first = current < 0;
  current = i;
  const d = reduced ? 0 : 1;

  gsap.to(root, { '--bg-inner': m.colors.inner, '--bg-mid': m.colors.mid, '--bg-outer': m.colors.outer, duration: 1.2 * d, ease: 'power2.inOut' });

  if (!first) {
    const old = floaters;
    floaters = [];
    await Promise.all([
      leave(old),
      gsap.to('.copy .word, .copy__desc, .copy__kicker', { yPercent: -110, autoAlpha: 0, duration: 0.35 * d, ease: 'power2.in', stagger: 0.04 * d }),
      gsap.to(plateImg, { xPercent: -60 * dir, rotation: -25 * dir, autoAlpha: 0, scale: 0.85, duration: 0.5 * d, ease: 'power2.in' }),
    ]);
  }
  setCopy(m);
  if (plateImg.getAttribute('src') !== m.plate) {
    plateImg.src = m.plate;
    try { await plateImg.decode(); } catch { /* ignore */ }
  }
  measure();
  floaters = buildFloaters(m);

  gsap.fromTo(plateImg, { xPercent: 60 * dir, rotation: 25 * dir, autoAlpha: 0, scale: first ? 0.7 : 0.85 },
    { xPercent: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: (first ? 1.4 : 0.9) * d, ease: 'expo.out' });
  gsap.fromTo('.copy .word, .copy__desc, .copy__kicker', { yPercent: 110, autoAlpha: 0 },
    { yPercent: 0, autoAlpha: 1, duration: 0.7 * d, ease: 'expo.out', stagger: 0.06 * d, delay: 0.1 * d });
  enter(floaters);
  setTimeout(() => { busy = false; }, first ? 600 : 400);
}

function step(dir) {
  let i = current;
  for (let n = 0; n < menus.length; n++) {
    i = (i + dir + menus.length) % menus.length;
    if (menus[i].plate) return show(i, dir);
  }
}
cardsEl.addEventListener('click', (e) => {
  const c = e.target.closest('.card');
  if (!c || c.classList.contains('is-soon')) return;
  const i = +c.dataset.i;
  show(i, i > current ? 1 : -1);
});
$('#prev').addEventListener('click', () => step(-1));
$('#next').addEventListener('click', () => step(1));
window.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

// swipe on the stage (phones)
let sx = null;
stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (sx == null) return;
  const dx = e.changedTouches[0].clientX - sx; sx = null;
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
}, { passive: true });

window.addEventListener('resize', () => { measure(); floaters.forEach(place); });

// ---------- 1. intro screen: logo pops in, then the sentence rises in word by word
const line = $('#intro-line');
// break after commas so the sentence reads as balanced lines ("Sarapan sedap, / setiap hari.")
line.innerHTML = (R.introLine || R.shortTagline).split(/(?<=,)\s+/).map((part) =>
  part.split(' ').map((w) => `<span class="w"><span class="w__in">${esc(w)}</span></span>`).join(' ')).join('<br />');
const D = reduced ? 0 : 1;
gsap.timeline({ delay: 0.15 * D })
  .from('.intro__glow', { scale: 0.4, autoAlpha: 0, duration: 1.4 * D, ease: 'power2.out' }, 0)
  .from('#intro-logo', { scale: 0.4, rotation: -18, autoAlpha: 0, duration: 1.1 * D, ease: 'back.out(1.7)' }, 0.1)
  .from('.w__in', { yPercent: 115, rotation: 6, duration: 0.8 * D, ease: 'expo.out', stagger: 0.09 * D }, 0.75)
  .from('.intro__cue', { y: 16, autoAlpha: 0, duration: 0.8 * D, ease: 'power2.out' }, 1.5);
if (!reduced) gsap.to('#intro-logo', { y: -10, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.3 });

// header: hidden on the intro, slides in once the visitor scrolls past it
const topBar = $('#top');
const introObs = new IntersectionObserver(([e]) => {
  topBar.classList.toggle('is-on', !e.isIntersecting || e.intersectionRatio < 0.35);
}, { threshold: [0, 0.35, 0.6] });
introObs.observe($('#intro'));

// active nav pill follows the section in view
const navObs = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) $$('.pill__item').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === e.target.id));
}), { threshold: 0.45 });
navObs.observe($('#hero'));
navObs.observe($('#menu-lain'));

// ---------- 2. hero starts when it scrolls into view
gsap.set('.copy .word, .copy__desc, .copy__kicker, .switch, .copy__chips', { autoAlpha: 0 });
gsap.set(plateImg, { autoAlpha: 0 });
let heroStarted = false;
const heroObs = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting || heroStarted) return;
  heroStarted = true;
  heroObs.disconnect();
  show(0);
  gsap.fromTo('.switch, .copy__chips', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1 * D, ease: 'power3.out', delay: 0.5 * D, stagger: 0.1 * D });
}, { threshold: 0.3 });
heroObs.observe($('#hero'));
window.__hero = { show, get current() { return current; }, get floaters() { return floaters.length; } };
