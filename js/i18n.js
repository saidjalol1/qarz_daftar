'use strict';

const SCRIPT_KEY = 'qd_script';
let script = localStorage.getItem(SCRIPT_KEY) === 'cyrl' ? 'cyrl' : 'latn';

const I18N = {
  latn: {
    'app.title': 'Qarz Daftar', 'app.name': 'Qarz Daftar', 'currency': "so'm",
    'nav.debts': 'Qarzlar', 'nav.archive': 'Arxiv', 'nav.base': 'Baza', 'nav.users': 'Foydalanuvchilar', 'nav.logout': 'Chiqish',
    'role.super': 'Super admin', 'role.manager': 'Menejer', 'role.cashier': 'Kassir',
    'login.hero': "Har bir qarz o'z o'rnida.",
    'login.lead': "Kim qancha qarz olgani, qachon va qancha to'lagani — hammasi bir daftarda.",
    'login.sampleTotal': 'Umumiy qarz', 'login.samplePaid': "To'langan", 'login.sampleLeft': 'Qoldiq',
    'login.title': 'Tizimga kirish', 'login.hint': 'Email va parolingizni kiriting', 'login.pass': 'Parol',
    'login.submit': 'Kirish', 'login.demo': 'Demo: admin@qarzdaftar.uz / admin123',
    'login.err': "Email yoki parol noto'g'ri. Qayta tekshiring.",
    'debts.title': 'Qarzlar', 'debts.sub': "To'lanmagan qarzlar, klientlar bo'yicha guruhlangan", 'debts.add': "+ Qarz qo'shish",
    'debts.left': 'Jami qoldiq qarz', 'debts.paid': "To'langan", 'debts.debtors': 'Qarzdorlar soni',
    'debts.search': 'Ism, telefon yoki username bo\'yicha qidirish',
    'debts.all': 'Barchasi', 'debts.open': 'Qarzi bor', 'debts.closed': "To'langan",
    'debts.colDebtor': 'Qarzdor', 'debts.colPhone': 'Telefon', 'debts.colTotal': 'Qarz summasi',
    'debts.colLeft': 'Qoldiq', 'debts.colStatus': 'Holat',
    'debts.empty': 'Qarz topilmadi', 'debts.emptyHint': "Yangi qarz qo'shing yoki qidiruvni o'zgartiring.",
    'status.paid': "To'langan", 'status.part': 'Qisman', 'status.unpaid': "To'lanmagan",
    'debt.new': 'Yangi qarz', 'debt.debtor': 'Qarzdor', 'debt.datetime': 'Sana va vaqt',
    'debt.items': 'Tovarlar', 'debt.optional': '(ixtiyoriy)', 'debt.addItem': '+ Tovar biriktirish',
    'debt.manual': "Summani qo'lda kiritaman", 'debt.sum': 'Qarz summasi', 'debt.total': 'Jami qarz',
    'debt.save': 'Saqlash', 'debt.cancel': 'Bekor qilish',
    'debt.needClient': "Avval Baza bo'limida mijoz qo'shing",
    'debt.needProduct': "Avval Baza bo'limida tovar qo'shing",
    'debt.needSum': "Summa 0 dan katta bo'lishi kerak: tovar kiriting yoki summani qo'lda yozing.",
    'debt.added': "Qarz qo'shildi", 'debt.updated': 'Qarz yangilandi', 'debt.edit': 'Tahrirlash',
    'debt.editTitle': 'Qarz tahriri', 'debt.del': "O'chirish",
    'debt.delOk': "Bu qarz butunlay o'chiriladi. Davom etasizmi?", 'debt.deleted': "Qarz o'chirildi",
    'debt.belowPaid': "Yangi summa to'langandan ({s}) kichik bo'lmasin.",
    'debt.product': 'Tovar', 'debt.price': 'Narxi (1 dona)',
    'debt.boxes': 'Qop soni', 'debt.qty': 'Dona', 'debt.remove': "O'chirish", 'debt.pcs': 'dona',
    'date.all': 'Barchasi', 'date.today': 'Bugun', 'date.week': 'Hafta', 'date.month': 'Oy',
    'date.empty': 'Bu muddatda qarz yo\'q',
    'nak.title': 'Nakladnoy №{n}', 'nak.client': 'Klient', 'nak.phone': 'Telefon', 'nak.tg': 'Telegram', 'nak.date': 'Sana',
    'nak.noItems': "Bu qarz tovarsiz, summa qo'lda kiritilgan.",
    'nak.payments': "To'lovlar tarixi", 'nak.noPay': "Hali to'lov qilinmagan.", 'nak.left': 'Qoldiq',
    'nak.payAmt': "To'lov summasi", 'nak.takePay': "To'lov qabul qilish",
    'nak.needPay': "To'lov summasini kiriting.", 'nak.overPay': "To'lov qoldiqdan ({s}) oshib ketdi.",
    'nak.paidOk': "To'lov qabul qilindi", 'nak.archive': 'Arxivga', 'nak.pdf': 'PDF yuklab olish',
    'nak.restore': 'Qayta tiklash', 'nak.colPrice': 'Narx', 'nak.colBoxes': 'Qop', 'nak.colQty': 'Dona',
    'nak.colSum': 'Summa', 'nak.archived': 'Arxivlangan',
    'arch.confirm': "Bu qarz o'chirilmaydi — arxivga ko'chiriladi. Davom etasizmi?",
    'arch.done': 'Qarz arxivga ko\'chirildi', 'arch.restored': 'Qarz qayta tiklandi',
    'arch.auto': "Qarz to'liq to'landi va arxivga ko'chirildi",
    'arch.title': 'Arxiv', 'arch.sub': "O'chirilgan o'rniga arxivlangan qarzlar, qarzdorlar bo'yicha guruhlangan",
    'arch.search': 'Qarzdor yoki nakladnoy raqami bo\'yicha qidirish',
    'arch.empty': 'Arxiv bo\'sh', 'arch.emptyHint': "Qarzni o'chirish o'rniga arxivga ko'chiring.",
    'arch.count': '{n} ta qarz', 'arch.total': 'Jami',
    'pdf.fail': "PDF kutubxonasi yuklanmadi. Internetni tekshiring.",
    'pdf.font': "PDF shrifti yuklanmadi. Internetni tekshiring.",
    'pdf.title': 'NAKLADNOY № {n}', 'pdf.brand': 'Qarz Daftar', 'pdf.payDate': "To'lov sanasi",
    'pdf.amount': 'Summa', 'pdf.noPay': "To'lov yo'q", 'pdf.paid': "To'langan",
    'pdf.gave': 'Topshirdi: ____________', 'pdf.got': 'Qabul qildi: ____________',
    'base.title': 'Baza', 'base.sub': 'Mijozlar va tovarlar ro\'yxati',
    'base.addClient': "+ Mijoz qo'shish", 'base.addProduct': "+ Tovar qo'shish",
    'base.clients': 'Mijozlar', 'base.products': 'Tovarlar', 'base.search': 'Qidirish',
    'base.colName': 'Nomi', 'base.edit': 'Tahrirlash', 'base.del': "O'chirish",
    'base.noClient': "Mijoz yo'q", 'base.noProduct': "Tovar yo'q", 'base.emptyHint': "Yuqoridagi tugma orqali qo'shing.",
    'base.hasDebts': "Bu mijozning qarzlari bor, o'chirib bo'lmaydi",
    'base.delOk': "O'chirishni tasdiqlaysizmi?", 'base.client': 'Mijoz', 'base.product': 'Tovar',
    'base.editOf': 'tahriri', 'base.addOf': "qo'shish", 'base.fullName': 'Ism familiya',
    'base.prodName': 'Tovar nomi', 'base.phone': 'Telefon raqami', 'base.tg': 'Telegram username',
    'base.needNameC': 'Ismni kiriting.', 'base.needNameP': 'Tovar nomini kiriting.',
    'base.needPhone': 'Telefon raqamini kiriting.', 'base.saved': 'Saqlandi',
    'users.title': 'Foydalanuvchilar', 'users.sub': 'Tizimga kirish huquqi va rollar',
    'users.add': "+ Foydalanuvchi qo'shish", 'users.colName': 'Ism familiya',
    'users.del': "O'chirish", 'users.delOk': "Foydalanuvchi o'chirilsinmi?",
    'users.new': 'Yangi foydalanuvchi', 'users.role': 'Rol',
    'users.roleM': 'Menejer — qarz va bazani boshqaradi',
    'users.roleC': "Kassir — faqat to'lov qabul qiladi",
    'users.roleS': "Super admin — to'liq huquq",
    'users.email': 'Email', 'users.pass': 'Parol (kamida 6 belgi)',
    'users.register': "Ro'yxatdan o'tkazish",
    'users.needName': 'Ism familiyani kiriting.', 'users.badEmail': "Email noto'g'ri formatda.",
    'users.shortPass': "Parol kamida 6 belgidan iborat bo'lsin.",
    'users.exists': "Bu email bilan foydalanuvchi mavjud.", 'users.added': "Foydalanuvchi qo'shildi",
    'ui.close': 'Yopish', 'ui.ok': 'Tasdiqlash', 'script.latn': 'Lotin', 'script.cyrl': 'Kirill',
    'cur.uzs': "So'm", 'cur.usd': 'USD', 'cur.rate': '1 USD kurs',
    'cur.cbu': 'Markaziy bank', 'cur.cbuOff': "Oxirgi saqlangan kurs",
    'debt.currency': 'Valyuta', 'nak.native': 'Qarz valyutasi'
  },
  cyrl: {
    'app.title': 'Қарз Дафтар', 'app.name': 'Қарз Дафтар', 'currency': 'сўм',
    'nav.debts': 'Қарзлар', 'nav.archive': 'Архив', 'nav.base': 'База', 'nav.users': 'Фойдаланувчилар', 'nav.logout': 'Чиқиш',
    'role.super': 'Супер админ', 'role.manager': 'Менежер', 'role.cashier': 'Кассир',
    'login.hero': 'Ҳар бир қарз ўз ўрнида.',
    'login.lead': 'Ким қанча қарз олгани, қачон ва қанча тўлагани — ҳаммаси бир дафтарда.',
    'login.sampleTotal': 'Умумий қарз', 'login.samplePaid': 'Тўланган', 'login.sampleLeft': 'Қолдиқ',
    'login.title': 'Тизимга кириш', 'login.hint': 'Email ва паролингизни киритинг', 'login.pass': 'Парол',
    'login.submit': 'Кириш', 'login.demo': 'Демо: admin@qarzdaftar.uz / admin123',
    'login.err': 'Email ёки парол нотўғри. Қайта текширинг.',
    'debts.title': 'Қарзлар', 'debts.sub': 'Тўланмаган қарзлар, клиентлар бўйича гуруҳланган', 'debts.add': '+ Қарз қўшиш',
    'debts.left': 'Жами қолдиқ қарз', 'debts.paid': 'Тўланган', 'debts.debtors': 'Қарздорлар сони',
    'debts.search': 'Исм, телефон ёки username бўйича қидириш',
    'debts.all': 'Барчаси', 'debts.open': 'Қарзи бор', 'debts.closed': 'Тўланган',
    'debts.colDebtor': 'Қарздор', 'debts.colPhone': 'Телефон', 'debts.colTotal': 'Қарз суммаси',
    'debts.colLeft': 'Қолдиқ', 'debts.colStatus': 'Ҳолат',
    'debts.empty': 'Қарз топилмади', 'debts.emptyHint': 'Янги қарз қўшинг ёки қидирувни ўзгартиринг.',
    'status.paid': 'Тўланган', 'status.part': 'Қисман', 'status.unpaid': 'Тўланмаган',
    'debt.new': 'Янги қарз', 'debt.debtor': 'Қарздор', 'debt.datetime': 'Сана ва вақт',
    'debt.items': 'Товарлар', 'debt.optional': '(ихтиёрий)', 'debt.addItem': '+ Товар бириктириш',
    'debt.manual': 'Суммани қўлда киритаман', 'debt.sum': 'Қарз суммаси', 'debt.total': 'Жами қарз',
    'debt.save': 'Сақлаш', 'debt.cancel': 'Бекор қилиш',
    'debt.needClient': 'Аввал База бўлимида мижоз қўшинг',
    'debt.needProduct': 'Аввал База бўлимида товар қўшинг',
    'debt.needSum': 'Сумма 0 дан катта бўлиши керак: товар киритинг ёки суммани қўлда ёзинг.',
    'debt.added': 'Қарз қўшилди', 'debt.updated': 'Қарз янгиланди', 'debt.edit': 'Таҳрирлаш',
    'debt.editTitle': 'Қарз таҳрири', 'debt.del': 'Ўчириш',
    'debt.delOk': 'Бу қарз бутунлай ўчирилади. Давом этасизми?', 'debt.deleted': 'Қарз ўчирилди',
    'debt.belowPaid': 'Янги сумма тўлангандан ({s}) кичик бўлмасин.',
    'debt.product': 'Товар', 'debt.price': 'Нархи (1 дона)',
    'debt.boxes': 'Қоп сони', 'debt.qty': 'Дона', 'debt.remove': 'Ўчириш', 'debt.pcs': 'дона',
    'date.all': 'Барчаси', 'date.today': 'Бугун', 'date.week': 'Ҳафта', 'date.month': 'Ой',
    'date.empty': 'Бу муддатда қарз йўқ',
    'nak.title': 'Накладной №{n}', 'nak.client': 'Клиент', 'nak.phone': 'Телефон', 'nak.tg': 'Телеграм', 'nak.date': 'Сана',
    'nak.noItems': 'Бу қарз товарсиз, сумма қўлда киритилган.',
    'nak.payments': 'Тўловлар тарихи', 'nak.noPay': 'Ҳали тўлов қилинмаган.', 'nak.left': 'Қолдиқ',
    'nak.payAmt': 'Тўлов суммаси', 'nak.takePay': 'Тўлов қабул қилиш',
    'nak.needPay': 'Тўлов суммасини киритинг.', 'nak.overPay': 'Тўлов қолдиқдан ({s}) ошиб кетди.',
    'nak.paidOk': 'Тўлов қабул қилинди', 'nak.archive': 'Архивга', 'nak.pdf': 'PDF юклаб олиш',
    'nak.restore': 'Қайта тиклаш', 'nak.colPrice': 'Нарх', 'nak.colBoxes': 'Қоп', 'nak.colQty': 'Дона',
    'nak.colSum': 'Сумма', 'nak.archived': 'Архивланган',
    'arch.confirm': 'Бу қарз ўчирилмайди — архивга кўчирилади. Давом этасизми?',
    'arch.done': 'Қарз архивга кўчирилди', 'arch.restored': 'Қарз қайта тикланди',
    'arch.auto': 'Қарз тўлиқ тўланди ва архивга кўчирилди',
    'arch.title': 'Архив', 'arch.sub': 'Ўчирилган ўрнига архивланган қарзлар, қарздорлар бўйича гуруҳланган',
    'arch.search': 'Қарздор ёки накладной рақами бўйича қидириш',
    'arch.empty': 'Архив бўш', 'arch.emptyHint': 'Қарзни ўчириш ўрнига архивга кўчиринг.',
    'arch.count': '{n} та қарз', 'arch.total': 'Жами',
    'pdf.fail': 'PDF кутубхонаси юкланмади. Интернетни текширинг.',
    'pdf.font': 'PDF шрифти юкланмади. Интернетни текширинг.',
    'pdf.title': 'НАКЛАДНОЙ № {n}', 'pdf.brand': 'Қарз Дафтар', 'pdf.payDate': 'Тўлов санаси',
    'pdf.amount': 'Сумма', 'pdf.noPay': 'Тўлов йўқ', 'pdf.paid': 'Тўланган',
    'pdf.gave': 'Топширди: ____________', 'pdf.got': 'Қабул қилди: ____________',
    'base.title': 'База', 'base.sub': 'Мижозлар ва товарлар рўйхати',
    'base.addClient': '+ Мижоз қўшиш', 'base.addProduct': '+ Товар қўшиш',
    'base.clients': 'Мижозлар', 'base.products': 'Товарлар', 'base.search': 'Қидириш',
    'base.colName': 'Номи', 'base.edit': 'Таҳрирлаш', 'base.del': 'Ўчириш',
    'base.noClient': 'Мижоз йўқ', 'base.noProduct': 'Товар йўқ', 'base.emptyHint': 'Юқоридаги тугма орқали қўшинг.',
    'base.hasDebts': 'Бу мижознинг қарзлари бор, ўчириб бўлмайди',
    'base.delOk': 'Ўчиришни тасдиқлайсизми?', 'base.client': 'Мижоз', 'base.product': 'Товар',
    'base.editOf': 'таҳрири', 'base.addOf': 'қўшиш', 'base.fullName': 'Исм фамилия',
    'base.prodName': 'Товар номи', 'base.phone': 'Телефон рақами', 'base.tg': 'Telegram username',
    'base.needNameC': 'Исмни киритинг.', 'base.needNameP': 'Товар номини киритинг.',
    'base.needPhone': 'Телефон рақамини киритинг.', 'base.saved': 'Сақланди',
    'users.title': 'Фойдаланувчилар', 'users.sub': 'Тизимга кириш ҳуқуқи ва роллар',
    'users.add': '+ Фойдаланувчи қўшиш', 'users.colName': 'Исм фамилия',
    'users.del': 'Ўчириш', 'users.delOk': 'Фойдаланувчи ўчирилсинми?',
    'users.new': 'Янги фойдаланувчи', 'users.role': 'Рол',
    'users.roleM': 'Менежер — қарз ва базани бошқаради',
    'users.roleC': 'Кассир — фақат тўлов қабул қилади',
    'users.roleS': 'Супер админ — тўлиқ ҳуқуқ',
    'users.email': 'Email', 'users.pass': 'Парол (камида 6 белги)',
    'users.register': 'Рўйхатдан ўтказиш',
    'users.needName': 'Исм фамилияни киритинг.', 'users.badEmail': "Email нотўғри форматда.",
    'users.shortPass': 'Парол камида 6 белгидан иборат бўлсин.',
    'users.exists': 'Бу email билан фойдаланувчи мавжуд.', 'users.added': 'Фойдаланувчи қўшилди',
    'ui.close': 'Ёпиш', 'ui.ok': 'Тасдиқлаш', 'script.latn': 'Lotin', 'script.cyrl': 'Кирилл',
    'cur.uzs': 'Сўм', 'cur.usd': 'USD', 'cur.rate': '1 USD курс',
    'cur.cbu': 'Марказий банк', 'cur.cbuOff': 'Охирги сақланган курс',
    'debt.currency': 'Валюта', 'nak.native': 'Қарз валютаси'
  }
};

const AP = "'ʻʼ‘’`'´′";
const isAp = ch => AP.includes(ch);
const casify = (src, dst) => {
  if (!src) return dst;
  if (src.length > 1 && src === src.toUpperCase()) return dst.toUpperCase();
  if (src[0] !== src[0].toLowerCase()) return dst[0].toUpperCase() + dst.slice(1);
  return dst;
};

function latToCyr(text) {
  const one = { a: 'а', b: 'б', c: 'с', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з' };
  let out = '', i = 0, s = String(text ?? '');
  while (i < s.length) {
    const a = s[i], b = s[i + 1] || '', c = s[i + 2] || '';
    const pair = (a + b).toLowerCase();
    const eat = (n, dst) => { out += casify(s.slice(i, i + n), dst); i += n; };
    if ((pair[0] === 'o' && isAp(b)) || pair === 'oʻ' || pair === 'oʼ') { eat(2, 'ў'); continue; }
    if ((pair[0] === 'g' && isAp(b)) || pair === 'gʻ' || pair === 'gʼ') { eat(2, 'ғ'); continue; }
    if (pair === 'yo') { eat(2, 'ё'); continue; }
    if (pair === 'yu') { eat(2, 'ю'); continue; }
    if (pair === 'ya') { eat(2, 'я'); continue; }
    if (pair === 'ye') { eat(2, 'е'); continue; }
    if (pair === 'sh') { eat(2, 'ш'); continue; }
    if (pair === 'ch') { eat(2, 'ч'); continue; }
    if (pair === 'ts') { eat(2, 'ц'); continue; }
    const low = a.toLowerCase();
    if (one[low]) { eat(1, one[low]); continue; }
    out += a; i++;
  }
  return out;
}

function cyrToLat(text) {
  const map = { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': "'", 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'қ': 'q', 'ғ': "g'", 'ҳ': 'h' };
  let out = '';
  for (const ch of String(text ?? '')) {
    const low = ch.toLowerCase(), dst = map[low];
    if (dst == null) { out += ch; continue; }
    out += ch === ch.toUpperCase() && ch !== ch.toLowerCase()
      ? dst.charAt(0).toUpperCase() + dst.slice(1) : dst;
  }
  return out;
}

const t = (k, vars) => {
  let s = I18N[script][k] ?? I18N.latn[k] ?? k;
  if (vars) Object.entries(vars).forEach(([a, b]) => { s = s.replaceAll('{' + a + '}', b); });
  return s;
};

function disp(s) {
  s = String(s ?? '');
  const cyr = /[\u0400-\u04FF]/.test(s);
  if (script === 'cyrl') return cyr ? s : latToCyr(s);
  return cyr ? cyrToLat(s) : s;
}

function applyStatic() {
  document.title = t('app.title');
  document.documentElement.lang = script === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
    el.title = t(el.dataset.i18nAria);
  });
  document.querySelectorAll('[data-script-switch]').forEach(box => {
    box.innerHTML = `<button type="button" data-script="latn">${t('script.latn')}</button><button type="button" data-script="cyrl">${t('script.cyrl')}</button>`;
    box.querySelectorAll('[data-script]').forEach(b => {
      b.classList.toggle('on', b.dataset.script === script);
      b.onclick = () => setScript(b.dataset.script);
    });
  });
  if (typeof paintCurrency === 'function') paintCurrency();
}

function setScript(mode) {
  if (mode !== 'latn' && mode !== 'cyrl') return;
  script = mode;
  localStorage.setItem(SCRIPT_KEY, script);
  if (typeof closeModal === 'function') closeModal();
  applyStatic();
  if (typeof bootShell === 'function' && me && $('#nav')) bootShell(document.body.dataset.page);
  if (typeof renderPage === 'function') renderPage();
}
