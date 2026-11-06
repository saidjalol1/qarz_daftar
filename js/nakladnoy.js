'use strict';

let pdfFontB64 = null;

async function pdfFont(doc) {
  if (!pdfFontB64) {
    const res = await fetch('https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf');
    if (!res.ok) throw new Error('font');
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    pdfFontB64 = btoa(bin);
  }
  doc.addFileToVFS('DejaVuSans.ttf', pdfFontB64);
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal');
  doc.setFont('DejaVu');
}

async function nakladnoy(d) {
  if (!window.jspdf) { toast(t('pdf.fail')); return; }
  const c = client(d.clientId), doc = new window.jspdf.jsPDF(), W = doc.internal.pageSize.width;
  try { await pdfFont(doc); } catch { toast(t('pdf.font')); return; }
  const tx = s => disp(s);
  doc.setFillColor(14, 59, 67); doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255); doc.setFont('DejaVu'); doc.setFontSize(18);
  doc.text(t('pdf.title', { n: d.no }), 14, 18);
  doc.setFontSize(10); doc.text(t('pdf.brand'), W - 14, 18, { align: 'right' });
  doc.setTextColor(20, 32, 43); doc.setFontSize(11);
  doc.text(`${t('nak.client')}: ${tx(c.name)}`, 14, 40);
  doc.text(`${t('nak.phone')}: ${c.phone}`, 14, 47);
  if (c.tg) doc.text(`${t('nak.tg')}: @${c.tg}`, 14, 54);
  doc.text(`${t('nak.date')}: ${fdate(d.date)}`, W - 14, 40, { align: 'right' });
  doc.text(`${t('nak.native')}: ${t('cur.' + nativeCur(d))}  ·  1 USD = ${usdRate().toFixed(2)} ${t('currency')}${cbuDate ? ' · ' + cbuDate : ''}`, 14, c.tg ? 61 : 54);
  const font = 'DejaVu';
  let y = c.tg ? 70 : 64;
  if (d.items.length) {
    doc.autoTable({
      startY: y, theme: 'grid', styles: { font, fontStyle: 'normal', fontSize: 10 },
      headStyles: { fillColor: [14, 59, 67], font, fontStyle: 'normal', textColor: 255 },
      head: [['#', t('debt.product'), t('nak.colPrice'), t('nak.colBoxes'), t('nak.colQty'), t('nak.colSum')]],
      body: d.items.map((i, n) => [n + 1, tx(i.name), moneyDebt(i.price, d), i.boxes || '—', itemQty(i), moneyDebt(lineSum(i), d)]),
      columnStyles: { 2: { halign: 'right' }, 5: { halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 8;
  }
  doc.autoTable({
    startY: y, theme: 'striped', styles: { font, fontStyle: 'normal', fontSize: 10 },
    headStyles: { fillColor: [100, 113, 127], font, fontStyle: 'normal', textColor: 255 },
    head: [[t('pdf.payDate'), t('pdf.amount')]],
    body: d.payments.length ? d.payments.map(p => [fdate(p.date), moneyDebt(p.amount, d)]) : [[t('pdf.noPay'), '—']],
    columnStyles: { 1: { halign: 'right' } }, tableWidth: 90
  });
  y = doc.lastAutoTable.finalY + 10;
  doc.setFont('DejaVu'); doc.setFontSize(11);
  doc.text(`${t('debt.total')}: ${somDebt(d.total, d)}`, W - 14, y, { align: 'right' });
  doc.text(`${t('pdf.paid')}: ${somDebt(paid(d), d)}`, W - 14, y + 7, { align: 'right' });
  doc.setFontSize(13); doc.text(`${t('nak.left')}: ${somDebt(left(d), d)}`, W - 14, y + 16, { align: 'right' });
  const genDate = new Date().toLocaleDateString('ru-RU').replace(/\//g, '.');
  const fileName = [tx(c.name), genDate].filter(Boolean).join(' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'nakladnoy';
  doc.save(`${fileName}.pdf`);
}
