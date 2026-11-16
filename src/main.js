import './styles/main.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { renderSite } from './ui/site.js';
import { restaurant } from './config/restaurant.js';
import { sequence as SEQ } from './config/sequence.js';
import { createPlayer, pickFrameSet } from './sequence/player.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

renderSite();

// ---------- ingredient chips (light up as each one lands)
const chipSteps = SEQ.steps.filter((s) => !['plate', 'done'].includes(s.key));
$('#seq-chips').innerHTML = chipSteps
  .map((s) => `<li data-key="${s.key}">${restaurant.assemblySteps[SEQ.steps.indexOf(s)].title}</li>`)
  .join('');
const chips = [...document.querySelectorAll('#seq-chips li')];

// ---------- player
const setName = pickFrameSet(SEQ.sets);
const player = createPlayer({
  front: $('#seq-front'),
  back: $('#seq-back'),
  cfg: SEQ,
  setName,
  onLoadProgress(p) {
    const el = $('#seq-loading');
    el.textContent = p < 1 ? `Memuatkan ${Math.round(p * 100)}%` : '';
    el.classList.toggle('is-on', p < 1);
  },
});
window.__seq = player; // for automated tests

// ---------- step captions (text is visible during the animation, swapped per ingredient)
const stepEl = $('#seq-step'), numEl = $('#seq-num'), titleEl = $('#seq-stitle'), textEl = $('#seq-stext');
const hint = $('#seq-hint'), endEl = $('#seq-end'), rail = $('#seq-rail');
const total = SEQ.steps.length - 1; // "done" is not numbered
let shownStep = -1;
function stepAt(frame) {
  let k = 0;
  for (let i = 0; i < SEQ.steps.length; i++) if (frame >= SEQ.steps[i].at) k = i;
  return k;
}
function showStep(k) {
  if (k === shownStep) return;
  shownStep = k;
  const copy = restaurant.assemblySteps[k];
  const swap = () => {
    numEl.textContent = SEQ.steps[k].key === 'done' ? 'Hidangan lengkap' : `${String(k + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    titleEl.textContent = copy.title;
    textEl.textContent = copy.text;
  };
  if (reducedMotion) return swap();
  gsap.timeline()
    .to(stepEl, { autoAlpha: 0, y: -8, duration: 0.15, ease: 'power1.in' })
    .add(swap)
    .fromTo(stepEl, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' });
}

const doneAt = SEQ.steps.find((s) => s.key === 'done').at;
const hdCount = SEQ.sets.hd.count;
function update(p) {
  player.setProgress(p);
  const frame = p * (hdCount - 1);
  showStep(stepAt(frame));
  chips.forEach((c) => {
    const s = SEQ.steps.find((x) => x.key === c.dataset.key);
    c.classList.toggle('is-on', frame >= s.at + 6);
  });
  hint.classList.toggle('is-off', p > 0.02);
  endEl.classList.toggle('is-on', frame >= doneAt);
  rail.style.transform = `scaleX(${p.toFixed(4)})`;
}

const st = ScrollTrigger.create({
  trigger: '#sequence',
  start: 'top top',
  end: () => `+=${Math.round(window.innerHeight * SEQ.scrollLength)}`,
  pin: true,
  anticipatePin: 1,
  invalidateOnRefresh: true,
  scrub: reducedMotion ? true : 0.4,
  onUpdate: (self) => update(self.progress),
});
window.__st = st;
update(0);

player.ready.then(() => document.documentElement.classList.add('seq-ready'));
