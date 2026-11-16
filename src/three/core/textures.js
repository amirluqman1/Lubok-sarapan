// Procedural canvas textures. No external images are used anywhere in the project.
import * as THREE from 'three';
import { fbm } from '../util/noise.js';
import { clamp, smoothstep } from '../util/random.js';

function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTexture(canvas, { srgb = true, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Dark walnut table top: color + roughness maps. */
export function woodTextures(noise, size = 1024) {
  const c = makeCanvas(size), r = makeCanvas(size);
  const ctx = c.getContext('2d'), rctx = r.getContext('2d');
  const img = ctx.createImageData(size, size), rimg = rctx.createImageData(size, size);
  const planks = 5;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    const plank = Math.floor(v * planks);
    const pv = v * planks - plank;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const g = fbm(noise, u * 2.2 + plank * 7.3, v * 26, plank * 3.1, 4);
      const ring = 0.5 + 0.5 * Math.sin(v * 300 + g * 10 + noise(u * 1.1, plank * 5, 0.5) * 7);
      const fine = noise(u * 90, v * 900, plank) * 0.5 + 0.5;
      let t = 0.4 * ring * ring + 0.48 * (g * 0.5 + 0.5) + 0.12 * fine;
      const plankTone = 0.85 + 0.3 * (((plank * 9301 + 49297) % 233280) / 233280);
      const edge = smoothstep(0, 0.012, pv) * smoothstep(1, 0.988, pv);
      let R = (26 + 40 * t) * plankTone, G = (16 + 24 * t) * plankTone, B = (10 + 13 * t) * plankTone;
      R *= 0.35 + 0.65 * edge; G *= 0.35 + 0.65 * edge; B *= 0.35 + 0.65 * edge;
      const i = (y * size + x) * 4;
      img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
      const rough = clamp(0.55 + 0.25 * (1 - ring) + 0.1 * fine, 0, 1) * 255;
      rimg.data[i] = rough; rimg.data[i + 1] = rough; rimg.data[i + 2] = rough; rimg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0); rctx.putImageData(rimg, 0, 0);
  const map = toTexture(c, { repeat: true });
  const roughnessMap = toTexture(r, { srgb: false, repeat: true });
  return { map, roughnessMap };
}

/**
 * Speckled stoneware glaze. UVs of the plate are planar top-down: u = x/span + .5, v = z/span + .5
 */
export function plateTextures(noise, rng, span, size = 1024) {
  const c = makeCanvas(size), r = makeCanvas(size);
  const ctx = c.getContext('2d'), rctx = r.getContext('2d');
  const img = ctx.createImageData(size, size), rimg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wx = (x / size - 0.5) * span, wz = (y / size - 0.5) * span;
      const rad = Math.hypot(wx, wz);
      const n = fbm(noise, wx * 2.2, wz * 2.2, 0.3, 3);
      const n2 = noise(wx * 18, wz * 18, 2.1);
      // glaze pooling: slightly darker / warmer where the glaze is thick (well), lighter on the slope
      let R = 228 + 8 * n + 3 * n2, G = 214 + 7 * n + 3 * n2, B = 190 + 6 * n + 2 * n2;
      // reactive glaze breaking to toasted clay at the rim
      const rim = smoothstep(1.075, 1.135, rad);
      const rimN = 0.5 + 0.5 * fbm(noise, wx * 9, wz * 9, 5.5, 3);
      const rimT = clamp(rim * (0.45 + 0.45 * rimN), 0, 1);
      R = R * (1 - rimT) + (172 + 26 * rimN) * rimT;
      G = G * (1 - rimT) + (134 + 20 * rimN) * rimT;
      B = B * (1 - rimT) + (98 + 14 * rimN) * rimT;
      const i = (y * size + x) * 4;
      img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
      const rough = clamp(0.2 + 0.06 * n + 0.04 * n2 + 0.25 * rimT, 0, 1) * 255;
      rimg.data[i] = rough; rimg.data[i + 1] = rough; rimg.data[i + 2] = rough; rimg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0); rctx.putImageData(rimg, 0, 0);
  // iron speckles typical of stoneware
  for (let k = 0; k < 2200; k++) {
    const x = rng() * size, y = rng() * size, s = 0.4 + rng() * rng() * 1.8;
    ctx.fillStyle = `rgba(${90 + rng() * 40},${60 + rng() * 25},${40 + rng() * 20},${0.35 + rng() * 0.5})`;
    ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
  }
  return { map: toTexture(c), roughnessMap: toTexture(r, { srgb: false }) };
}

/** Banana leaf: parallel veins, glossy surface, slight sun-yellowing. */
export function leafTextures(noise, rng, size = 1024) {
  const c = makeCanvas(size), b = makeCanvas(size);
  const ctx = c.getContext('2d'), bctx = b.getContext('2d');
  const img = ctx.createImageData(size, size), bimg = bctx.createImageData(size, size);
  // pre-generate vein lines (rows) with jittered spacing
  const veinStrength = new Float32Array(size);
  let yy = 0;
  while (yy < size) {
    const strong = rng() < 0.12;
    const w = strong ? 2.6 : 1.5;
    for (let d = -3; d <= 3; d++) {
      const row = Math.round(yy + d);
      if (row >= 0 && row < size) veinStrength[row] = Math.max(veinStrength[row], Math.max(0, 1 - Math.abs(d) / w) * (strong ? 1 : 0.55));
    }
    yy += 6 + rng() * 7;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const n = 0.5 * fbm(noise, u * 3, v * 3, 7.7, 4);
      const streak = noise(u * 2, v * 140, 3.3) * 0.5 + 0.5;
      const yellow = smoothstep(0.25, 0.7, fbm(noise, u * 1.6 + 4, v * 1.6, 1.9, 3));
      const vein = veinStrength[y] * (0.75 + 0.25 * noise(u * 30, v * 4, 0));
      const along = 0.85 + 0.15 * u;
      let R = (24 + 6 * n + 4 * streak) * along, G = (60 + 10 * n + 8 * streak) * along, B = (18 + 4 * n) * along;
      R += yellow * 22; G += yellow * 12; B -= yellow * 3;
      R += vein * 16; G += vein * 22; B += vein * 8;
      const i = (y * size + x) * 4;
      img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = 255;
      const h = clamp(0.5 + vein * 0.5 + 0.08 * streak, 0, 1) * 255;
      bimg.data[i] = h; bimg.data[i + 1] = h; bimg.data[i + 2] = h; bimg.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0); bctx.putImageData(bimg, 0, 0);
  return { map: toTexture(c), bumpMap: toTexture(b, { srgb: false }) };
}

/** Cut face of a diagonally sliced cucumber: peel ring, pale flesh, 3-lobed seed cavity. */
export function cucumberFaceTexture(rng, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2, R = size * 0.5;
  ctx.fillStyle = '#18300f'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#1f3d13'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5f8c33'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.955, 0, Math.PI * 2); ctx.fill();
  let g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 0.93);
  g.addColorStop(0, '#dbe9b4'); g.addColorStop(0.7, '#cfe2a0'); g.addColorStop(1, '#a9c96f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.93, 0, Math.PI * 2); ctx.fill();
  // seed cavity (watery gel, slightly darker & translucent looking)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
    const rr = R * (0.5 + 0.06 * Math.cos(3 * a) + 0.015 * Math.sin(11 * a));
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
  g.addColorStop(0, 'rgba(176,205,120,0.95)'); g.addColorStop(0.8, 'rgba(160,196,104,0.9)'); g.addColorStop(1, 'rgba(190,215,140,0.4)');
  ctx.fillStyle = g; ctx.fill();
  // placenta lines from centre
  ctx.strokeStyle = 'rgba(228,238,200,0.55)'; ctx.lineWidth = R * 0.03;
  for (let k = 0; k < 3; k++) {
    const a = k * (Math.PI * 2 / 3) + 0.4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.36, Math.sin(a) * R * 0.36); ctx.stroke();
  }
  // seeds
  for (let k = 0; k < 3; k++) {
    const base = k * (Math.PI * 2 / 3) + 0.4 + Math.PI / 3;
    const n = 6 + Math.floor(rng() * 3);
    for (let s = 0; s < n; s++) {
      const a = base + (s / (n - 1) - 0.5) * 1.3 + (rng() - 0.5) * 0.08;
      const rr = R * (0.3 + rng() * 0.12);
      ctx.save();
      ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(120,150,80,0.5)';
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.075, R * 0.045, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eef2d4';
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.06, R * 0.032, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  // wet speckle
  for (let k = 0; k < 900; k++) {
    const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * R * 0.92;
    ctx.fillStyle = `rgba(255,255,240,${rng() * 0.12})`;
    ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.5, 1.5);
  }
  return toTexture(c);
}

/** Tileable blob bump texture (generic micro detail). */
export function blobBumpTexture(rng, size = 256, count = 700, maxR = 10) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,128)'; ctx.fillRect(0, 0, size, size);
  for (let k = 0; k < count; k++) {
    const x = rng() * size, y = rng() * size, r = 1.5 + rng() * rng() * maxR;
    const light = rng() < 0.55;
    const a = 0.12 + rng() * 0.25;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const px = x + ox * size, py = y + oy * size;
      if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      const col = light ? '255,255,255' : '0,0,0';
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
  }
  return toTexture(c, { srgb: false, repeat: true });
}

export function steamTexture(noise, size = 256) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size - 0.5, v = y / size - 0.5;
    const d = Math.hypot(u * 1.6, v);
    const fall = clamp(1 - d * 2, 0, 1);
    const n = fbm(noise, u * 4, v * 3, 9.1, 4) * 0.5 + 0.5;
    const a = Math.pow(fall, 1.6) * smoothstep(0.35, 0.85, n);
    const i = (y * size + x) * 4;
    img.data[i] = 255; img.data[i + 1] = 250; img.data[i + 2] = 240; img.data[i + 3] = a * 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

export function contactShadowTexture(size = 128) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    g.addColorStop(t, `rgba(0,0,0,${Math.pow(1 - t, 2.2).toFixed(3)})`);
  }
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: false });
}
