'use strict';

function toast(msg) {
  const e = document.createElement('div');
  e.className = 'toast';
  e.textContent = msg;
  document.body.append(e);
  setTimeout(() => e.remove(), 2200);
}

function modal(title, body, foot, wide) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="ov"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
    <div class="mh"><h3>${title}</h3><button class="btn icon" data-x aria-label="${esc(t('ui.close'))}">✕</button></div>
    <div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div></div>`;
  root.onclick = e => { if (e.target.classList.contains('ov') || e.target.closest('[data-x]')) closeModal(); };
}

const closeModal = () => { 
  const root = $('#modalRoot'); 
  if (root) root.innerHTML = ''; 
  // Clear form data when modal closes
  if (typeof currentFormData !== 'undefined') currentFormData = null;
};
const empty = (title, sub) => `<div class="empty"><b>${title}</b>${sub}</div>`;

let askDone = null;
function confirmRoot() {
  let el = $('#confirmRoot');
  if (!el) { el = document.createElement('div'); el.id = 'confirmRoot'; document.body.append(el); }
  return el;
}
function settleAsk(ok) {
  confirmRoot().innerHTML = '';
  const done = askDone;
  askDone = null;
  if (done) done(ok);
}
function ask(title, text) {
  return new Promise(resolve => {
    settleAsk(false);
    askDone = resolve;
    const root = confirmRoot();
    root.innerHTML = `<div class="ov ov-ask"><div class="modal ask" role="dialog" aria-modal="true">
      <div class="mh"><h3>${esc(title)}</h3><button class="btn icon" data-no aria-label="${esc(t('ui.close'))}">✕</button></div>
      <div class="mb"><p>${esc(text)}</p></div>
      <div class="mf"><button class="btn" data-no>${t('debt.cancel')}</button><button class="btn primary" data-yes>${t('ui.ok')}</button></div>
    </div></div>`;
    root.onclick = e => {
      if (e.target.classList.contains('ov') || e.target.closest('[data-no]')) settleAsk(false);
      else if (e.target.closest('[data-yes]')) settleAsk(true);
    };
  });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (askDone) { settleAsk(false); return; }
  closeModal();
});
