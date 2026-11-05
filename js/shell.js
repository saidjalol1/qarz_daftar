'use strict';

const PAGES = {
  debts: 'debts.html',
  archive: 'archive.html',
  base: 'base.html',
  users: 'users.html'
};

const ICON = {
  debts: '<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4zM8 9h8M8 13h5"/>',
  archive: '<path d="M4 8h16l-1.2 12.2A2 2 0 0 1 16.81 22H7.19a2 2 0 0 1-1.99-1.8L4 8zM9 12h6M3 8h18V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>',
  base: '<path d="M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>'
};

function bootShell(page) {
  if (!me) { location.replace('index.html'); return false; }
  if (page === 'users' && !can('users')) { location.replace('debts.html'); return false; }
  applyStatic();
  const name = $('#meName'), role = $('#meRole');
  if (name) name.textContent = disp(me.name);
  if (role) role.textContent = roleName(me.role);
  const items = [['debts', t('nav.debts')], ['archive', t('nav.archive')], ['base', t('nav.base')], ...(can('users') ? [['users', t('nav.users')]] : [])];
  $('#nav').innerHTML = items.map(([k, title]) =>
    `<a href="${PAGES[k]}" data-p="${k}" class="${k === page ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>${title}</a>`
  ).join('');
  const out = $('#logout');
  if (out) out.onclick = () => { sessionStorage.removeItem('qd_me'); me = null; location.href = 'index.html'; };
  return true;
}
