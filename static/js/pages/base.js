'use strict';

let baseTab = 'clients';
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 20;
let totalPages = 1;
let isLoading = false;

// Cache per tab
let clientsCache = {};  // { page: { data: [], total: 0 } }
let productsCache = {};  // { page: { data: [], total: 0 } }

async function loadClients(page = 1, search = '') {
  if (isLoading) return false;
  isLoading = true;
  
  try {
    const params = new URLSearchParams({
      page: page,
      page_size: PAGE_SIZE,
      ...(search && { search })
    });
    
    const res = await fetch(`/base/api/clients/?${params}`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load clients');
    
    const data = await res.json();
    if (data.success) {
      clientsCache = data.clients;
      totalPages = data.pagination.total_pages;
      currentPage = data.pagination.page;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load clients error:', err);
    toast(disp('Klientlarni yuklashda xatolik'));
    return false;
  } finally {
    isLoading = false;
  }
}

async function loadProducts(page = 1, search = '') {
  if (isLoading) return false;
  isLoading = true;
  
  try {
    const params = new URLSearchParams({
      page: page,
      page_size: PAGE_SIZE,
      ...(search && { search })
    });
    
    const res = await fetch(`/base/api/products/?${params}`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load products');
    
    const data = await res.json();
    if (data.success) {
      productsCache = data.products;
      totalPages = data.pagination.total_pages;
      currentPage = data.pagination.page;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load products error:', err);
    toast(disp('Tovarlarni yuklashda xatolik'));
    return false;
  } finally {
    isLoading = false;
  }
}

async function viewBase() {
  const isC = baseTab === 'clients';
  
  // Ensure currentPage is valid
  if (!currentPage || isNaN(currentPage) || currentPage < 1) {
    currentPage = 1;
  }
  
  // Load data
  const loaded = isC 
    ? await loadClients(currentPage, searchQuery)
    : await loadProducts(currentPage, searchQuery);
  
  if (!loaded) return;
  
  const rows = isC ? clientsCache : productsCache;
  
  // Check if this is initial render or just update
  const isInitialRender = !$('#view').innerHTML || !$('#search');
  
  if (isInitialRender) {
    // Full page render
    $('#view').innerHTML = `
      <div class="head"><div><h2>${t('base.title')}</h2><p>${t('base.sub')}</p></div>
        ${can('add') ? `<button class="btn primary" id="addB">${isC ? t('base.addClient') : t('base.addProduct')}</button>` : ''}</div>
      <div class="tabs">
        <button data-t="clients" class="${isC ? 'on' : ''}">${t('base.clients')}</button>
        <button data-t="products" class="${!isC ? 'on' : ''}">${t('base.products')}</button>
      </div>
      <div class="tools">
        <input class="input" id="search" placeholder="${esc(t('base.search'))}" value="${esc(searchQuery)}">
      </div>
      <div id="resultsContainer"></div>`;
    
    // Tab switching
    document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { 
      baseTab = b.dataset.t;
      searchQuery = ''; 
      currentPage = 1;
      totalPages = 1;
      
      // Update tab button states
      document.querySelectorAll('.tabs button').forEach(btn => {
        btn.classList.toggle('on', btn.dataset.t === baseTab);
      });
      
      // Clear search input
      const searchInput = $('#search');
      if (searchInput) searchInput.value = '';
      
      // Reload data and update results
      viewBase();
    });
    
    // Search with debounce
    const searchInput = $('#search');
    let searchTimeout;
    searchInput.oninput = e => {
      const cursorPos = e.target.selectionStart;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        searchQuery = e.target.value;
        currentPage = 1;
        // Load new data and update results - use current baseTab instead of captured isC
        const loaded = baseTab === 'clients'
          ? await loadClients(currentPage, searchQuery)
          : await loadProducts(currentPage, searchQuery);
        if (loaded) {
          updateResults();
          // Restore focus and cursor position
          const newSearchInput = $('#search');
          if (newSearchInput) {
            newSearchInput.focus();
            newSearchInput.setSelectionRange(cursorPos, cursorPos);
          }
        }
      }, 300);
    };
    
    // Add button
    if (can('add')) $('#addB').onclick = () => baseForm();
  } else {
    // Update translatable text elements only (for script changes)
    updateTranslatableText();
  }
  
  // Update results only (doesn't affect search input)
  updateResults();
}

function updateTranslatableText() {
  const isC = baseTab === 'clients';
  
  // Update header title and subtitle
  const headDiv = $('#view .head');
  if (headDiv) {
    const titleH2 = headDiv.querySelector('h2');
    const subP = headDiv.querySelector('p');
    const addBtn = headDiv.querySelector('#addB');
    
    if (titleH2) titleH2.textContent = t('base.title');
    if (subP) subP.textContent = t('base.sub');
    if (addBtn) addBtn.textContent = isC ? t('base.addClient') : t('base.addProduct');
  }
  
  // Update tab labels
  const tabs = document.querySelectorAll('.tabs button');
  if (tabs.length >= 2) {
    tabs[0].textContent = t('base.clients');
    tabs[1].textContent = t('base.products');
  }
  
  // Update search placeholder
  const searchInput = $('#search');
  if (searchInput) {
    searchInput.placeholder = t('base.search');
  }
  
  // Update modal form if it's open
  updateModalForm();
}

function updateModalForm() {
  // Check if modal is open and form data exists
  const modal = document.querySelector('#modalRoot .modal');
  if (!modal || !currentFormData) return;
  
  const { record, isClient } = currentFormData;
  const isEdit = !!record;
  const kind = isClient ? t('base.client') : t('base.product');
  
  // Preserve user's current input values
  const currentName = $('#bName')?.value || '';
  const currentPhone = $('#bPhone')?.value || '';
  const currentTg = $('#bTg')?.value || '';
  const currentError = $('#bErr')?.textContent || '';
  
  // Update modal title
  const modalTitle = modal.querySelector('.mh h3');
  if (modalTitle) {
    modalTitle.textContent = `${kind} ${record ? t('base.editOf') : t('base.addOf')}`;
  }
  
  // Update field labels
  const labels = modal.querySelectorAll('label');
  if (isClient && labels.length >= 3) {
    labels[0].textContent = t('base.fullName');
    labels[1].textContent = t('base.phone');
    labels[2].textContent = t('base.tg');
  } else if (!isClient && labels.length >= 1) {
    labels[0].textContent = t('base.prodName');
  }
  
  // Update button text
  const cancelBtn = modal.querySelector('[data-x]');
  const saveBtn = modal.querySelector('#bSave');
  if (cancelBtn) cancelBtn.textContent = t('debt.cancel');
  if (saveBtn) saveBtn.textContent = t('debt.save');
  
  // Restore user input values
  if ($('#bName')) $('#bName').value = currentName;
  if ($('#bPhone')) $('#bPhone').value = currentPhone;
  if ($('#bTg')) $('#bTg').value = currentTg;
  if ($('#bErr')) $('#bErr').textContent = disp(currentError);
  
  // Update close button aria-label
  const closeBtn = modal.querySelector('.mh button[data-x]');
  if (closeBtn) closeBtn.setAttribute('aria-label', t('ui.close'));
}

function updateResults() {
  const isC = baseTab === 'clients';
  const rows = isC ? clientsCache : productsCache;
  
  $('#resultsContainer').innerHTML = `
    <div class="card">${rows.length ? `<table class="stack"><thead><tr><th>${t('base.colName')}</th>${isC ? `<th>${t('nak.phone')}</th><th>${t('nak.tg')}</th>` : ''}<th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td class="who"><b>${esc(disp(r.name))}</b>${isC ? `<span class="hm2">${esc(r.phone)}</span>` : ''}</td>${isC ? `<td class="hm">${esc(r.phone)}</td><td class="hm">${r.telegram ? '@' + esc(r.telegram) : '—'}</td>` : ''}
      <td class="r acts">${can('add') ? `<button class="btn sm" data-e="${r.id}">${t('base.edit')}</button> <button class="btn sm danger" data-d="${r.id}">${t('base.del')}</button>` : ''}</td></tr>`).join('')}</tbody></table>`
      : empty(isC ? t('base.noClient') : t('base.noProduct'), t('base.emptyHint'))}</div>
    ${totalPages > 1 ? renderPagination() : ''}`;
  
  // Edit buttons
  document.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
    const row = rows.find(r => r.id === parseInt(b.dataset.e));
    if (row) baseForm(row);
  });
  
  // Delete buttons
  document.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    const id = parseInt(b.dataset.d);
    if (!await ask(t('base.del'), t('base.delOk'))) return;
    await deleteItem(id);
  });
  
  // Pagination
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => {
    const newPage = parseInt(b.dataset.page);
    if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
      currentPage = newPage;
      viewBase();
    }
  });
}

function renderPagination() {
  const maxVisible = 5;
  let pages = [];
  
  // Always show first page
  pages.push(1);
  
  // Calculate range
  let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages - 1, start + maxVisible - 1);
  start = Math.max(2, end - maxVisible + 1);
  
  // Add ellipsis if needed
  if (start > 2) pages.push('...');
  
  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  // Add ellipsis if needed
  if (end < totalPages - 1) pages.push('...');
  
  // Always show last page
  if (totalPages > 1) pages.push(totalPages);
  
  return `<div class="pagination">
    <button class="btn sm" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>←</button>
    ${pages.map(p => 
      p === '...' ? '<span>...</span>' : 
      `<button class="btn sm ${p === currentPage ? 'primary' : ''}" data-page="${p}">${p}</button>`
    ).join('')}
    <button class="btn sm" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>→</button>
  </div>`;
}

async function deleteItem(id) {
  const isC = baseTab === 'clients';
  const endpoint = isC ? `/base/api/clients/${id}/delete/` : `/base/api/products/${id}/delete/`;
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      toast(disp(data.error || 'Xatolik yuz berdi'));
      return false;
    }
    
    toast(disp(data.message || 'O\'chirildi'));
    // Reload the current page of data
    await (isC ? loadClients(currentPage, searchQuery) : loadProducts(currentPage, searchQuery));
    updateResults();
    return true;
  } catch (err) {
    console.error('Delete error:', err);
    toast(disp('Xatolik yuz berdi'));
    return false;
  }
}

// Store current form state for script switching
let currentFormData = null;

function baseForm(r) {
  const isC = baseTab === 'clients';
  const kind = isC ? t('base.client') : t('base.product');
  const isEdit = !!r;
  
  // Store form data for potential script updates
  currentFormData = { record: r, isClient: isC };
  
  modal(`${kind} ${r ? t('base.editOf') : t('base.addOf')}`, `
    <div class="field"><label>${isC ? t('base.fullName') : t('base.prodName')}</label><input class="input" id="bName" value="${esc(r?.name || '')}"></div>
    ${isC ? `<div class="row"><div class="field"><label>${t('base.phone')}</label><input class="input" id="bPhone" type="tel" placeholder="+998" value="${esc(r?.phone || '')}"></div>
    <div class="field"><label>${t('base.tg')}</label><input class="input" id="bTg" placeholder="username" value="${esc(r?.telegram || '')}"></div></div>` : ''}
    <div class="err" id="bErr"></div>`,
    `<button class="btn" data-x>${t('debt.cancel')}</button><button class="btn primary" id="bSave">${t('debt.save')}</button>`);
  
  // Phone input auto-populate with +
  if (isC) setupPhoneInput($('#bPhone'));
  
  $('#bSave').onclick = async () => {
    const name = $('#bName').value.trim();
    if (!name) { 
      $('#bErr').textContent = disp(isC ? t('base.needNameC') : t('base.needNameP')); 
      return; 
    }
    
    const data = { name };
    
    if (isC) {
      const phone = $('#bPhone').value.trim();
      const telegram = $('#bTg').value.trim().replace(/^@/, '');
      
      if (!phone || phone === '+') { 
        $('#bErr').textContent = disp(t('base.needPhone')); 
        return; 
      }
      if (phone.length < 4) { 
        $('#bErr').textContent = disp(t('base.invalidPhone') || 'Telefon raqam noto\'g\'ri'); 
        return; 
      }
      
      data.phone = phone;
      data.telegram = telegram;
    }
    
    const success = isEdit 
      ? await updateItem(r.id, data)
      : await createItem(data);
    
    if (success) {
      currentFormData = null; // Clear form data
      closeModal();
      // Reload data without losing search input focus
      await (isC ? loadClients(currentPage, searchQuery) : loadProducts(currentPage, searchQuery));
      updateResults();
      toast(disp(t('base.saved')));
    }
  };
}

async function createItem(data) {
  const isC = baseTab === 'clients';
  const endpoint = isC ? '/base/api/clients/create/' : '/base/api/products/create/';
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      $('#bErr').textContent = disp(result.error || 'Xatolik yuz berdi');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Create error:', err);
    $('#bErr').textContent = disp('Xatolik yuz berdi');
    return false;
  }
}

async function updateItem(id, data) {
  const isC = baseTab === 'clients';
  const endpoint = isC ? `/base/api/clients/${id}/update/` : `/base/api/products/${id}/update/`;
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    
    if (!res.ok || !result.success) {
      $('#bErr').textContent = disp(result.error || 'Xatolik yuz berdi');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Update error:', err);
    $('#bErr').textContent = disp('Xatolik yuz berdi');
    return false;
  }
}

function renderPage() { 
  // Ensure variables are initialized
  if (!currentPage || isNaN(currentPage)) currentPage = 1;
  if (!totalPages || isNaN(totalPages)) totalPages = 1;
  if (!baseTab) baseTab = 'clients';
  if (!searchQuery) searchQuery = '';
  
  viewBase(); 
}
if (bootShell('base')) renderPage();
