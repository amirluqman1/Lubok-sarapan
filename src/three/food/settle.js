// Rest an object on the plate/leaf surface: lifts `target` so no vertex of `meshes` is below foodY.
import * as THREE from 'three';
import { foodY } from './layout.js';

const v = new THREE.Vector3();
export function restOnFood(root, target, meshes, clearance = 0.0005) {
  root.updateMatrixWorld(true);
  let lift = -Infinity;
  for (const mesh of meshes) {
    mesh.updateMatrixWorld(true);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      const need = foodY(v.x, v.z) + clearance - v.y;
      if (need > lift) lift = need;
    }
  }
  target.position.y += lift;
  root.updateMatrixWorld(true);
  return lift;
}
