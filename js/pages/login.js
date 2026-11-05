'use strict';

applyStatic();
if (me) {
  const map = { debts: 'debts.html', archive: 'archive.html', base: 'base.html', users: 'users.html' };
  location.replace(map[location.hash.slice(1)] || 'debts.html');
} else {
  $('#loginForm').onsubmit = e => {
    e.preventDefault();
    const u = db.users.find(x => x.email.toLowerCase() === $('#lEmail').value.trim().toLowerCase() && x.pass === $('#lPass').value);
    if (!u) { $('#lErr').textContent = t('login.err'); return; }
    me = u;
    sessionStorage.setItem('qd_me', JSON.stringify(u));
    location.href = 'debts.html';
  };
}
