import './styles/main.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { restaurant as R } from './config/restaurant.js';
import { sequence as SEQ } from './config/sequence.js';
import { createPlayer, pickFrameSet } from './sequence/player.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- copy from config
$$('[data-cfg="name"]').forEach((el) => { el.textContent = R.name; });
const waHref = R.whatsapp
  ? `https://wa.me/${R.whatsapp}?text=${encodeURIComponent(`Salam ${R.name}, saya nak order nasi lemak.`)}`
  : null;
$$('[data-order]').forEach((a) => {
  if (waHref) { a.href = waHref; a.target = '_blank'; a.rel = 'noopener'; }
  else a.setAttribute('aria-disabled', 'true');
});
$('#order-note').textContent = waHref ? '' : 'Nombor WhatsApp belum ditetapkan.';
$('#replay').addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
});

const CH = SEQ.chapters;
$('#chapters').innerHTML = CH.map((c, i) => `
  <article class="chap ${i % 2 ? 'chap--r' : 'chap--l'}" data-i="${i}">
    <p class="chap__num">${String(i + 1).padStart(2, '0')}<span>/${String(CH.length).padStart(2, '0')}</span></p>
    <h2 class="chap__title">${esc(c.title)}</h2>
    <p class="chap__line">${esc(c.line)}</p>
    <ul class="chap__notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
  </article>`).join('');
$('#ghosts').innerHTML = CH.map((c, i) => `<span class="ghost" data-i="${i}" style="--len:${c.ghost.length}">${esc(c.ghost)}</span>`).join('');
$('#progress').innerHTML = CH.map((c) => `<li><span></span><em>${esc(c.title)}</em></li>`).join('');

// ---------- player + camera push-in (transform on the frame canvas)
const front = $('#film-front');
const frameEl = $('#film-frame');
const cam = { s: 1, fx: 0.5, fy: 0.55, ox: 0 }; // scale, focus (video coords 0–1), x-shift (fraction of viewport)
let rect = { w: 1, h: 1 };
function applyCam() {
  const Fx = cam.fx * rect.w, Fy = cam.fy * rect.h;
  front.style.transform = `translate(${(Fx * (1 - cam.s)).toFixed(2)}px, ${(Fy * (1 - cam.s)).toFixed(2)}px) scale(${cam.s.toFixed(4)})`;
  frameEl.style.transform = cam.ox ? `translateX(${(cam.ox * window.innerWidth).toFixed(1)}px)` : '';
}
const player = createPlayer({
  frame: frameEl,
  front,
  back: $('#film-back'),
  cfg: SEQ,
  setName: pickFrameSet(SEQ.sets),
  onLoadProgress(p) {
    const el = $('#film-loading');
    el.textContent = p < 1 ? `Memuatkan ${Math.round(p * 100)}%` : '';
    el.classList.toggle('is-on', p < 1);
  },
  onLayout(r) { rect = r; applyCam(); },
});
window.__seq = player; // automated tests

// ---------- master timeline (scrubbed by scroll → fully reversible)
const film = { frame: 0 };
const tl = gsap.timeline({
  paused: true,
  defaults: { ease: 'none' },
  onUpdate() { player.drawHD(film.frame); applyCam(); },
});
const easeOut = 'power2.out', easeIn = 'power2.in';
const prog = $$('#progress li');

// intro: hold on the empty plate while the title splits away and the letterbox opens
tl.to('.intro__l1', { xPercent: -22, autoAlpha: 0, duration: 0.7, ease: easeIn }, 0.25)
  .to('.intro__l2', { xPercent: 22, autoAlpha: 0, duration: 0.7, ease: easeIn }, 0.3)
  .to('.intro__sub, .intro__cue, #intro .kicker', { autoAlpha: 0, y: -20, duration: 0.4 }, 0.2)
  .to('.film__bar', { scaleY: 0, duration: 0.8, ease: 'power2.inOut' }, 0.2)
  .to('.film__shade', { opacity: 0.6, duration: 0.8 }, 0.2)
  .fromTo('#progress', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.7);
let t = SEQ.intro.weight;

CH.forEach((c, i) => {
  const d = c.weight;
  const chap = `.chap[data-i="${i}"]`, ghost = `.ghost[data-i="${i}"]`;
  // video frames for this ingredient
  tl.fromTo(film, { frame: c.from }, { frame: c.to, duration: d, immediateRender: false }, t);
  // camera pushes in on the ingredient as it lands, then eases back
  tl.to(cam, { s: c.zoom, fx: c.focus[0], fy: c.focus[1], duration: d * 0.55, ease: 'sine.inOut' }, t)
    .to(cam, { s: 1.02, duration: d * 0.45, ease: 'sine.inOut' }, t + d * 0.55);
  // caption: in → readable hold → out
  tl.fromTo(chap, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: d * 0.18, ease: easeOut, immediateRender: false }, t + d * 0.04)
    .fromTo(`${chap} .chap__notes li`, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, stagger: d * 0.04, duration: d * 0.1, ease: easeOut, immediateRender: false }, t + d * 0.16)
    .to(chap, { autoAlpha: 0, y: -30, duration: d * 0.14, ease: easeIn }, t + d * 0.86);
  // giant ghost word drifting behind the caption
  tl.fromTo(ghost, { autoAlpha: 0, xPercent: i % 2 ? 5 : -5 }, { autoAlpha: 1, xPercent: 0, duration: d * 0.25, ease: easeOut, immediateRender: false }, t)
    .to(ghost, { xPercent: i % 2 ? -4 : 4, duration: d * 0.6 }, t + d * 0.25)
    .to(ghost, { autoAlpha: 0, duration: d * 0.15 }, t + d * 0.85);
  // progress marker fills across the chapter
  tl.fromTo(prog[i], { '--fill': 0 }, { '--fill': 1, duration: d, immediateRender: false }, t);
  t += d;
});

// finale: last frames settle, camera pulls back, title + CTA
const F = SEQ.finale;
tl.fromTo(film, { frame: F.from }, { frame: F.to, duration: F.weight * 0.6, immediateRender: false }, t)
  .to(cam, { s: 1, fx: 0.5, fy: 0.55, ox: matchMedia('(min-width: 900px) and (min-aspect-ratio: 4/5)').matches ? 0.2 : 0, duration: F.weight * 0.5, ease: 'sine.inOut' }, t)
  .to('.film__shade', { opacity: 1, duration: F.weight * 0.4 }, t + F.weight * 0.2)
  .to('#progress', { autoAlpha: 0, duration: F.weight * 0.2 }, t + F.weight * 0.2)
  .fromTo('.finale .kicker, .finale__title span, .finale__title em', { autoAlpha: 0, y: 50 },
    { autoAlpha: 1, y: 0, stagger: 0.12, duration: F.weight * 0.3, ease: easeOut, immediateRender: false }, t + F.weight * 0.25)
  .fromTo('.finale__tag, .finale__cta, .finale__note', { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, stagger: 0.08, duration: F.weight * 0.25, ease: easeOut, immediateRender: false }, t + F.weight * 0.5);
t += F.weight;

// initial (unscrolled) state
gsap.set('.chap, .ghost, .finale .kicker, .finale__title span, .finale__title em, .finale__tag, .finale__cta, .finale__note', { autoAlpha: 0 });

const st = ScrollTrigger.create({
  trigger: '#film',
  start: 'top top',
  end: () => `+=${Math.round(window.innerHeight * SEQ.vhPerUnit * t)}`,
  pin: true,
  anticipatePin: 1,
  invalidateOnRefresh: true,
  animation: tl,
  scrub: reduced ? true : 0.9,
});
window.__st = st;
window.__tl = tl;
player.ready.then(() => document.documentElement.classList.add('seq-ready'));
