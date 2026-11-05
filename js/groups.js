'use strict';

const dateTab = {};
const closedGroups = new Set();

function inDateTab(iso, tab) {
  if (!tab || tab === 'all') return true;
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return true;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (tab === 'today') return x >= start && x < new Date(start.getTime() + 864e5);
  if (tab === 'week') {
    const from = new Date(start);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    return x >= from;
  }
  if (tab === 'month') return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth();
  return true;
}

function groupByClient(rows) {
  const groups = [], map = new Map();
  rows.forEach(d => {
    if (!map.has(d.clientId)) {
      const g = { clientId: d.clientId, debts: [] };
      map.set(d.clientId, g); groups.push(g);
    }
    map.get(d.clientId).debts.push(d);
  });
  groups.sort((a, b) => disp(client(a.clientId).name).localeCompare(disp(client(b.clientId).name), 'uz'));
  groups.forEach(g => g.debts.sort((a, b) => b.date.localeCompare(a.date)));
  return groups;
}

function renderGrouped(target, rows, emptyTitle, emptyHint) {
  const groups = groupByClient(rows);
  const showActs = document.body.dataset.page === 'debts' && can('add');
  target.innerHTML = groups.length ? `<div class="arch">${groups.map(g => {
    const tab = dateTab[g.clientId] || 'all';
    const shown = g.debts.filter(d => inDateTab(d.date, tab));
    const c = client(g.clientId);
    const tot = shown.reduce((s, d) => s + d.total, 0);
    const due = shown.reduce((s, d) => s + left(d), 0);
    const tabs = [['all', 'date.all'], ['today', 'date.today'], ['week', 'date.week'], ['month', 'date.month']];
    return `<div class="arch-g ${closedGroups.has(g.clientId) ? 'closed' : ''}" data-gid="${g.clientId}">
      <button type="button" class="arch-h">
        <svg class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        <div class="who"><b>${esc(disp(c.name))}</b><span>${esc(c.phone)}${c.tg ? ' · @' + esc(c.tg) : ''}</span></div>
        <div class="arch-meta">${t('arch.count', { n: shown.length })}<br><span class="num">${t('arch.total')}: ${som(tot)} · ${t('nak.left')}: ${som(due)}</span></div>
      </button>
      <div class="arch-body">
        <div class="tabs date-tabs">${tabs.map(([k, key]) => `<button type="button" data-dt="${k}" class="${tab === k ? 'on' : ''}">${t(key)}</button>`).join('')}</div>
        ${shown.length ? `<table class="stack"><thead><tr><th>№</th><th>${t('nak.date')}</th><th class="r">${t('debts.colTotal')}</th><th class="r">${t('debts.colLeft')}</th><th>${t('debts.colStatus')}</th>${showActs ? '<th></th>' : ''}</tr></thead><tbody>
          ${shown.map(d => {
            const lft = left(d);
            return `<tr class="click" data-id="${d.id}"><td class="who"><b>№${d.no}</b><span>${d.items.length ? d.items.map(i => esc(disp(i.name))).join(', ') : t('nak.noItems')}</span></td>
            <td class="hm">${fdate(d.date)}</td><td class="r hm num">${som(d.total)}</td>
            <td class="r num"><b style="color:${lft > 0 ? 'var(--debt)' : 'var(--ok)'}">${som(lft)}</b></td>
            <td class="hm">${statusPill(d)}</td>
            ${showActs ? `<td class="r acts"><button class="btn sm" data-edit="${d.id}">${t('debt.edit')}</button> <button class="btn sm danger" data-del="${d.id}">${t('debt.del')}</button></td>` : ''}</tr>`;
          }).join('')}
        </tbody></table>` : `<div class="empty"><b>${t('date.empty')}</b></div>`}
      </div></div>`;
  }).join('')}</div>` : `<div class="card">${empty(emptyTitle, emptyHint)}</div>`;
  target.querySelectorAll('.arch-h').forEach(h => h.onclick = () => {
    const g = h.closest('.arch-g'), id = g.dataset.gid;
    g.classList.toggle('closed');
    if (g.classList.contains('closed')) closedGroups.add(id); else closedGroups.delete(id);
  });
  target.querySelectorAll('[data-dt]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    dateTab[b.closest('.arch-g').dataset.gid] = b.dataset.dt;
    renderGrouped(target, rows, emptyTitle, emptyHint);
  });
  target.querySelectorAll('tr.click').forEach(r => r.onclick = e => {
    if (e.target.closest('[data-edit],[data-del]')) return;
    debtDetail(r.dataset.id);
  });
  target.querySelectorAll('[data-edit]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const d = db.debts.find(x => x.id === b.dataset.edit);
    if (d) debtForm(d);
  });
  target.querySelectorAll('[data-del]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    deleteDebt(b.dataset.del);
  });
}
