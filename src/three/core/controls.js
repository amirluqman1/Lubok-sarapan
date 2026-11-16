// Turntable controls for the 360° showcase: mouse/touch drag with inertia, pitch limits,
// vertical page scrolling preserved on touch (touch-action: pan-y) unless "free rotate" is on.
import { gsap } from 'gsap';
import { clamp } from '../util/random.js';

export function createTurntableControls(el, { reducedMotion }) {
  const s = { yaw: 0, pitch: 0, vYaw: 0, vPitch: 0, dragging: false, enabled: false, free: false, idle: 0, interacted: false };
  let lastX = 0, lastY = 0, pid = null, pointerType = 'mouse';
  el.style.touchAction = 'pan-y';

  const down = (e) => {
    if (!s.enabled) return;
    s.dragging = true; pid = e.pointerId; pointerType = e.pointerType;
    lastX = e.clientX; lastY = e.clientY;
    s.vYaw = 0; s.vPitch = 0; s.idle = 0; s.interacted = true;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    el.classList.add('is-dragging');
  };
  const move = (e) => {
    if (!s.dragging || e.pointerId !== pid) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    const k = 5.5 / Math.max(320, el.clientWidth);
    s.vYaw = dx * k;
    s.yaw += s.vYaw;
    if (pointerType === 'mouse' || s.free) {
      s.vPitch = dy * k * 0.6;
      s.pitch = clamp(s.pitch + s.vPitch, -0.3, 0.42);
    }
  };
  const up = (e) => {
    if (e.pointerId !== pid) return;
    s.dragging = false; pid = null;
    el.classList.remove('is-dragging');
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  function update(dt) {
    if (!s.dragging) {
      const damp = Math.exp(-dt * 3.2);
      s.yaw += s.vYaw * dt * 30;
      s.vYaw *= damp;
      s.pitch = clamp(s.pitch + s.vPitch * dt * 30, -0.3, 0.42);
      s.vPitch *= damp;
      s.idle += dt;
      if (s.enabled && !reducedMotion && s.idle > 2.5 && Math.abs(s.vYaw) < 1e-3) s.yaw += dt * 0.12; // gentle turntable drift
    }
    return Math.abs(s.vYaw) > 1e-4 || Math.abs(s.vPitch) > 1e-4 || s.dragging;
  }
  function reset() {
    const turns = Math.round(s.yaw / (Math.PI * 2)) * Math.PI * 2;
    s.vYaw = 0; s.vPitch = 0; s.idle = -4;
    gsap.to(s, { yaw: turns, pitch: 0, duration: reducedMotion ? 0 : 1.1, ease: 'power3.inOut' });
  }
  function nudge(dir) { s.vYaw = 0; s.idle = -4; gsap.to(s, { yaw: s.yaw + dir * Math.PI / 4, duration: reducedMotion ? 0 : 0.7, ease: 'power2.inOut' }); }
  function setFree(on) { s.free = on; el.style.touchAction = on ? 'none' : 'pan-y'; }
  function setEnabled(on) { s.enabled = on; if (!on) { s.dragging = false; } }
  function dispose() {
    el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
  }
  return { state: s, update, reset, nudge, setFree, setEnabled, dispose };
}
