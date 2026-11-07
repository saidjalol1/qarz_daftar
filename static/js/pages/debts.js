'use strict';

// State management
let currentFilter = 'all'; // all, open, closed
let currentDateFilter = 'all'; // all, today, week, month
let searchQuery = '';
let currentPage = 1;
const PAGE_SIZE = 20;
let totalPages = 1;
let isLoading = false;

// Cache for recent data
let cachedGroups = [];
let cachedSummary = {};

// Cache for clients and products (for selects)
let clientsCache = [];
let productsCache = [];

// Current debt being viewed
let currentDebt = null;

// ============================================================================
// MAIN VIEW - LIST DEBTS GROUPED BY CLIENT
// ============================================================================

async function viewDebts() {
  currentDebt = null; // Clear current debt when viewing list
  await loadDebts();
}

async function loadDebts() {
  if (isLoading) return;
  isLoading = true;
  
  // Save currently open groups before re-rendering
  const openGroups = [];
  document.querySelectorAll('.arch-g:not(.closed)').forEach(g => {
    openGroups.push(g.id);
  });
  if (openGroups.length > 0) {
    sessionStorage.setItem('qd_open_groups', JSON.stringify(openGroups));
  }
  
  try {
    const params = new URLSearchParams({
      page: currentPage,
      page_size: PAGE_SIZE,
      status: currentFilter,
      date_filter: currentDateFilter,
      ...(searchQuery && { search: searchQuery })
    });
    
    const res = await fetch(`/debts/api/?${params}`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load debts');
    
    const data = await res.json();
    if (data.success) {
      cachedGroups = data.groups;
      cachedSummary = data.summary;
      renderDebtsList(data.groups, data.summary, data.pagination);
    }
  } catch (err) {
    console.error('Load debts error:', err);
    toast(disp('Qarzlarni yuklashda xatolik'));
  } finally {
    isLoading = false;
  }
}

function renderDebtsList(groups, summary, pagination) {
  totalPages = pagination.total_pages;
  currentPage = pagination.page;
  
  // Convert summary totals from their native currencies to display currency
  // Summary already aggregates across all currencies, but we need to ensure proper conversion
  const displayTotalLeft = parseFloat(summary.total_left);
  const displayTotalPaid = parseFloat(summary.total_paid);
  
  $('#view').innerHTML = `
    <div class="head">
      <div>
        <h2>${t('debts.title')}</h2>
        <p>${t('debts.sub')}</p>
      </div>
      ${can('add') ? `<button class="btn primary" id="addDebt">${t('debts.add')}</button>` : ''}
    </div>
    
    <div class="sum">
      <div class="big">
        <small>${t('debts.left')}</small>
        <strong>${money(displayTotalLeft)} ${unit()}</strong>
      </div>
      <div>
        <small>${t('debts.paid')}</small>
        <strong>${money(displayTotalPaid)} ${unit()}</strong>
      </div>
      <div>
        <small>${t('debts.debtors')}</small>
        <strong>${summary.debtors_count}</strong>
      </div>
    </div>
    
    <div class="tools">
      <input class="input" id="debtSearch" placeholder="${esc(t('debts.search'))}" value="${esc(searchQuery)}">
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-left: auto;">
        <div class="tabs">
          <button data-filter="all" class="${currentFilter === 'all' ? 'on' : ''}">${t('debts.all')}</button>
          <button data-filter="open" class="${currentFilter === 'open' ? 'on' : ''}">${t('debts.open')}</button>
          <button data-filter="closed" class="${currentFilter === 'closed' ? 'on' : ''}">${t('debts.closed')}</button>
        </div>
        <div class="tabs">
          <button data-date="all" class="${currentDateFilter === 'all' ? 'on' : ''}">${t('date.all')}</button>
          <button data-date="today" class="${currentDateFilter === 'today' ? 'on' : ''}">${t('date.today')}</button>
          <button data-date="week" class="${currentDateFilter === 'week' ? 'on' : ''}">${t('date.week')}</button>
          <button data-date="month" class="${currentDateFilter === 'month' ? 'on' : ''}">${t('date.month')}</button>
        </div>
      </div>
    </div>
    
    <div id="debtsContainer">
      ${groups.length ? groups.map(g => renderClientGroup(g)).join('') : `
        <div class="card">${empty(t('debts.empty'), currentDateFilter !== 'all' ? t('date.empty') : t('debts.emptyHint'))}</div>
      `}
    </div>
    
    ${totalPages > 1 ? renderPagination() : ''}
  `;
  
  // Add debt button
  if (can('add')) {
    $('#addDebt').onclick = () => showDebtForm();
  }
  
  // Search
  const searchInput = $('#debtSearch');
  let searchTimeout;
  searchInput.oninput = e => {
    const cursorPos = e.target.selectionStart;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      searchQuery = e.target.value;
      currentPage = 1;
      await loadDebts();
      // Restore focus and cursor position
      const newSearchInput = $('#debtSearch');
      if (newSearchInput) {
        newSearchInput.focus();
        newSearchInput.setSelectionRange(cursorPos, cursorPos);
      }
    }, 300);
  };
  
  // Status filter tabs
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.onclick = () => {
      currentFilter = btn.dataset.filter;
      currentPage = 1;
      loadDebts();
    };
  });
  
  // Date filter tabs
  document.querySelectorAll('[data-date]').forEach(btn => {
    btn.onclick = () => {
      currentDateFilter = btn.dataset.date;
      currentPage = 1;
      loadDebts();
    };
  });
  
  // Pagination
  document.querySelectorAll('[data-page]').forEach(b => {
    b.onclick = () => {
      const newPage = parseInt(b.dataset.page);
      if (!isNaN(newPage) && newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        loadDebts();
      }
    };
  });
  
  // Initialize all groups as CLOSED by default
  document.querySelectorAll('.arch-g').forEach(g => {
    g.classList.add('closed');
  });
  
  // Restore previously opened groups (from currency toggle or other re-renders)
  const openGroups = sessionStorage.getItem('qd_open_groups');
  if (openGroups) {
    try {
      const openGroupIds = JSON.parse(openGroups);
      openGroupIds.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (group) {
          group.classList.remove('closed');
        }
      });
    } catch (e) {
      console.error('Error restoring open groups:', e);
    }
  }
  
  // Check if we need to auto-open a specific client's group (after adding new debt)
  const openClientId = sessionStorage.getItem('qd_open_client');
  if (openClientId) {
    const groupToOpen = document.getElementById(`group-${openClientId}`);
    if (groupToOpen) {
      groupToOpen.classList.remove('closed');
    }
    // Clear the stored client ID
    sessionStorage.removeItem('qd_open_client');
  }
}

function renderClientGroup(group) {
  const client = group.client;
  
  // Check if client has mixed currencies
  const currencies = [...new Set(group.debts.map(d => d.currency || 'uzs'))];
  const hasMixedCurrencies = currencies.length > 1;
  
  // Calculate totals - if mixed, convert to display currency
  let totalAmount = 0;
  let paidAmount = 0;
  let leftAmount = 0;
  let summaryCurrency = displayCur;
  
  if (!hasMixedCurrencies) {
    // Single currency - use native currency
    summaryCurrency = currencies[0];
    group.debts.forEach(d => {
      totalAmount += parseFloat(d.total);
      paidAmount += parseFloat(d.paid);
      leftAmount += parseFloat(d.left);
    });
  } else {
    // Mixed currencies - convert all to display currency for summary
    group.debts.forEach(d => {
      const debtCurrency = d.currency || 'uzs';
      totalAmount += convert(parseFloat(d.total), debtCurrency, displayCur);
      paidAmount += convert(parseFloat(d.paid), debtCurrency, displayCur);
      leftAmount += convert(parseFloat(d.left), debtCurrency, displayCur);
    });
  }
  
  const isPaid = leftAmount <= 0;
  const groupId = `group-${client.id}`;
  
  // Create a fake debt object for statusPill
  const groupDebt = {
    total: totalAmount,
    payments: [{ amount: paidAmount }]
  };
  
  return `
    <div class="card arch-g" id="${groupId}" data-client-id="${client.id}">
      <button class="arch-h" type="button" onclick="toggleGroup('${groupId}')">
        <div class="who">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px;">
            <b>${esc(disp(client.name))}</b>
            ${statusPill(groupDebt)}
          </div>
          <span>${esc(client.phone)}${client.telegram ? ' • @' + esc(client.telegram) : ''}</span>
        </div>
        <div class="arch-meta">
          <div style="font-size: 0.85rem; white-space: nowrap;">
            ${t('arch.count', {n: group.debts.length})}
          </div>
        </div>
        <span class="chev">▼</span>
      </button>
      <div class="arch-body">
        <div style="padding: 0 16px 12px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; padding: 12px; background: #F6F8FA; border-radius: 8px; position: relative;">
            ${hasMixedCurrencies ? `<div style="position: absolute; top: 4px; right: 8px; font-size: 0.7rem; color: var(--warn); background: #FFF9E6; padding: 2px 6px; border-radius: 4px;">≈ ${disp('hisoblangan')}</div>` : ''}
            <div>
              <small style="color: var(--muted); font-size: 0.75rem;">${t('debts.colTotal')}</small>
              <div style="font-weight: 600;">${money(totalAmount, summaryCurrency)} ${unit(summaryCurrency)}</div>
            </div>
            <div>
              <small style="color: var(--muted); font-size: 0.75rem;">${t('debts.paid')}</small>
              <div style="font-weight: 600; color: var(--success);">${money(paidAmount, summaryCurrency)} ${unit(summaryCurrency)}</div>
            </div>
            <div>
              <small style="color: var(--muted); font-size: 0.75rem;">${t('debts.colLeft')}</small>
              <div style="font-weight: 600; color: ${isPaid ? 'var(--success)' : 'var(--danger)'};">${money(leftAmount, summaryCurrency)} ${unit(summaryCurrency)}</div>
            </div>
          </div>
          ${group.debts.map(d => renderDebtRow(d)).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderDebtRow(d) {
  const debtCurrency = d.currency || 'uzs';
  const leftInNative = parseFloat(d.left);
  const isPaid = leftInNative <= 0;
  
  return `
    <div class="nak" style="margin-bottom: 8px;">
      <div class="nak-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
          <strong style="color: var(--brand); font-size: 1rem; white-space: nowrap;">№${d.number}</strong>
          <span style="color: var(--muted); font-size: 0.85rem;">${new Date(d.issued_at).toLocaleDateString('ru-RU')}</span>
        </div>
        <strong style="font-size: 1rem; white-space: nowrap;">${money(leftInNative, debtCurrency)} ${unit(debtCurrency)}</strong>
      </div>
      <div class="nak-row debt-actions" style="margin-top: 8px; gap: 8px; display: flex; flex-wrap: wrap; justify-content: flex-end;">
        <button class="btn sm" type="button" onclick="viewDebtDetail(${d.id})">${t('nak.title', {n: d.number})}</button>
        ${(can('super') || can('manager')) ? `<button class="btn sm danger" type="button" onclick="archiveDebt(${d.id})">${t('nak.archive')}</button>` : ''}
      </div>
    </div>
  `;
}

window.toggleGroup = function(groupId) {
  const group = document.getElementById(groupId);
  if (group) {
    group.classList.toggle('closed');
    
    // Save the state of all open groups to sessionStorage
    const openGroups = [];
    document.querySelectorAll('.arch-g:not(.closed)').forEach(g => {
      openGroups.push(g.id);
    });
    sessionStorage.setItem('qd_open_groups', JSON.stringify(openGroups));
  }
};

function renderPagination() {
  const maxVisible = 5;
  let pages = [];
  
  pages.push(1);
  
  let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages - 1, start + maxVisible - 1);
  start = Math.max(2, end - maxVisible + 1);
  
  if (start > 2) pages.push('...');
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  if (end < totalPages - 1) pages.push('...');
  
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

// ============================================================================
// DEBT DETAIL VIEW (NAKLADNOY)
// ============================================================================

async function viewDebtDetail(debtId) {
  try {
    const res = await fetch(`/debts/api/${debtId}/`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load debt');
    
    const data = await res.json();
    if (data.success) {
      currentDebt = data.debt;
      renderDebtDetail(data.debt);
    }
  } catch (err) {
    console.error('Load debt detail error:', err);
    toast(disp('Qarz ma\'lumotlarini yuklashda xatolik'));
  }
}

function renderDebtDetail(debt) {
  const debtCurrency = debt.currency || 'uzs';
  const totalInNative = parseFloat(debt.total);
  const paidInNative = parseFloat(debt.paid);
  const leftInNative = parseFloat(debt.left);
  
  // Show amounts in NATIVE currency (don't convert)
  const isPaid = leftInNative <= 0;
  
  $('#view').innerHTML = `
    <div class="head">
      <div>
        <h2>${t('nak.title', {n: debt.number})}</h2>
        <p>${disp(debt.client.name)} • ${new Date(debt.issued_at).toLocaleDateString('ru-RU')}</p>
      </div>
      <button class="btn" id="backBtn">← ${t('debts.title')}</button>
    </div>
    
    <div class="card" style="margin-bottom: 16px;">
      <div style="padding: 16px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
          <div>
            <small style="color: var(--muted);">${t('nak.client')}</small>
            <div style="font-weight: 600;">${esc(disp(debt.client.name))}</div>
          </div>
          <div>
            <small style="color: var(--muted);">${t('nak.phone')}</small>
            <div>${esc(debt.client.phone)}</div>
          </div>
          ${debt.client.telegram ? `<div>
            <small style="color: var(--muted);">${t('nak.tg')}</small>
            <div>@${esc(debt.client.telegram)}</div>
          </div>` : ''}
          <div>
            <small style="color: var(--muted);">${t('nak.date')}</small>
            <div>${new Date(debt.issued_at).toLocaleString('ru-RU')}</div>
          </div>
          <div>
            <small style="color: var(--muted);">${t('nak.native')}</small>
            <div>${unit(debtCurrency)}</div>
          </div>
        </div>
        ${debt.items.length > 0 ? `
          <div style="margin-top: 20px;">
            <div style="margin-bottom: 16px;">
              <h4 style="margin: 0; font-size: 1rem; font-weight: 600;">${t('debt.items')}</h4>
            </div>
            <div id="debtItemsList">
              ${debt.items.map((item, idx) => {
                // Show prices in NATIVE currency
                const priceInNative = parseFloat(item.price);
                const lineSumInNative = parseFloat(item.line_sum);
                const boxes = parseInt(item.boxes) || 0;
                const qtyDisplay = Math.round(item.qty || 0); // Remove decimals from dona
                return `
                  <div class="debt-item" data-item-idx="${idx}" style="display: grid; grid-template-columns: 1fr auto; gap: 12px; padding: 12px; background: #F6F8FA; border-radius: 8px; margin-bottom: 10px;">
                    <div>
                      <div style="font-weight: 600; margin-bottom: 6px; font-size: 0.95rem;">${esc(disp(item.name))}</div>
                      <div style="font-size: 0.85rem; color: var(--muted);">
                        ${money(priceInNative, debtCurrency)} ${unit(debtCurrency)} × ${qtyDisplay} ${disp('dona')}${boxes > 0 ? ` (${boxes} ${disp('qop')})` : ''}
                      </div>
                    </div>
                    <div style="text-align: right; align-self: center;">
                      <div style="font-weight: 600; font-size: 1.05rem;">${money(lineSumInNative, debtCurrency)} ${unit(debtCurrency)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : `<div style="padding: 16px; text-align: center; color: var(--muted); margin-top: 16px;">${t('nak.noItems')}</div>`}
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 24px; padding-top: 20px; border-top: 2px solid var(--line);">
          <div>
            <small style="color: var(--muted); font-size: 0.85rem;">${t('debts.colTotal')}</small>
            <div style="font-size: 1.3rem; font-weight: 700; margin-top: 4px;">${money(totalInNative, debtCurrency)} ${unit(debtCurrency)}</div>
          </div>
          <div>
            <small style="color: var(--muted); font-size: 0.85rem;">${t('debts.paid')}</small>
            <div style="font-size: 1.3rem; font-weight: 700; color: var(--success); margin-top: 4px;">${money(paidInNative, debtCurrency)} ${unit(debtCurrency)}</div>
          </div>
          <div>
            <small style="color: var(--muted); font-size: 0.85rem;">${t('nak.left')}</small>
            <div style="font-size: 1.3rem; font-weight: 700; color: ${isPaid ? 'var(--success)' : 'var(--danger)'}; margin-top: 4px;">${money(leftInNative, debtCurrency)} ${unit(debtCurrency)}</div>
          </div>
        </div>
      </div>
    </div>
    
    ${debt.payments.length > 0 ? `
      <div class="card" style="margin-bottom: 16px;">
        <div style="padding: 16px;">
          <h3 style="margin: 0 0 16px 0; font-size: 1.1rem; font-weight: 600;">${t('nak.payments')}</h3>
          <div class="payment-list">
            ${debt.payments.map(p => {
              const amountInNative = parseFloat(p.amount);
              return `
                <div class="payment-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #F6F8FA; border-radius: 8px; margin-bottom: 10px;">
                  <div>
                    <div style="font-size: 0.9rem; color: var(--ink); margin-bottom: 4px; font-weight: 500;">${new Date(p.paid_at).toLocaleDateString('ru-RU')}</div>
                    <div style="font-size: 0.85rem; color: var(--muted);">${new Date(p.paid_at).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-weight: 600; font-size: 1.1rem; color: var(--success);">${money(amountInNative, debtCurrency)} ${unit(debtCurrency)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    ` : `<div class="card" style="margin-bottom: 16px;"><div style="padding: 16px; text-align: center; color: var(--muted);">${t('nak.noPay')}</div></div>`}
    
    <div class="card">
      <div style="padding: 16px; display: flex; gap: 10px; flex-wrap: wrap;">
        ${!isPaid ? `<button class="btn primary" id="addPaymentBtn" style="flex: 1; min-width: 200px;">${t('nak.takePay')}</button>` : ''}
        <button class="btn" id="downloadPdfBtn" style="flex: 1; min-width: 200px;">📄 ${t('nak.pdf')}</button>
        ${(can('super') || can('manager')) ? `<button class="btn danger" id="deleteDebtBtn" style="flex: 1; min-width: 200px;">🗑️ ${disp("To'liq o'chirish")}</button>` : ''}
      </div>
    </div>
  `;
  
  $('#backBtn').onclick = () => viewDebts();
  
  if (!isPaid && $('#addPaymentBtn')) {
    $('#addPaymentBtn').onclick = () => showPaymentForm(debt);
  }
  
  // PDF download button
  if ($('#downloadPdfBtn')) {
    $('#downloadPdfBtn').onclick = () => generatePDF(debt);
  }
  
  // Delete button (for both paid and unpaid debts)
  if ($('#deleteDebtBtn')) {
    $('#deleteDebtBtn').onclick = () => deleteDebtPermanently(debt.id, isPaid);
  }
}

// ============================================================================
// EDIT DEBT
// ============================================================================

window.editDebt = async function(debtId) {
  try {
    const res = await fetch(`/debts/api/${debtId}/`, {
      method: 'GET',
      headers: { 'X-CSRFToken': getCsrf() },
      credentials: 'same-origin'
    });
    
    if (!res.ok) throw new Error('Failed to load debt');
    
    const data = await res.json();
    if (data.success) {
      showEditDebtForm(data.debt);
    }
  } catch (err) {
    console.error('Load debt for edit error:', err);
    toast(disp('Qarz ma\'lumotlarini yuklashda xatolik'));
  }
};

function showEditDebtForm(debt) {
  modal(t('debt.editTitle'), `
    <div class="field">
      <label>${t('debt.debtor')}</label>
      <input class="input" value="${esc(disp(debt.client.name))}" disabled>
    </div>
    
    <div class="field">
      <label>${t('debt.datetime')}</label>
      <input class="input" type="datetime-local" id="editDebtDate" value="${debt.issued_at.slice(0, 16)}">
    </div>
    
    <div class="field">
      <label>${t('debt.sum')}</label>
      <input class="input" type="number" id="editDebtTotal" min="${debt.paid}" step="0.01" value="${debt.total}">
      <small style="color: var(--muted);">${disp('To\'langan')}: ${debt.paid} ${unit(debt.currency)}</small>
    </div>
    
    <div class="err" id="editDebtErr"></div>
  `, `<button class="btn" type="button" data-x>${t('debt.cancel')}</button><button class="btn primary" type="button" id="saveEditDebt">${t('debt.save')}</button>`, true);
  
  $('#saveEditDebt').onclick = () => saveEditDebt(debt.id);
}

async function saveEditDebt(debtId) {
  toast(disp('Bu funksiya hali ishlab chiqilmoqda'));
  closeModal();
}

// ============================================================================
// ARCHIVE DEBT
// ============================================================================

window.archiveDebt = async function(debtId) {
  // Confirmation message - same for all debts (all are archived, not deleted)
  const confirmMsg = disp(t('arch.confirm'));
  
  const confirmed = await ask(disp('Tasdiqlash'), confirmMsg);
  if (!confirmed) return;
  
  try {
    // Archive the debt (backend always archives, never permanently deletes)
    const archiveRes = await fetch(`/debts/api/${debtId}/delete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin'
    });
    
    const archiveData = await archiveRes.json();
    
    if (!archiveRes.ok || !archiveData.success) {
      toast(disp(archiveData.error || 'Xatolik yuz berdi'));
      return;
    }
    
    toast(disp(t('arch.done')));
    viewDebts();
    
  } catch (err) {
    console.error('Archive debt error:', err);
    toast(disp('Xatolik yuz berdi'));
  }
};

// Permanent delete for paid and unpaid debts
window.deleteDebtPermanently = async function(debtId, isPaid) {
  const confirmMsg = isPaid 
    ? disp("To'liq to'langan qarz butunlay o'chiriladi va uni qayta tiklab bo'lmaydi. Davom etasizmi?")
    : disp("⚠️ OGOHLANTIRISH! Bu qarz hali to'lanmagan. Qarzni o'chirish barcha to'lovlar va ma'lumotlarni butunlay yo'q qiladi va uni qayta tiklab bo'lmaydi. Rostdan ham davom etasizmi?");
  
  const confirmed = await ask(disp('⚠️ Ogohlantirish'), confirmMsg);
  if (!confirmed) return;
  
  try {
    const deleteRes = await fetch(`/debts/api/${debtId}/permanent-delete/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify({ force: !isPaid })
    });
    
    const deleteData = await deleteRes.json();
    
    if (!deleteRes.ok || !deleteData.success) {
      toast(disp(deleteData.error || 'Xatolik yuz berdi'));
      return;
    }
    
    toast(disp("Qarz butunlay o'chirildi"));
    viewDebts();
    
  } catch (err) {
    console.error('Permanent delete error:', err);
    toast(disp('Xatolik yuz berdi'));
  }
};

// ============================================================================
// CREATE DEBT FORM
// ============================================================================

async function showDebtForm() {
  // Load clients and products for selects
  await Promise.all([loadClientsForSelect(), loadProductsForSelect()]);
  
  modal(t('debt.new'), `
    <div class="field">
      <label>${t('debt.debtor')}</label>
      <input class="input" list="clientsList" id="debtClient" placeholder="${disp('Ism, telefon yoki username bo\'yicha qidirish')}" autocomplete="off">
      <datalist id="clientsList">
        ${clientsCache.map(c => `<option value="${esc(disp(c.name))}" data-id="${c.id}">${esc(c.phone)}</option>`).join('')}
      </datalist>
    </div>
    
    <div class="field">
      <label>${t('debt.datetime')}</label>
      <input class="input" type="datetime-local" id="debtDate" value="${nowISO().slice(0, 16)}">
    </div>
    
    <div class="field">
      <label>
        <input type="checkbox" id="debtManual"> ${t('debt.manual')}
      </label>
    </div>
    
    <div id="itemsSection">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label>${t('debt.items')}</label>
        <button class="btn sm" type="button" id="addItemBtn">+ ${t('debt.addItem')}</button>
      </div>
      <div id="debtItems"></div>
    </div>
    
    <div id="manualSection" style="display: none;">
      <div class="field">
        <label>${t('debt.sum')}</label>
        <input class="input" type="number" id="debtTotal" min="0" step="0.01" value="0">
      </div>
    </div>
    
    <div class="field">
      <label>${t('debt.currency')}</label>
      <select class="input" id="debtCurrency">
        <option value="uzs">${t('cur.uzs')}</option>
        <option value="usd">${t('cur.usd')}</option>
      </select>
    </div>
    
    <div style="padding: 12px; background: var(--bg); border-radius: 6px; margin-top: 16px;">
      <strong>${t('debt.total')}: <span id="debtTotalDisplay">0 ${unit()}</span></strong>
    </div>
    
    <div class="err" id="debtErr"></div>
  `, `<button class="btn" type="button" data-x>${t('debt.cancel')}</button><button class="btn primary" type="button" id="saveDebt">${t('debt.save')}</button>`, true);
  
  // Setup searchable client input
  setupSearchableInput('debtClient', 'clientsList', clientsCache, 'client');
  
  // Manual mode toggle
  $('#debtManual').onchange = e => {
    const isManual = e.target.checked;
    $('#itemsSection').style.display = isManual ? 'none' : 'block';
    $('#manualSection').style.display = isManual ? 'block' : 'none';
    updateTotal();
  };
  
  // Currency change - update total display
  $('#debtCurrency').onchange = () => updateTotal();
  
  // Add item button
  $('#addItemBtn').onclick = () => addDebtItem();
  
  // Add first item by default
  addDebtItem();
  
  // Manual total change
  $('#debtTotal').oninput = () => updateTotal();
  
  // Save button
  $('#saveDebt').onclick = () => saveDebt();
}

let debtItemCounter = 0;

function addDebtItem() {
  const itemId = ++debtItemCounter;
  const itemsDiv = $('#debtItems');
  
  const itemHtml = `
    <div class="item" id="item-${itemId}" style="background: var(--bg); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
      <div class="field">
        <label>${t('debt.product')}</label>
        <input class="input item-product" list="productsList-${itemId}" data-item="${itemId}" id="product-${itemId}" placeholder="${esc(disp('Tovar nomini kiriting'))}" autocomplete="off">
        <datalist id="productsList-${itemId}">
          ${productsCache.map(p => `<option value="${esc(disp(p.name))}" data-id="${p.id}"></option>`).join('')}
        </datalist>
      </div>
      <div class="field">
        <label>${t('debt.price')}</label>
        <input class="input item-price" type="number" min="0" step="0.01" data-item="${itemId}" value="0">
      </div>
      <div class="field">
        <label>${t('debt.boxes')}</label>
        <input class="input item-boxes" type="number" min="0" data-item="${itemId}" value="0">
      </div>
      <div class="field">
        <label>${t('debt.qty')}</label>
        <input class="input item-qty" type="number" min="0" step="0.01" data-item="${itemId}" value="1">
      </div>
      <div class="field" style="display: flex; align-items: flex-end;">
        <button class="btn danger" type="button" onclick="removeDebtItem(${itemId})" style="width: 100%; justify-content: center;">${disp(t('debt.remove'))}</button>
      </div>
    </div>
  `;
  
  itemsDiv.insertAdjacentHTML('beforeend', itemHtml);
  
  // Setup searchable product input
  setupSearchableInput(`product-${itemId}`, `productsList-${itemId}`, productsCache, 'product');
  
  // Add listeners
  document.querySelectorAll(`[data-item="${itemId}"]`).forEach(el => {
    el.oninput = () => updateTotal();
    el.onchange = () => updateTotal();
  });
}

window.removeDebtItem = function(itemId) {
  const item = $(`#item-${itemId}`);
  if (item) item.remove();
  updateTotal();
};

function updateTotal() {
  const isManual = $('#debtManual').checked;
  const currency = $('#debtCurrency') ? $('#debtCurrency').value : 'uzs';
  let total = 0;
  
  if (isManual) {
    total = parseFloat($('#debtTotal').value) || 0;
  } else {
    document.querySelectorAll('.item-price').forEach(priceInput => {
      const itemId = priceInput.dataset.item;
      const price = parseFloat(priceInput.value) || 0;
      const qty = parseFloat($(`.item-qty[data-item="${itemId}"]`).value) || 0;
      total += price * qty;
    });
  }
  
  // Display total in the DEBT'S currency, not the platform display currency
  $('#debtTotalDisplay').textContent = `${money(total, currency)} ${unit(currency)}`;
}

async function saveDebt() {
  const clientInput = $('#debtClient');
  const clientId = parseInt(clientInput.dataset.selectedId);
  const issuedAt = $('#debtDate').value;
  const isManual = $('#debtManual').checked;
  const currency = $('#debtCurrency').value;
  
  // Validation
  if (!clientId) {
    $('#debtErr').textContent = disp(t('debt.needClient'));
    return;
  }
  
  if (!issuedAt) {
    $('#debtErr').textContent = disp(t('debt.needSum'));
    return;
  }
  
  let debtData = {
    client_id: clientId,
    issued_at: issuedAt,
    manual: isManual,
    currency: currency
  };
  
  if (isManual) {
    const total = parseFloat($('#debtTotal').value) || 0;
    if (total <= 0) {
      $('#debtErr').textContent = disp(t('debt.needSum'));
      return;
    }
    debtData.total = total;
  } else {
    // Collect items
    const items = [];
    document.querySelectorAll('.item').forEach(itemDiv => {
      const itemId = itemDiv.id.split('-')[1];
      const productInput = $(`#product-${itemId}`);
      const productId = parseInt(productInput.dataset.selectedId) || null;
      const productName = productInput.value || '';
      const price = parseFloat($(`.item-price[data-item="${itemId}"]`).value) || 0;
      const boxes = parseInt($(`.item-boxes[data-item="${itemId}"]`).value) || 0;
      const qty = parseFloat($(`.item-qty[data-item="${itemId}"]`).value) || 0;
      
      if (price > 0 && qty > 0) {
        items.push({
          product_id: productId,
          name: productName,
          price: price,
          boxes: boxes,
          qty: qty
        });
      }
    });
    
    if (items.length === 0) {
      $('#debtErr').textContent = disp(t('debt.needSum'));
      return;
    }
    
    debtData.items = items;
  }
  
  try {
    const res = await fetch('/debts/api/create/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify(debtData)
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      $('#debtErr').textContent = disp(data.error || 'Xatolik yuz berdi');
      return;
    }
    
    closeModal();
    toast(disp(t('debt.added')));
    
    // Store the client ID to auto-open their group after reload
    sessionStorage.setItem('qd_open_client', clientId);
    
    viewDebts();
  } catch (err) {
    console.error('Create debt error:', err);
    $('#debtErr').textContent = disp('Xatolik yuz berdi');
  }
}

// ============================================================================
// ADD PAYMENT FORM
// ============================================================================

function showPaymentForm(debt) {
  const debtCurrency = debt.currency || 'uzs';
  const leftInNative = parseFloat(debt.left);
  
  modal(t('nak.takePay'), `
    <div class="field">
      <label>${t('debt.currency')}</label>
      <select class="input" id="payCurrency">
        <option value="uzs" ${debtCurrency === 'uzs' ? 'selected' : ''}>${t('cur.uzs')}</option>
        <option value="usd" ${debtCurrency === 'usd' ? 'selected' : ''}>${t('cur.usd')}</option>
      </select>
      <small style="color: var(--muted);">${disp('Qarz valyutasi')}: <strong>${money(leftInNative, debtCurrency)} ${unit(debtCurrency)}</strong></small>
    </div>
    
    <div class="field">
      <label>${t('nak.payAmt')}</label>
      <input class="input" type="number" id="payAmount" min="0" step="0.01" value="">
      <small style="color: var(--muted); display: block; margin-top: 4px;" id="payLeftHint"></small>
    </div>
    
    <div class="field">
      <label>${t('debt.datetime')}</label>
      <input class="input" type="datetime-local" id="payDate" value="${nowISO().slice(0, 16)}">
    </div>
    
    <div class="err" id="payErr"></div>
  `, `<button class="btn" data-x>${t('debt.cancel')}</button><button class="btn primary" id="savePayment">${t('debt.save')}</button>`);
  
  // Update hint when currency changes
  const updatePaymentHint = () => {
    const payCurrency = $('#payCurrency').value;
    if (payCurrency === debtCurrency) {
      // Same currency - no conversion needed
      $('#payLeftHint').innerHTML = `<span style="color: var(--success);">✓ ${disp('To\'g\'ridan-to\'g\'ri to\'lov')}</span>`;
    } else {
      // Different currency - show conversion
      const convertedLeft = convert(leftInNative, debtCurrency, payCurrency);
      const rate = usdRate();
      const rateText = `1 $ = ${money(rate, 'uzs')} ${unit('uzs')}`;
      $('#payLeftHint').innerHTML = `${disp('Qoldiq')}: <strong>${money(convertedLeft, payCurrency)} ${unit(payCurrency)}</strong><br><small style="color: var(--muted); font-size: 0.85em;">${disp('Kurs')}: ${rateText}</small>`;
    }
  };
  
  $('#payCurrency').onchange = updatePaymentHint;
  updatePaymentHint(); // Initialize hint
  
  $('#savePayment').onclick = async () => {
    const payCurrency = $('#payCurrency').value;
    const paymentAmount = parseFloat($('#payAmount').value) || 0;
    const paidAt = $('#payDate').value;
    
    if (paymentAmount <= 0) {
      $('#payErr').textContent = disp(t('nak.needPay'));
      return;
    }
    
    // Convert payment to debt's native currency for validation
    const paymentInDebtCurrency = convert(paymentAmount, payCurrency, debtCurrency);
    
    if (paymentInDebtCurrency > leftInNative) {
      $('#payErr').textContent = disp(`${t('nak.overPay', {s: money(leftInNative, debtCurrency) + ' ' + unit(debtCurrency)})}. ${disp('Siz kiritgan')}: ${money(paymentInDebtCurrency, debtCurrency)} ${unit(debtCurrency)}`);
      return;
    }
    
    try {
      const res = await fetch(`/debts/api/${debt.id}/payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrf()
        },
        credentials: 'same-origin',
        body: JSON.stringify({ 
          amount: paymentInDebtCurrency, // Always send in debt's currency
          paid_at: paidAt,
          currency: debtCurrency // Include currency for clarity
        })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        $('#payErr').textContent = disp(data.error || 'Xatolik yuz berdi');
        return;
      }
      
      closeModal();
      toast(disp(t('nak.paidOk')));
      
      if (data.auto_archived) {
        toast(disp(t('arch.auto')));
        viewDebts();
      } else {
        viewDebtDetail(debt.id);
      }
    } catch (err) {
      console.error('Add payment error:', err);
      $('#payErr').textContent = disp('Xatolik yuz berdi');
    }
  };
}

// ============================================================================
// PDF GENERATION
// ============================================================================

let pdfFontB64 = null;

async function loadPdfFont(doc) {
  if (!pdfFontB64) {
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf');
      if (!res.ok) throw new Error('font');
      const buf = new Uint8Array(await res.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      }
      pdfFontB64 = btoa(bin);
    } catch (error) {
      throw new Error('Font loading failed');
    }
  }
  doc.addFileToVFS('DejaVuSans.ttf', pdfFontB64);
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.setFont('DejaVu');
}

async function generatePDF(debt) {
  // Check if jsPDF library is loaded
  if (!window.jspdf) {
    toast(disp(t('pdf.fail')));
    return;
  }
  
  try {
    const doc = new window.jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Load custom font for Unicode support
    try {
      await loadPdfFont(doc);
    } catch (fontError) {
      toast(disp(t('pdf.font')));
      return;
    }
    
    const debtCurrency = debt.currency || 'uzs';
    const totalInNative = parseFloat(debt.total);
    const paidInNative = parseFloat(debt.paid);
    const leftInNative = parseFloat(debt.left);
    
    // Header with brand color
    doc.setFillColor(14, 59, 67);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255);
    doc.setFontSize(18);
    doc.text(disp(t('pdf.title', { n: debt.number })), 14, 18);
    doc.setFontSize(10);
    doc.text(disp(t('pdf.brand')), pageWidth - 14, 18, { align: 'right' });
    
    // Client information
    doc.setTextColor(20, 32, 43);
    doc.setFontSize(11);
    let yPos = 40;
    doc.text(`${disp(t('nak.client'))}: ${disp(debt.client.name)}`, 14, yPos);
    yPos += 7;
    doc.text(`${disp(t('nak.phone'))}: ${debt.client.phone}`, 14, yPos);
    
    if (debt.client.telegram) {
      yPos += 7;
      doc.text(`${disp(t('nak.tg'))}: @${debt.client.telegram}`, 14, yPos);
    }
    
    // Date and currency info
    const dateStr = new Date(debt.issued_at).toLocaleString('ru-RU');
    doc.text(`${disp(t('nak.date'))}: ${dateStr}`, pageWidth - 14, 40, { align: 'right' });
    
    // Skip the exchange rate line - not needed in PDF
    yPos += 2;
    
    yPos += 9;
    
    // Products table
    if (debt.items && debt.items.length > 0) {
      const tableData = debt.items.map((item, idx) => {
        const priceInNative = parseFloat(item.price);
        const lineSumInNative = parseFloat(item.line_sum);
        const boxes = parseInt(item.boxes) || 0;
        const qtyDisplay = Math.round(item.qty || 0); // Remove decimals from dona
        return [
          idx + 1,
          disp(item.name),
          money(priceInNative, debtCurrency),
          boxes || '—',
          qtyDisplay,
          money(lineSumInNative, debtCurrency)
        ];
      });
      
      doc.autoTable({
        startY: yPos,
        theme: 'grid',
        styles: { font: 'DejaVu', fontStyle: 'normal', fontSize: 10 },
        headStyles: { fillColor: [14, 59, 67], font: 'DejaVu', fontStyle: 'normal', textColor: 255 },
        head: [[
          '#',
          disp(t('debt.product')),
          disp(t('nak.colPrice')),
          disp(t('nak.colBoxes')),
          disp(t('nak.colQty')),
          disp(t('nak.colSum'))
        ]],
        body: tableData,
        columnStyles: {
          2: { halign: 'right' },
          5: { halign: 'right' }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 8;
    }
    
    // Payments table
    const paymentTableData = debt.payments && debt.payments.length > 0
      ? debt.payments.map(p => {
          const payDate = new Date(p.paid_at).toLocaleString('ru-RU');
          const amountInNative = parseFloat(p.amount);
          return [payDate, money(amountInNative, debtCurrency) + ' ' + unit(debtCurrency)];
        })
      : [[disp(t('pdf.noPay')), '—']];
    
    doc.autoTable({
      startY: yPos,
      theme: 'striped',
      styles: { font: 'DejaVu', fontStyle: 'normal', fontSize: 10 },
      headStyles: { fillColor: [100, 113, 127], font: 'DejaVu', fontStyle: 'normal', textColor: 255 },
      head: [[disp(t('pdf.payDate')), disp(t('pdf.amount'))]],
      body: paymentTableData,
      columnStyles: { 1: { halign: 'right' } },
      tableWidth: 90
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    // Summary - only native currency, no conversion
    doc.setFontSize(11);
    doc.setTextColor(20, 32, 43);
    
    // Total
    doc.text(`${disp(t('debt.total'))}: ${money(totalInNative, debtCurrency)} ${unit(debtCurrency)}`, pageWidth - 14, yPos, { align: 'right' });
    
    // Paid
    doc.text(`${disp(t('pdf.paid'))}: ${money(paidInNative, debtCurrency)} ${unit(debtCurrency)}`, pageWidth - 14, yPos + 7, { align: 'right' });
    
    // Left
    doc.setFontSize(13);
    doc.text(`${disp(t('nak.left'))}: ${money(leftInNative, debtCurrency)} ${unit(debtCurrency)}`, pageWidth - 14, yPos + 16, { align: 'right' });
    
    // Generate filename
    const genDate = new Date().toLocaleDateString('ru-RU').replace(/\//g, '.');
    const sanitizedName = disp(debt.client.name).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    const fileName = `${sanitizedName} ${genDate}`.trim() || 'nakladnoy';
    
    // Save PDF
    doc.save(`${fileName}.pdf`);
    toast(disp('PDF yuklandi'));
    
  } catch (error) {
    console.error('PDF generation error:', error);
    toast(disp('PDF yaratishda xatolik'));
  }
}

// ============================================================================
// EDIT ITEMS FUNCTIONALITY
// ============================================================================

function showEditItemsForm(debt) {
  const debtCurrency = debt.currency || 'uzs';
  const paidAmount = parseFloat(debt.paid);
  
  const itemsHtml = debt.items.map((item, idx) => {
    const priceInNative = parseFloat(item.price);
    const boxes = parseInt(item.boxes) || 0;
    const qty = parseFloat(item.qty) || 0;
    
    return `
      <div class="edit-item-card" id="edit-item-${idx}" style="background: #FFFFFF; padding: 16px; border-radius: 10px; margin-bottom: 12px; position: relative; border: 1px solid #E5E7EB;">
        <button type="button" class="btn danger icon remove-item-btn" data-idx="${idx}" style="position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; padding: 0; font-size: 1.3rem; line-height: 1; display: flex; align-items: center; justify-content: center;" title="${disp('O\'chirish')}">×</button>
        
        <div class="field" style="margin-bottom: 14px;">
          <label style="font-size: 0.9rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; display: block;">${t('debt.product')}</label>
          <input class="input edit-item-name" data-idx="${idx}" value="${esc(item.name)}" readonly style="background: #F9FAFB; font-size: 1rem; padding: 12px; border: 1px solid #E5E7EB; width: 100%;">
        </div>
        
        <div class="edit-item-fields" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div class="field">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; display: block;">${t('debt.price')}</label>
            <input class="input edit-item-price" type="number" min="0" step="0.01" data-idx="${idx}" value="${priceInNative}" style="font-size: 1rem; padding: 12px; width: 100%;">
          </div>
          <div class="field">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; display: block;">${t('debt.boxes')}</label>
            <input class="input edit-item-boxes" type="number" min="0" data-idx="${idx}" value="${boxes}" style="font-size: 1rem; padding: 12px; width: 100%;">
          </div>
          <div class="field">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; display: block;">${t('debt.qty')}</label>
            <input class="input edit-item-qty" type="number" min="0" step="0.01" data-idx="${idx}" value="${qty}" style="font-size: 1rem; padding: 12px; width: 100%;">
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  modal(disp('Tovarlarni tahrirlash'), `
    <div style="margin-bottom: 18px; padding: 12px; background: #F3F4F6; border-radius: 8px;">
      <small style="color: var(--muted); font-size: 0.9rem;">${disp('Qarz valyutasi')}: <strong style="font-size: 1.1rem; color: var(--ink);">${unit(debtCurrency)}</strong></small>
    </div>
    <div id="editItemsContainer" style="max-height: 400px; overflow-y: auto; padding-right: 4px;">
      ${itemsHtml}
    </div>
    <div style="padding: 14px; background: #FEF3C7; border-radius: 8px; margin-top: 16px; border-left: 4px solid #F59E0B;">
      <strong style="font-size: 1rem; color: #92400E;">${disp('Ogohlantirish')}:</strong><br>
      <small style="font-size: 0.92rem; color: #78350F;">${disp('To\'langan summa')}: <strong style="font-size: 1.05rem;">${money(paidAmount, debtCurrency)} ${unit(debtCurrency)}</strong></small><br>
      <small style="color: #92400E; font-size: 0.88rem;">${disp('Jami qarz to\'langan summadan kam bo\'lmasligi kerak')}</small>
    </div>
    <div class="err" id="editItemsErr" style="margin-top: 14px; font-size: 1rem; font-weight: 600;"></div>
  `, `<button class="btn" type="button" data-x style="font-size: 1rem; padding: 12px 20px;">${t('debt.cancel')}</button><button class="btn primary" type="button" id="saveEditItems" style="font-size: 1rem; padding: 12px 20px;">${t('debt.save')}</button>`, true);
  
  // CRITICAL: Don't set values again - they're already in the HTML with value="${...}"
  // This was causing the issue - double setting was clearing values
  
  // Remove item function
  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.onclick = function() {
      const idx = this.dataset.idx;
      const itemEl = $(`#edit-item-${idx}`);
      if (itemEl) {
        itemEl.style.opacity = '0.3';
        itemEl.style.pointerEvents = 'none';
        itemEl.dataset.removed = 'true';
        updateEditTotal();
      }
    };
  });
  
  // Calculate and display total on input change
  const updateEditTotal = () => {
    let total = 0;
    document.querySelectorAll('.edit-item-price').forEach(priceInput => {
      const idx = priceInput.dataset.idx;
      const itemEl = $(`#edit-item-${idx}`);
      
      // Skip removed items
      if (itemEl && itemEl.dataset.removed === 'true') return;
      
      const price = parseFloat(priceInput.value) || 0;
      const qtyInput = $(`.edit-item-qty[data-idx="${idx}"]`);
      const qty = qtyInput ? (parseFloat(qtyInput.value) || 0) : 0;
      total += price * qty;
    });
    
    const totalDisplay = $('#editItemsErr');
    if (totalDisplay) {
      totalDisplay.textContent = `${disp('Yangi jami')}: ${money(total, debtCurrency)} ${unit(debtCurrency)}`;
      totalDisplay.style.color = total >= paidAmount ? 'var(--success)' : 'var(--danger)';
    }
  };
  
  document.querySelectorAll('.edit-item-price, .edit-item-qty').forEach(input => {
    input.oninput = updateEditTotal;
  });
  
  updateEditTotal();
  
  $('#saveEditItems').onclick = () => saveEditItems(debt);
}

async function saveEditItems(debt) {
  const debtCurrency = debt.currency || 'uzs';
  const paidAmount = parseFloat(debt.paid);
  
  // Collect updated items (excluding removed ones)
  const updatedItems = [];
  let newTotal = 0;
  
  document.querySelectorAll('.edit-item-price').forEach(priceInput => {
    const idx = parseInt(priceInput.dataset.idx);
    const itemEl = $(`#edit-item-${idx}`);
    
    // Skip removed items
    if (itemEl && itemEl.dataset.removed === 'true') return;
    
    const originalItem = debt.items[idx];
    if (!originalItem) return; // Safety check
    
    const price = parseFloat(priceInput.value) || 0;
    const boxes = parseInt($(`.edit-item-boxes[data-idx="${idx}"]`).value) || 0;
    const qty = parseFloat($(`.edit-item-qty[data-idx="${idx}"]`).value) || 0;
    
    if (price > 0 && qty > 0) {
      updatedItems.push({
        product_id: originalItem.product_id,
        name: originalItem.name,
        price: price,
        boxes: boxes,
        qty: qty
      });
      newTotal += price * qty;
    }
  });
  
  // Validation
  if (updatedItems.length === 0) {
    $('#editItemsErr').textContent = disp('Kamida bitta tovar bo\'lishi kerak');
    $('#editItemsErr').style.color = 'var(--danger)';
    return;
  }
  
  if (newTotal < paidAmount) {
    $('#editItemsErr').textContent = disp(`Yangi jami (${money(newTotal, debtCurrency)}) to'langan summadan (${money(paidAmount, debtCurrency)}) kam bo'lmasligi kerak`);
    $('#editItemsErr').style.color = 'var(--danger)';
    return;
  }
  
  // Send update to backend
  try {
    const res = await fetch(`/debts/api/${debt.id}/update-items/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf()
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        items: updatedItems,
        currency: debtCurrency
      })
    });
    
    const data = await res.json();
    
    if (!res.ok || !data.success) {
      $('#editItemsErr').textContent = disp(data.error || 'Xatolik yuz berdi');
      $('#editItemsErr').style.color = 'var(--danger)';
      return;
    }
    
    closeModal();
    toast(disp('Tovarlar yangilandi'));
    viewDebtDetail(debt.id); // Reload debt detail
    
  } catch (error) {
    console.error('Update items error:', error);
    $('#editItemsErr').textContent = disp('Xatolik yuz berdi');
    $('#editItemsErr').style.color = 'var(--danger)';
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Setup searchable input with datalist (mobile-friendly custom search)
function setupSearchableInput(inputId, datalistId, dataArray, type) {
  const input = $(`#${inputId}`);
  const datalist = $(`#${datalistId}`);
  if (!input || !datalist) return;
  
  // Detect if mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  
  if (isMobile) {
    // Mobile: Custom searchable modal
    
    // Hide datalist
    datalist.style.display = 'none';
    
    // Make input readonly and add click handler
    input.setAttribute('readonly', 'readonly');
    input.style.cursor = 'pointer';
    input.style.caretColor = 'transparent';
    
    // Add search icon indicator
    input.style.paddingRight = '40px';
    input.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'8\'/%3E%3Cpath d=\'m21 21-4.35-4.35\'/%3E%3C/svg%3E")';
    input.style.backgroundRepeat = 'no-repeat';
    input.style.backgroundPosition = 'right 12px center';
    input.style.backgroundSize = '20px';
    
    // Store the handler so we can ensure it's only attached once
    if (!input._mobileSearchHandler) {
      input._mobileSearchHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        showMobileSearchModal(input, dataArray, type);
      };
      
      input.onclick = input._mobileSearchHandler;
      
      // Prevent keyboard from showing
      input.onfocus = function(e) {
        e.preventDefault();
        this.blur();
        showMobileSearchModal(input, dataArray, type);
      };
    }
  } else {
    // Desktop: Use datalist as before
    
    // Remove mobile handlers if they exist
    if (input._mobileSearchHandler) {
      input.onclick = null;
      input.onfocus = null;
      delete input._mobileSearchHandler;
    }
    
    // Remove mobile styling
    input.removeAttribute('readonly');
    input.style.cursor = '';
    input.style.caretColor = '';
    input.style.paddingRight = '';
    input.style.backgroundImage = '';
    datalist.style.display = '';
    
    input.addEventListener('input', function(e) {
      const value = e.target.value;
      
      // Check if value matches any option
      const options = datalist.querySelectorAll('option');
      let matchedId = null;
      
      for (let option of options) {
        if (option.value === value) {
          matchedId = option.dataset.id;
          break;
        }
      }
      
      if (matchedId) {
        input.dataset.selectedId = matchedId;
      } else {
        delete input.dataset.selectedId;
      }
    });
    
    // Clear selection if input is emptied
    input.addEventListener('blur', function(e) {
      if (!e.target.value) {
        delete e.target.dataset.selectedId;
      }
    });
  }
}

// Mobile search modal
function showMobileSearchModal(targetInput, dataArray, type) {
  // Prevent multiple modals
  const existing = $('#mobileSearchOverlay');
  if (existing) {
    existing.remove();
  }
  
  const searchPlaceholder = type === 'client' ? 'Mijozni qidirish...' : 'Tovarni qidirish...';
  const modalHtml = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: flex-end;" id="mobileSearchOverlay">
      <div style="background: white; width: 100%; max-height: 80vh; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; animation: slideUp 0.3s ease-out;">
        <div style="padding: 16px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; gap: 12px;">
          <input type="text" id="mobileSearchInput" placeholder="${esc(disp(searchPlaceholder))}" style="flex: 1; padding: 12px 16px; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 1rem;" autofocus>
          <button onclick="closeMobileSearch()" style="padding: 12px 16px; background: #F3F4F6; border: none; border-radius: 8px; font-weight: 600; color: #6B7280;">${esc(disp('Yopish'))}</button>
        </div>
        <div id="mobileSearchResults" style="flex: 1; overflow-y: auto; padding: 8px;">
          <!-- Results here -->
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Add animation keyframes
  if (!document.getElementById('mobileSearchStyle')) {
    const style = document.createElement('style');
    style.id = 'mobileSearchStyle';
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  const searchInput = $('#mobileSearchInput');
  const resultsDiv = $('#mobileSearchResults');
  
  // Render all results initially
  function renderResults(filteredData) {
    if (filteredData.length === 0) {
      resultsDiv.innerHTML = `<div style="padding: 48px 20px; text-align: center; color: #9CA3AF;">${esc(disp('Natija topilmadi'))}</div>`;
      return;
    }
    
    resultsDiv.innerHTML = filteredData.map(item => {
      if (type === 'client') {
        const phoneText = item.phone ? esc(item.phone) : '';
        const telegramText = item.telegram ? ' • @' + esc(item.telegram) : '';
        const subtitle = phoneText + telegramText;
        
        return `
          <div class="mobile-search-item" data-id="${item.id}" data-name="${esc(disp(item.name))}" style="padding: 14px 16px; border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.2s;">
            <div style="font-weight: 600; font-size: 1rem; margin-bottom: 4px; color: #111827;">${esc(disp(item.name))}</div>
            ${subtitle ? `<div style="font-size: 0.9rem; color: #6B7280;">${subtitle}</div>` : ''}
          </div>
        `;
      } else {
        return `
          <div class="mobile-search-item" data-id="${item.id}" data-name="${esc(disp(item.name))}" style="padding: 14px 16px; border-bottom: 1px solid #F3F4F6; cursor: pointer; transition: background 0.2s;">
            <div style="font-weight: 600; font-size: 1rem; color: #111827;">${esc(disp(item.name))}</div>
          </div>
        `;
      }
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.mobile-search-item').forEach(el => {
      el.onclick = function() {
        targetInput.value = this.dataset.name;
        targetInput.dataset.selectedId = this.dataset.id;
        closeMobileSearch();
        
        // Trigger change event so updateTotal fires
        const event = new Event('change', { bubbles: true });
        targetInput.dispatchEvent(event);
        
        // Also trigger input event for any other listeners
        const inputEvent = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(inputEvent);
      };
      
      // Add touch feedback
      el.addEventListener('touchstart', function() {
        this.style.background = '#F3F4F6';
      }, { passive: true });
      
      el.addEventListener('touchend', function() {
        setTimeout(() => {
          this.style.background = '';
        }, 150);
      }, { passive: true });
      
      el.addEventListener('touchcancel', function() {
        this.style.background = '';
      }, { passive: true });
    });
  }
  
  // Initial render
  renderResults(dataArray);
  
  // Search functionality
  searchInput.oninput = function() {
    const query = this.value.toLowerCase().trim();
    
    if (!query) {
      renderResults(dataArray);
      return;
    }
    
    const filtered = dataArray.filter(item => {
      if (type === 'client') {
        return disp(item.name).toLowerCase().includes(query) ||
               (item.phone && item.phone.includes(query)) ||
               (item.telegram && item.telegram.toLowerCase().includes(query));
      } else {
        return disp(item.name).toLowerCase().includes(query);
      }
    });
    
    renderResults(filtered);
  };
  
  // Close on overlay click
  $('#mobileSearchOverlay').onclick = function(e) {
    if (e.target === this) {
      closeMobileSearch();
    }
  };
  
  // Focus search input
  setTimeout(() => searchInput.focus(), 100);
}

// Close mobile search modal
window.closeMobileSearch = function() {
  const overlay = $('#mobileSearchOverlay');
  if (overlay) {
    overlay.style.animation = 'slideDown 0.2s ease-in';
    setTimeout(() => overlay.remove(), 200);
  }
};

// Add slideDown animation
if (!document.getElementById('mobileSearchStyleDown')) {
  const style = document.createElement('style');
  style.id = 'mobileSearchStyleDown';
  style.textContent = `
    @keyframes slideDown {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }
  `;
  document.head.appendChild(style);
}

async function loadClientsForSelect() {
  try {
    const res = await fetch('/base/api/clients/all/');
    const data = await res.json();
    if (data.success) {
      clientsCache = data.clients;
    }
  } catch (err) {
    console.error('Load clients error:', err);
  }
}

async function loadProductsForSelect() {
  try {
    const res = await fetch('/base/api/products/all/');
    const data = await res.json();
    if (data.success) {
      productsCache = data.products;
    }
  } catch (err) {
    console.error('Load products error:', err);
  }
}

function nowISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function renderPage() {
  // If we're viewing a debt detail, re-render that instead of going back to list
  if (currentDebt) {
    renderDebtDetail(currentDebt);
  } else {
    // Reset filters and go back to list view
    currentFilter = 'all';
    currentDateFilter = 'all';
    searchQuery = '';
    currentPage = 1;
    viewDebts();
  }
}

if (bootShell('debts')) renderPage();
