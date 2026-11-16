// Single source of truth for the final dish arrangement (top view, units ≈ 13 cm).
// Camera looks from +z toward -z, so +z is "front" of the plate.
import * as THREE from 'three';

export const PLATE_RADIUS = 1.205;
export const LEAF_RADIUS = 0.86;
export const LEAF_LIFT = 0.0045;

export const LAYOUT = {
  rice: { x: -0.15, z: -0.27, R: 0.42, H: 0.3 },
  sambal: { dx: 0.035, dz: 0.075, R: 0.235 }, // relative to rice centre
  egg: { x: 0.57, z: -0.27, yaw: 1.25 },
  cucumber: { x: -0.38, z: 0.5, dirAngle: Math.atan2(0.8, 0.6) },
  pile: { x: -0.66, z: 0.04, R: 0.21 },
  chicken: { x: 0.31, z: 0.47, dir: Math.atan2(0.42, 0.91) },
};

// ---- Plate cross-section (r, y) control points: top surface -> rim bead -> underside -> foot.
export const PLATE_PROFILE = [
  [0, 0.058], [0.4, 0.058], [0.76, 0.061], [0.88, 0.074], [0.97, 0.098], [1.04, 0.126],
  [1.095, 0.147], [1.14, 0.158], [1.177, 0.156], [1.199, 0.143], [1.206, 0.128],
  [1.196, 0.115], [1.17, 0.108], [1.1, 0.097], [1.0, 0.075], [0.9, 0.051], [0.8, 0.034],
  [0.7, 0.024], [0.665, 0.02], [0.652, 0.006], [0.635, 0.0], [0.6, 0.0], [0.585, 0.012],
  [0.5, 0.026], [0.0, 0.03],
];

const _curveCache = new Map();
let _topTable = null;
export function plateCurvePoints(samples = 400) {
  if (_curveCache.has(samples)) return _curveCache.get(samples);
  const curve = new THREE.CatmullRomCurve3(
    PLATE_PROFILE.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal'
  );
  const pts = curve.getPoints(samples).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  pts[0].x = 0; pts[pts.length - 1].x = 0;
  _curveCache.set(samples, pts);
  return pts;
}

function topTable() {
  if (_topTable) return _topTable;
  const pts = plateCurvePoints();
  const t = [];
  let maxR = -1;
  for (const p of pts) {
    if (p.x < maxR) break;
    maxR = p.x; t.push(p);
  }
  _topTable = t;
  return t;
}

/** Height of the plate's top surface at radius r. */
export function plateTopY(r) {
  const t = topTable();
  if (r <= t[0].x) return t[0].y;
  for (let i = 1; i < t.length; i++) {
    if (r <= t[i].x) {
      const a = t[i - 1], b = t[i];
      const k = (r - a.x) / Math.max(1e-6, b.x - a.x);
      return a.y + (b.y - a.y) * k;
    }
  }
  return t[t.length - 1].y;
}

/** World height of the surface food rests on (leaf top inside the leaf, glaze outside). */
export function foodY(x, z) {
  const r = Math.hypot(x, z);
  return plateTopY(r) + (r < LEAF_RADIUS ? LEAF_LIFT + 0.0015 : 0.001);
}
