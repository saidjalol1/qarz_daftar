'use strict';

function viewUsers() {
  $('#view').innerHTML = `
    <div class="head"><div><h2>${t('users.title')}</h2><p>${t('users.sub')}</p></div><button class="btn primary" id="addU">${t('users.add')}</button></div>
    <div class="card"><table class="stack"><thead><tr><th>${t('users.colName')}</th><th>${t('users.email')}</th><th>${t('nak.phone')}</th><th>${t('nak.tg')}</th><th>${t('users.role')}</th><th></th></tr></thead><tbody>
    ${db.users.map(u => `<tr><td class="who"><b>${esc(disp(u.name))}</b><span class="hm2">${esc(u.email)}</span></td><td class="hm">${esc(u.email)}</td><td class="hm">${esc(u.phone)}</td><td class="hm">${u.tg ? '@' + esc(u.tg) : '—'}</td>
    <td><span class="pill ${u.role === 'super' ? 'warn' : 'gray'}">${roleName(u.role)}</span></td>
    <td class="r acts">${u.id === me.id ? '' : `<button class="btn sm danger" data-d="${u.id}">${t('users.del')}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
  $('#addU').onclick = userForm;
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    if (!await ask(t('users.del'), t('users.delOk'))) return;
    db.users = db.users.filter(u => u.id !== b.dataset.d); save(); viewUsers();
  });
}

function userForm() {
  modal(t('users.new'), `
    <div class="row"><div class="field"><label>${t('users.colName')}</label><input class="input" id="uName"></div>
    <div class="field"><label>${t('users.role')}</label><select class="input" id="uRole"><option value="manager">${t('users.roleM')}</option><option value="cashier">${t('users.roleC')}</option><option value="super">${t('users.roleS')}</option></select></div></div>
    <div class="row"><div class="field"><label>${t('users.email')}</label><input class="input" id="uEmail" type="email"></div>
    <div class="field"><label>${t('base.phone')}</label><input class="input" id="uPhone" type="tel" placeholder="+998"></div></div>
    <div class="row"><div class="field"><label>${t('base.tg')}</label><input class="input" id="uTg"></div>
    <div class="field"><label>${t('users.pass')}</label><input class="input" id="uPass" type="password" autocomplete="new-password"></div></div>
    <div class="err" id="uErr"></div>`,
    `<button class="btn" data-x>${t('debt.cancel')}</button><button class="btn primary" id="uSave">${t('users.register')}</button>`);
  $('#uSave').onclick = () => {
    const u = { id: uid(), name: $('#uName').value.trim(), email: $('#uEmail').value.trim(), phone: $('#uPhone').value.trim(), tg: $('#uTg').value.trim().replace(/^@/, ''), pass: $('#uPass').value, role: $('#uRole').value };
    const err = !u.name ? t('users.needName') : !/^\S+@\S+\.\S+$/.test(u.email) ? t('users.badEmail') : !u.phone ? t('base.needPhone')
      : u.pass.length < 6 ? t('users.shortPass') : db.users.some(x => x.email.toLowerCase() === u.email.toLowerCase()) ? t('users.exists') : '';
    if (err) { $('#uErr').textContent = err; return; }
    db.users.push(u); save(); closeModal(); viewUsers(); toast(t('users.added'));
  };
}

function renderPage() { viewUsers(); }
if (bootShell('users')) renderPage();
