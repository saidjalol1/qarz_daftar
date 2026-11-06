'use strict';

const KEY = 'qd_v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

const seed = () => {
  const c = [uid(), uid(), uid()], p = [uid(), uid(), uid()];
  return {
    clients: [
      { id: c[0], name: 'Aziz Karimov', phone: '+998901234567', tg: 'aziz_k' },
      { id: c[1], name: 'Dilnoza Yusupova', phone: '+998935554433', tg: '' },
      { id: c[2], name: 'Bobur Do\'stmatov', phone: '+998977001122', tg: 'bobur_d' }],
    products: [{ id: p[0], name: 'Un (Oliy nav)' }, { id: p[1], name: 'Yog\' 5 litr' }, { id: p[2], name: 'Shakar' }],
    usdRate: 12500,
    debts: [{
      id: uid(), no: 1, clientId: c[0], date: nowISO(), manual: false, archived: false, currency: 'uzs',
      items: [{ name: 'Un (Oliy nav)', price: 8500, boxes: 10, qty: 500 }],
      total: 4250000, payments: [{ id: uid(), date: nowISO(), amount: 1000000 }]
    }]
  };
};

let db = JSON.parse(localStorage.getItem(KEY) || 'null') || seed();
if (!Array.isArray(db.debts)) db.debts = [];
if (!db.usdRate) db.usdRate = 12500;
if (!db.usdRateDate) db.usdRateDate = '';
db.debts.forEach(d => {
  if (d.archived == null) d.archived = false;
  if (!d.currency) d.currency = 'uzs';
});
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
save();

let me = JSON.parse(sessionStorage.getItem('qd_me') || 'null');
const activeDebts = () => db.debts.filter(d => !d.archived);
const archivedDebts = () => db.debts.filter(d => d.archived);
const client = id => db.clients.find(c => c.id === id) || { name: '—', phone: '', tg: '' };
