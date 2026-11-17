// Public, read-only menu data from Neon — plain fetch (no SDK) to keep the public page light.
// Flow: anonymous JWT from Neon Auth → Data API (PostgREST). Row-level security in the database
// makes this read-only (db/schema.sql). The admin panel uses the full SDK in src/admin/.
import { backend } from '../config/backend.js';
import snapshot from './menu-snapshot.json';

/** Today's date in Malaysia (YYYY-MM-DD) — "habis hari ini" is stored against this date. */
export function todayMY(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** ada | habis (sold out today) | tutup (closed until reopened) */
export function statusOf(item) {
  if (!item) return 'ada';
  if (item.closed) return 'tutup';
  if (item.sold_out_today) return 'habis';
  return 'ada';
}

const CACHE_KEY = 'lubok-menu-cache-v1';

async function getJSON(url, opts, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

function normalise(categories, items) {
  const cats = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const its = items.map((i) => ({ sold_out_today: false, closed: false, ...i, options: i.options || [] }))
    .sort((a, b) => a.sort_order - b.sort_order);
  return { categories: cats, items: its, byId: Object.fromEntries(its.map((i) => [i.id, i])) };
}

/**
 * Loads categories + items. Preference: live Neon → last good copy saved in this browser →
 * snapshot bundled with the site (src/data/menu-snapshot.json). `source` tells which was used.
 */
export async function loadMenu({ timeout = 7000 } = {}) {
  try {
    const { token } = await getJSON(`${backend.authUrl}/token/anonymous`, {}, timeout);
    const h = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
    const api = backend.dataApiUrl;
    const [categories, items] = await Promise.all([
      getJSON(`${api}/categories?select=id,name,sort_order,options_label,options,in_list&order=sort_order.asc`, h, timeout),
      getJSON(`${api}/menu_public?select=id,category,name,description,price,image,options,sort_order,closed,sold_out_today&order=sort_order.asc`, h, timeout),
    ]);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), categories, items })); } catch { /* private mode */ }
    return { ...normalise(categories, items), source: 'live' };
  } catch (err) {
    console.warn('[menu] live load failed, using fallback:', err?.message || err);
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.items) {
        // a saved copy's "habis hari ini" only applies if it was saved today
        const sameDay = todayMY(new Date(cached.at)) === todayMY();
        const items = sameDay ? cached.items : cached.items.map((i) => ({ ...i, sold_out_today: false }));
        return { ...normalise(cached.categories, items), source: 'cache' };
      }
    } catch { /* ignore */ }
    return { ...normalise(snapshot.categories, snapshot.items), source: 'snapshot' };
  }
}
