// Subtle rising steam: a handful of soft noise sprites (cheap, disabled on low quality / reduced motion).
import * as THREE from 'three';
import { LAYOUT } from './layout.js';

export function createSteam({ textures, count = 7 }) {
  const group = new THREE.Group();
  group.name = 'steam';
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: textures.steam, transparent: true, depthWrite: false, opacity: 0, color: 0xfff6ea });
    const s = new THREE.Sprite(mat);
    s.userData = { phase: i / count, ox: (Math.random() - 0.5) * 0.35, oz: (Math.random() - 0.5) * 0.25, rot: Math.random() * 6.28, spd: 0.07 + Math.random() * 0.04 };
    sprites.push(s);
    group.add(s);
  }
  const base = new THREE.Vector3(LAYOUT.rice.x, 0.38, LAYOUT.rice.z);
  function update(time, intensity) {
    group.visible = intensity > 0.01;
    if (!group.visible) return;
    for (const s of sprites) {
      const u = s.userData;
      const k = (time * u.spd + u.phase) % 1;
      s.position.set(base.x + u.ox + Math.sin(time * 0.6 + u.rot) * 0.06 * k, base.y + k * 1.0, base.z + u.oz);
      const sc = 0.35 + k * 0.7;
      s.scale.set(sc, sc * 1.4, 1);
      s.material.rotation = u.rot + k * 0.6;
      s.material.opacity = Math.sin(k * Math.PI) * 0.085 * intensity;
    }
  }
  return { group, update };
}
