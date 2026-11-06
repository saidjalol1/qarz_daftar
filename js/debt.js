'use strict';

function debtForm(edit) {
  if (!db.clients.length) { toast(t('debt.needClient')); location.href = 'base.html'; return; }
  let formCur = edit ? nativeCur(edit) : 'uzs';
  const items = edit ? edit.items.map(i => ({ name: i.name, price: i.price, boxes: i.boxes || 0, qty: itemQty(i) })) : [];
  const step = () => formCur === 'usd' ? '0.01' : '1';
  modal(edit ? t('debt.editTitle') : t('debt.new'), `
    <div class="row"><div class="field"><label>${t('debt.debtor')}</label><select class="input" id="dClient">${db.clients.map(c => `<option value="${c.id}" ${edit && edit.clientId === c.id ? 'selected' : ''}>${esc(disp(c.name))} — ${esc(c.phone)}</option>`).join('')}</select></div>
    <div class="field"><label>${t('debt.datetime')}</label><input class="input" type="datetime-local" id="dDate" value="${esc(toLocalInput(edit?.date || nowISO()))}"></div></div>
    <div class="field"><label>${t('debt.currency')}</label>
      <div class="script-switch form-cur" id="dCur">${['uzs', 'usd'].map(c => `<button type="button" data-c="${c}" class="${formCur === c ? 'on' : ''}" ${edit ? 'disabled' : ''}>${t('cur.' + c)}</button>`).join('')}</div>
    </div>
    <div class="sec">${t('debt.items')} <span style="font-weight:400;color:var(--muted)">${t('debt.optional')}</span></div>
    <div id="items" style="display:grid;gap:10px"></div>
    <button class="btn" id="addItem" type="button">${t('debt.addItem')}</button>
    <label class="chk"><input type="checkbox" id="manual" ${edit?.manual ? 'checked' : ''}> ${t('debt.manual')}</label>
    <div class="field hidden" id="mWrap"><label>${t('debt.sum')}</label><input class="input" type="number" min="0" step="${step()}" id="mSum" value="${edit?.manual ? edit.total : ''}"></div>
    <div class="total"><span>${t('debt.total')}</span><strong class="num" id="tSum">${fmtCur(0, formCur)}</strong></div>
    <div class="err" id="dErr"></div>`,
    `<button class="btn" data-x>${t('debt.cancel')}</button><button class="btn primary" id="saveDebt">${t('debt.save')}</button>`, true);
  const calc = () => {
    const man = $('#manual').checked;
    $('#mWrap').classList.toggle('hidden', !man);
    const tot = man ? num($('#mSum').value) : items.reduce((s, i) => s + lineSum(i), 0);
    $('#tSum').textContent = fmtCur(tot, formCur); return roundMoney(tot, formCur);
  };
  const draw = () => {
    $('#items').innerHTML = items.map((it, i) => `<div class="item" data-i="${i}">
      <div class="field"><label>${t('debt.product')}</label><select class="input" data-k="name">${db.products.map(p => `<option ${p.name === it.name ? 'selected' : ''} value="${esc(p.name)}">${esc(disp(p.name))}</option>`).join('')}</select></div>
      <div class="field"><label>${t('debt.price')}</label><input class="input" type="number" min="0" step="${step()}" data-k="price" value="${it.price || ''}"></div>
      <div class="field"><label>${t('debt.boxes')}</label><input class="input" type="number" min="0" data-k="boxes" value="${it.boxes || ''}"></div>
      <div class="field"><label>${t('debt.qty')}</label><input class="input" type="number" min="0" data-k="qty" value="${it.qty || ''}"></div>
      <button class="btn icon danger" data-del aria-label="${esc(t('debt.remove'))}">✕</button>
      <div class="ts">${itemQty(it)} ${t('debt.pcs')} × ${money(it.price, formCur)} = <b>${fmtCur(lineSum(it), formCur)}</b></div></div>`).join('');
    calc();
  };
  $('#addItem').onclick = () => {
    if (!db.products.length) { toast(t('debt.needProduct')); return; }
    items.push({ name: db.products[0].name, price: 0, boxes: 0, qty: 1 }); draw();
  };
  $('#items').oninput = e => {
    const el = e.target, row = el.closest('.item'), it = items[row.dataset.i];
    it[el.dataset.k] = el.dataset.k === 'name' ? el.value : num(el.value);
    row.querySelector('.ts').innerHTML = `${itemQty(it)} ${t('debt.pcs')} × ${money(it.price, formCur)} = <b>${fmtCur(lineSum(it), formCur)}</b>`; calc();
  };
  $('#items').onclick = e => { const b = e.target.closest('[data-del]'); if (b) { items.splice(b.closest('.item').dataset.i, 1); draw(); } };
  $('#manual').onchange = calc; $('#mSum').oninput = calc;
  $('#dCur').onclick = e => {
    const b = e.target.closest('[data-c]');
    if (!b || edit) return;
    formCur = b.dataset.c;
    $('#dCur').querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x.dataset.c === formCur));
    const m = $('#mSum'); if (m) m.step = step();
    draw();
  };
  if (items.length || edit?.manual) draw(); else calc();
  $('#saveDebt').onclick = () => {
    const total = calc();
    if (total <= 0) { $('#dErr').textContent = t('debt.needSum'); return; }
    if (edit) {
      const already = paid(edit);
      if (total < already) { $('#dErr').textContent = t('debt.belowPaid', { s: fmtCur(already, formCur) }); return; }
      edit.clientId = $('#dClient').value;
      edit.date = $('#dDate').value;
      edit.manual = $('#manual').checked;
      edit.currency = formCur;
      edit.items = items.map(i => ({ ...i }));
      edit.total = total;
      if (left(edit) <= 0) { edit.archived = true; edit.archivedAt = nowISO(); }
      save(); closeModal(); renderPage(); toast(left(edit) <= 0 ? t('arch.auto') : t('debt.updated'));
      return;
    }
    db.debts.push({
      id: uid(), no: Math.max(0, ...db.debts.map(d => d.no || 0)) + 1, clientId: $('#dClient').value, date: $('#dDate').value,
      manual: $('#manual').checked, currency: formCur, archived: false, items: items.map(i => ({ ...i })), total, payments: []
    });
    save(); closeModal(); renderPage(); toast(t('debt.added'));
  };
}

async function deleteDebt(id) {
  if (!await ask(t('debt.del'), t('debt.delOk'))) return;
  db.debts = db.debts.filter(x => x.id !== id);
  save(); closeModal(); renderPage(); toast(t('debt.deleted'));
}

function debtDetail(id) {
  const d = db.debts.find(x => x.id === id), c = client(d.clientId), l = left(d);
  const canPay = !d.archived && l > 0 && can('pay');
  const onDebts = !d.archived && can('add');
  modal(t('nak.title', { n: d.no }), `
    <div class="nak"><div class="nak-row"><span>${t('nak.client')}</span><b>${esc(disp(c.name))}</b></div>
      <div class="nak-row"><span>${t('nak.phone')}</span><span>${esc(c.phone)}</span></div>
      ${c.tg ? `<div class="nak-row"><span>${t('nak.tg')}</span><span>@${esc(c.tg)}</span></div>` : ''}
      <div class="nak-row"><span>${t('nak.date')}</span><span>${fdate(d.date)}</span></div>
      ${d.archived ? `<div class="nak-row"><span>${t('nak.archived')}</span><span>${d.archivedAt ? fdate(d.archivedAt) : '—'}</span></div>` : ''}
      <div class="nak-row"><span>${t('nak.native')}</span><span>${t('cur.' + nativeCur(d))}</span></div></div>
    ${d.items.length ? `<div class="sec">${t('debt.items')}</div><div class="table-wrap"><table class="mini"><thead><tr><th>${t('debt.product')}</th><th class="r">${t('nak.colPrice')}</th><th class="r">${t('nak.colBoxes')}</th><th class="r">${t('nak.colQty')}</th><th class="r">${t('nak.colSum')}</th></tr></thead><tbody>
      ${d.items.map(i => `<tr>
        <td data-label="${esc(t('debt.product'))}">${esc(disp(i.name))}</td>
        <td class="r num" data-label="${esc(t('nak.colPrice'))}">${moneyDebt(i.price, d)}</td>
        <td class="r" data-label="${esc(t('nak.colBoxes'))}">${i.boxes || '—'}</td>
        <td class="r" data-label="${esc(t('nak.colQty'))}">${itemQty(i)}</td>
        <td class="r num" data-label="${esc(t('nak.colSum'))}">${moneyDebt(lineSum(i), d)}</td>
      </tr>`).join('')}
      </tbody></table></div>` : `<p style="color:var(--muted)">${t('nak.noItems')}</p>`}
    <div class="nak-row"><span>${t('debt.total')}</span><b class="num">${somDebt(d.total, d)}</b></div>
    <div class="sec">${t('nak.payments')}</div>
    ${d.payments.length ? d.payments.map(p => `<div class="pay"><span>${fdate(p.date)}</span><b class="num" style="color:var(--ok)">− ${somDebt(p.amount, d)}</b></div>`).join('') : `<p style="color:var(--muted)">${t('nak.noPay')}</p>`}
    <div class="nak-row" style="font-size:1.05rem"><span>${t('nak.left')}</span><b class="num" style="color:${l > 0 ? 'var(--debt)' : 'var(--ok)'}">${somDebt(l, d)}</b></div>
    ${canPay ? `<div class="row" style="align-items:end"><div class="field"><label>${t('nak.payAmt')}</label><input class="input" type="number" min="0" step="${displayCur === 'usd' ? '0.01' : '1'}" id="pAmt" placeholder="${moneyDebt(l, d)}"></div>
      <div class="field"><label>${t('debt.datetime')}</label><input class="input" type="datetime-local" id="pDate" value="${nowISO()}"></div></div><div class="err" id="pErr"></div>
      <button class="btn primary" id="pay">${t('nak.takePay')}</button>` : ''}`,
    `${onDebts ? `<button class="btn" id="editDebt">${t('debt.edit')}</button><button class="btn danger" id="delDebt">${t('debt.del')}</button><button class="btn" id="archDebt">${t('nak.archive')}</button>` : ''}
     ${can('add') && d.archived ? `<button class="btn" id="restoreDebt">${t('nak.restore')}</button>` : ''}
     <button class="btn" id="pdf">${t('nak.pdf')}</button>`, true);
  $('#pdf').onclick = () => nakladnoy(d);
  if (onDebts) {
    $('#editDebt').onclick = () => debtForm(d);
    $('#delDebt').onclick = () => deleteDebt(d.id);
    $('#archDebt').onclick = async () => {
      if (!await ask(t('nak.archive'), t('arch.confirm'))) return;
      d.archived = true; d.archivedAt = nowISO(); save(); closeModal();
      renderPage(); toast(t('arch.done'));
    };
  }
  if (can('add') && d.archived) $('#restoreDebt').onclick = () => {
    d.archived = false; delete d.archivedAt; save(); closeModal();
    renderPage(); toast(t('arch.restored'));
  };
  const pay = $('#pay');
  if (pay) pay.onclick = () => {
    const a = num($('#pAmt').value);
    if (!a) { $('#pErr').textContent = t('nak.needPay'); return; }
    let nativePay = convert(a, displayCur, nativeCur(d));
    const slack = nativeCur(d) === 'usd' ? 0.009 : 0.5;
    if (nativePay > l + slack) { $('#pErr').textContent = t('nak.overPay', { s: somDebt(l, d) }); return; }
    nativePay = Math.min(nativePay, l);
    d.payments.push({ id: uid(), date: $('#pDate').value, amount: nativePay });
    if (left(d) <= 0) {
      d.archived = true; d.archivedAt = nowISO(); save(); closeModal();
      renderPage(); toast(t('arch.auto'));
      return;
    }
    save(); debtDetail(id); renderPage(); toast(t('nak.paidOk'));
  };
}
