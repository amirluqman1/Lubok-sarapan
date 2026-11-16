// Sambal: an organic sauce sheet draped over the rice heightfield. Thickness, chunky lumps,
// oil-separated edges, glossy clearcoat, chilli flakes and seeds riding the surface.
// The "pour" is a spread parameter that keeps every vertex on the rice surface (no penetration,
// fully reversible — no physics).
import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import { riceTopY } from './rice.js';
import { createNoise3D, fbm } from '../util/noise.js';
import { mulberry32, range, smoothstep, clamp, lerp } from '../util/random.js';
import { easeOutCubic, win } from '../util/ease.js';

const S = LAYOUT.sambal;

export function createSambal({ quality, textures }) {
  const rng = mulberry32(777);
  const noise = createNoise3D(mulberry32(31337));
  const group = new THREE.Group();
  group.name = 'sambal';
  group.position.set(LAYOUT.rice.x, 0, LAYOUT.rice.z);

  const NR = quality.tier === 'low' ? 18 : quality.tier === 'medium' ? 30 : 44;
  const NS = quality.tier === 'low' ? 56 : quality.tier === 'medium' ? 96 : 140;
  const vCount = 1 + NR * NS;
  const rho = new Float32Array(vCount), theta = new Float32Array(vCount);
  const edgeR = new Float32Array(NS);
  const lump = new Float32Array(vCount);
  for (let j = 0; j < NS; j++) {
    const th = (j / NS) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    let R = S.R * (1 + 0.17 * noise(c * 1.1, s * 1.1, 4.2) + 0.07 * noise(c * 3.2, s * 3.2, 9.4) + 0.025 * noise(c * 8, s * 8, 1));
    R *= 1 + 0.22 * Math.max(0, s) * Math.max(0, s); // flows a little further down the front slope
    edgeR[j] = R;
  }
  rho[0] = 0; theta[0] = 0;
  for (let i = 1; i <= NR; i++) {
    for (let j = 0; j < NS; j++) {
      const k = 1 + (i - 1) * NS + j;
      rho[k] = Math.pow(i / NR, 0.85);
      theta[k] = (j / NS) * Math.PI * 2;
    }
  }
  const idx = [];
  for (let j = 0; j < NS; j++) idx.push(0, 1 + ((j + 1) % NS), 1 + j);
  for (let i = 1; i < NR; i++) {
    const a0 = 1 + (i - 1) * NS, b0 = 1 + i * NS;
    for (let j = 0; j < NS; j++) {
      const j1 = (j + 1) % NS;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  // per-vertex static attributes: lumps and colour
  const colors = new Float32Array(vCount * 3);
  const deep = new THREE.Color(0x3a0904), mid = new THREE.Color(0x631407), oil = new THREE.Color(0x9a2c0a), dark = new THREE.Color(0x240502);
  const c = new THREE.Color();
  const uv = new Float32Array(vCount * 2);
  for (let k = 0; k < vCount; k++) {
    const j = k === 0 ? 0 : (k - 1) % NS;
    const r = rho[k] * edgeR[j];
    const x = S.dx + Math.cos(theta[k]) * r, z = S.dz + Math.sin(theta[k]) * r;
    const l = fbm(noise, x * 16, z * 16, 0.5, 4);
    lump[k] = l;
    const speck = noise(x * 60, z * 60, 7.3);
    c.copy(mid).lerp(deep, clamp(0.5 + l * 0.9, 0, 1));
    c.lerp(oil, smoothstep(0.72, 1.0, rho[k]) * 0.75);
    if (speck > 0.6) c.lerp(dark, 0.35);
    colors.set([c.r, c.g, c.b], k * 3);
    uv[k * 2] = x * 3.2; uv[k * 2 + 1] = z * 3.2;
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(new Float32Array(vCount * 3), 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);

  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.5,
    bumpMap: textures.bumpCoarse,
    bumpScale: 2.2,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
    clearcoatNormalMap: null,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'sambalSauce';
  group.add(mesh);

  // ---------- chilli flakes & seeds (instanced), parametrised in the same (rho, theta) space
  const flakeGeo = new THREE.SphereGeometry(1, 6, 4);
  {
    const p = flakeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const j = 1 + 0.35 * noise(x * 2, y * 2, z * 2);
      p.setXYZ(i, x * 0.016 * j, y * 0.0026, z * 0.011 * j);
    }
    flakeGeo.computeVertexNormals();
  }
  const seedGeo = new THREE.SphereGeometry(1, 6, 4);
  seedGeo.scale(0.0045, 0.0012, 0.0035);
  const flakeMat = new THREE.MeshPhysicalMaterial({ color: 0x6a1206, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const seedMat = new THREE.MeshPhysicalMaterial({ color: 0xe0b866, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const nFlakes = quality.sambalFlakes, nSeeds = Math.round(quality.sambalFlakes * 0.3);
  const flakes = new THREE.InstancedMesh(flakeGeo, flakeMat, nFlakes);
  const seeds = new THREE.InstancedMesh(seedGeo, seedMat, nSeeds);
  flakes.name = 'sambalFlakes'; seeds.name = 'sambalSeeds';
  for (const im of [flakes, seeds]) im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const parts = [];
  const mkParts = (n, mesh) => {
    for (let i = 0; i < n; i++) {
      parts.push({
        mesh, i,
        rho: Math.sqrt(rng()) * 0.86,
        th: rng() * Math.PI * 2,
        yaw: rng() * Math.PI * 2,
        tilt: (rng() - 0.5) * 0.5,
        sc: range(rng, 0.6, 1.3),
        embed: range(rng, 0.0015, 0.004),
      });
    }
  };
  mkParts(nFlakes, flakes); mkParts(nSeeds, seeds);
  group.add(flakes, seeds);

  // ---------- spread solver
  const profileFinal = (r) => Math.pow(Math.max(0, 1 - Math.pow(r, 5)), 0.45);
  const profileDollop = (r) => Math.sqrt(Math.max(0, 1 - r * r));
  const T0 = 0.032;
  // fine chunky texture of ground chilli / shallots
  const l2 = (rh, th) => noise(Math.cos(th) * rh * 30, Math.sin(th) * rh * 30, 5.5);
  const edgeAt = (th) => {
    const f = ((th / (Math.PI * 2)) % 1 + 1) % 1 * NS;
    const j0 = Math.floor(f) % NS, j1 = (j0 + 1) % NS;
    return lerp(edgeR[j0], edgeR[j1], f - Math.floor(f));
  };
  function surfacePoint(rh, th, l, spread, lift, out) {
    const r = rh * edgeAt(th) * spread;
    const x = S.dx + Math.cos(th) * r, z = S.dz + Math.sin(th) * r;
    const w = smoothstep(0.3, 1, spread);
    const prof = lerp(profileDollop(rh), profileFinal(rh), w);
    const thick = T0 * Math.min(1 / (spread * spread), 4.2) * prof * (1 + 0.85 * l * prof) + 0.004 * prof * Math.max(0, l2(rh, th));
    out.set(x, riceTopY(x, z) + thick + lift, z);
    return thick;
  }

  const v = new THREE.Vector3();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  let lastKey = -1;
  function applySpread(spread, lift) {
    const key = Math.round(spread * 4000) * 10000 + Math.round(lift * 4000);
    if (key === lastKey) return;
    lastKey = key;
    const arr = posAttr.array;
    for (let k = 0; k < vCount; k++) {
      surfacePoint(rho[k], theta[k], lump[k], spread, lift, v);
      arr[k * 3] = v.x; arr[k * 3 + 1] = v.y; arr[k * 3 + 2] = v.z;
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    for (const p of parts) {
      surfacePoint(p.rho, p.th, 0, spread, lift, v);
      v.y -= p.embed;
      e.set(p.tilt, p.yaw, p.tilt * 0.5);
      q.setFromEuler(e);
      sc.setScalar(p.sc);
      m4.compose(v, q, sc);
      p.mesh.setMatrixAt(p.i, m4);
    }
    flakes.instanceMatrix.needsUpdate = true;
    seeds.instanceMatrix.needsUpdate = true;
    flakes.computeBoundingSphere(); seeds.computeBoundingSphere();
  }

  function setProgress(p) {
    group.visible = p > 0;
    if (!group.visible) return;
    // 0 - .35 : a dollop descends onto the crown;  .35 - 1 : it slumps & spreads over the rice
    const fall = win(p, 0, 0.35);
    const lift = 0.9 * Math.pow(1 - fall, 2);
    const spread = lerp(0.3, 1, easeOutCubic(win(p, 0.33, 1)));
    applySpread(spread, lift);
  }
  setProgress(1);
  return { group, setProgress };
}
