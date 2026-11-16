import { clamp } from './random.js';
export const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOutCubic = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOutBack = (t, s = 1.4) => { t = clamp(t, 0, 1) - 1; return t * t * ((s + 1) * t + s) + 1; };
/** Progress window helper: maps p in [a,b] to [0,1]. */
export const win = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

/**
 * Drop-and-settle curve. Returns { fall, bounce, squash } for p in [0,1].
 * fall: 1 -> 0 (height factor, gravity-like), bounce: small upward bump after impact,
 * squash: impact compression amount.
 */
export function dropCurve(p, impactAt = 0.72) {
  p = clamp(p, 0, 1);
  if (p < impactAt) {
    const q = p / impactAt;
    return { fall: 1 - q * q, bounce: 0, squash: 0, rot: 1 - easeOutCubic(q) };
  }
  const k = (p - impactAt) / (1 - impactAt);
  const damp = Math.pow(1 - k, 2);
  return { fall: 0, bounce: Math.max(0, Math.sin(k * Math.PI * 2)) * damp, squash: Math.sin(Math.min(1, k * 2.5) * Math.PI) * damp, rot: 0 };
}
