// GSAP master timeline for the assembly (0–100 = scroll percentage). It is paused and only
// ever *seeked* (tl.progress) so it is perfectly reversible and frame-rate independent.
import { gsap } from 'gsap';

export const STEPS = [
  { key: 'plate', from: 0, to: 10 },
  { key: 'rice', from: 10, to: 25 },
  { key: 'sambal', from: 25, to: 40 },
  { key: 'egg', from: 40, to: 50 },
  { key: 'cucumber', from: 50, to: 60 },
  { key: 'anchovy', from: 60, to: 70 },
  { key: 'peanut', from: 70, to: 80 },
  { key: 'chicken', from: 80, to: 90 },
  { key: 'reveal', from: 90, to: 100 },
];

export function createAssemblyTimeline() {
  const state = {};
  for (const s of STEPS) state[s.key] = 0;
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  for (const s of STEPS) tl.to(state, { [s.key]: 1, duration: s.to - s.from }, s.from);
  tl.progress(0);
  return { tl, state };
}

export function stepIndexAt(p) {
  const pct = p * 100;
  for (let i = STEPS.length - 1; i >= 0; i--) if (pct >= STEPS[i].from) return i;
  return 0;
}
