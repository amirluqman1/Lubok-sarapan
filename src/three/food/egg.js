// Halved hard-boiled egg: asymmetric egg-shaped white shell, bevelled cut face, domed crumbly yolk.
import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import { createNoise3D } from '../util/noise.js';
import { mulberry32 } from '../util/random.js';
import { dropCurve } from '../util/ease.js';
import { restOnFood } from './settle.js';

const A = 0.205;  // half length
const B = 0.143;  // half width
const DEPTH = 0.9; // dome depth relative to width

// egg outline radius along the long axis (blunt end at +x)
const outline = (alpha) => B * Math.sin(alpha) * (1 + 0.09 * Math.cos(alpha));

export function createEgg({ quality, textures }) {
  const noise = createNoise3D(mulberry32(55));
  const group = new THREE.Group();
  group.name = 'egg';
  const nA = quality.tier === 'low' ? 32 : 64, nB = quality.tier === 'low' ? 16 : 32;

  // ---------- outer white (half shell, cut plane y = 0, dome below)
  const shell = new THREE.BufferGeometry();
  {
    const pos = [], idx = [];
    for (let i = 0; i <= nA; i++) {
      const al = (i / nA) * Math.PI;
      const x = A * Math.cos(al), r = outline(al);
      for (let j = 0; j <= nB; j++) {
        const be = (j / nB) * Math.PI;
        const z = r * Math.cos(be);
        let y = -r * Math.sin(be) * DEPTH;
        // rounded rim where the knife cut the white
        y = Math.min(y, -0.003 * Math.pow(Math.cos(be), 12));
        pos.push(x, y + 0.0015 * noise(x * 20, y * 20, z * 20), z);
      }
    }
    for (let i = 0; i < nA; i++) for (let j = 0; j < nB; j++) {
      const a = i * (nB + 1) + j, b = a + nB + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    shell.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    shell.setIndex(idx);
    shell.computeVertexNormals();
  }
  const whiteMat = new THREE.MeshPhysicalMaterial({
    color: 0xf6f2ea, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.25,
    sheen: 0.6, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.4,
    emissive: new THREE.Color(0x1a1814), emissiveIntensity: 0.7, side: THREE.DoubleSide,
  });
  const white = new THREE.Mesh(shell, whiteMat);

  // ---------- cut face (slightly concave white ring)
  const face = new THREE.BufferGeometry();
  {
    const pos = [], idx = [];
    const nC = nB;
    for (let i = 0; i <= nA; i++) {
      const al = (i / nA) * Math.PI;
      const x = A * Math.cos(al), r = outline(al);
      for (let j = 0; j <= nC; j++) {
        const c = (j / nC) * 2 - 1;
        const z = r * c * 0.985;
        const y = -0.003 * Math.pow(Math.abs(c), 12) - 0.0025 * (1 - c * c) * Math.sin(al) + 0.0008 * noise(x * 40, 0, z * 40);
        pos.push(x * 0.995, y, z);
      }
    }
    for (let i = 0; i < nA; i++) for (let j = 0; j < nC; j++) {
      const a = i * (nC + 1) + j, b = a + nC + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    face.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    face.setIndex(idx);
    face.computeVertexNormals();
  }
  const faceMat = new THREE.MeshPhysicalMaterial({
    color: 0xfaf7f0, roughness: 0.42, sheen: 0.5, sheenColor: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0x1d1b17), emissiveIntensity: 0.8, side: THREE.DoubleSide,
  });
  const cut = new THREE.Mesh(face, faceMat);

  // ---------- yolk: domed, slightly crumbly, toward the blunt end
  const yolkGeo = new THREE.BufferGeometry();
  {
    const pos = [], idx = [], col = [];
    const NR = quality.tier === 'low' ? 10 : 20, NS = quality.tier === 'low' ? 32 : 64;
    const ya = 0.118, yb = 0.094, cx = 0.02;
    const cCenter = new THREE.Color(0xdc7f06), cEdge = new THREE.Color(0xeaa522), cc = new THREE.Color();
    pos.push(cx, 0.024, 0); cc.copy(cCenter); col.push(cc.r, cc.g, cc.b);
    for (let i = 1; i <= NR; i++) {
      const t = i / NR;
      for (let j = 0; j < NS; j++) {
        const th = (j / NS) * Math.PI * 2;
        const wob = 1 + 0.04 * noise(Math.cos(th) * 2, Math.sin(th) * 2, 3);
        const x = cx + Math.cos(th) * ya * t * wob, z = Math.sin(th) * yb * t * wob;
        const y = 0.024 * Math.pow(Math.max(0, 1 - t * t), 0.7) + 0.003 * noise(x * 45, z * 45, 1) * (1 - t) - 0.0006;
        pos.push(x, y, z);
        cc.copy(cCenter).lerp(cEdge, Math.pow(t, 3));
        col.push(cc.r, cc.g, cc.b);
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
    yolkGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    yolkGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    yolkGeo.setAttribute('uv', new THREE.Float32BufferAttribute(pos.filter((_, i) => i % 3 !== 1).map((v) => v * 6), 2));
    yolkGeo.setIndex(idx);
    yolkGeo.computeVertexNormals();
  }
  const yolkMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.78, bumpMap: textures.bumpFine, bumpScale: 2.5,
    emissive: new THREE.Color(0x3a2200), emissiveIntensity: 0.35,
  });
  const yolk = new THREE.Mesh(yolkGeo, yolkMat);

  const body = new THREE.Group();
  body.add(white, cut, yolk);
  for (const m of [white, cut, yolk]) { m.castShadow = true; m.receiveShadow = true; }
  // tilt the cut face slightly toward the camera, then rest on the leaf
  body.rotation.set(0.16, LAYOUT.egg.yaw, 0, 'YXZ');
  group.add(body);
  group.position.set(LAYOUT.egg.x, 0, LAYOUT.egg.z);
  restOnFood(group, body, [white]);
  const restY = body.position.y;
  const restRot = body.rotation.clone();

  function setProgress(p) {
    group.visible = p > 0;
    const d = dropCurve(p, 0.72);
    body.position.y = restY + 1.5 * d.fall + 0.02 * d.bounce;
    body.rotation.set(restRot.x + 0.9 * d.rot, restRot.y + 1.6 * d.rot, restRot.z - 0.5 * d.rot, 'YXZ');
  }
  setProgress(1);
  return { group, setProgress };
}
