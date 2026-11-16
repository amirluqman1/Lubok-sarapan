// Scroll-driven image-sequence player (the "Apple product page" technique).
// Frames are decoded images drawn to a canvas; the scroll position picks the frame.
// Loading is progressive: frame 0 first, then a coarse-to-fine pass, so scrubbing works early.

export function pickFrameSet(sets) {
  const q = new URLSearchParams(location.search).get('frames');
  if (q && sets[q]) return q;
  const c = navigator.connection || {};
  if (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '') || (navigator.deviceMemory || 4) <= 2) return 'lite';
  return 'hd';
}

export function createPlayer({ front, back, cfg, setName, onLoadProgress }) {
  const set = cfg.sets[setName];
  const count = set.count;
  const imgs = new Array(count);
  const ready = new Uint8Array(count);
  let loaded = 0, current = -1, want = 0, disposed = false;
  const fctx = front.getContext('2d', { alpha: false });
  const bctx = back.getContext('2d', { alpha: false });
  const aspect = cfg.width / cfg.height;

  const url = (i) => `${set.path}${String(i).padStart(3, '0')}.${cfg.ext}`;

  // coarse-to-fine load order: 0, last, then strides 16, 8, 4, 2, 1
  const order = [0, count - 1];
  const seen = new Set(order);
  for (const s of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += s) if (!seen.has(i)) { seen.add(i); order.push(i); }

  function load(i) {
    return new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = async () => {
        try { await im.decode(); } catch { /* already decoded */ }
        if (disposed) return res();
        imgs[i] = im; ready[i] = 1; loaded++;
        onLoadProgress?.(loaded / count);
        if (Math.abs(i - want) < Math.abs(current - want) || current < 0) draw(want, true);
        res();
      };
      im.onerror = () => { loaded++; onLoadProgress?.(loaded / count); res(); };
      im.src = url(i);
    });
  }
  const firstFrame = load(0);
  (async () => {
    await firstFrame;
    let k = 1;
    const worker = async () => { while (k < order.length && !disposed) await load(order[k++]); };
    await Promise.all(Array.from({ length: 6 }, worker));
  })();

  function nearest(i) {
    if (ready[i]) return i;
    for (let d = 1; d < count; d++) {
      if (i - d >= 0 && ready[i - d]) return i - d;
      if (i + d < count && ready[i + d]) return i + d;
    }
    return -1;
  }

  // ---- layout: the canvas element is sized/positioned to the image rect, backdrop fills the screen
  let rect = { x: 0, y: 0, w: 1, h: 1 }, mode = 'portrait';
  let lastW = 0, lastH = 0;
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // ignore mobile address-bar show/hide (height-only jitter) to avoid canvas flicker
    if (vw === lastW && Math.abs(vh - lastH) < 160 && lastW) return;
    lastW = vw; lastH = vh;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (vw / vh < 0.8) {
      mode = 'portrait';
      let w = vw, h = vw / aspect;
      if (h > vh) { h = vh; w = h * aspect; }
      rect = { x: (vw - w) / 2, y: vh - h, w, h };
    } else {
      mode = 'landscape';
      const h = vh, w = h * aspect;
      const cx = vw < 900 ? vw / 2 : Math.min(vw - w / 2 - vw * 0.04, vw * 0.66);
      rect = { x: cx - w / 2, y: 0, w, h };
    }
    Object.assign(front.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    front.dataset.mode = mode;
    front.width = Math.round(rect.w * dpr);
    front.height = Math.round(rect.h * dpr);
    back.width = 96; back.height = Math.round(96 * vh / vw);
    current = -1;
    draw(want, true);
  }

  function draw(i, force = false) {
    want = Math.max(0, Math.min(count - 1, i));
    const n = nearest(want);
    if (n < 0 || (n === current && !force)) return;
    current = n;
    const im = imgs[n];
    fctx.drawImage(im, 0, 0, front.width, front.height);
    // backdrop: cover-fit, tiny, CSS blurs it
    const s = Math.max(back.width / im.width, back.height / im.height);
    const bw = im.width * s, bh = im.height * s;
    bctx.drawImage(im, (back.width - bw) / 2, (back.height - bh) / 2, bw, bh);
  }

  /** p in [0,1] → frame */
  function setProgress(p) { draw(Math.round(p * (count - 1))); }

  window.addEventListener('resize', layout);
  layout();

  return {
    setProgress,
    ready: firstFrame,
    get loaded() { return loaded / count; },
    get frame() { return current * set.step; }, // in HD-frame units
    dispose() { disposed = true; window.removeEventListener('resize', layout); },
  };
}
