// Quality tiers, automatic device classification and runtime FPS-based downgrade.
export const TIERS = {
  low: { tier: 'low', dprCap: 1, shadows: false, shadowMapSize: 512, riceCount: 2400, crumbs: 120, steam: false },
  medium: { tier: 'medium', dprCap: 1.5, shadows: true, shadowMapSize: 1024, riceCount: 4800, crumbs: 260, steam: true },
  high: { tier: 'high', dprCap: 2, shadows: true, shadowMapSize: 2048, riceCount: 7600, crumbs: 420, steam: true },
};
const ORDER = ['low', 'medium', 'high'];

/** Geometry-resolution parameters, fixed at build time from the build tier. */
export function buildParams(tier) {
  const t = TIERS[tier];
  return {
    ...t,
    riceMax: tier === 'low' ? TIERS.low.riceCount : TIERS.high.riceCount,
    plateSegments: { low: 72, medium: 120, high: 160 }[tier],
    chickenRes: { low: [56, 70], medium: [96, 120], high: [150, 190] }[tier],
    sambalFlakes: { low: 60, medium: 110, high: 170 }[tier],
    anchovies: { low: 30, medium: 44, high: 56 }[tier],
    peanuts: { low: 16, medium: 24, high: 32 }[tier],
    grainShadows: tier === 'high',
    textureSize: tier === 'low' ? 512 : 1024,
    antialias: tier !== 'low',
  };
}

const STORAGE_KEY = 'nl-quality';
export function getStoredQuality() {
  try { const v = localStorage.getItem(STORAGE_KEY); return v && (v === 'auto' || TIERS[v]) ? v : 'auto'; } catch { return 'auto'; }
}
export function storeQuality(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch { /* private mode */ } }

export function readGPU() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return String(r || '');
  } catch { return ''; }
}

export function detectTier() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('q');
  if (forced && TIERS[forced]) return { tier: forced, reason: 'url' };
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua) || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820);
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const gpu = readGPU() || '';
  let tier = mobile ? 'medium' : 'high';
  if (/Mali-[24T]|Mali-G(31|51|52|57)|Adreno \(TM\) [3-5]\d\d|PowerVR|SwiftShader|llvmpipe|Software/i.test(gpu)) tier = 'low';
  else if (/Adreno \(TM\) (6[4-9]\d|7\d\d|8\d\d)|Mali-G(7\d|71[0-9]|715|720|925)|Immortalis|Apple GPU/i.test(gpu) && mobile && mem >= 6) tier = 'high';
  if (mem <= 2 || cores <= 4 && mobile && mem <= 3) tier = 'low';
  return { tier, reason: 'auto', gpu, mobile };
}

export function lowerTier(t) { const i = ORDER.indexOf(t); return i > 0 ? ORDER[i - 1] : null; }

/** Tracks frame times; calls onSlow() when sustained FPS drops below the threshold. */
export function createFpsMonitor({ threshold = 32, window = 2.5, onSlow }) {
  let acc = 0, frames = 0, cooldown = 3;
  return {
    sample(dt) {
      if (dt > 0.25) return; // tab switch / hitch: ignore
      if (cooldown > 0) { cooldown -= dt; return; }
      acc += dt; frames++;
      if (acc >= window) {
        const fps = frames / acc;
        acc = 0; frames = 0;
        if (fps < threshold) { cooldown = 3; onSlow?.(fps); }
      }
    },
    get fps() { return frames / Math.max(acc, 1e-3); },
  };
}
