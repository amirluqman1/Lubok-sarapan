// Scene, studio lighting, environment reflections and the walnut table.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function createRenderer(canvas, { antialias }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0a0604, 1);
  return renderer;
}

export function createStage({ renderer, textures, quality }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0604);
  scene.fog = new THREE.Fog(0x0a0604, 7.5, 17);

  // reflections: neutral studio room, toned down so the warm key light dominates
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.28;
  scene.environmentRotation.set(0, 2.2, 0);
  pmrem.dispose();

  // table
  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshStandardMaterial({ map: textures.wood.map, roughnessMap: textures.wood.roughnessMap, roughness: 1, color: 0x9a8878 })
  );
  for (const t of [textures.wood.map, textures.wood.roughnessMap]) { t.repeat.set(2.2, 2.2); t.rotation = 0.35; t.center.set(0.5, 0.5); }
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  table.name = 'table';
  scene.add(table);

  // ---- lights
  const key = new THREE.DirectionalLight(0xffdcb0, 3.4); // warm soft key, behind-left (food photography back-light)
  key.position.set(-2.4, 4.4, -2.2);
  key.castShadow = quality.shadows;
  key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
  Object.assign(key.shadow.camera, { left: -1.7, right: 1.7, top: 1.7, bottom: -1.7, near: 1, far: 12 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0xfff0dc, 0.75); // soft frontal fill, no shadows
  fill.position.set(2.6, 2.4, 4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffd2a0, 1.7); // rim from back-right: edge highlights, sauce gloss
  rim.position.set(3, 1.5, -3.2);
  scene.add(rim);

  const pool = new THREE.SpotLight(0xffd5a0, 20, 12, 0.3, 0.95, 1.4); // light pool on the table
  pool.position.set(0.3, 7, 1.4);
  pool.target.position.set(0, 0, 0);
  scene.add(pool, pool.target);

  const hemi = new THREE.HemisphereLight(0xffe6c8, 0x20120a, 0.38);
  scene.add(hemi);

  renderer.shadowMap.enabled = quality.shadows;

  return { scene, lights: { key, fill, rim, pool, hemi }, table, envRT };
}
