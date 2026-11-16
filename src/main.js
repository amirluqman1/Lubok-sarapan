import './styles/main.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { renderSite, applySnapshots } from './ui/site.js';
import { getStoredQuality, storeQuality } from './three/core/quality.js';
import { stepIndexAt } from './three/core/assembly.js';
import { smoothstep, clamp, lerp } from './three/util/random.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s) => document.querySelector(s);
const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

function finishLoader() {
  $('#loader').classList.add('is-done');
  setTimeout(() => $('#loader')?.remove(), 1200);
}

function fallback(reason) {
  root.classList.add('no-webgl');
  const msg = document.createElement('p');
  msg.className = 'webgl-msg';
  msg.textContent = reason || 'Peranti atau pelayar ini tidak menyokong WebGL, jadi paparan 3D dimatikan. Semua maklumat menu masih tersedia.';
  $('.hero__copy').appendChild(msg);
  document.querySelectorAll('#steps li').forEach((li) => li.classList.add('is-active'));
  $('#reveal').classList.add('is-on');
  finishLoader();
}

async function main() {
  renderSite();
  const params = new URLSearchParams(location.search);
  if (!hasWebGL() || params.has('nowebgl')) return fallback();

  const select = $('#quality-select');
  const pref = getStoredQuality();
  select.value = pref;

  let exp;
  try {
    const { createExperience } = await import('./three/experience.js');
    exp = await createExperience({
      canvas: $('#stage'),
      qualityPref: pref,
      reducedMotion,
      still: params.has('still'),
      onProgress(p, label) {
        $('#loader-fill').style.width = `${Math.round(p * 100)}%`;
        $('#loader-pct').textContent = `${Math.round(p * 100)}%`;
        if (label) $('#loader-step').textContent = label;
      },
    });
  } catch (err) {
    console.error('[3D] init failed', err);
    return fallback('Paparan 3D gagal dimulakan pada peranti ini. Semua maklumat menu masih tersedia.');
  }
  window.__nl = exp; // debug / automated tests

  // real renders of the model for the menu cards
  try {
    const all = ['rice', 'sambal', 'egg', 'cucumber', 'anchovy', 'peanut', 'chicken'];
    applySnapshots(exp.snapshots([
      { id: 'full', parts: all, pose: { az: 0.5, el: 0.66, fit: 0.8, ty: 0.08 } },
      { id: 'biasa', parts: all.filter((p) => p !== 'chicken'), pose: { az: 0.2, el: 0.72, fit: 0.78, ty: 0.06 } },
      { id: 'chicken', parts: ['chicken', 'rice', 'sambal', 'cucumber'], pose: { az: 0.35, el: 0.5, fit: 0.36, ty: 0.12, tx: 0.3, tz: 0.46 } },
      { id: 'sambal', parts: ['rice', 'sambal', 'egg'], pose: { az: 0.05, el: 0.62, fit: 0.37, ty: 0.24, tx: -0.13, tz: -0.25 } },
      { id: 'egg', parts: all, pose: { az: 0.75, el: 0.75, fit: 0.3, ty: 0.08, tx: 0.55, tz: -0.27 } },
    ]));
  } catch (err) { console.warn('[3D] snapshots skipped', err); }

  select.addEventListener('change', () => { storeQuality(select.value); exp.setQuality(select.value); });

  // ---------- scroll choreography
  ScrollTrigger.create({
    trigger: '#hero', start: 'top top', end: 'bottom top',
    onUpdate: (s) => exp.setScroll({ hero: 1 - s.progress }),
  });
  const assemblyST = ScrollTrigger.create({
    trigger: '#assembly', start: 'top top', end: () => `+=${Math.round(window.innerHeight * 5)}`,
    pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (s) => exp.setScroll({ asm: s.progress }),
  });
  ScrollTrigger.create({
    trigger: '#showcase', start: 'top 55%', end: 'bottom 35%',
    onToggle: (s) => exp.setShowcase(s.isActive),
  });
  ScrollTrigger.create({
    trigger: '#menu', start: 'top top', end: 'max',
    onToggle: (s) => { exp.setStageActive(!s.isActive); root.classList.toggle('is-stage-off', s.isActive); },
  });

  // ---------- 360 controls UI
  $('#rot-reset').addEventListener('click', () => exp.controls.reset());
  $('#rot-left').addEventListener('click', () => exp.controls.nudge(-1));
  $('#rot-right').addEventListener('click', () => exp.controls.nudge(1));
  $('#rot-free').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    exp.controls.setFree(on);
    $('#showcase-hint').textContent = on
      ? 'Mod putar bebas: seret ke mana-mana arah. Matikan untuk skrol semula di kawasan ini.'
      : 'Seret ke kiri / kanan untuk memusing pinggan. Skrol seperti biasa untuk teruskan.';
  });

  // ---------- per-frame UI sync (captions follow the *smoothed* 3D progress)
  const stepsEl = $('#steps');
  const steps = [...stepsEl.querySelectorAll('li')];
  const reveal = $('#reveal'), railFill = $('#rail-fill'), pct = $('#pct'), showcaseEl = $('#showcase');
  let lastStep = -1;
  gsap.ticker.add(() => {
    const a = exp.asm;
    const idx = Math.min(7, stepIndexAt(a));
    const r = smoothstep(0.9, 0.97, a);
    if (idx !== lastStep) { steps.forEach((li, i) => li.classList.toggle('is-active', i === idx)); lastStep = idx; }
    stepsEl.style.opacity = String(1 - r);
    railFill.style.transform = `scaleX(${a.toFixed(4)})`;
    pct.textContent = Math.round(a * 100);
    reveal.style.opacity = r.toFixed(3);
    reveal.style.transform = innerWidth >= 900 ? `translateY(calc(-50% + ${(1 - r) * 16}px))` : `translateY(${(1 - r) * 16}px)`;
    reveal.classList.toggle('is-on', r > 0.01);

    const vh = innerHeight;
    const show = clamp(1 - showcaseEl.getBoundingClientRect().top / vh, 0, 1);
    const portrait = innerWidth / vh < 0.85;
    exp.setFraming(portrait
      ? { ox: 0, oy: lerp(lerp(0.11, 0.06, exp.hero) * (1 - r) + 0.04 * r, 0.0, show) }
      : { ox: lerp(lerp(lerp(0.13, 0.21, r), 0.17, exp.hero), 0, Math.max(show, 0)), oy: 0 });
  });

  window.__st = { assembly: assemblyST };
  finishLoader();
  ScrollTrigger.refresh();
}

main();
