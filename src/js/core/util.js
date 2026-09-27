// ابزارهای پایه. قانون: هر داده‌ای که از لیست‌ها می‌آید فقط از طریق html`` درج شود تا escape شود (جلوگیری از XSS).

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"'`]/g, (c) => ESC[c]);

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
/** رشته‌ای که قبلاً امن شده و نباید دوباره escape شود */
export const raw = (s) => new Raw(String(s ?? ''));

function render(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

/** قالب HTML با escape خودکار مقادیر */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += render(values[i]);
  });
  return new Raw(out);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const shn = (name, root = document) => root.querySelector(`[data-shn="${name}"]`);

export function mount(el, content) {
  if (el) el.innerHTML = render(content);
  return el;
}

/** متن چندخطی ساده → پاراگراف‌های امن */
export function paragraphs(text) {
  const parts = String(text ?? '').split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
  return raw(parts.map((p) => `<p>${esc(p)}</p>`).join(''));
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export function setQs(params) {
  const u = new URL(location.href);
  Object.entries(params).forEach(([k, v]) => {
    if (v === '' || v == null || v === 'all' || (k === 'page' && Number(v) === 1)) u.searchParams.delete(k);
    else u.searchParams.set(k, v);
  });
  history.replaceState(null, '', u);
}

export function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function storage(kind = 'local') {
  const s = () => (kind === 'session' ? window.sessionStorage : window.localStorage);
  return {
    get(key, fallback = null) {
      try { const v = s().getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      try { s().setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    remove(key) {
      try { s().removeItem(key); } catch { /* ignore */ }
    }
  };
}

/** نرمال‌سازی حروف فارسی/عربی برای جستجو */
export function normalizeFa(s) {
  return String(s ?? '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏]/g, ' ')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .toLowerCase().trim();
}

/** فقط لینک‌های http/https/mailto مجازند (جلوگیری از javascript: در داده‌های کاربر) */
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  return /^(https?:\/\/|mailto:)/i.test(s) ? s : '#';
}
