// Assembles every ingredient into the final dish and exposes per-ingredient progress control.
import * as THREE from 'three';
import { LAYOUT, foodY } from './layout.js';
import { createPlate } from './plate.js';
import { createRice } from './rice.js';
import { createSambal } from './sambal.js';
import { createEgg } from './egg.js';
import { createCucumber } from './cucumber.js';
import { createPile } from './pile.js';
import { createChicken } from './chicken.js';
import { createSteam } from './steam.js';
import { smoothstep } from '../util/random.js';

export const INGREDIENTS = ['plate', 'rice', 'sambal', 'egg', 'cucumber', 'anchovy', 'peanut', 'chicken'];

/**
 * Builds the dish step by step (async so the loader can report real progress).
 * @returns {Promise<{root, parts, apply(state), setQuality(q), steam}>}
 */
export async function buildDish({ quality, textures, noise, onStep }) {
  const root = new THREE.Group();
  root.name = 'dish';
  const turntable = new THREE.Group(); // user rotation is applied here
  turntable.name = 'turntable';
  root.add(turntable);

  const step = async (label, fn) => {
    const r = fn();
    onStep?.(label);
    await new Promise((res) => setTimeout(res, 0));
    return r;
  };

  const plate = await step('Pinggan seramik', () => createPlate({ quality, textures, noise }));
  const rice = await step('Nasi santan', () => createRice({ quality }));
  const sambal = await step('Sambal', () => createSambal({ quality, textures }));
  const egg = await step('Telur rebus', () => createEgg({ quality, textures }));
  const cucumber = await step('Timun', () => createCucumber({ quality, textures }));
  const pile = await step('Ikan bilis & kacang', () => createPile({ quality }));
  const chicken = await step('Ayam goreng', () => createChicken({ quality, textures }));

  const parts = { plate, rice, sambal, egg, cucumber, anchovy: pile.anchovy, peanut: pile.peanut, chicken };
  for (const k of INGREDIENTS) turntable.add(parts[k].group);

  // ---------- soft contact shadows (cheap ambient occlusion, fade in as each item lands)
  const shadowMatBase = { map: textures.contactShadow, transparent: true, depthWrite: false, color: 0x000000, polygonOffset: true, polygonOffsetFactor: -2 };
  const blob = (x, z, sx, sz, rot, opacity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ ...shadowMatBase, opacity }));
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.scale.set(sx, sz, 1);
    m.position.set(x, foodY(x, z) + 0.0008, z);
    m.renderOrder = 1;
    m.userData.baseOpacity = opacity;
    turntable.add(m);
    return m;
  };
  const shadows = {
    rice: blob(LAYOUT.rice.x, LAYOUT.rice.z, 1.12, 1.12, 0, 0.55),
    egg: blob(LAYOUT.egg.x, LAYOUT.egg.z, 0.5, 0.42, -LAYOUT.egg.yaw, 0.45),
    cucumber: blob(LAYOUT.cucumber.x, LAYOUT.cucumber.z, 0.5, 0.62, -LAYOUT.cucumber.dirAngle + Math.PI / 2, 0.35),
    anchovy: blob(LAYOUT.pile.x, LAYOUT.pile.z, 0.55, 0.55, 0, 0.45),
    chicken: blob(LAYOUT.chicken.x - 0.05, LAYOUT.chicken.z - 0.02, 0.85, 0.42, LAYOUT.chicken.dir, 0.55),
  };
  // table contact shadow under the plate (outside turntable, it is radially symmetric anyway)
  const plateShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ ...shadowMatBase, opacity: 0.75 }));
  plateShadow.rotation.x = -Math.PI / 2;
  plateShadow.scale.setScalar(3.1);
  plateShadow.position.y = 0.002;
  root.add(plateShadow);

  const steam = createSteam({ textures });
  turntable.add(steam.group);

  const last = {};
  function apply(state) {
    for (const k of INGREDIENTS) {
      const v = state[k];
      if (last[k] === v) continue;
      last[k] = v;
      parts[k].setProgress(v);
      const sh = shadows[k];
      if (sh) sh.material.opacity = sh.userData.baseOpacity * smoothstep(0.55, 0.95, v);
    }
  }

  function setQuality(q) {
    rice.setGrainCount(q.riceCount);
    chicken.setCrumbCount(q.crumbs);
  }

  return { root, turntable, parts, apply, steam, setQuality };
}
