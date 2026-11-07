'use strict';

let usersCache = [];

async function loadUsers() {
  try {
    const res = await fetch('/users/api/', {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) {
      if (res.status === 403) {
        toast(disp('Ruxsat yo\'q'));
        return false;
      }
      throw new Error('Failed to load users');
    }
    
    const data = await res.json();
    if (data.success) {
      usersCache = data.users;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load users error:', err);
    toast(disp('Foydalanuvchilarni yuklashda xatolik'));
    return false;
  }
}

async function viewUsers() {
  const loaded = await loadUsers();
  if (!loaded) return;
  
  $('#view').innerHTML = `
    <div class="head"><div><h2>${t('users.title')}</h2><p>${t('users.sub')}</p></div><button class="btn primary" id="addU">${t('users.add')}</button></div>
    <div class="card"><table class="stack"><thead><tr><th>${t('users.colName')}</th><th>${t('users.email')}</th><th>${t('nak.phone')}</th><th>${t('nak.tg')}</th><th>${t('users.role')}</th><th></th></tr></thead><tbody>
    ${usersCache.map(u => `<tr><td class="who"><b>${esc(disp(u.name))}</b><span class="hm2">${esc(u.email)}</span></td><td class="hm">${esc(u.email)}</td><td class="hm">${esc(u.phone)}</td><td class="hm">${u.telegram ? '@' + esc(u.telegram) : '—'}</td>
    <td><span class="pill ${u.role === 'super' ? 'warn' : 'gray'}">${roleName(u.role)}</span></td>
    <td class="r acts">
      <button class="btn sm" data-e="${u.id}">${t('users.edit') || 'Tahrirlash'}</button>
      ${u.role === 'super' ? '' : `<button class="btn sm danger" data-d="${u.id}">${t('users.del')}</button>`}
    </td></tr>`).join('')}</tbody></table></div>`;
  
  $('#addU').onclick = () => userForm();
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
    const user = usersCache.find(u => u.id === parseInt(b.dataset.e));
    if (user) userForm(user);
  });
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    const userId = parseInt(b.dataset.d);
    const user = usersCache.find(u => u.id === userId);
    if (user && user.role === 'super') {
      toast(disp(t('users.cannotDeleteSuper') || 'Super admin foydalanuvchisini o\'chirib bo\'lmaydi'));
      return;
    }
    if (!await ask(t('users.del'), t('users.delOk'))) return;
    await deleteUser(userId);
  });
}

async function createUser(userData) {
  try {
    const res = await fetch('/users/api/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify(userData)
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      $('#uErr').textContent = disp(data.error || 'Xatolik yuz berdi');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Create user error:', err);
    $('#uErr').textContent = disp('Xatolik yuz berdi');
    return false;
  }
}

async function updateUser(userId, userData) {
  try {
    const res = await fetch(`/users/api/${userId}/update/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify(userData)
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      $('#uErr').textContent = disp(data.error || 'Xatolik yuz berdi');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Update user error:', err);
    $('#uErr').textContent = disp('Xatolik yuz berdi');
    return false;
  }
}

async function deleteUser(userId) {
  try {
    const user = usersCache.find(u => u.id === userId);
    if (user && user.role === 'super') {
      toast(disp(t('users.cannotDeleteSuper') || 'Super admin foydalanuvchisini o\'chirib bo\'lmaydi'));
      return false;
    }
    const res = await fetch(`/users/api/${userId}/delete/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      toast(disp(data.error || 'Xatolik yuz berdi'));
      return false;
    }
    
    toast(disp(data.message || 'Foydalanuvchi o\'chirildi'));
    viewUsers();
    return true;
  } catch (err) {
    console.error('Delete user error:', err);
    toast(disp('Xatolik yuz berdi'));
    return false;
  }
}

function userForm(editUser = null) {
  const isEdit = !!editUser;
  const title = isEdit ? (t('users.editTitle') || 'Foydalanuvchini tahrirlash') : t('users.new');
  const saveBtn = isEdit ? (t('users.update') || 'Yangilash') : t('users.register');
  
  modal(title, `
    <div class="row"><div class="field"><label>${t('users.colName')}</label><input class="input" id="uName" value="${isEdit ? esc(editUser.name) : ''}"></div>
    <div class="field"><label>${t('users.role')}</label><select class="input" id="uRole" ${isEdit && editUser.role === 'super' ? 'disabled' : ''}>
      <option value="manager" ${isEdit && editUser.role === 'manager' ? 'selected' : ''}>${t('users.roleM')}</option>
      <option value="cashier" ${isEdit && editUser.role === 'cashier' ? 'selected' : ''}>${t('users.roleC')}</option>
      <option value="super" ${isEdit && editUser.role === 'super' ? 'selected' : ''}>${t('users.roleS')}</option>
    </select></div></div>
    <div class="row"><div class="field"><label>${t('users.email')}</label><input class="input" id="uEmail" type="email" value="${isEdit ? esc(editUser.email) : ''}" ${isEdit ? 'disabled' : ''}></div>
    <div class="field"><label>${t('base.phone')}</label><input class="input" id="uPhone" type="tel" placeholder="+998" value="${isEdit ? esc(editUser.phone) : ''}"></div></div>
    <div class="row"><div class="field"><label>${t('base.tg')}</label><input class="input" id="uTg" value="${isEdit && editUser.telegram ? esc(editUser.telegram) : ''}"></div>
    <div class="field"><label>${t('users.pass')}${isEdit ? ' (' + (t('users.passOptional') || 'ixtiyoriy') + ')' : ''}</label>
      <div class="pw-wrap">
        <input class="input" id="uPass" type="password" autocomplete="new-password">
        <button type="button" class="pw-eye" id="togglePass" aria-label="Toggle password">
          <svg id="eyeSvg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    </div></div>
    <div class="err" id="uErr"></div>`,
    `<button class="btn" data-x>${t('debt.cancel')}</button><button class="btn primary" id="uSave">${saveBtn}</button>`);
  
  // Phone input auto-populate with +
  setupPhoneInput($('#uPhone'));
  
  // Password toggle
  const passInput = $('#uPass');
  const toggleBtn = $('#togglePass');
  const eyeSvg = $('#eyeSvg');
  const EYE_OPEN = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  const EYE_SHUT = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
  toggleBtn.onclick = () => {
    const hide = passInput.type === 'password';
    passInput.type = hide ? 'text' : 'password';
    eyeSvg.innerHTML = hide ? EYE_SHUT : EYE_OPEN;
  };
  
  $('#uSave').onclick = async () => {
    const name = $('#uName').value.trim();
    const email = $('#uEmail').value.trim().toLowerCase();
    const phone = $('#uPhone').value.trim();
    const telegram = $('#uTg').value.trim().replace(/^@/, '');
    const password = $('#uPass').value;
    const role = $('#uRole').value;
    
    // Client-side validation
    const err = !name ? t('users.needName') 
      : (!isEdit && !/^\S+@\S+\.\S+$/.test(email)) ? t('users.badEmail')
      : (!phone || phone === '+') ? t('base.needPhone')
      : phone.length < 4 ? (t('users.invalidPhone') || 'Telefon raqam noto\'g\'ri')
      : (!isEdit && !password) ? t('users.shortPass')
      : (!isEdit && password.length < 6) ? t('users.shortPass')
      : '';
    
    if (err) { 
      $('#uErr').textContent = err; 
      return; 
    }
    
    const userData = {
      name,
      email,
      phone,
      telegram,
      password,
      role
    };
    
    let success = false;
    if (isEdit) {
      success = await updateUser(editUser.id, userData);
      if (success) {
        closeModal();
        viewUsers();
        toast(disp(t('users.updated') || 'Foydalanuvchi yangilandi'));
      }
    } else {
      success = await createUser(userData);
      if (success) {
        closeModal();
        viewUsers();
        toast(disp(t('users.added')));
      }
    }
  };
}

function renderPage() { viewUsers(); }
if (bootShell('users')) renderPage();
