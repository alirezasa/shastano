// قالب‌بندی تاریخ شمسی و اعداد فارسی

const dateLong = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
const dateShort = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const yearLatn = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric' });

const valid = (d) => d && !Number.isNaN(new Date(d).getTime());

export const fmtDate = (d) => (valid(d) ? dateLong.format(new Date(d)) : '—');
export const fmtDateShort = (d) => (valid(d) ? dateShort.format(new Date(d)) : '—');
export const fmtToday = () => weekday.format(new Date());
export const jalaliYear = (d = new Date()) => parseInt(yearLatn.format(new Date(d)), 10);

export const faNum = (n) => (n == null || n === '' ? '—' : Number(n).toLocaleString('fa-IR'));
export const faDigits = (s) => String(s ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export function daysLeft(d) {
  if (!valid(d)) return null;
  const end = new Date(d); end.setHours(23, 59, 59, 999);
  return Math.ceil((end - Date.now()) / 86400000);
}

export function relTime(d) {
  if (!valid(d)) return '';
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'لحظاتی پیش';
  if (diff < 3600) return `${faNum(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${faNum(Math.floor(diff / 3600))} ساعت پیش`;
  if (diff < 86400 * 30) return `${faNum(Math.floor(diff / 86400))} روز پیش`;
  return fmtDate(d);
}

/** تاریخ ورودی input[type=date] (میلادی) → ISO */
export const toIsoDate = (v) => (v ? new Date(`${v}T00:00:00`).toISOString() : null);
export const toInputDate = (d) => {
  if (!valid(d)) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
