'use strict';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const money = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const som = n => money(n) + ' ' + t('currency');
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
