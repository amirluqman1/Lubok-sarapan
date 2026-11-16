// Coconut rice: a molded dome core + thousands of individual instanced grains (InstancedMesh).
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { LAYOUT, foodY } from './layout.js';
import { createNoise3D } from '../util/noise.js';
import { mulberry32, range, shuffle, clamp } from '../util/random.js';
import { dropCurve } from '../util/ease.js';

const RICE = LAYOUT.rice;
const shapeNoise = createNoise3D(mulberry32(1107));
const CORE_INSET = 0.016;

/** Outer dome height above the base surface, in rice-local coords (origin = rice centre). */
export function riceDomeHeight(x, z) {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const Rb = RICE.R * (1 + 0.035 * shapeNoise(Math.cos(th) * 1.4, Math.sin(th) * 1.4, 2.5));
  const t = r / Rb;
  if (t >= 1) return 0;
  let h = RICE.H * Math.pow(1 - t * t, 0.58);
  h *= 1 - 0.07 * Math.pow(1 - t, 3); // slightly flattened crown, like a pressed mould
  h += 0.012 * shapeNoise(x * 7, z * 7, 1.3) * (1 - t * t * t * t);
  return Math.max(0, h);
}

/** Local y of the rice top (grain layer included) — sambal drapes over this. */
export function riceTopY(lx, lz) {
  return foodY(lx + RICE.x, lz + RICE.z) + riceDomeHeight(lx, lz) + 0.014;
}

function grainGeometry(tier) {
  // ~30 / ~48 / ~70 triangles per grain depending on tier
  const g = tier === 'low' ? new THREE.SphereGeometry(1, 6, 3) : tier === 'medium' ? new THREE.SphereGeometry(1, 7, 4) : new THREE.SphereGeometry(1, 8, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // elongated grain with slightly squared, tapered tips and a gentle curve
    const taper = 1 - 0.18 * x * x;
    y *= taper; z *= taper;
    y += 0.12 * x * x;
    p.setXYZ(i, x * 0.027, y * 0.0088, z * 0.0079);
  }
  g.computeVertexNormals();
  return g;
}

export function createRice({ quality }) {
  const rng = mulberry32(2024);
  const group = new THREE.Group();
  group.name = 'rice';

  // ---------- core dome (a smooth inner body hiding gaps between grains)
  const NR = quality.tier === 'low' ? 22 : 40, NS = quality.tier === 'low' ? 64 : 112;
  const pos = [], idx = [];
  pos.push(0, foodY(RICE.x, RICE.z) + riceDomeHeight(0, 0) - CORE_INSET, 0);
  for (let i = 1; i <= NR; i++) {
    const phi = (i / NR) * Math.PI * 0.5;
    const t = Math.sin(phi) * 1.04;
    for (let j = 0; j < NS; j++) {
      const th = (j / NS) * Math.PI * 2;
      const x = Math.cos(th) * t * RICE.R, z = Math.sin(th) * t * RICE.R;
      const h = riceDomeHeight(x, z);
      const y = foodY(x + RICE.x, z + RICE.z) + Math.max(0.0015, h - CORE_INSET);
      pos.push(x, y, z);
    }
  }
  for (let j = 0; j < NS; j++) idx.push(0, 1 + ((j + 1) % NS), 1 + j);
  for (let i = 1; i < NR; i++) {
    const a0 = 1 + (i - 1) * NS, b0 = 1 + i * NS;
    for (let j = 0; j < NS; j++) {
      const j1 = (j + 1) % NS;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  coreGeo.setIndex(idx);
  coreGeo.computeVertexNormals();
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xcfc3a6, roughness: 0.75 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.castShadow = true;
  core.receiveShadow = true;
  core.name = 'riceCore';
  group.add(core);

  // ---------- grains
  const maxCount = quality.riceMax;
  const grainMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.4,
    sheen: 0.35,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xfff2dc),
    emissive: new THREE.Color(0x2a2214), // lifts shadows a touch: cheap fake for rice translucency
    emissiveIntensity: 0.55,
  });
  const grains = new THREE.InstancedMesh(grainGeometry(quality.tier), grainMat, maxCount);
  grains.name = 'riceGrains';
  grains.castShadow = quality.grainShadows;
  grains.receiveShadow = true;

  const sampler = new MeshSurfaceSampler(core).setRandomGenerator(rng).build();
  const P = new THREE.Vector3(), N = new THREE.Vector3(), T = new THREE.Vector3(), B = new THREE.Vector3();
  const A = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), roll = new THREE.Quaternion();
  const col = new THREE.Color();
  const records = [];
  const looseCount = Math.floor(maxCount * 0.018);
  for (let k = 0; k < maxCount; k++) {
    let depth;
    if (k < looseCount) {
      // loose grains fallen onto the leaf around the base
      const a = rng() * Math.PI * 2, r = RICE.R * range(rng, 1.0, 1.28);
      P.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      P.y = foodY(P.x + RICE.x, P.z + RICE.z) + 0.0075;
      N.copy(up);
      depth = 1;
    } else {
      sampler.sample(P, N);
      const d = range(rng, 0.002, 0.022);
      depth = clamp((d - 0.002) / 0.02, 0, 1);
      P.addScaledVector(N, d + 0.006);
    }
    // grain axis: mostly tangent to the surface, random heading, some tilt
    tmp.set(rng() - 0.5, rng() - 0.5, rng() - 0.5);
    T.copy(tmp).addScaledVector(N, -tmp.dot(N)).normalize();
    const tilt = (rng() - 0.5) * (k < looseCount ? 0.2 : 0.9);
    A.copy(T).multiplyScalar(Math.cos(tilt)).addScaledVector(N, Math.sin(tilt)).normalize();
    B.crossVectors(A, N).normalize();
    const Y = tmp.crossVectors(B, A).normalize();
    m.makeBasis(A, Y, B);
    q.setFromRotationMatrix(m);
    roll.setFromAxisAngle(A, (rng() - 0.5) * 1.2);
    q.premultiply(roll);
    const sc = range(rng, 0.85, 1.12);
    s.set(sc * range(rng, 0.92, 1.08), sc, sc);
    // colour: creamy ivory; deeper grains darker (cavity occlusion), rare slightly yellow grains (santan)
    const shade = 0.72 + 0.28 * depth;
    col.setRGB(0.94, 0.9, 0.79);
    if (rng() < 0.06) col.setRGB(0.95, 0.87, 0.66);
    const v = range(rng, 0.94, 1.04) * shade;
    col.multiplyScalar(v);
    records.push({ px: P.x, py: P.y, pz: P.z, q: q.clone(), s: s.clone(), c: col.clone() });
  }
  // shuffle so that any prefix (lower quality count) still covers the dome evenly
  shuffle(rng, records);
  records.forEach((r, i) => {
    m.compose(P.set(r.px, r.py, r.pz), r.q, r.s);
    grains.setMatrixAt(i, m);
    grains.setColorAt(i, r.c);
  });
  grains.instanceMatrix.needsUpdate = true;
  grains.instanceColor.needsUpdate = true;
  grains.count = quality.riceCount;
  grains.computeBoundingSphere();
  group.add(grains);

  const inner = new THREE.Group(); // the falling part
  inner.add(core, grains);
  group.add(inner);
  group.position.set(RICE.x, 0, RICE.z);

  function setProgress(p) {
    group.visible = p > 0;
    const d = dropCurve(p, 0.7);
    inner.position.y = 1.6 * d.fall + 0.025 * d.bounce;
    inner.rotation.y = 0.9 * d.rot;
    inner.scale.set(1 + 0.035 * d.squash, 1 - 0.06 * d.squash, 1 + 0.035 * d.squash);
  }
  function setGrainCount(n) { grains.count = Math.min(n, maxCount); }
  setProgress(1);
  return { group, setProgress, setGrainCount, grains };
}
