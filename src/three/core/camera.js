// Camera rig: poses expressed as orbit params (azimuth, elevation, fit, target height),
// keyframed against assembly progress and auto-fitted to any aspect ratio (portrait phones included).
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../util/random.js';

const FIT_RADIUS = 1.32; // plate radius + margin

export const ASSEMBLY_KEYS = [
  { p: 0.0, az: -0.6, el: 1.2, fit: 1.0, ty: 0.0 },
  { p: 0.1, az: -0.24, el: 0.94, fit: 0.98, ty: 0.04 },
  { p: 0.45, az: -0.1, el: 0.9, fit: 0.97, ty: 0.05 },
  { p: 0.9, az: 0.06, el: 0.86, fit: 0.96, ty: 0.06 },
  { p: 1.0, az: 0.46, el: 0.56, fit: 0.86, ty: 0.1 },
];
export const HERO_POSE = { az: 0.62, el: 0.5, fit: 0.86, ty: 0.12 };

export function poseAt(p, out) {
  const K = ASSEMBLY_KEYS;
  let i = 1;
  while (i < K.length - 1 && p > K[i].p) i++;
  const a = K[i - 1], b = K[i];
  const t = smoothstep(a.p, b.p, clamp(p, a.p, b.p));
  out.az = lerp(a.az, b.az, t); out.el = lerp(a.el, b.el, t);
  out.fit = lerp(a.fit, b.fit, t); out.ty = lerp(a.ty, b.ty, t);
  return out;
}
export function mixPose(a, b, t, out) {
  out.az = lerp(a.az, b.az, t); out.el = lerp(a.el, b.el, t);
  out.fit = lerp(a.fit, b.fit, t); out.ty = lerp(a.ty, b.ty, t);
  return out;
}

export function createCameraRig() {
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const target = new THREE.Vector3();
  const view = { w: 1, h: 1, ox: 0, oy: 0 };
  function setViewport(w, h, ox = 0, oy = 0) {
    view.w = w; view.h = h; view.ox = ox; view.oy = oy;
    camera.aspect = w / h;
    if (ox || oy) camera.setViewOffset(w, h, -ox * w, -oy * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function apply(pose) {
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    // portrait screens: fit to width; landscape: fit to height (with elevation foreshortening)
    const fore = lerp(0.62, 1, Math.sin(pose.el));
    const half = Math.min(vf / 2 / Math.max(0.55, fore), hf / 2);
    // portrait phones: keep (almost) the whole plate inside the narrow width
    const fit = camera.aspect < 1 ? lerp(pose.fit, 1.02, 0.75) : pose.fit;
    const dist = (FIT_RADIUS * fit) / Math.sin(half);
    target.set(pose.tx || 0, pose.ty, pose.tz || 0);
    camera.position.set(
      target.x + Math.sin(pose.az) * Math.cos(pose.el) * dist,
      pose.ty + Math.sin(pose.el) * dist,
      target.z + Math.cos(pose.az) * Math.cos(pose.el) * dist
    );
    camera.lookAt(target);
  }
  return { camera, setViewport, apply, view };
}
