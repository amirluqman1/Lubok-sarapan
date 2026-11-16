// Orchestrates renderer, scene, dish, GSAP timeline, camera, controls, quality and the render loop.
import * as THREE from 'three';
import { createRenderer, createStage } from './core/scene.js';
import { createCameraRig, poseAt, mixPose, HERO_POSE } from './core/camera.js';
import { createAssemblyTimeline } from './core/assembly.js';
import { createTurntableControls } from './core/controls.js';
import { TIERS, buildParams, detectTier, lowerTier, createFpsMonitor } from './core/quality.js';
import * as T from './core/textures.js';
import { buildDish, INGREDIENTS } from './food/dish.js';
import { createNoise3D } from './util/noise.js';
import { mulberry32, smoothstep, clamp } from './util/random.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function createExperience({ canvas, qualityPref = 'auto', reducedMotion = false, still = false, onProgress }) {
  const detected = detectTier();
  const buildTier = qualityPref !== 'auto' ? qualityPref : detected.tier;
  const params = buildParams(buildTier);
  let runtime = { ...TIERS[buildTier] };
  let mode = qualityPref; // 'auto' | tier

  const renderer = createRenderer(canvas, { antialias: params.antialias });
  const report = (() => {
    let done = 0; const total = 16;
    return async (label) => { done++; onProgress?.(Math.min(1, done / total), label); await tick(); };
  })();

  // ---------- procedural textures
  const rng = mulberry32(1);
  const noise = createNoise3D(mulberry32(2));
  const ts = params.textureSize;
  const textures = {};
  textures.wood = T.woodTextures(noise, ts); await report('Meja kayu');
  textures.plate = T.plateTextures(noise, rng, 1.205 * 2.025, ts); await report('Glis seramik');
  textures.leaf = T.leafTextures(noise, rng, ts); await report('Daun pisang');
  textures.cucumberFace = T.cucumberFaceTexture(rng, 512);
  textures.bumpFine = T.blobBumpTexture(rng, 256, 900, 6);
  textures.bumpCoarse = T.blobBumpTexture(rng, 256, 520, 13);
  textures.steam = T.steamTexture(noise, 128);
  textures.contactShadow = T.contactShadowTexture(128);
  await report('Tekstur bahan');

  // ---------- scene & dish
  const stage = createStage({ renderer, textures, quality: runtime });
  const { scene, lights } = stage;
  await report('Pencahayaan studio');
  const dish = await buildDish({ quality: params, textures, noise, onStep: (l) => report(l) });
  scene.add(dish.root);

  const rig = createCameraRig();
  const { camera } = rig;
  const { tl, state } = createAssemblyTimeline();
  const controls = createTurntableControls(canvas, { reducedMotion });

  // ---------- sizing
  let vw = 1, vh = 1;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (w === vw && h === vh) return;
    vw = w; vh = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, runtime.dprCap));
    renderer.setSize(w, h, false);
    dirty = true;
  }

  // ---------- quality
  function applyRuntime(t) {
    runtime = { ...TIERS[t] };
    const wasShadows = renderer.shadowMap.enabled;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, runtime.dprCap));
    renderer.setSize(vw, vh, false);
    renderer.shadowMap.enabled = runtime.shadows;
    lights.key.castShadow = runtime.shadows;
    if (lights.key.shadow.mapSize.x !== runtime.shadowMapSize) {
      lights.key.shadow.mapSize.set(runtime.shadowMapSize, runtime.shadowMapSize);
      lights.key.shadow.map?.dispose(); lights.key.shadow.map = null;
    }
    if (wasShadows !== runtime.shadows) scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    dish.setQuality({ ...runtime, riceCount: Math.min(runtime.riceCount, params.riceMax) });
    dirty = true;
    onQuality?.(info());
  }
  let onQuality = null;
  const fps = createFpsMonitor({
    threshold: 30,
    onSlow: () => {
      if (mode !== 'auto') return;
      const lower = lowerTier(runtime.tier);
      if (lower) applyRuntime(lower);
    },
  });

  // ---------- scroll-driven state (targets set by ScrollTrigger, smoothed here)
  const target = { hero: 1, asm: 0 };
  const cur = { hero: 1, asm: 0 };
  let stageActive = true, showcase = false, framing = { ox: 0, oy: 0 }, dirty = true;
  const pose = { az: 0, el: 0, fit: 1, ty: 0 }, poseA = { ...pose };
  let time = 0, last = performance.now(), raf = 0, lastP = -1;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!stageActive || document.hidden) return;
    time += still ? 0 : dt;
    if (still && time === 0) time = 3.3;
    resize();

    const k = reducedMotion || still ? 1 : 1 - Math.exp(-dt * 7);
    cur.hero += (target.hero - cur.hero) * k;
    cur.asm += (target.asm - cur.asm) * k;
    if (Math.abs(target.hero - cur.hero) < 1e-4) cur.hero = target.hero;
    if (Math.abs(target.asm - cur.asm) < 1e-4) cur.asm = target.asm;

    const P = Math.max(cur.asm, cur.hero);
    if (P !== lastP) { tl.progress(P); dish.apply(state); lastP = P; dirty = true; }

    // camera
    poseAt(cur.asm, poseA);
    const heroPose = { ...HERO_POSE, az: HERO_POSE.az + (reducedMotion ? 0 : Math.sin(time * 0.18) * 0.22) };
    mixPose(poseA, heroPose, smoothstep(0, 1, cur.hero), pose);
    // turntable / showcase
    controls.setEnabled(showcase);
    const moving = controls.update(dt);
    const cs = controls.state;
    if (!showcase) {
      cs.yaw = Math.atan2(Math.sin(cs.yaw), Math.cos(cs.yaw)) * Math.exp(-dt * 3);
      cs.pitch *= Math.exp(-dt * 3);
    }
    pose.el = clamp(pose.el + cs.pitch, 0.22, 1.35);
    dish.turntable.rotation.y = cs.yaw;
    rig.setViewport(vw, vh, framing.ox, framing.oy);
    rig.apply(pose);

    const steamOn = runtime.steam && !reducedMotion;
    dish.steam.update(time, steamOn ? smoothstep(0.7, 1, state.rice) * (0.4 + 0.6 * Math.max(cur.hero, state.reveal)) : 0);

    const settling = cur.hero !== target.hero || cur.asm !== target.asm;
    const animating = still ? (dirty || moving || settling) : (moving || cur.hero > 0.001 || steamOn || showcase || dirty);
    if (animating) {
      renderer.render(scene, camera);
      fps.sample(dt);
      dirty = false;
    }
  }

  // compile shaders up front (prevents first-scroll hitches)
  resize();
  tl.progress(1); dish.apply(state);
  rig.setViewport(vw, vh); rig.apply(HERO_POSE);
  try { await renderer.compileAsync(scene, camera); } catch { /* not critical */ }
  await report('Menyusun shader');
  renderer.render(scene, camera);
  await report('Siap');

  function info() {
    return { tier: runtime.tier, mode, buildTier, detected: detected.tier, gpu: detected.gpu || '', calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, fps: Math.round(fps.fps || 0) };
  }

  /** Renders still frames of the real scene for the menu cards. */
  function snapshots(specs, w = 640, h = 480) {
    const out = {};
    const saved = { ...state };
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    rig.setViewport(w, h, 0, 0);
    tl.progress(1); dish.apply(state);
    dish.steam.update(0, 0);
    for (const s of specs) {
      for (const kk of INGREDIENTS) dish.parts[kk].group.visible = kk === 'plate' || s.parts.includes(kk);
      dish.turntable.rotation.y = s.yaw || 0;
      rig.apply(s.pose);
      renderer.render(scene, camera);
      out[s.id] = canvas.toDataURL('image/jpeg', 0.86);
    }
    for (const kk of INGREDIENTS) dish.parts[kk].group.visible = true;
    Object.assign(state, saved);
    lastP = -1;
    vw = vh = -1; // force resize on next frame
    dirty = true;
    return out;
  }

  raf = requestAnimationFrame(frame);

  const onPageHide = (e) => { if (!e.persisted) dispose(); };
  window.addEventListener('pagehide', onPageHide);

  function dispose() {
    cancelAnimationFrame(raf);
    controls.dispose();
    const seen = new Set();
    scene.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      if (o.material) [].concat(o.material).forEach((m) => {
        if (seen.has(m)) return; seen.add(m);
        for (const v of Object.values(m)) if (v && v.isTexture && !seen.has(v)) { seen.add(v); v.dispose(); }
        m.dispose();
      });
      if (o.isInstancedMesh) o.dispose();
    });
    stage.envRT.dispose();
    renderer.dispose();
    window.removeEventListener('pagehide', onPageHide);
  }

  return {
    camera, scene, renderer, controls, state, dish,
    setScroll(v) { if (v.hero !== undefined) target.hero = v.hero; if (v.asm !== undefined) target.asm = v.asm; },
    setStageActive(on) { stageActive = on; if (on) { last = performance.now(); dirty = true; } },
    setShowcase(on) { showcase = on; dirty = true; },
    setFraming(f) {
      if (Math.abs(f.ox - framing.ox) < 1e-4 && Math.abs(f.oy - framing.oy) < 1e-4) return;
      framing = f; dirty = true;
    },
    setQuality(pref) {
      mode = pref;
      applyRuntime(pref === 'auto' ? buildTier : pref);
    },
    onQualityChange(fn) { onQuality = fn; },
    snapshots,
    info,
    dispose,
    get progress() { return Math.max(cur.asm, cur.hero); },
    get asm() { return cur.asm; },
    get hero() { return cur.hero; },
  };
}
