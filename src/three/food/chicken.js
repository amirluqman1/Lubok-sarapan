// Ayam goreng berempah (fried drumstick): lathe body with anatomical asymmetry, multi-scale crust
// displacement (lumps + ridged batter crags + fine grit), cavity-darkened vertex colours,
// instanced crispy batter crumbs and an exposed bone knuckle.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LAYOUT } from './layout.js';
import { createNoise3D, fbm, ridged } from '../util/noise.js';
import { mulberry32, range, clamp, smoothstep, lerp } from '../util/random.js';
import { dropCurve } from '../util/ease.js';
import { restOnFood } from './settle.js';

const L = 0.68;
// drumstick radius profile along t (0 = bone knuckle, 1 = round meaty end)
const PROFILE = [[0.14, 0.03], [0.17, 0.05], [0.25, 0.066], [0.36, 0.092], [0.48, 0.128], [0.6, 0.158],
  [0.7, 0.172], [0.79, 0.168], [0.87, 0.148], [0.93, 0.115], [0.975, 0.07], [1.0, 0.0]];
function radiusAt(t) {
  if (t <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    if (t <= PROFILE[i][0]) {
      const [t0, r0] = PROFILE[i - 1], [t1, r1] = PROFILE[i];
      const k = (t - t0) / (t1 - t0);
      const s = k * k * (3 - 2 * k);
      // round off the tip with a circular arc
      if (i === PROFILE.length - 1) return r0 * Math.sqrt(Math.max(0, 1 - k * k));
      return lerp(r0, r1, s);
    }
  }
  return 0;
}

export function createChicken({ quality, textures }) {
  const noise = createNoise3D(mulberry32(6061));
  const rng = mulberry32(6062);
  const group = new THREE.Group();
  group.name = 'chicken';
  const [nAround, nAlong] = quality.chickenRes;

  // ---------- crust body: parametric tube along x, built as a grid then seam-welded
  const pos = [], uv = [], idx = [];
  const tStart = 0.135;
  for (let i = 0; i <= nAlong; i++) {
    const t = tStart + (1 - tStart) * (i / nAlong);
    const r = radiusAt(t);
    const x = (t - 0.5) * L;
    const bend = 0.02 * Math.sin(Math.PI * t); // slight banana curve of the leg
    for (let j = 0; j <= nAround; j++) {
      const a = (j / nAround) * Math.PI * 2;
      // asymmetric meat: fuller on one side (+y) and slightly flattened where it rests (-y)
      const fuller = 1 + 0.12 * Math.max(0, Math.sin(a)) * Math.sin(Math.PI * t);
      const flat = Math.sin(a) < 0 ? 1 - 0.14 * Math.pow(-Math.sin(a), 2) : 1;
      const y = Math.sin(a) * r * fuller * flat * 0.92 + bend;
      const z = Math.cos(a) * r * 0.9;
      pos.push(i === nAlong ? x : x, i === nAlong ? bend : y, i === nAlong ? 0 : z);
      uv.push(j / nAround * 3, t * 4);
    }
  }
  for (let i = 0; i < nAlong; i++) for (let j = 0; j < nAround; j++) {
    const a = i * (nAround + 1) + j, b = a + nAround + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo = mergeVertices(geo, 1e-6);
  geo.computeVertexNormals();

  // displacement along normals
  const p = geo.attributes.position, n = geo.attributes.normal;
  const count = p.count;
  const disp = new Float32Array(count), cav = new Float32Array(count);
  const tmp = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(p, i); nn.fromBufferAttribute(n, i);
    const t = tmp.x / L + 0.5;
    const meat = smoothstep(0.14, 0.22, t);
    const lumps = fbm(noise, tmp.x * 4.5, tmp.y * 4.5, tmp.z * 4.5, 3);
    const crag = ridged(noise, tmp.x * 13 + 3, tmp.y * 13, tmp.z * 13, 4);
    const grit = noise(tmp.x * 48, tmp.y * 48, tmp.z * 48);
    const flakes = smoothstep(0.55, 0.85, ridged(noise, tmp.x * 26 + 9, tmp.y * 26, tmp.z * 26, 2));
    const d = meat * (0.02 * lumps + 0.026 * (crag - 0.45) + 0.004 * grit + 0.008 * flakes);
    disp[i] = d;
    cav[i] = clamp(0.5 + (crag - 0.45) * 1.6 + lumps * 0.5, 0, 1);
    p.setXYZ(i, tmp.x + nn.x * d, tmp.y + nn.y * d, tmp.z + nn.z * d);
  }
  geo.computeVertexNormals();
  // uv after merge (generate cylindrical uv for bump detail)
  const uvA = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    uvA[i * 2] = (Math.atan2(y, z) / (Math.PI * 2) + 0.5) * 3;
    uvA[i * 2 + 1] = (x / L + 0.5) * 5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));

  // vertex colours: deep crevices → mahogany, crests → golden turmeric crust, scattered burnt spots
  const colors = new Float32Array(count * 3);
  const cDeep = new THREE.Color(0x341405), cMid = new THREE.Color(0x7c3a0e), cGold = new THREE.Color(0xb46b22), cHi = new THREE.Color(0xd19341), cBurn = new THREE.Color(0x2a1003), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    tmp.fromBufferAttribute(p, i);
    const t = tmp.x / L + 0.5;
    const k = cav[i];
    if (k < 0.5) c.copy(cDeep).lerp(cMid, k / 0.5); else c.copy(cMid).lerp(cGold, (k - 0.5) / 0.5);
    const hi = smoothstep(0.75, 1, k) * (0.5 + 0.5 * noise(tmp.x * 20, tmp.y * 20, tmp.z * 20));
    c.lerp(cHi, hi * 0.6);
    const burn = smoothstep(0.45, 0.75, fbm(noise, tmp.x * 7 + 11, tmp.y * 7, tmp.z * 7, 3));
    c.lerp(cBurn, burn * 0.55);
    // underside (touching plate) & the ends brown more
    c.lerp(cDeep, smoothstep(0.25, 0.14, t) * 0.5);
    const tone = 0.9 + 0.2 * (noise(tmp.x * 3, tmp.y * 3, tmp.z * 3 + 4) * 0.5 + 0.5);
    colors[i * 3] = c.r * tone; colors[i * 3 + 1] = c.g * tone; colors[i * 3 + 2] = c.b * tone;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const crustMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.55,
    bumpMap: textures.bumpCoarse,
    bumpScale: 1.6,
    clearcoat: 0.4,
    clearcoatRoughness: 0.32,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xffb25a),
    sheenRoughness: 0.5,
  });
  const crust = new THREE.Mesh(geo, crustMat);
  crust.castShadow = true; crust.receiveShadow = true;
  crust.name = 'chickenCrust';

  // ---------- bone knuckle
  const bonePts = [];
  const boneProfile = [[0.0, 0.0], [0.004, 0.03], [0.02, 0.046], [0.045, 0.048], [0.07, 0.036], [0.1, 0.026], [0.16, 0.024], [0.2, 0.024]];
  for (const [t, r] of boneProfile) bonePts.push(new THREE.Vector2(r, (t - 0.5) * L));
  const boneGeo = new THREE.LatheGeometry(bonePts, quality.tier === 'low' ? 16 : 28);
  boneGeo.rotateZ(Math.PI / 2);
  boneGeo.scale(-1, 1, 1);
  {
    const bp = boneGeo.attributes.position;
    const bc = new Float32Array(bp.count * 3);
    const cBone = new THREE.Color(0xeadcc0), cToast = new THREE.Color(0x9b6a3c);
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const t = x / L + 0.5;
      const s = 1 + 0.06 * noise(x * 30, y * 30, z * 30);
      bp.setXYZ(i, x, y * s, z * s);
      c.copy(cBone).lerp(cToast, clamp(smoothstep(0.03, 0.0, t) * 0.4 + smoothstep(0.1, 0.16, t) * 0.8 + (noise(x * 25, y * 25, z * 25) * 0.5 + 0.5) * 0.25, 0, 1));
      bc.set([c.r, c.g, c.b], i * 3);
    }
    boneGeo.setAttribute('color', new THREE.BufferAttribute(bc, 3));
    boneGeo.computeVertexNormals();
  }
  const boneMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const bone = new THREE.Mesh(boneGeo, boneMat);
  bone.castShadow = true; bone.receiveShadow = true;
  bone.name = 'chickenBone';

  // ---------- crumbs (crispy flour bits) scattered on the crust
  const crumbGeo = new THREE.IcosahedronGeometry(1, quality.tier === 'low' ? 1 : 2);
  {
    const cp = crumbGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
      const s = 1 + 0.3 * noise(x * 1.7, y * 1.7, z * 1.7);
      cp.setXYZ(i, x * s, y * s * 0.45, z * s);
    }
    crumbGeo.computeVertexNormals();
  }
  const crumbMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.62, clearcoat: 0.3, clearcoatRoughness: 0.45, sheen: 0.4, sheenColor: new THREE.Color(0xffb25a) });
  const crumbs = new THREE.InstancedMesh(crumbGeo, crumbMat, quality.crumbs);
  crumbs.castShadow = quality.tier === 'high';
  crumbs.receiveShadow = true;
  {
    const sampler = new MeshSurfaceSampler(crust).setRandomGenerator(rng).build();
    const P = new THREE.Vector3(), N = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), m = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
    let i = 0, guard = 0;
    while (i < quality.crumbs && guard++ < quality.crumbs * 10) {
      sampler.sample(P, N);
      if (P.x / L + 0.5 < 0.2) continue;
      const size = range(rng, 0.003, 0.0085) * (rng() < 0.1 ? 1.5 : 1);
      P.addScaledVector(N, size * 0.1);
      q.setFromUnitVectors(up, N);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(up, rng() * 6.28));
      s.set(size * range(rng, 0.8, 1.3), size, size * range(rng, 0.8, 1.3));
      m.compose(P, q, s);
      crumbs.setMatrixAt(i, m);
      c.copy(cMid).lerp(cHi, rng() * 0.9).multiplyScalar(range(rng, 0.75, 1.05));
      crumbs.setColorAt(i, c);
      i++;
    }
    crumbs.count = i;
    crumbs.instanceMatrix.needsUpdate = true;
    crumbs.instanceColor.needsUpdate = true;
  }

  const body = new THREE.Group();
  body.add(crust, bone, crumbs);
  // orientation: bone end points outward toward the front-right rim, meat end toward the rice.
  // local +x is the meaty end → yaw so local +x points along -dir.
  const C = LAYOUT.chicken;
  body.rotation.set(0.18, Math.PI - C.dir, 0.04, 'YXZ');
  group.add(body);
  group.position.set(C.x, 0, C.z);
  restOnFood(group, body, [crust, bone]);
  const restY = body.position.y, restRot = body.rotation.clone();

  function setProgress(p) {
    group.visible = p > 0;
    const d = dropCurve(p, 0.72);
    body.position.y = restY + 1.8 * d.fall + 0.03 * d.bounce;
    body.rotation.set(restRot.x - 0.7 * d.rot, restRot.y - 1.4 * d.rot, restRot.z + 0.4 * d.rot, 'YXZ');
    body.position.x = 0.35 * d.fall;
  }
  function setCrumbCount(nC) { crumbs.count = Math.min(nC, quality.crumbs); }
  setProgress(1);
  return { group, setProgress, setCrumbCount };
}
