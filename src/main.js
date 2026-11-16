import './styles/main.css';
import { gsap } from 'gsap';
import { restaurant as R } from './config/restaurant.js';
import { menus, floatersFor, availableImages } from './config/menu.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- config-driven bits
$$('[data-cfg="name"]').forEach((el) => { el.textContent = R.name; });
function orderHref(menu) {
  if (!R.whatsapp) return null;
  const txt = `Salam ${R.name}, saya nak order ${menu.kicker} ${menu.line1} ${menu.line2}.`;
  return `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(txt)}`;
}
$$('[aria-disabled="true"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

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
  $('#price').textContent = typeof m.price === 'number' ? `${R.currency} ${m.price.toFixed(2)}` : '';
  plateImg.alt = `${m.kicker} ${m.line1} ${m.line2}`;
  const href = orderHref(m);
  $$('[data-order]').forEach((a) => {
    if (href) { a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled'); }
    else { a.href = '#'; a.setAttribute('aria-disabled', 'true'); a.title = 'Nombor WhatsApp belum ditetapkan'; }
  });
  $('#idx').textContent = String(current + 1).padStart(2, '0');
  $$('.card').forEach((c, i) => { c.classList.toggle('is-active', i === current); c.setAttribute('aria-selected', String(i === current)); });
  // keep the active card visible in the horizontal scroller (phones) without scrolling the page
  const act = cardsEl.children[current];
  if (act && cardsEl.scrollWidth > cardsEl.clientWidth) {
    const left = act.offsetLeft - (cardsEl.clientWidth - act.offsetWidth) / 2;
    cardsEl.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
  }
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

// ---------- intro
gsap.from('.top > *', { y: -20, autoAlpha: 0, duration: reduced ? 0 : 0.8, ease: 'power3.out', stagger: 0.08 });
gsap.from('.switch, .copy__chips, .copy__cta', { y: 30, autoAlpha: 0, duration: reduced ? 0 : 1, ease: 'power3.out', delay: 0.5, stagger: 0.1 });
show(0);
window.__hero = { show, get current() { return current; }, get floaters() { return floaters.length; } };
