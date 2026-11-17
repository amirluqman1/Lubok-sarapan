// Admin panel: sign in with Neon Auth, then set each menu item to Ada / Habis hari ini / Tutup.
// Writes go straight to Neon through the Data API; row-level security only lets the linked
// admin account change anything (db/schema.sql), so this page holds no secrets.
import './admin.css';
import { createClient } from '@neon/neon-js';
import { backend } from '../config/backend.js';
import { todayMY, statusOf } from '../data/menu-store.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const db = createClient({ auth: { url: backend.authUrl }, dataApi: { url: backend.dataApiUrl } });
const auth = db.auth;

// ---------- views & small UI helpers
function show(view) { $$('.view').forEach((v) => v.classList.toggle('is-on', v.dataset.view === view)); window.scrollTo(0, 0); }
function msg(form, text, ok = false) { const m = $('.form__msg', form); m.textContent = text || ''; m.classList.toggle('is-ok', ok); }
function busy(form, on) { $$('button, input', form).forEach((el) => { el.disabled = on; }); }
let toastT;
function toast(text, err = false) {
  const t = $('#toast'); t.textContent = text; t.classList.toggle('is-err', err); t.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2200);
}
function confirmBox(text) {
  return new Promise((res) => {
    const box = $('#confirm'); $('#confirm-text').textContent = text; box.hidden = false;
    const done = (v) => { box.hidden = true; $('#confirm-yes').onclick = $('#confirm-no').onclick = null; res(v); };
    $('#confirm-yes').onclick = () => done(true); $('#confirm-no').onclick = () => done(false);
  });
}
const errText = (e) => {
  const code = e?.code || '';
  if (/INVALID_EMAIL_OR_PASSWORD|invalid_credentials/i.test(code) || e?.status === 401) return 'Emel atau kata laluan salah.';
  if (/USER_ALREADY_EXISTS/i.test(code)) return 'Emel ini sudah didaftarkan. Sila log masuk.';
  if (/PASSWORD_TOO_SHORT/i.test(code)) return 'Kata laluan terlalu pendek (sekurang-kurangnya 8 aksara).';
  if (/INVALID_OTP|OTP_EXPIRED/i.test(code)) return 'Kod tidak sah atau telah tamat tempoh.';
  if (/TOO_MANY/i.test(code) || e?.status === 429) return 'Terlalu banyak cubaan. Cuba lagi sebentar.';
  return e?.message ? `Ralat: ${e.message}` : 'Ralat sambungan. Semak internet dan cuba lagi.';
};
$$('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); show(a.dataset.go); }));
$$('.js-logout').forEach((a) => a.addEventListener('click', async (e) => { e.preventDefault(); await auth.signOut(); show('login'); }));

// ---------- sign in
let pendingEmail = '';
$('#f-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, email = $('#login-email').value.trim().toLowerCase(), password = $('#login-pass').value;
  if (!email || !password) return msg(f, 'Isi emel dan kata laluan.');
  busy(f, true); msg(f, '');
  const { error } = await auth.signIn.email({ email, password });
  busy(f, false);
  if (error) {
    if (/EMAIL_NOT_VERIFIED/i.test(error.code || '') || error.status === 403) {
      pendingEmail = email; $('#verify-email').textContent = email; show('verify'); return;
    }
    return msg(f, errText(error));
  }
  enter();
});

// ---------- sign up → verify email
$('#f-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const name = $('#su-name').value.trim(), email = $('#su-email').value.trim().toLowerCase();
  const p1 = $('#su-pass').value, p2 = $('#su-pass2').value;
  if (!name || !email) return msg(f, 'Isi nama dan emel.');
  if (p1.length < 8) return msg(f, 'Kata laluan sekurang-kurangnya 8 aksara.');
  if (p1 !== p2) return msg(f, 'Kata laluan tidak sama.');
  busy(f, true); msg(f, '');
  const { error } = await auth.signUp.email({ name, email, password: p1 });
  busy(f, false);
  if (error) return msg(f, errText(error));
  pendingEmail = email; $('#verify-email').textContent = email; show('verify');
});
$('#f-verify').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, otp = $('#verify-otp').value.trim();
  if (!/^\d{6}$/.test(otp)) return msg(f, 'Masukkan kod 6 digit.');
  busy(f, true); msg(f, '');
  const { error } = await auth.emailOtp.verifyEmail({ email: pendingEmail, otp });
  busy(f, false);
  if (error) return msg(f, errText(error));
  const s = await auth.getSession();
  if (s.data?.session) enter();
  else { msg(f, 'Emel disahkan. Sila log masuk.', true); setTimeout(() => show('login'), 1200); }
});
$('#resend-verify').addEventListener('click', async (e) => {
  e.preventDefault();
  if (!pendingEmail) return show('login');
  const { error } = await auth.emailOtp.sendVerificationOtp({ email: pendingEmail, type: 'email-verification' });
  toast(error ? errText(error) : 'Kod baru dihantar.', !!error);
});

// ---------- forgot password (OTP to email → new password)
let fgStep = 1;
$('#f-forgot').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget, email = $('#fg-email').value.trim().toLowerCase();
  if (!email) return msg(f, 'Isi emel.');
  busy(f, true); msg(f, '');
  if (fgStep === 1) {
    const { error } = await auth.emailOtp.sendVerificationOtp({ email, type: 'forget-password' });
    busy(f, false);
    if (error) return msg(f, errText(error));
    fgStep = 2; $('.form__step2', f).hidden = false; $('#fg-btn').textContent = 'Tukar kata laluan';
    return msg(f, 'Kod dihantar ke emel anda (jika akaun wujud).', true);
  }
  const otp = $('#fg-otp').value.trim(), password = $('#fg-pass').value;
  if (!/^\d{6}$/.test(otp) || password.length < 8) { busy(f, false); return msg(f, 'Masukkan kod 6 digit dan kata laluan baru (8+ aksara).'); }
  const { error } = await auth.emailOtp.resetPassword({ email, otp, password });
  busy(f, false);
  if (error) return msg(f, errText(error));
  msg(f, 'Kata laluan ditukar. Sila log masuk.', true);
  fgStep = 1; setTimeout(() => show('login'), 1400);
});

// ---------- after sign-in: check admin rights, then load the dashboard
async function enter() {
  show('loading');
  const s = await auth.getSession();
  if (!s.data?.session) return show('login');
  const { data: isAdmin, error } = await db.rpc('is_admin');
  if (error || !isAdmin) {
    $('#pending-email').textContent = s.data.user?.email || '';
    return show('pending');
  }
  await loadDash();
  show('dash');
}
$('#pending-retry').addEventListener('click', enter);

// ---------- dashboard
let items = [], cats = [];
const LABEL = { ada: 'Ada', habis: 'Habis', tutup: 'Tutup' };

async function loadDash() {
  const [c, m] = await Promise.all([
    db.from('categories').select('id,name,sort_order').order('sort_order'),
    db.from('menu_public').select('id,category,name,sort_order,closed,sold_out_today').order('sort_order'),
  ]);
  if (c.error || m.error) { toast('Gagal memuatkan menu. Tarik untuk muat semula.', true); return; }
  cats = c.data; items = m.data;
  $('#dash-date').textContent = new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  render();
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  $('#dash-cats').innerHTML = cats.map((c) => `<a href="#g-${esc(c.id)}">${esc(c.name)}</a>`).join('');
  $('#dash-list').innerHTML = cats.map((c) => {
    const list = items.filter((i) => i.category === c.id && (!q || i.name.toLowerCase().includes(q)));
    if (q && !list.length) return '';
    const off = list.filter((i) => statusOf(i) !== 'ada').length;
    return `
      <section class="group" id="g-${esc(c.id)}">
        <h2 class="group__name">${esc(c.name)}<span class="group__count">${list.length} menu${off ? ` · ${off} tidak tersedia` : ''}</span></h2>
        ${list.length ? list.map((i) => {
          const st = statusOf(i);
          return `
          <div class="row" data-id="${esc(i.id)}" data-status="${st}">
            <span class="row__name">${esc(i.name)}</span>
            <span class="seg" role="group" aria-label="Status ${esc(i.name)}">
              ${['ada', 'habis', 'tutup'].map((s) => `<button type="button" data-set="${s}" aria-pressed="${st === s}">${LABEL[s]}</button>`).join('')}
            </span>
          </div>`;
        }).join('') : '<p class="group__empty">Tiada menu dalam kategori ini.</p>'}
      </section>`;
  }).join('');
  const habis = items.filter((i) => statusOf(i) === 'habis').length, tutup = items.filter((i) => statusOf(i) === 'tutup').length;
  $('#dash-summary').textContent = habis || tutup
    ? `${habis} habis hari ini · ${tutup} ditutup · ${items.length - habis - tutup} ada`
    : `Semua ${items.length} menu ada.`;
  $('#reopen-all').hidden = habis === 0;
}
$('#search').addEventListener('input', render);

const patchFor = (s) => (s === 'ada' ? { closed: false, sold_out_on: null }
  : s === 'habis' ? { closed: false, sold_out_on: todayMY() }
    : { closed: true, sold_out_on: null });

async function setStatus(id, s) {
  const it = items.find((i) => i.id === id);
  if (!it || statusOf(it) === s) return;
  const prev = { closed: it.closed, sold_out_today: it.sold_out_today };
  Object.assign(it, { closed: s === 'tutup', sold_out_today: s === 'habis' });
  render();
  const row = $(`.row[data-id="${CSS.escape(id)}"]`); row?.classList.add('is-saving');
  const { data, error } = await db.from('menu_items').update(patchFor(s)).eq('id', id).select('id');
  row?.classList.remove('is-saving');
  if (error || !data?.length) {
    Object.assign(it, prev); render();
    return toast(error ? 'Gagal disimpan. Cuba lagi.' : 'Tiada kebenaran untuk mengubah menu.', true);
  }
  toast(`${it.name}: ${s === 'habis' ? 'Habis hari ini' : s === 'tutup' ? 'Ditutup' : 'Ada'} ✓`);
}
$('#dash-list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-set]'); if (!b) return;
  setStatus(b.closest('.row').dataset.id, b.dataset.set);
});
$('#reopen-all').addEventListener('click', async () => {
  const ids = items.filter((i) => statusOf(i) === 'habis').map((i) => i.id);
  if (!ids.length || !(await confirmBox(`Tanda ${ids.length} menu yang habis sebagai "Ada" semula?`))) return;
  const { data, error } = await db.from('menu_items').update({ sold_out_on: null }).in('id', ids).select('id');
  if (error || !data?.length) return toast('Gagal disimpan. Cuba lagi.', true);
  items.forEach((i) => { if (ids.includes(i.id)) i.sold_out_today = false; });
  render(); toast('Semua dibuka semula ✓');
});

// refresh when the phone comes back to this tab (another device may have changed something)
document.addEventListener('visibilitychange', () => { if (!document.hidden && $('[data-view="dash"]').classList.contains('is-on')) loadDash(); });

// ---------- start
enter().catch(() => show('login'));
