// Ceramic plate (lathe + hand-thrown wobble + speckled stoneware glaze) and banana-leaf liner.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { plateCurvePoints, plateTopY, LEAF_RADIUS, LEAF_LIFT, PLATE_RADIUS } from './layout.js';
import { easeOutCubic } from '../util/ease.js';

export function createPlate({ quality, textures, noise }) {
  const group = new THREE.Group();
  group.name = 'plate';

  // ---------- plate body
  const segs = quality.plateSegments;
  let geo = new THREE.LatheGeometry(plateCurvePoints(quality.tier === 'low' ? 110 : 170), segs);
  geo.deleteAttribute('normal');
  const pos = geo.attributes.position;
  const span = PLATE_RADIUS * 2.025;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 1e-4) {
      // subtle hand-thrown irregularity, continuous around the seam
      const a = Math.atan2(z, x);
      const wob = 1 + 0.0035 * noise(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.7) * Math.min(1, r);
      x *= wob; z *= wob;
      y += 0.0018 * noise(Math.cos(a) * 2, Math.sin(a) * 2, 3.1) * Math.min(1, r * r);
      pos.setXYZ(i, x, y, z);
    }
    uv[i * 2] = x / span + 0.5;
    uv[i * 2 + 1] = z / span + 0.5;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo = mergeVertices(geo, 1e-5);
  geo.computeVertexNormals();

  const plateMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: textures.plate.map,
    roughnessMap: textures.plate.roughnessMap,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    sheen: 0.15,
    sheenColor: new THREE.Color(0xfff1dc),
  });
  const plate = new THREE.Mesh(geo, plateMat);
  plate.castShadow = true;
  plate.receiveShadow = true;
  plate.name = 'plateBody';
  group.add(plate);

  // ---------- banana leaf liner (follows the plate well)
  const NR = quality.tier === 'low' ? 18 : 30, NS = quality.tier === 'low' ? 72 : 128;
  const lp = [], luv = [], lidx = [];
  lp.push(0, plateTopY(0) + LEAF_LIFT, 0); luv.push(0.5, 0.5);
  const ca = Math.cos(0.55), sa = Math.sin(0.55);
  for (let i = 1; i <= NR; i++) {
    const t = i / NR;
    for (let j = 0; j < NS; j++) {
      const th = (j / NS) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      const edge = LEAF_RADIUS * (1 + 0.025 * noise(c * 2.2, s * 2.2, 8.8) + 0.008 * noise(c * 9, s * 9, 1.1));
      const r = t * edge;
      const x = c * r, z = s * r;
      const y = plateTopY(r) + LEAF_LIFT + 0.0016 * noise(x * 5, z * 5, 2.2) * t;
      lp.push(x, y, z);
      luv.push((x * ca - z * sa) / 1.9 + 0.5, (x * sa + z * ca) / 1.9 + 0.5);
    }
  }
  for (let j = 0; j < NS; j++) lidx.push(0, 1 + ((j + 1) % NS), 1 + j);
  for (let i = 1; i < NR; i++) {
    const a0 = 1 + (i - 1) * NS, b0 = 1 + i * NS;
    for (let j = 0; j < NS; j++) {
      const j1 = (j + 1) % NS;
      lidx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  leafGeo.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2));
  leafGeo.setIndex(lidx);
  leafGeo.computeVertexNormals();
  const leafMat = new THREE.MeshPhysicalMaterial({
    map: textures.leaf.map,
    bumpMap: textures.leaf.bumpMap,
    bumpScale: 0.5,
    roughness: 0.32,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
    side: THREE.DoubleSide,
  });
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.receiveShadow = true;
  leaf.name = 'bananaLeaf';
  group.add(leaf);

  function setProgress(p) {
    // The plate is always present (it is the stage); its entrance is a slow settle + turn.
    const e = easeOutCubic(p);
    group.rotation.y = -0.55 * (1 - e);
    group.position.y = -0.03 * (1 - e);
    leaf.scale.setScalar(0.9 + 0.1 * e);
  }
  setProgress(1);
  return { group, setProgress };
}
