'use strict';

// State management
let archiveTab = 'debts'; // debts, clients, products
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 20;
let totalPages = 1;
let isLoading = false;

// Cache per tab
let debtsCache = [];
let clientsCache = [];
let productsCache = [];

// ============================================================================
// MAIN VIEW - ARCHIVE PAGE WITH TABS
// ============================================================================

async function viewArchive() {
  // Ensure currentPage is valid
  if (!currentPage || isNaN(currentPage) || currentPage < 1) {
    currentPage = 1;
  }
  
  // Load data based on active tab
  let loaded = false;
  if (archiveTab === 'debts') {
    loaded = await loadArchivedDebts(currentPage, searchQuery);
  } else if (archiveTab === 'clients') {
    loaded = await loadArchivedClients(currentPage, searchQuery);
  } else if (archiveTab === 'products') {
    loaded = await loadArchivedProducts(currentPage, searchQuery);
  }
  
  if (!loaded) return;
  
  // Check if this is initial render or just update
  const isInitialRender = !$('#view').innerHTML || !$('#archSearch');
  
  if (isInitialRender) {
    // Full page render
    $('#view').innerHTML = `
      <div class="head">
        <div>
          <h2>${t('arch.title')}</h2>
          <p>${t('arch.sub')}</p>
        </div>
      </div>
      
      <div class="tools">
        <input class="input" id="archSearch" placeholder="${esc(t('base.search'))}" value="${esc(searchQuery)}">
        <div class="tabs">
          <button data-tab="debts" class="${archiveTab === 'debts' ? 'on' : ''}">${t('arch.debts')}</button>
          <button data-tab="clients" class="${archiveTab === 'clients' ? 'on' : ''}">${t('base.clients')}</button>
          <button data-tab="products" class="${archiveTab === 'products' ? 'on' : ''}">${t('base.products')}</button>
        </div>
      </div>
      
      <div id="archiveContainer"></div>
    `;
    
    // Tab switching
    document.querySelectorAll('.tabs button').forEach(btn => {
      btn.onclick = () => {
        archiveTab = btn.dataset.tab;
        searchQuery = '';
        currentPage = 1;
        totalPages = 1;
        
        // Update tab button states
        document.querySelectorAll('.tabs button').forEach(b => {
          b.classList.toggle('on', b.dataset.tab === archiveTab);
        });
        
        // Clear search input
        const searchInput = $('#archSearch');
        if (searchInput) searchInput.value = '';
        
        // Reload data and update results
        viewArchive();
      };
    });
    
    // Search with debounce
    const searchInput = $('#archSearch');
    let searchTimeout;
    searchInput.oninput = e => {
      const cursorPos = e.target.selectionStart;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        searchQuery = e.target.value;
        currentPage = 1;
        
        // Load new data based on current tab
        let loaded = false;
        if (archiveTab === 'debts') {
          loaded = await loadArchivedDebts(currentPage, searchQuery);
        } else if (archiveTab === 'clients') {
          loaded = await loadArchivedClients(currentPage, searchQuery);
        } else if (archiveTab === 'products') {
          loaded = await loadArchivedProducts(currentPage, searchQuery);
        }
        
        if (loaded) {
          updateArchiveResults();
          // Restore focus and cursor position
          const newSearchInput = $('#archSearch');
          if (newSearchInput) {
            newSearchInput.focus();
            newSearchInput.setSelectionRange(cursorPos, cursorPos);
          }
        }
      }, 300);
    };
  } else {
    // Update translatable text elements only (for script changes)
    updateArchiveTranslatableText();
  }
  
  // Update results only
  updateArchiveResults();
}

function updateArchiveTranslatableText() {
  // Update header
  const headDiv = $('#view .head');
  if (headDiv) {
    const titleH2 = headDiv.querySelector('h2');
    const subP = headDiv.querySelector('p');
    
    if (titleH2) titleH2.textContent = t('arch.title');
    if (subP) subP.textContent = t('arch.sub');
  }
  
  // Update tab labels
  const tabs = document.querySelectorAll('.tabs button');
  if (tabs.length >= 3) {
    tabs[0].textContent = t('arch.debts');
    tabs[1].textContent = t('base.clients');
    tabs[2].textContent = t('base.products');
  }
  
  // Update search placeholder
  const searchInput = $('#archSearch');
  if (searchInput) {
    searchInput.placeholder = t('base.search');
  }
}

function updateArchiveResults() {
  if (archiveTab === 'debts') {
    renderArchivedDebts();
  } else if (archiveTab === 'clients') {
    renderArchivedClients();
  } else if (archiveTab === 'products') {
    renderArchivedProducts();
  }
}

// ============================================================================
// ARCHIVED DEBTS - LOAD & RENDER
// ============================================================================

async function loadArchivedDebts(page = 1, search = '') {
  if (isLoading) return false;
  isLoading = true;
  
  try {
    const params = new URLSearchParams({
      page: page,
      page_size: PAGE_SIZE,
      ...(search && { search })
    });
    
    const res = await fetch(`/archive/api/debts/?${params}`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load archived debts');
    
    const data = await res.json();
    if (data.success) {
      debtsCache = data.groups;
      totalPages = data.pagination.total_pages;
      currentPage = data.pagination.page;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load archived debts error:', err);
    toast(disp('Arxivlangan qarzlarni yuklashda xatolik'));
    return false;
  } finally {
    isLoading = false;
  }
}

function renderArchivedDebts() {
  const groups = debtsCache;
  
  $('#archiveContainer').innerHTML = `
    <div class="arch">
      ${groups.length ? groups.map(g => renderArchivedDebtGroup(g)).join('') : 
        `<div class="card">${empty(t('arch.noDebts'), t('arch.emptyHint'))}</div>`}
    </div>
    ${totalPages > 1 ? renderPagination() : ''}
  `;
  
  // Restore buttons
  document.querySelectorAll('[data-restore-debt]').forEach(btn => {
    btn.onclick = async () => {
      const debtId = parseInt(btn.dataset.restoreDebt);
      const debtNumber = btn.dataset.debtNumber;
      if (await ask(t('arch.restore'), t('arch.restoreDebt', {n: debtNumber}))) {
        await restoreDebt(debtId);
      }
    };
  });
  
  // Pagination
  attachPaginationHandlers();
}

// Toggle archive group open/close
window.toggleArchGroup = function(clientId) {
  const group = $(`#arch-group-${clientId}`);
  if (group) {
    group.classList.toggle('closed');
  }
};

function renderArchivedDebtGroup(group) {
  const client = group.client;
  const groupCurrency = group.currency || 'uzs';
  
  // Use group totals (already summed in backend)
  const totalAmount = parseFloat(group.total);
  const paidAmount = parseFloat(group.paid);
  const leftAmount = parseFloat(group.left);
  const isPaid = leftAmount <= 0;
  
  return `
    <div class="arch-g closed" id="arch-group-${client.id}">
      <button class="arch-h" onclick="toggleArchGroup(${client.id})">
        <div class="who">
          <b>${esc(disp(client.name))}</b>
          <span>${esc(client.phone)}${client.telegram ? ' • @' + esc(client.telegram) : ''}</span>
        </div>
        <div class="arch-meta">
          ${statusPill({ total: totalAmount, payments: [{amount: paidAmount}] })}
          <div style="margin-top: 4px; font-size: 0.85rem; color: var(--muted);">${group.debts.length} ${disp('qarz')}</div>
        </div>
        <span class="chev">›</span>
      </button>
      
      <div class="arch-body">
        <div style="padding: 14px 16px; background: #FAFBFC;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px;">
            <div style="background: #FFFFFF; padding: 10px 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
              <small style="color: var(--muted); font-size: 0.8rem; display: block; margin-bottom: 4px;">${t('debts.colTotal')}</small>
              <div style="font-weight: 700; font-size: 1rem; color: var(--ink);">${money(totalAmount, groupCurrency)} ${unit(groupCurrency)}</div>
            </div>
            <div style="background: #FFFFFF; padding: 10px 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
              <small style="color: var(--muted); font-size: 0.8rem; display: block; margin-bottom: 4px;">${t('debts.paid')}</small>
              <div style="font-weight: 700; font-size: 1rem; color: var(--success);">${money(paidAmount, groupCurrency)} ${unit(groupCurrency)}</div>
            </div>
            <div style="background: #FFFFFF; padding: 10px 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
              <small style="color: var(--muted); font-size: 0.8rem; display: block; margin-bottom: 4px;">${t('debts.colLeft')}</small>
              <div style="font-weight: 700; font-size: 1rem; color: ${isPaid ? 'var(--success)' : 'var(--danger)'};">${money(leftAmount, groupCurrency)} ${unit(groupCurrency)}</div>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${group.debts.map(d => `
              <div style="padding: 14px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 180px;">
                  <span style="font-weight: 700; color: var(--brand); font-size: 0.95rem;">№${d.number}</span>
                  <span style="color: var(--muted); font-size: 0.85rem; margin-left: 10px;">${new Date(d.issued_at).toLocaleDateString('ru-RU')}</span>
                  ${d.archived_at ? `<span style="color: #9CA3AF; font-size: 0.78rem; margin-left: 8px;">(${new Date(d.archived_at).toLocaleDateString('ru-RU')})</span>` : ''}
                </div>
                <button class="btn sm primary archive-restore-btn" data-restore-debt="${d.id}" data-debt-number="${d.number}" style="flex-shrink: 0; min-width: 100px;">${t('arch.restoreBtn')}</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function restoreDebt(debtId) {
  try {
    const res = await fetch(`/archive/api/debts/${debtId}/restore/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      toast(disp(data.error || 'Xatolik yuz berdi'));
      return false;
    }
    
    toast(disp(data.message || 'Qarz qayta tiklandi'));
    
    // Reload current page
    await loadArchivedDebts(currentPage, searchQuery);
    updateArchiveResults();
    return true;
  } catch (err) {
    console.error('Restore debt error:', err);
    toast(disp('Xatolik yuz berdi'));
    return false;
  }
}

// ============================================================================
// ARCHIVED CLIENTS - LOAD & RENDER
// ============================================================================

async function loadArchivedClients(page = 1, search = '') {
  if (isLoading) return false;
  isLoading = true;
  
  try {
    const params = new URLSearchParams({
      page: page,
      page_size: PAGE_SIZE,
      ...(search && { search })
    });
    
    const res = await fetch(`/archive/api/clients/?${params}`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load archived clients');
    
    const data = await res.json();
    if (data.success) {
      clientsCache = data.clients;
      totalPages = data.pagination.total_pages;
      currentPage = data.pagination.page;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load archived clients error:', err);
    toast(disp('Arxivlangan mijozlarni yuklashda xatolik'));
    return false;
  } finally {
    isLoading = false;
  }
}

function renderArchivedClients() {
  const clients = clientsCache;
  
  $('#archiveContainer').innerHTML = `
    <div class="card">
      ${clients.length ? `
        <table class="stack">
          <thead>
            <tr>
              <th>${t('base.colName')}</th>
              <th>${t('nak.phone')}</th>
              <th>${t('nak.tg')}</th>
              <th>${t('arch.date')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(c => `
              <tr>
                <td class="who">
                  <b>${esc(disp(c.name))}</b>
                  <span class="hm2">${esc(c.phone)}</span>
                </td>
                <td class="hm">${esc(c.phone)}</td>
                <td class="hm">${c.telegram ? '@' + esc(c.telegram) : '—'}</td>
                <td class="hm">${new Date(c.created_at).toLocaleDateString('ru-RU')}</td>
                <td class="r acts">
                  <button class="btn sm primary" data-restore-client="${c.id}" data-client-name="${esc(c.name)}">${t('arch.restoreBtn')}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : empty(t('arch.noClients'), t('arch.emptyHint'))}
    </div>
    ${totalPages > 1 ? renderPagination() : ''}
  `;
  
  // Restore buttons
  document.querySelectorAll('[data-restore-client]').forEach(btn => {
    btn.onclick = async () => {
      const clientId = parseInt(btn.dataset.restoreClient);
      const clientName = btn.dataset.clientName;
      if (await ask(t('arch.restore'), t('arch.restoreClient', {n: clientName}))) {
        await restoreClient(clientId);
      }
    };
  });
  
  // Pagination
  attachPaginationHandlers();
}

async function restoreClient(clientId) {
  try {
    const res = await fetch(`/archive/api/clients/${clientId}/restore/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      toast(disp(data.error || 'Xatolik yuz berdi'));
      return false;
    }
    
    toast(disp(data.message || 'Mijoz qayta tiklandi'));
    
    // Reload current page
    await loadArchivedClients(currentPage, searchQuery);
    updateArchiveResults();
    return true;
  } catch (err) {
    console.error('Restore client error:', err);
    toast(disp('Xatolik yuz berdi'));
    return false;
  }
}

// ============================================================================
// ARCHIVED PRODUCTS - LOAD & RENDER
// ============================================================================

async function loadArchivedProducts(page = 1, search = '') {
  if (isLoading) return false;
  isLoading = true;
  
  try {
    const params = new URLSearchParams({
      page: page,
      page_size: PAGE_SIZE,
      ...(search && { search })
    });
    
    const res = await fetch(`/archive/api/products/?${params}`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load archived products');
    
    const data = await res.json();
    if (data.success) {
      productsCache = data.products;
      totalPages = data.pagination.total_pages;
      currentPage = data.pagination.page;
      return true;
    }
    return false;
  } catch (err) {
    console.error('Load archived products error:', err);
    toast(disp('Arxivlangan tovarlarni yuklashda xatolik'));
    return false;
  } finally {
    isLoading = false;
  }
}

function renderArchivedProducts() {
  const products = productsCache;
  
  $('#archiveContainer').innerHTML = `
    <div class="card">
      ${products.length ? `
        <table class="stack">
          <thead>
            <tr>
              <th>${t('base.colName')}</th>
              <th>${t('arch.date')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td class="who">
                  <b>${esc(disp(p.name))}</b>
                </td>
                <td class="hm">${new Date(p.created_at).toLocaleDateString('ru-RU')}</td>
                <td class="r acts">
                  <button class="btn sm primary" data-restore-product="${p.id}" data-product-name="${esc(p.name)}">${t('arch.restoreBtn')}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : empty(t('arch.noProducts'), t('arch.emptyHint'))}
    </div>
    ${totalPages > 1 ? renderPagination() : ''}
  `;
  
  // Restore buttons
  document.querySelectorAll('[data-restore-product]').forEach(btn => {
    btn.onclick = async () => {
      const productId = parseInt(btn.dataset.restoreProduct);
      const productName = btn.dataset.productName;
      if (await ask(t('arch.restore'), t('arch.restoreProduct', {n: productName}))) {
        await restoreProduct(productId);
      }
    };
  });
  
  // Pagination
  attachPaginationHandlers();
}

async function restoreProduct(productId) {
  try {
    const res = await fetch(`/archive/api/products/${productId}/restore/`, {
      method: 'POST',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      toast(disp(data.error || 'Xatolik yuz berdi'));
      return false;
    }
    
    toast(disp(data.message || 'Tovar qayta tiklandi'));
    
    // Reload current page
    await loadArchivedProducts(currentPage, searchQuery);
    updateArchiveResults();
    return true;
  } catch (err) {
    console.error('Restore product error:', err);
    toast(disp('Xatolik yuz berdi'));
    return false;
  }
}

// ============================================================================
// PAGINATION
// ============================================================================

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

function attachPaginationHandlers() {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.onclick = () => {
      const newPage = parseInt(btn.dataset.page);
      if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        viewArchive();
      }
    };
  });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function renderPage() {
  // Ensure variables are initialized
  if (!currentPage || isNaN(currentPage)) currentPage = 1;
  if (!totalPages || isNaN(totalPages)) totalPages = 1;
  if (!archiveTab) archiveTab = 'debts';
  if (!searchQuery) searchQuery = '';
  
  viewArchive();
}

if (bootShell('archive')) renderPage();
