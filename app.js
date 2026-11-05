'use strict';
/* ---------- Storage (backend ulangunga qadar localStorage) ---------- */
const KEY = 'qd_v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const seed = () => {
  const c = [uid(), uid(), uid()], p = [uid(), uid(), uid()];
  return {
    users: [{ id: uid(), name: 'Super Admin', email: 'admin@qarzdaftar.uz', phone: '+998901112233', tg: 'superadmin', pass: 'admin123', role: 'super' }],
    clients: [
      { id: c[0], name: 'Aziz Karimov', phone: '+998901234567', tg: 'aziz_k' },
      { id: c[1], name: 'Dilnoza Yusupova', phone: '+998935554433', tg: '' },
      { id: c[2], name: 'Bobur Do\'stmatov', phone: '+998977001122', tg: 'bobur_d' }],
    products: [{ id: p[0], name: 'Un (Oliy nav)' }, { id: p[1], name: 'Yog\' 5 litr' }, { id: p[2], name: 'Shakar' }],
    debts: [{
      id: uid(), no: 1, clientId: c[0], date: nowISO(), manual: false,
      items: [{ name: 'Un (Oliy nav)', price: 8500, boxes: 10, perBox: 50 }],
      total: 4250000, payments: [{ id: uid(), date: nowISO(), amount: 1000000 }]
    }]
  };
};
let db = JSON.parse(localStorage.getItem(KEY) || 'null') || seed();
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
save();
let me = JSON.parse(sessionStorage.getItem('qd_me') || 'null');

/* ---------- Helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const money = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const som = n => money(n) + " so'm";
const fdate = d => { const x = new Date(d); return x.toLocaleDateString('ru-RU') + ' ' + x.toTimeString().slice(0, 5); };
const paid = d => d.payments.reduce((s, p) => s + p.amount, 0);
const left = d => d.total - paid(d);
const client = id => db.clients.find(c => c.id === id) || { name: '—', phone: '', tg: '' };
const ROLES = { super: 'Super admin', manager: 'Menejer', cashier: 'Kassir' };
const can = a => ({ super: 1, manager: a !== 'users', cashier: a === 'pay' })[me.role];
const num = v => Math.max(0, parseFloat(v) || 0);

function toast(t) { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 2200); }
function modal(title, body, foot, wide) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="ov"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="mh"><h3>${title}</h3><button class="btn icon" data-x aria-label="Yopish">✕</button></div>
    <div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div></div>`;
  root.onclick = e => { if (e.target.classList.contains('ov') || e.target.closest('[data-x]')) closeModal(); };
}
const closeModal = () => { $('#modalRoot').innerHTML = ''; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
const empty = (t, s) => `<div class="empty"><b>${t}</b>${s}</div>`;

/* ---------- Auth ---------- */
$('#loginForm').onsubmit = e => {
  e.preventDefault();
  const u = db.users.find(x => x.email.toLowerCase() === $('#lEmail').value.trim().toLowerCase() && x.pass === $('#lPass').value);
  if (!u) { $('#lErr').textContent = "Email yoki parol noto'g'ri. Qayta tekshiring."; return; }
  me = u; sessionStorage.setItem('qd_me', JSON.stringify(u)); boot();
};
$('#logout').onclick = () => { sessionStorage.removeItem('qd_me'); me = null; location.hash = ''; boot(); };

const ICON = {
  debts: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM8 9h8M8 13h5"/>',
  base: '<path d="M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'
};
function boot() {
  $('#login').classList.toggle('hidden', !!me);
  $('#app').classList.toggle('hidden', !me);
  if (!me) return;
  $('#meName').textContent = me.name; $('#meRole').textContent = ROLES[me.role];
  const pages = [['debts', 'Qarzlar'], ['base', 'Baza'], ...(can('users') ? [['users', 'Foydalanuvchilar']] : [])];
  $('#nav').innerHTML = pages.map(([k, t]) => `<a href="#${k}" data-p="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>${t}</a>`).join('');
  route();
}
let baseTab = 'clients', q = '';
function route() {
  if (!me) return;
  let p = location.hash.slice(1) || 'debts';
  if (p === 'users' && !can('users')) p = 'debts';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  ({ debts: viewDebts, base: viewBase, users: viewUsers })[p]();
}
window.addEventListener('hashchange', () => { q = ''; route(); });

/* ---------- Qarzlar ---------- */
function viewDebts() {
  const all = db.debts, tot = all.reduce((s, d) => s + d.total, 0), pd = all.reduce((s, d) => s + paid(d), 0);
  const debtors = new Set(all.filter(d => left(d) > 0).map(d => d.clientId)).size;
  $('#view').innerHTML = `
    <div class="head"><div><h2>Qarzlar</h2><p>Barcha qarzlar va to'lovlar</p></div>
      ${can('add') ? '<button class="btn primary" id="addDebt">+ Qarz qo\'shish</button>' : ''}</div>
    <div class="sum"><div class="big"><small>Jami qoldiq qarz</small><strong class="num">${som(tot - pd)}</strong></div>
      <div><small>To'langan</small><strong class="num">${som(pd)}</strong></div>
      <div><small>Qarzdorlar soni</small><strong class="num">${debtors}</strong></div></div>
    <div class="tools"><input class="input" id="search" placeholder="Ism, telefon yoki username bo'yicha qidirish" value="${esc(q)}">
      <select class="input" id="flt" style="max-width:180px"><option value="">Barchasi</option><option value="open">Qarzi bor</option><option value="closed">To'langan</option></select></div>
    <div class="card" id="dlist"></div>`;
  $('#search').oninput = e => { q = e.target.value; list(); $('#search').focus(); };
  $('#flt').onchange = list;
  if (can('add')) $('#addDebt').onclick = () => debtForm();
  list();
  function list() {
    const f = $('#flt').value, s = q.toLowerCase();
    const rows = db.debts.filter(d => {
      const c = client(d.clientId);
      return (!s || [c.name, c.phone, c.tg].some(x => (x || '').toLowerCase().includes(s))) &&
        (!f || (f === 'open') === (left(d) > 0));
    }).sort((a, b) => b.date.localeCompare(a.date));
    $('#dlist').innerHTML = rows.length ? `<table class="stack"><thead><tr><th>Qarzdor</th><th>Telefon</th><th class="r">Qarz summasi</th><th class="r">Qoldiq</th><th>Holat</th></tr></thead><tbody>
      ${rows.map(d => { const c = client(d.clientId), l = left(d), pc = Math.min(100, paid(d) / d.total * 100 || 0);
        return `<tr class="click" data-id="${d.id}"><td class="who"><b>${esc(c.name)}</b><span>${c.tg ? '@' + esc(c.tg) + ' · ' : ''}№${d.no} · ${fdate(d.date)}</span></td>
        <td class="hm">${esc(c.phone)}</td><td class="r hm num">${som(d.total)}</td>
        <td class="r num"><b style="color:${l > 0 ? 'var(--debt)' : 'var(--ok)'}">${som(l)}</b></td>
        <td class="hm">${l <= 0 ? '<span class="pill ok">To\'langan</span>' : paid(d) > 0 ? '<span class="pill warn">Qisman</span>' : '<span class="pill debt">To\'lanmagan</span>'}<div class="bar"><i style="width:${pc}%"></i></div></td></tr>`; }).join('')}
      </tbody></table>` : empty('Qarz topilmadi', "Yangi qarz qo'shing yoki qidiruvni o'zgartiring.");
    $('#dlist').querySelectorAll('tr.click').forEach(r => r.onclick = () => debtDetail(r.dataset.id));
  }
}

function debtForm() {
  if (!db.clients.length) { toast("Avval Baza bo'limida mijoz qo'shing"); location.hash = 'base'; return; }
  const items = [];
  modal("Yangi qarz", `
    <div class="row"><div class="field"><label>Qarzdor</label><select class="input" id="dClient">${db.clients.map(c => `<option value="${c.id}">${esc(c.name)} — ${esc(c.phone)}</option>`).join('')}</select></div>
    <div class="field"><label>Sana va vaqt</label><input class="input" type="datetime-local" id="dDate" value="${nowISO()}"></div></div>
    <div class="sec">Tovarlar <span style="font-weight:400;color:var(--muted)">(ixtiyoriy)</span></div>
    <div id="items" style="display:grid;gap:10px"></div>
    <button class="btn" id="addItem" type="button">+ Tovar biriktirish</button>
    <label class="chk"><input type="checkbox" id="manual"> Summani qo'lda kiritaman</label>
    <div class="field hidden" id="mWrap"><label>Qarz summasi (so'm)</label><input class="input" type="number" min="0" id="mSum"></div>
    <div class="total"><span>Jami qarz</span><strong class="num" id="tSum">0 so'm</strong></div>
    <div class="err" id="dErr"></div>`,
    '<button class="btn" data-x>Bekor qilish</button><button class="btn primary" id="saveDebt">Saqlash</button>', true);
  const calc = () => {
    const man = $('#manual').checked;
    $('#mWrap').classList.toggle('hidden', !man);
    const t = man ? num($('#mSum').value) : items.reduce((s, i) => s + i.price * i.boxes * i.perBox, 0);
    $('#tSum').textContent = som(t); return t;
  };
  const draw = () => {
    $('#items').innerHTML = items.map((it, i) => `<div class="item" data-i="${i}">
      <div class="field"><label>Tovar</label><select class="input" data-k="name">${db.products.map(p => `<option ${p.name === it.name ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Narxi (1 dona)</label><input class="input" type="number" min="0" data-k="price" value="${it.price || ''}"></div>
      <div class="field"><label>Qop soni</label><input class="input" type="number" min="0" data-k="boxes" value="${it.boxes || ''}"></div>
      <div class="field"><label>Qopda dona</label><input class="input" type="number" min="0" data-k="perBox" value="${it.perBox || ''}"></div>
      <button class="btn icon danger" data-del aria-label="O'chirish">✕</button>
      <div class="ts">${it.boxes * it.perBox} dona × ${money(it.price)} = <b>${som(it.price * it.boxes * it.perBox)}</b></div></div>`).join('');
    calc();
  };
  $('#addItem').onclick = () => {
    if (!db.products.length) { toast("Avval Baza bo'limida tovar qo'shing"); return; }
    items.push({ name: db.products[0].name, price: 0, boxes: 1, perBox: 1 }); draw();
  };
  $('#items').oninput = e => {
    const el = e.target, row = el.closest('.item'), it = items[row.dataset.i];
    it[el.dataset.k] = el.dataset.k === 'name' ? el.value : num(el.value);
    row.querySelector('.ts').innerHTML = `${it.boxes * it.perBox} dona × ${money(it.price)} = <b>${som(it.price * it.boxes * it.perBox)}</b>`; calc();
  };
  $('#items').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { items.splice(b.closest('.item').dataset.i, 1); draw(); } };
  $('#manual').onchange = calc; $('#mSum').oninput = calc;
  $('#saveDebt').onclick = () => {
    const total = calc();
    if (total <= 0) { $('#dErr').textContent = "Summa 0 dan katta bo'lishi kerak: tovar kiriting yoki summani qo'lda yozing."; return; }
    db.debts.push({ id: uid(), no: Math.max(0, ...db.debts.map(d => d.no)) + 1, clientId: $('#dClient').value, date: $('#dDate').value,
      manual: $('#manual').checked, items: items.map(i => ({ ...i })), total, payments: [] });
    save(); closeModal(); viewDebts(); toast("Qarz qo'shildi");
  };
}

function debtDetail(id) {
  const d = db.debts.find(x => x.id === id), c = client(d.clientId), l = left(d);
  modal(`Nakladnoy №${d.no}`, `
    <div class="nak"><div class="nak-row"><span>Qarzdor</span><b>${esc(c.name)}</b></div>
      <div class="nak-row"><span>Telefon</span><span>${esc(c.phone)}</span></div>
      ${c.tg ? `<div class="nak-row"><span>Telegram</span><span>@${esc(c.tg)}</span></div>` : ''}
      <div class="nak-row"><span>Sana</span><span>${fdate(d.date)}</span></div></div>
    ${d.items.length ? `<div class="sec">Tovarlar</div><div style="overflow:auto"><table class="mini"><thead><tr><th>Tovar</th><th class="r">Narx</th><th class="r">Qop</th><th class="r">Dona</th><th class="r">Summa</th></tr></thead><tbody>
      ${d.items.map(i => `<tr><td>${esc(i.name)}</td><td class="r num">${money(i.price)}</td><td class="r">${i.boxes}</td><td class="r">${i.boxes * i.perBox}</td><td class="r num">${money(i.price * i.boxes * i.perBox)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p style="color:var(--muted)">Bu qarz tovarsiz, summa qo\'lda kiritilgan.</p>'}
    <div class="nak-row"><span>Jami qarz</span><b class="num">${som(d.total)}</b></div>
    <div class="sec">To'lovlar tarixi</div>
    ${d.payments.length ? d.payments.map(p => `<div class="pay"><span>${fdate(p.date)}</span><b class="num" style="color:var(--ok)">− ${som(p.amount)}</b></div>`).join('') : '<p style="color:var(--muted)">Hali to\'lov qilinmagan.</p>'}
    <div class="nak-row" style="font-size:1.05rem"><span>Qoldiq</span><b class="num" style="color:${l > 0 ? 'var(--debt)' : 'var(--ok)'}">${som(l)}</b></div>
    ${l > 0 && can('pay') ? `<div class="row" style="align-items:end"><div class="field"><label>To'lov summasi</label><input class="input" type="number" min="0" max="${l}" id="pAmt" placeholder="${money(l)}"></div>
      <div class="field"><label>Sana va vaqt</label><input class="input" type="datetime-local" id="pDate" value="${nowISO()}"></div></div><div class="err" id="pErr"></div>
      <button class="btn primary" id="pay">To'lov qabul qilish</button>` : ''}`,
    `${can('add') ? '<button class="btn danger" id="delDebt">O\'chirish</button>' : ''}<button class="btn" id="pdf">PDF yuklab olish</button>`, true);
  $('#pdf').onclick = () => nakladnoy(d);
  if (can('add')) $('#delDebt').onclick = () => { if (confirm("Bu qarz butunlay o'chiriladi. Davom etasizmi?")) { db.debts = db.debts.filter(x => x.id !== id); save(); closeModal(); viewDebts(); } };
  const pay = $('#pay');
  if (pay) pay.onclick = () => {
    const a = num($('#pAmt').value);
    if (!a) { $('#pErr').textContent = "To'lov summasini kiriting."; return; }
    if (a > l) { $('#pErr').textContent = `To'lov qoldiqdan (${som(l)}) oshib ketdi.`; return; }
    d.payments.push({ id: uid(), date: $('#pDate').value, amount: a }); save(); debtDetail(id); viewDebts(); toast("To'lov qabul qilindi");
  };
}

function nakladnoy(d) {
  if (!window.jspdf) { toast("PDF kutubxonasi yuklanmadi. Internetni tekshiring."); return; }
  const t = s => String(s ?? '').replace(/[ʻʼ‘’`]/g, "'");
  const c = client(d.clientId), doc = new window.jspdf.jsPDF(), W = doc.internal.pageSize.width;
  doc.setFillColor(14, 59, 67); doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255); doc.setFontSize(18); doc.text('NAKLADNOY № ' + d.no, 14, 18);
  doc.setFontSize(10); doc.text('Qarz Daftar', W - 14, 18, { align: 'right' });
  doc.setTextColor(20, 32, 43); doc.setFontSize(11);
  doc.text(`Qarzdor: ${t(c.name)}`, 14, 40); doc.text(`Telefon: ${t(c.phone)}`, 14, 47);
  if (c.tg) doc.text(`Telegram: @${t(c.tg)}`, 14, 54);
  doc.text(`Sana: ${fdate(d.date)}`, W - 14, 40, { align: 'right' });
  let y = 62;
  if (d.items.length) {
    doc.autoTable({ startY: y, head: [['#', 'Tovar', 'Narx', 'Qop', 'Dona', 'Summa']], theme: 'grid', headStyles: { fillColor: [14, 59, 67] },
      body: d.items.map((i, n) => [n + 1, t(i.name), money(i.price), i.boxes, i.boxes * i.perBox, money(i.price * i.boxes * i.perBox)]),
      columnStyles: { 2: { halign: 'right' }, 5: { halign: 'right' } } });
    y = doc.lastAutoTable.finalY + 8;
  }
  doc.autoTable({ startY: y, head: [["To'lov sanasi", "Summa"]], theme: 'striped', headStyles: { fillColor: [100, 113, 127] },
    body: d.payments.length ? d.payments.map(p => [fdate(p.date), money(p.amount)]) : [["To'lov yo'q", '—']], columnStyles: { 1: { halign: 'right' } }, tableWidth: 90 });
  y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.text(`Jami qarz: ${som(d.total)}`, W - 14, y, { align: 'right' });
  doc.text(`To'langan: ${som(paid(d))}`, W - 14, y + 7, { align: 'right' });
  doc.setFontSize(13); doc.text(`Qoldiq: ${som(left(d))}`, W - 14, y + 16, { align: 'right' });
  doc.setFontSize(10); doc.text('Topshirdi: ____________', 14, y + 34); doc.text('Qabul qildi: ____________', W - 14, y + 34, { align: 'right' });
  doc.save(`nakladnoy-${d.no}.pdf`);
}

/* ---------- Baza: mijozlar va tovarlar ---------- */
function viewBase() {
  const isC = baseTab === 'clients', rows = isC ? db.clients : db.products, s = q.toLowerCase();
  const list = rows.filter(r => !s || (r.name + (r.phone || '') + (r.tg || '')).toLowerCase().includes(s));
  $('#view').innerHTML = `
    <div class="head"><div><h2>Baza</h2><p>Mijozlar va tovarlar ro'yxati</p></div>
      ${can('add') ? `<button class="btn primary" id="addB">+ ${isC ? 'Mijoz' : 'Tovar'} qo'shish</button>` : ''}</div>
    <div class="tabs"><button data-t="clients" class="${isC ? 'on' : ''}">Mijozlar (${db.clients.length})</button><button data-t="products" class="${!isC ? 'on' : ''}">Tovarlar (${db.products.length})</button></div>
    <div class="tools"><input class="input" id="search" placeholder="Qidirish" value="${esc(q)}"></div>
    <div class="card">${list.length ? `<table class="stack"><thead><tr><th>Nomi</th>${isC ? '<th>Telefon</th><th>Telegram</th>' : ''}<th></th></tr></thead><tbody>
      ${list.map(r => `<tr><td class="who"><b>${esc(r.name)}</b>${isC ? `<span class="hm2">${esc(r.phone)}</span>` : ''}</td>${isC ? `<td class="hm">${esc(r.phone)}</td><td class="hm">${r.tg ? '@' + esc(r.tg) : '—'}</td>` : ''}
      <td class="r">${can('add') ? `<button class="btn sm" data-e="${r.id}">Tahrirlash</button> <button class="btn sm danger" data-d="${r.id}">O'chirish</button>` : ''}</td></tr>`).join('')}</tbody></table>`
      : empty(isC ? "Mijoz yo'q" : "Tovar yo'q", "Yuqoridagi tugma orqali qo'shing.")}</div>`;
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { baseTab = b.dataset.t; q = ''; viewBase(); });
  $('#search').oninput = e => { q = e.target.value; viewBase(); const i = $('#search'); i.focus(); i.setSelectionRange(q.length, q.length); };
  if (can('add')) $('#addB').onclick = () => baseForm();
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => baseForm(rows.find(r => r.id === b.dataset.e)));
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const id = b.dataset.d;
    if (isC && db.debts.some(d => d.clientId === id)) { toast("Bu mijozning qarzlari bor, o'chirib bo'lmaydi"); return; }
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    if (isC) db.clients = db.clients.filter(x => x.id !== id); else db.products = db.products.filter(x => x.id !== id);
    save(); viewBase();
  });
}
function baseForm(r) {
  const isC = baseTab === 'clients';
  modal(`${isC ? 'Mijoz' : 'Tovar'} ${r ? 'tahriri' : "qo'shish"}`, `
    <div class="field"><label>${isC ? 'Ism familiya' : 'Tovar nomi'}</label><input class="input" id="bName" value="${esc(r?.name)}"></div>
    ${isC ? `<div class="row"><div class="field"><label>Telefon raqami</label><input class="input" id="bPhone" type="tel" placeholder="+998 90 123 45 67" value="${esc(r?.phone)}"></div>
    <div class="field"><label>Telegram username</label><input class="input" id="bTg" placeholder="username" value="${esc(r?.tg)}"></div></div>` : ''}
    <div class="err" id="bErr"></div>`,
    '<button class="btn" data-x>Bekor qilish</button><button class="btn primary" id="bSave">Saqlash</button>');
  $('#bSave').onclick = () => {
    const name = $('#bName').value.trim();
    if (!name) { $('#bErr').textContent = isC ? 'Ismni kiriting.' : 'Tovar nomini kiriting.'; return; }
    const o = r || { id: uid() }; o.name = name;
    if (isC) {
      o.phone = $('#bPhone').value.trim(); o.tg = $('#bTg').value.trim().replace(/^@/, '');
      if (!o.phone) { $('#bErr').textContent = 'Telefon raqamini kiriting.'; return; }
    }
    if (!r) (isC ? db.clients : db.products).push(o);
    save(); closeModal(); viewBase(); toast('Saqlandi');
  };
}

/* ---------- Foydalanuvchilar (faqat super admin) ---------- */
function viewUsers() {
  $('#view').innerHTML = `
    <div class="head"><div><h2>Foydalanuvchilar</h2><p>Tizimga kirish huquqi va rollar</p></div><button class="btn primary" id="addU">+ Foydalanuvchi qo'shish</button></div>
    <div class="card"><table class="stack"><thead><tr><th>Ism familiya</th><th>Email</th><th>Telefon</th><th>Telegram</th><th>Rol</th><th></th></tr></thead><tbody>
    ${db.users.map(u => `<tr><td class="who"><b>${esc(u.name)}</b><span class="hm2">${esc(u.email)}</span></td><td class="hm">${esc(u.email)}</td><td class="hm">${esc(u.phone)}</td><td class="hm">${u.tg ? '@' + esc(u.tg) : '—'}</td>
    <td><span class="pill ${u.role === 'super' ? 'warn' : 'gray'}">${ROLES[u.role]}</span></td>
    <td class="r">${u.id === me.id ? '' : `<button class="btn sm danger" data-d="${u.id}">O'chirish</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  $('#addU').onclick = userForm;
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (confirm("Foydalanuvchi o'chirilsinmi?")) { db.users = db.users.filter(u => u.id !== b.dataset.d); save(); viewUsers(); } });
}
function userForm() {
  modal("Yangi foydalanuvchi", `
    <div class="row"><div class="field"><label>Ism familiya</label><input class="input" id="uName"></div>
    <div class="field"><label>Rol</label><select class="input" id="uRole"><option value="manager">Menejer — qarz va bazani boshqaradi</option><option value="cashier">Kassir — faqat to'lov qabul qiladi</option><option value="super">Super admin — to'liq huquq</option></select></div></div>
    <div class="row"><div class="field"><label>Email</label><input class="input" id="uEmail" type="email"></div>
    <div class="field"><label>Telefon raqami</label><input class="input" id="uPhone" type="tel" placeholder="+998"></div></div>
    <div class="row"><div class="field"><label>Telegram username</label><input class="input" id="uTg"></div>
    <div class="field"><label>Parol (kamida 6 belgi)</label><input class="input" id="uPass" type="password" autocomplete="new-password"></div></div>
    <div class="err" id="uErr"></div>`,
    '<button class="btn" data-x>Bekor qilish</button><button class="btn primary" id="uSave">Ro\'yxatdan o\'tkazish</button>');
  $('#uSave').onclick = () => {
    const u = { id: uid(), name: $('#uName').value.trim(), email: $('#uEmail').value.trim(), phone: $('#uPhone').value.trim(), tg: $('#uTg').value.trim().replace(/^@/, ''), pass: $('#uPass').value, role: $('#uRole').value };
    const e = !u.name ? 'Ism familiyani kiriting.' : !/^\S+@\S+\.\S+$/.test(u.email) ? "Email noto'g'ri formatda." : !u.phone ? 'Telefon raqamini kiriting.'
      : u.pass.length < 6 ? "Parol kamida 6 belgidan iborat bo'lsin." : db.users.some(x => x.email.toLowerCase() === u.email.toLowerCase()) ? "Bu email bilan foydalanuvchi mavjud." : '';
    if (e) { $('#uErr').textContent = e; return; }
    db.users.push(u); save(); closeModal(); viewUsers(); toast("Foydalanuvchi qo'shildi");
  };
}

boot();
