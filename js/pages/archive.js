'use strict';

let q = '';

function viewArchive() {
  const all = archivedDebts();
  $('#view').innerHTML = `
    <div class="head"><div><h2>${t('arch.title')}</h2><p>${t('arch.sub')}</p></div></div>
    <div class="tools"><input class="input" id="search" placeholder="${esc(t('arch.search'))}" value="${esc(q)}"></div>
    <div id="alist"></div>`;
  $('#search').oninput = e => { q = e.target.value; draw(); const i = $('#search'); i.focus(); i.setSelectionRange(q.length, q.length); };
  draw();
  function draw() {
    const s = q.toLowerCase();
    const rows = all.filter(d => {
      const c = client(d.clientId);
      const hay = [c.name, disp(c.name), c.phone, c.tg, String(d.no)].join(' ').toLowerCase();
      return !s || hay.includes(s);
    });
    renderGrouped($('#alist'), rows, t('arch.empty'), t('arch.emptyHint'));
  }
}

function renderPage() { viewArchive(); }
if (bootShell('archive')) renderPage();
