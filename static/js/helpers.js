'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Helper function to setup phone input with auto + prefix
function setupPhoneInput(input) {
  if (!input) return;
  input.addEventListener('focus', () => {
    if (!input.value) input.value = '+';
  });
  input.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('+')) {
      e.target.value = '+' + val.replace(/^\+/, '');
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && input.value === '+') {
      e.preventDefault();
    }
  });
}

const CUR_KEY = 'qd_cur';
const CBU_USD = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/';
let displayCur = localStorage.getItem(CUR_KEY) === 'usd' ? 'usd' : 'uzs';
let cbuLive = false;
let cbuBusy = false;
let cbuDate = db.usdRateDate || '';
const nativeCur = d => d && d.currency === 'usd' ? 'usd' : 'uzs';
const usdRate = () => Math.max(1, Number(db.usdRate) || 12500);
const cbuUsdUrl = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${CBU_USD}${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}/`;
};
const parseCbuUsd = data => {
  const row = Array.isArray(data) ? (data.find(x => x && x.Ccy === 'USD') || data[0]) : data;
  if (!row) return null;
  const rate = Number(String(row.Rate).replace(',', '.'));
  if (!Number.isFinite(rate) || rate < 1) return null;
  return { rate: Math.round(rate * 100) / 100, date: row.Date || '' };
};
async function fetchCbuRate() {
  if (cbuBusy) return;
  cbuBusy = true;
  try {
    let res = await fetch(cbuUsdUrl(), { cache: 'no-store' });
    if (!res.ok) res = await fetch(CBU_USD, { cache: 'no-store' });
    if (!res.ok) throw new Error('cbu');
    const parsed = parseCbuUsd(await res.json());
    if (!parsed) throw new Error('cbu');
    const changed = db.usdRate !== parsed.rate || db.usdRateDate !== parsed.date;
    cbuLive = true;
    cbuDate = parsed.date;
    db.usdRate = parsed.rate;
    db.usdRateDate = parsed.date;
    if (changed) save();
    paintCurrency();
    if (changed && typeof renderPage === 'function') renderPage();
  } catch (e) {
    cbuLive = false;
    paintCurrency();
  } finally {
    cbuBusy = false;
  }
}
function startCbuRate() {
  fetchCbuRate();
  if (window._cbuTimer) clearInterval(window._cbuTimer);
  window._cbuTimer = setInterval(fetchCbuRate, 10 * 60 * 1000);
  if (!window._cbuFocus) {
    window._cbuFocus = true;
    window.addEventListener('focus', () => fetchCbuRate());
  }
}
const roundMoney = (n, cur) => {
  n = Number(n) || 0;
  return cur === 'usd' ? Math.round(n * 100) / 100 : Math.round(n);
};
const convert = (amount, from, to) => {
  from = from === 'usd' ? 'usd' : 'uzs';
  to = to === 'usd' ? 'usd' : 'uzs';
  if (from === to) return roundMoney(amount, to);
  return from === 'uzs' ? roundMoney(amount / usdRate(), 'usd') : roundMoney(amount * usdRate(), 'uzs');
};
const unit = (cur = displayCur) => cur === 'usd' ? '$' : t('currency');
const money = (n, cur = displayCur) => {
  n = roundMoney(n, cur);
  const neg = n < 0;
  const abs = Math.abs(n);
  if (cur === 'usd') {
    const [a, b] = abs.toFixed(2).split('.');
    return (neg ? '− ' : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + b;
  }
  return (neg ? '− ' : '') + Math.round(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
const fmtCur = (n, cur) => money(n, cur) + ' ' + unit(cur);
const som = (n, from = displayCur) => fmtCur(convert(n, from, displayCur), displayCur);
const somDebt = (n, d) => som(n, nativeCur(d));
const moneyDebt = (n, d) => money(convert(n, nativeCur(d), displayCur), displayCur);

function setDisplayCur(mode) {
  if (mode !== 'uzs' && mode !== 'usd') return;
  displayCur = mode;
  localStorage.setItem(CUR_KEY, displayCur);
  if (typeof closeModal === 'function') closeModal();
  applyStatic();
  if (typeof bootShell === 'function' && me && $('#nav')) bootShell(document.body.dataset.page);
  if (typeof renderPage === 'function') renderPage();
}

function paintCurrency() {
  document.querySelectorAll('[data-cur-switch]').forEach(box => {
    box.innerHTML = `<button type="button" data-cur="uzs">${t('cur.uzs')}</button><button type="button" data-cur="usd">${t('cur.usd')}</button>`;
    box.querySelectorAll('[data-cur]').forEach(b => {
      b.classList.toggle('on', b.dataset.cur === displayCur);
      b.onclick = () => setDisplayCur(b.dataset.cur);
    });
  });
  const rate = $('#usdRate');
  if (rate) {
    rate.value = usdRate().toFixed(2);
    rate.readOnly = true;
    rate.disabled = false;
    rate.onchange = null;
  }
  const hint = $('#usdRateHint');
  if (hint) hint.textContent = cbuLive && cbuDate ? `${t('cur.cbu')} · ${cbuDate}` : t('cur.cbuOff');
}
const fdate = d => { const x = new Date(d); return x.toLocaleDateString('ru-RU') + ' ' + x.toTimeString().slice(0, 5); };
const paid = d => d.payments.reduce((s, p) => s + p.amount, 0);
const left = d => d.total - paid(d);
const roleName = r => t('role.' + r);
const can = a => ({ super: 1, manager: a !== 'users', cashier: a === 'pay' })[me.role];
const num = v => Math.max(0, parseFloat(v) || 0);
const itemQty = i => i.qty != null ? num(i.qty) : num(i.boxes) * num(i.perBox);
const lineSum = i => num(i.price) * itemQty(i);
const toLocalInput = d => {
  if (!d) return nowISO();
  const s = String(d);
  if (s.length >= 16 && s[10] === 'T') return s.slice(0, 16);
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return nowISO();
  const p = n => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

function statusPill(d) {
  const l = left(d);
  if (l <= 0) return `<span class="pill ok">${t('status.paid')}</span>`;
  if (paid(d) > 0) return `<span class="pill warn">${t('status.part')}</span>`;
  return `<span class="pill debt">${t('status.unpaid')}</span>`;
}
