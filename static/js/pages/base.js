'use strict';

let baseTab = 'clients', q = '';

function viewBase() {
  const isC = baseTab === 'clients', rows = isC ? db.clients : db.products, s = q.toLowerCase();
  const list = rows.filter(r => {
    const hay = [r.name, disp(r.name), r.phone || '', r.tg || ''].join(' ').toLowerCase();
    return !s || hay.includes(s);
  });
  $('#view').innerHTML = `
    <div class="head"><div><h2>${t('base.title')}</h2><p>${t('base.sub')}</p></div>
      ${can('add') ? `<button class="btn primary" id="addB">${isC ? t('base.addClient') : t('base.addProduct')}</button>` : ''}</div>
    <div class="tabs"><button data-t="clients" class="${isC ? 'on' : ''}">${t('base.clients')} (${db.clients.length})</button><button data-t="products" class="${!isC ? 'on' : ''}">${t('base.products')} (${db.products.length})</button></div>
    <div class="tools"><input class="input" id="search" placeholder="${esc(t('base.search'))}" value="${esc(q)}"></div>
    <div class="card">${list.length ? `<table class="stack"><thead><tr><th>${t('base.colName')}</th>${isC ? `<th>${t('nak.phone')}</th><th>${t('nak.tg')}</th>` : ''}<th></th></tr></thead><tbody>
      ${list.map(r => `<tr><td class="who"><b>${esc(disp(r.name))}</b>${isC ? `<span class="hm2">${esc(r.phone)}</span>` : ''}</td>${isC ? `<td class="hm">${esc(r.phone)}</td><td class="hm">${r.tg ? '@' + esc(r.tg) : '—'}</td>` : ''}
      <td class="r acts">${can('add') ? `<button class="btn sm" data-e="${r.id}">${t('base.edit')}</button> <button class="btn sm danger" data-d="${r.id}">${t('base.del')}</button>` : ''}</td></tr>`).join('')}</tbody></table>`
      : empty(isC ? t('base.noClient') : t('base.noProduct'), t('base.emptyHint'))}</div>`;
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { baseTab = b.dataset.t; q = ''; viewBase(); });
  $('#search').oninput = e => { q = e.target.value; viewBase(); const i = $('#search'); i.focus(); i.setSelectionRange(q.length, q.length); };
  if (can('add')) $('#addB').onclick = () => baseForm();
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => baseForm(rows.find(r => r.id === b.dataset.e)));
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    const id = b.dataset.d;
    if (isC && db.debts.some(d => d.clientId === id)) { toast(disp(t('base.hasDebts'))); return; }
    if (!await ask(t('base.del'), t('base.delOk'))) return;
    if (isC) db.clients = db.clients.filter(x => x.id !== id); else db.products = db.products.filter(x => x.id !== id);
    save(); viewBase(); toast(disp(t('base.saved')));
  });
  });
}

function baseForm(r) {
  const isC = baseTab === 'clients';
  const kind = isC ? t('base.client') : t('base.product');
  modal(`${kind} ${r ? t('base.editOf') : t('base.addOf')}`, `
    <div class="field"><label>${isC ? t('base.fullName') : t('base.prodName')}</label><input class="input" id="bName" value="${esc(r?.name)}"></div>
    ${isC ? `<div class="row"><div class="field"><label>${t('base.phone')}</label><input class="input" id="bPhone" type="tel" placeholder="+998 90 123 45 67" value="${esc(r?.phone)}"></div>
    <div class="field"><label>${t('base.tg')}</label><input class="input" id="bTg" placeholder="username" value="${esc(r?.tg)}"></div></div>` : ''}
    <div class="err" id="bErr"></div>`,
    `<button class="btn" data-x>${t('debt.cancel')}</button><button class="btn primary" id="bSave">${t('debt.save')}</button>`);
  
  // Phone input auto-populate with +
  if (isC) setupPhoneInput($('#bPhone'));
  
  $('#bSave').onclick = () => {
    const name = $('#bName').value.trim();
    if (!name) { $('#bErr').textContent = disp(isC ? t('base.needNameC') : t('base.needNameP')); return; }
    const o = r || { id: uid() }; o.name = name;
    if (isC) {
      const phone = $('#bPhone').value.trim();
      o.phone = phone;
      o.tg = $('#bTg').value.trim().replace(/^@/, '');
      if (!phone || phone === '+') { $('#bErr').textContent = disp(t('base.needPhone')); return; }
      if (phone.length < 4) { $('#bErr').textContent = disp(t('base.invalidPhone') || 'Telefon raqam noto\'g\'ri'); return; }
    }
    if (!r) (isC ? db.clients : db.products).push(o);
    save(); closeModal(); viewBase(); toast(disp(t('base.saved')));
  };
}

function renderPage() { viewBase(); }
if (bootShell('base')) renderPage();
