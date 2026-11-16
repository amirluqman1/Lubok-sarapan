// Fried anchovies (ikan bilis) + roasted peanuts. Both are InstancedMeshes of a few procedural
// variants, stacked with a height-field so pieces rest on each other without interpenetrating.
import * as THREE from 'three';
import { LAYOUT, foodY } from './layout.js';
import { createNoise3D } from '../util/noise.js';
import { mulberry32, range, gauss, clamp } from '../util/random.js';
import { win, dropCurve } from '../util/ease.js';

const PILE = LAYOUT.pile;

class HeightField {
  constructor(cx, cz, size, res) {
    Object.assign(this, { cx, cz, size, res, cell: size / res });
    this.h = new Float32Array(res * res);
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = cx - size / 2 + (i + 0.5) * this.cell, z = cz - size / 2 + (j + 0.5) * this.cell;
      this.h[j * res + i] = foodY(x, z);
    }
  }
  _each(x, z, rad, fn) {
    const { cx, cz, size, res, cell } = this;
    const i0 = Math.floor((x - rad - (cx - size / 2)) / cell), i1 = Math.floor((x + rad - (cx - size / 2)) / cell);
    const j0 = Math.floor((z - rad - (cz - size / 2)) / cell), j1 = Math.floor((z + rad - (cz - size / 2)) / cell);
    for (let j = Math.max(0, j0); j <= Math.min(res - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(res - 1, i1); i++) {
      const px = cx - size / 2 + (i + 0.5) * cell, pz = cz - size / 2 + (j + 0.5) * cell;
      const d2 = (px - x) ** 2 + (pz - z) ** 2;
      if (d2 < rad * rad) fn(j * res + i, Math.sqrt(rad * rad - d2));
    }
  }
  rest(x, z, rad, vr = rad) {
    let y = foodY(x, z) + vr;
    this._each(x, z, rad, (k, s) => { y = Math.max(y, this.h[k] + s * (vr / rad)); });
    return y;
  }
  stamp(x, z, rad, cy, vr = rad) {
    this._each(x, z, rad, (k, s) => { this.h[k] = Math.max(this.h[k], cy + s * (vr / rad)); });
  }
}

// ---------------------------------------------------------------- anchovy geometry
function anchovyGeometry(curl, sbend, noise, tier) {
  const L = 0.2;
  const nT = tier === 'low' ? 12 : 22, nA = tier === 'low' ? 6 : 10;
  const pos = [], col = [], idx = [];
  const spine = (t) => [(t - 0.5) * L, curl * L * ((t - 0.5) ** 2 - 0.083) + sbend * L * 0.05 * Math.sin(t * Math.PI * 2)];
  // fairly even body, narrow caudal peduncle, blunt head
  const depth = (t) => {
    const tail = Math.min(1, t / 0.2); const head = t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1;
    return 0.0155 * (0.35 + 0.65 * Math.sqrt(tail)) * (1 + 0.15 * Math.sin(Math.PI * t)) * head + 0.001;
  };
  const cBelly = new THREE.Color(0xb7772e), cBack = new THREE.Color(0x5a300f), cHead = new THREE.Color(0x3f210a), cEye = new THREE.Color(0x140904), c = new THREE.Color();
  for (let i = 0; i <= nT; i++) {
    const t = i / nT;
    const [x, z] = spine(t);
    const [x2, z2] = spine(Math.min(1, t + 0.01)), [x1, z1] = spine(Math.max(0, t - 0.01));
    let tx = x2 - x1, tz = z2 - z1; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
    const nx = -tz, nz = tx; // horizontal normal (dorsal = +n)
    const d = (i === 0 || i === nT) ? 0.0005 : depth(t);
    const w = d * 0.4 + 0.0015;
    for (let j = 0; j < nA; j++) {
      const a = (j / nA) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const bump = 1 + 0.1 * noise(x * 90, ca * 2, sa * 2) + 0.08 * Math.max(0, ca) * Math.sin(t * 40);
      pos.push(x + nx * d * ca * bump, w * sa * bump, z + nz * d * ca * bump);
      c.copy(cBelly).lerp(cBack, clamp(ca * 0.8 + 0.35, 0, 1));
      c.lerp(cHead, clamp((t - 0.82) / 0.15, 0, 1) * 0.45);
      if (t > 0.88 && t < 0.935 && Math.abs(ca) < 0.4) c.lerp(cEye, 0.8);
      if (Math.abs(ca) < 0.18 && t > 0.25 && t < 0.85) c.lerp(new THREE.Color(0xb9a58a), 0.35); // faded silver lateral stripe
      c.multiplyScalar(0.78 + 0.34 * (noise(x * 140, ca * 3, sa * 3) * 0.5 + 0.5));
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < nT; i++) for (let j = 0; j < nA; j++) {
    const a = i * nA + j, b = i * nA + ((j + 1) % nA), a2 = a + nA, b2 = b + nA;
    idx.push(a, a2, b, b, a2, b2);
  }
  // forked tail fin (double-sided material)
  const [tx0, tz0] = spine(0), [tx1, tz1] = spine(0.03);
  let dx = tx0 - tx1, dz = tz0 - tz1; const dl = Math.hypot(dx, dz); dx /= dl; dz /= dl;
  const nx = -dz, nz = dx;
  const base = pos.length / 3;
  const fin = [
    [tx0, 0, tz0], [tx0 + dx * 0.026 + nx * 0.013, 0, tz0 + dz * 0.026 + nz * 0.013],
    [tx0 + dx * 0.016, 0, tz0 + dz * 0.016], [tx0 + dx * 0.026 - nx * 0.013, 0, tz0 + dz * 0.026 - nz * 0.013],
  ];
  const cFin = new THREE.Color(0x7a4517);
  for (const f of fin) { pos.push(...f); col.push(cFin.r, cFin.g, cFin.b); }
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const samples = [0.1, 0.3, 0.5, 0.7, 0.88].map((t) => spine(t));
  return { geo: g, samples };
}

// ---------------------------------------------------------------- peanut geometry
function peanutGeometry(half, noise, seed, tier) {
  const g = tier === 'low' ? new THREE.SphereGeometry(1, 14, 10) : new THREE.SphereGeometry(1, 22, 16);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const skin = new THREE.Color(0x6e2c12), skin2 = new THREE.Color(0x9a4f2a), cream = new THREE.Color(0xe2bd86), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = noise(x * 2.2 + seed, y * 2.2, z * 2.2);
    const s = 1 + 0.05 * n;
    let X = x * 0.052 * s * (1 + 0.06 * x), Y = y * 0.033 * s, Z = z * 0.035 * s;
    Y += 0.006 * (x * x - 0.4); // slight kidney curve
    let flat = 0;
    if (half && Y < -0.004) { flat = 1; Y = -0.004 + 0.0008 * noise(X * 80, 0, Z * 80); }
    p.setXYZ(i, X, Y, Z);
    const streak = noise(X * 30 + seed, Y * 120, Z * 30) * 0.5 + 0.5;
    const vein = Math.pow(1 - Math.abs(noise(X * 70 + seed, Y * 40, Z * 70)), 8);
    c.copy(skin).lerp(skin2, streak * 0.8).lerp(cream, vein * 0.35);
    if (flat) { c.copy(cream).multiplyScalar(0.92 + 0.12 * streak); if (X > 0.04) c.multiplyScalar(0.8); }
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return { geo: g, samples: [[-0.035, 0], [0, 0], [0.035, 0]], halfH: half ? 0.02 : 0.031 };
}

// ---------------------------------------------------------------- build
export function createPile({ quality }) {
  const rng = mulberry32(9090);
  const noise = createNoise3D(mulberry32(808));
  const field = new HeightField(PILE.x, PILE.z, 0.7, 72);

  const anchovyMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3, side: THREE.DoubleSide,
  });
  const peanutMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.52, clearcoat: 0.28, clearcoatRoughness: 0.35, bumpMap: null });

  const aVariants = [[0.55, 0.2], [-0.35, -0.6], [0.9, 0.5], [0.15, 1.0]].map(([c, s]) => anchovyGeometry(c, s, noise, quality.tier));
  const pVariants = [peanutGeometry(false, noise, 0, quality.tier), peanutGeometry(false, noise, 5, quality.tier), peanutGeometry(true, noise, 9, quality.tier)];

  const tmpQ = new THREE.Quaternion(), e = new THREE.Euler();
  function place(list, variants, count, kind, sigma, centre) {
    const perVariant = variants.map(() => []);
    for (let n = 0; n < count; n++) {
      const vi = Math.floor(rng() * variants.length);
      const v = variants[vi];
      // try several nearby drop spots/headings and keep the lowest rest: pieces "roll" into gaps
      let best = null;
      const gx = centre[0] + gauss(rng) * sigma, gz = centre[1] + gauss(rng) * sigma;
      const tries = kind === 'a' ? 7 : 12;
      const sc = kind === 'a' ? range(rng, 0.78, 1.1) : range(rng, 0.68, 0.82);
      const rad = kind === 'a' ? 0.022 * sc : 0.027 * sc;
      const vr = kind === 'a' ? 0.0145 * sc : v.halfH * sc;
      for (let t = 0; t < tries; t++) {
        const a = rng() * Math.PI * 2, d = t === 0 ? 0 : rng() * (kind === 'a' ? 0.05 : 0.09);
        const x = gx + Math.cos(a) * d, z = gz + Math.sin(a) * d;
        if (Math.hypot(x - PILE.x, z - PILE.z) > PILE.R) continue;
        const yaw = rng() * Math.PI * 2;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const pts = v.samples.map(([sx, sz]) => {
          const lx = sx * sc, lz = sz * sc;
          const wx = x + lx * cy + lz * sy, wz = z - lx * sy + lz * cy;
          return { s: lx, wx, wz, y: field.rest(wx, wz, rad, vr) };
        });
        // gravity: choose the tilt that gives the LOWEST resting centre (rests on its highest supports)
        let m = 0, c = Infinity;
        for (let k = -8; k <= 8; k++) {
          const mm = k * 0.05;
          let cc = -Infinity;
          for (const p of pts) cc = Math.max(cc, p.y - mm * p.s);
          if (cc < c - 1e-6) { c = cc; m = mm; }
        }
        if (!best || c < best.c) best = { c, m, x, z, yaw, pts };
      }
      if (!best) { n--; continue; }
      const { c, m, x, z, yaw, pts } = best;
      for (const p of pts) field.stamp(p.wx, p.wz, rad, c + m * p.s, vr);
      const pitch = Math.atan(m);
      const roll = kind === 'a' ? (rng() - 0.5) * 0.35 : (rng() < 0.5 ? 0 : Math.PI) * 0 + (rng() - 0.5) * 0.4;
      e.set(0, yaw, 0, 'YZX');
      e.set(roll, yaw, pitch, 'YZX');
      tmpQ.setFromEuler(e);
      const color = new THREE.Color().setHSL(0, 0, range(rng, 0.85, 1.1));
      perVariant[vi].push({ pos: new THREE.Vector3(x, c, z), q: tmpQ.clone(), s: sc, color, order: n,
        spin: new THREE.Vector3(range(rng, -2, 2), range(rng, -3, 3), range(rng, -2, 2)), h: range(rng, 0.8, 1.3) });
    }
    variants.forEach((v, vi) => {
      const items = perVariant[vi];
      if (!items.length) return;
      const mesh = new THREE.InstancedMesh(v.geo, kind === 'a' ? anchovyMat : peanutMat, items.length);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      items.forEach((it, i) => mesh.setColorAt(i, it.color));
      list.push({ mesh, items, count });
    });
  }

  const anchovies = [], peanuts = [];
  place(anchovies, aVariants, quality.anchovies, 'a', 0.1, [PILE.x, PILE.z]);
  place(peanuts, pVariants, quality.peanuts, 'p', 0.1, [PILE.x + 0.02, PILE.z + 0.02]);

  const aGroup = new THREE.Group(); aGroup.name = 'anchovies';
  const pGroup = new THREE.Group(); pGroup.name = 'peanuts';
  anchovies.forEach((b) => aGroup.add(b.mesh));
  peanuts.forEach((b) => pGroup.add(b.mesh));

  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3(), q = new THREE.Quaternion(), sv = new THREE.Vector3(), eu = new THREE.Euler();
  function animate(list, p, spread) {
    for (const b of list) {
      for (let i = 0; i < b.items.length; i++) {
        const it = b.items[i];
        const delay = (it.order / b.count) * spread;
        const local = win(p, delay, delay + (1 - spread));
        if (local <= 0) { m4.makeScale(0, 0, 0); b.mesh.setMatrixAt(i, m4); continue; }
        const d = dropCurve(local, 0.75);
        v3.copy(it.pos); v3.y += it.h * d.fall + 0.012 * d.bounce;
        eu.set(it.spin.x * d.rot, it.spin.y * d.rot, it.spin.z * d.rot);
        q.setFromEuler(eu).multiply(it.q);
        sv.setScalar(it.s);
        m4.compose(v3, q, sv);
        b.mesh.setMatrixAt(i, m4);
      }
      b.mesh.instanceMatrix.needsUpdate = true;
      b.mesh.computeBoundingSphere();
    }
  }
  let lastA = -1, lastP = -1;
  const anchovy = {
    group: aGroup,
    setProgress(p) { aGroup.visible = p > 0; if (p === lastA) return; lastA = p; animate(anchovies, p, 0.6); },
  };
  const peanut = {
    group: pGroup,
    setProgress(p) { pGroup.visible = p > 0; if (p === lastP) return; lastP = p; animate(peanuts, p, 0.6); },
  };
  anchovy.setProgress(1); peanut.setProgress(1);
  return { anchovy, peanut };
}
