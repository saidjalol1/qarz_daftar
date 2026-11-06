'use strict';

let q = '';

function viewDebts() {
  const unpaid = activeDebts().filter(d => left(d) > 0);
  const tot = unpaid.reduce((s, d) => s + convert(d.total, nativeCur(d), displayCur), 0);
  const pd = unpaid.reduce((s, d) => s + convert(paid(d), nativeCur(d), displayCur), 0);
  const debtors = new Set(unpaid.map(d => d.clientId)).size;
  $('#view').innerHTML = `
    <div class="head"><div><h2>${t('debts.title')}</h2><p>${t('debts.sub')}</p></div>
      ${can('add') ? `<button class="btn primary" id="addDebt">${t('debts.add')}</button>` : ''}</div>
    <div class="sum"><div class="big"><small>${t('debts.left')}</small><strong class="num">${som(tot - pd)}</strong></div>
      <div><small>${t('debts.paid')}</small><strong class="num">${som(pd)}</strong></div>
      <div><small>${t('debts.debtors')}</small><strong class="num">${debtors}</strong></div></div>
    <div class="tools"><input class="input" id="search" placeholder="${esc(t('debts.search'))}" value="${esc(q)}"></div>
    <div id="dlist"></div>`;
  $('#search').oninput = e => { q = e.target.value; list(); const i = $('#search'); i.focus(); i.setSelectionRange(q.length, q.length); };
  if (can('add')) $('#addDebt').onclick = () => debtForm();
  list();
  function list() {
    const s = q.toLowerCase();
    const rows = unpaid.filter(d => {
      const c = client(d.clientId);
      const hay = [c.name, disp(c.name), c.phone, c.tg, String(d.no)].join(' ').toLowerCase();
      return !s || hay.includes(s);
    });
    renderGrouped($('#dlist'), rows, t('debts.empty'), t('debts.emptyHint'));
  }
}

function renderPage() { viewDebts(); }
if (bootShell('debts')) renderPage();
