// Cucumber: diagonally cut slices (elliptical), shingled so each slice rests on the previous one.
import * as THREE from 'three';
import { LAYOUT, foodY } from './layout.js';
import { mulberry32, range } from '../util/random.js';
import { win, dropCurve } from '../util/ease.js';

export function createCucumber({ quality, textures }) {
  const rng = mulberry32(4242);
  const group = new THREE.Group();
  group.name = 'cucumber';
  const C = LAYOUT.cucumber;
  group.position.set(C.x, 0, C.z);

  const N = 4;
  const r = 0.118, t = 0.03, stretch = 1.32, spacing = 0.098;
  const seg = quality.tier === 'low' ? 28 : 48;
  const geo = new THREE.CylinderGeometry(r, r, t, seg, 1, false);
  // soften the cut edge a little so the rim catches light
  {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const x = p.getX(i), z = p.getZ(i);
      const rr = Math.hypot(x, z);
      if (rr > r * 0.99 && Math.abs(y) > t * 0.49) { p.setX(i, x * 0.985); p.setZ(i, z * 0.985); }
    }
    geo.computeVertexNormals();
  }
  geo.scale(stretch, 1, 1); // ellipse: long axis = local x

  const faceMat = new THREE.MeshPhysicalMaterial({
    map: textures.cucumberFace, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.12,
    emissive: new THREE.Color(0xffffff), emissiveMap: textures.cucumberFace, emissiveIntensity: 0.1,
    sheen: 0.5, sheenColor: new THREE.Color(0xe8ffd0),
  });
  const peelMat = new THREE.MeshPhysicalMaterial({ color: 0x1c3810, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const mats = [peelMat, faceMat, faceMat];

  // 2D profile solve along the fan direction d: slice i front edge on the plate,
  // back edge resting on top of slice i-1.  (half-extent along d = r because long axis ⟂ d)
  const base = foodY(C.x, C.z);
  const slices = [];
  let prev = null;
  for (let i = 0; i < N; i++) {
    const xc = (i - (N - 1) / 2) * spacing;
    let phi = 0;
    if (prev) {
      const backD = xc - r;
      // top surface height of previous slice at backD
      const yTop = base + (prev.xc + r - backD) * Math.tan(prev.phi) + t / Math.cos(prev.phi);
      phi = Math.atan2(yTop - base, 2 * r) * 0.98;
    }
    const cy = base + r * Math.sin(phi) + (t / 2) * Math.cos(phi);
    const s = { xc, phi, cy };
    slices.push(s);
    prev = s;
  }
  const dirX = Math.cos(C.dirAngle), dirZ = Math.sin(C.dirAngle);
  const meshes = slices.map((s, i) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(geo, mats);
    m.castShadow = true; m.receiveShadow = true;
    // local frame: x = along fan (d), long axis of ellipse ⟂ d  -> rotate geometry 90° about y
    m.rotation.y = Math.PI / 2 + range(rng, -0.08, 0.08);
    const tiltHolder = new THREE.Group();
    tiltHolder.rotation.z = -s.phi; // raise back edge (-x side) → face tilts toward +x (front of the fan)
    tiltHolder.add(m);
    pivot.add(tiltHolder);
    pivot.position.set(dirX * s.xc, s.cy, dirZ * s.xc);
    pivot.rotation.y = -C.dirAngle;
    group.add(pivot);
    return { pivot, rest: pivot.position.clone(), restRotY: pivot.rotation.y, i };
  });

  function setProgress(p) {
    group.visible = p > 0;
    for (const s of meshes) {
      const local = win(p, s.i * 0.17, s.i * 0.17 + 0.5);
      s.pivot.visible = local > 0;
      const d = dropCurve(local, 0.7);
      // swoop in from the left/front edge of the frame
      s.pivot.position.set(
        s.rest.x - 1.4 * d.fall,
        s.rest.y + 0.9 * d.fall + 0.012 * d.bounce,
        s.rest.z + 0.6 * d.fall
      );
      s.pivot.rotation.set(1.2 * d.rot, s.restRotY + 2.2 * d.rot, 0);
    }
  }
  setProgress(1);
  return { group, setProgress };
}
