// موتور فرم مبتنی بر schema + انتخابگر تاریخ شمسی + کپچا
import { html, raw, esc } from '../core/util.js';
import { fmtDate, faNum, faDigits } from '../core/format.js';
import { toJalali, toGregorian, monthLength, weekdayIndex, MONTHS, WEEKDAYS } from '../core/jalali.js';
import { TYPES } from '../schema.js';
import { icon, fileSize } from './components.js';
import { getCaptcha } from '../data/repository.js';

const MAX_FILE_MB = 10;
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip', 'rar'];

const req = (f) => (f.required ? html` <span class="tw-text-accent-600" aria-hidden="true">*</span>` : '');

function fieldControl(f, value, ctx) {
  const id = `f-${f.name}`;
  const common = raw(`id="${id}" name="${esc(f.name)}" ${f.required ? 'required aria-required="true"' : ''} aria-describedby="${id}-hint ${id}-err"`);
  const disabled = ctx.readonly?.includes(f.name);
  switch (f.type) {
    case 'note':
      return html`<textarea ${common} rows="${f.rows || 4}" class="shn-input tw-leading-7" ${f.max ? raw(`maxlength="${f.max}"`) : ''} ${disabled ? raw('readonly') : ''} data-counter>${value ?? ''}</textarea>`;
    case 'number':
    case 'percent':
      return html`<input ${common} type="number" inputmode="numeric" class="shn-input" value="${value ?? ''}" min="${f.type === 'percent' ? 0 : f.min ?? ''}" max="${f.type === 'percent' ? 100 : f.max ?? ''}" ${disabled ? raw('readonly') : ''}>`;
    case 'choice':
      return html`<select ${common} class="shn-input" ${disabled ? raw('disabled') : ''}>
        <option value="">انتخاب کنید…</option>
        ${f.options.map((o) => html`<option value="${o.value}" ${String(o.value) === String(value ?? '') ? raw('selected') : ''}>${o.label}</option>`)}
      </select>`;
    case 'domain':
    case 'category': {
      const opts = f.type === 'domain' ? ctx.domains : ctx.categories;
      const cur = f.type === 'domain' ? ctx.values.DomainId : ctx.values.CategoryId;
      return html`<select ${common} class="shn-input" ${disabled ? raw('disabled') : ''}>
        <option value="">انتخاب کنید…</option>
        ${(opts || []).map((o) => html`<option value="${o.Id}" ${Number(cur) === o.Id ? raw('selected') : ''}>${o.Title}</option>`)}
      </select>`;
    }
    case 'date':
      return html`<div class="tw-relative" data-jdate>
        <input type="hidden" name="${f.name}" value="${value ?? ''}">
        <button type="button" id="${id}" class="shn-input tw-flex tw-items-center tw-justify-between tw-text-right" aria-haspopup="dialog" aria-describedby="${id}-hint ${id}-err" ${disabled ? raw('disabled') : ''}>
          <span data-jdate-label class="${value ? '' : 'tw-text-slate-400'}">${value ? fmtDate(value) : 'انتخاب تاریخ'}</span>
          ${icon('fa-regular fa-calendar', 'tw-text-ink-soft')}
        </button>
      </div>`;
    case 'files':
      return html`<div>
        ${ctx.values.Attachments?.length ? html`<ul class="tw-mb-2 tw-space-y-1 tw-text-xs">${ctx.values.Attachments.map((a) => html`<li class="tw-flex tw-items-center tw-gap-2 tw-text-ink-muted">${icon('fa-paperclip')}${a.name}</li>`)}</ul>` : ''}
        <label class="tw-flex tw-cursor-pointer tw-flex-col tw-items-center tw-justify-center tw-gap-1 tw-rounded-xl tw-border-2 tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-px-4 tw-py-6 tw-text-center tw-text-sm tw-text-ink-muted hover:tw-border-ocean-400 hover:tw-bg-ocean-50">
          ${icon('fa-cloud-arrow-up', 'tw-text-2xl tw-text-ocean-600')}
          <span><b class="tw-text-ocean-700">انتخاب فایل</b> یا رها کردن فایل در این قسمت</span>
          <span class="tw-text-xs">حداکثر ${faNum(MAX_FILE_MB)} مگابایت — ${ALLOWED_EXT.slice(0, 7).join('، ')}، …</span>
          <input id="${id}" name="${f.name}" type="file" multiple class="tw-sr-only" data-files accept="${ALLOWED_EXT.map((x) => `.${x}`).join(',')}">
        </label>
        <ul class="tw-mt-2 tw-space-y-1 tw-text-xs" data-file-list></ul>
      </div>`;
    default: {
      const t = { url: 'url', email: 'email', phone: 'tel' }[f.type] || 'text';
      const ltr = ['url', 'email', 'phone'].includes(f.type);
      return html`<input ${common} type="${t}" class="shn-input ${ltr ? 'tw-text-left' : ''}" ${ltr ? raw('dir="ltr"') : ''} value="${value ?? ''}" ${f.max ? raw(`maxlength="${f.max}"`) : ''} ${disabled ? raw('readonly') : ''}>`;
    }
  }
}

/** رندر فیلدهای فرم یک نوع محتوا */
export function renderFields(type, values = {}, { role = 'company', domains = [], categories = [], readonly = [] } = {}) {
  const ctx = { values, domains, categories, readonly };
  const fields = TYPES[type].fields.filter((f) => role === 'holding' || !f.holdingOnly || readonly.includes(f.name));
  const wide = (f) => ['note', 'files'].includes(f.type) || f.name === 'Title';
  return html`<div class="tw-grid tw-grid-cols-1 tw-gap-x-5 tw-gap-y-5 sm:tw-grid-cols-2">
    ${fields.map((f) => {
      const v = f.type === 'domain' ? values.DomainId : f.type === 'category' ? values.CategoryId : values[f.name];
      return html`<div class="${wide(f) ? 'sm:tw-col-span-2' : ''}" data-field="${f.name}">
        <label class="shn-label" for="f-${f.name}">${f.label}${req(f)}</label>
        ${fieldControl(f, v, ctx)}
        <span id="f-${f.name}-hint" class="shn-hint">${f.hint || ''}${f.max && f.type === 'note' ? html` <span data-count-for="${f.name}"></span>` : ''}</span>
        <span id="f-${f.name}-err" class="shn-error" hidden></span>
      </div>`;
    })}
  </div>`;
}

const RX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  url: /^https?:\/\/[^\s]+$/i,
  phone: /^[0-9۰-۹+()\-\s]{5,40}$/
};

/** جمع‌آوری مقادیر و اعتبارسنجی */
export function collectFields(form, type, { role = 'company', requireAll = true } = {}) {
  const values = {};
  const errors = {};
  let files = [];
  const fields = TYPES[type].fields.filter((f) => role === 'holding' || !f.holdingOnly);
  for (const f of fields) {
    const el = form.elements[f.name];
    if (!el) continue;
    if (f.type === 'files') { files = el._files || Array.from(el.files || []); continue; }
    let v = typeof el.value === 'string' ? el.value.trim() : el.value;
    if (f.type === 'number' || f.type === 'percent') v = v === '' ? null : Number(faDigits(v).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    if (f.type === 'domain' || f.type === 'category') v = v ? Number(v) : null;
    const key = f.type === 'domain' ? 'DomainId' : f.type === 'category' ? 'CategoryId' : f.name;
    values[key] = v === '' ? null : v;

    const empty = v == null || v === '';
    if (empty) { if (f.required && requireAll) errors[f.name] = 'این فیلد الزامی است.'; continue; }
    if (f.max && String(v).length > f.max) errors[f.name] = `حداکثر ${faNum(f.max)} کاراکتر مجاز است.`;
    if (f.type === 'email' && !RX.email.test(v)) errors[f.name] = 'نشانی ایمیل معتبر نیست.';
    if (f.type === 'url' && !RX.url.test(v)) errors[f.name] = 'نشانی باید با http:// یا https:// شروع شود.';
    if (f.type === 'phone' && !RX.phone.test(v)) errors[f.name] = 'شماره تماس معتبر نیست.';
    if ((f.type === 'number' || f.type === 'percent') && Number.isNaN(v)) errors[f.name] = 'عدد معتبر وارد کنید.';
    if (f.type === 'percent' && (v < 0 || v > 100)) errors[f.name] = 'عددی بین ۰ تا ۱۰۰ وارد کنید.';
    if (f.type === 'number' && ((f.min != null && v < f.min) || (f.max != null && v > f.max))) errors[f.name] = `عددی بین ${faNum(f.min)} تا ${faNum(f.max)} وارد کنید.`;
    if (f.type === 'date' && f.future && requireAll && new Date(v) < new Date(new Date().toDateString())) errors[f.name] = 'تاریخ باید امروز یا بعد از آن باشد.';
  }
  const fileErr = validateFiles(files);
  if (fileErr) errors.Attachments = fileErr;
  // بازه‌ی تاریخ
  if (values.StartDate && values.EndDate && new Date(values.EndDate) < new Date(values.StartDate)) errors.EndDate = 'تاریخ پایان نباید قبل از تاریخ شروع باشد.';
  return { values, files, errors };
}

export function validateFiles(files) {
  for (const f of files) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return `نوع فایل «${f.name}» مجاز نیست.`;
    if (f.size > MAX_FILE_MB * 1048576) return `حجم فایل «${f.name}» بیش از ${faNum(MAX_FILE_MB)} مگابایت است.`;
  }
  return null;
}

export function showErrors(form, errors) {
  form.querySelectorAll('[data-field]').forEach((wrap) => {
    const name = wrap.dataset.field;
    const err = wrap.querySelector('.shn-error');
    const ctl = wrap.querySelector('.shn-input');
    if (!err) return;
    if (errors[name]) {
      err.textContent = errors[name]; err.hidden = false; ctl?.setAttribute('aria-invalid', 'true');
    } else {
      err.hidden = true; ctl?.removeAttribute('aria-invalid');
    }
  });
  const first = Object.keys(errors)[0];
  if (first) {
    const wrap = form.querySelector(`[data-field="${first}"]`);
    wrap?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    wrap?.querySelector('input:not([type=hidden]),select,textarea,button')?.focus({ preventScroll: true });
  }
  return !first;
}

/** فعال‌سازی رفتارهای فرم: شمارنده، فایل، تاریخ شمسی */
export function enhanceForm(root) {
  root.querySelectorAll('textarea[data-counter][maxlength]').forEach((ta) => {
    const out = root.querySelector(`[data-count-for="${ta.name}"]`);
    const upd = () => { if (out) out.textContent = `(${faNum(ta.value.length)} از ${faNum(ta.maxLength)})`; };
    ta.addEventListener('input', upd); upd();
  });
  root.querySelectorAll('input[data-files]').forEach((inp) => {
    const label = inp.closest('label');
    const list = label?.parentElement.querySelector('[data-file-list]');
    inp._files = [];
    const render = () => {
      if (!list) return;
      list.innerHTML = String(html`${inp._files.map((f, i) => html`<li class="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-rounded-lg tw-bg-slate-50 tw-px-3 tw-py-2">
        <span class="tw-flex tw-items-center tw-gap-2 tw-truncate">${icon('fa-file')}<span class="tw-truncate">${f.name}</span><span class="tw-text-ink-soft">${fileSize(f.size)}</span></span>
        <button type="button" class="tw-text-accent-600" data-remove-file="${i}" aria-label="حذف فایل">${icon('fa-trash-can')}</button></li>`)}`);
    };
    const add = (files) => { inp._files = [...inp._files, ...Array.from(files)].slice(0, 10); render(); };
    inp.addEventListener('change', () => { add(inp.files); inp.value = ''; });
    list?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove-file]');
      if (b) { inp._files.splice(Number(b.dataset.removeFile), 1); render(); }
    });
    label?.addEventListener('dragover', (e) => { e.preventDefault(); label.classList.add('tw-border-ocean-500'); });
    label?.addEventListener('dragleave', () => label.classList.remove('tw-border-ocean-500'));
    label?.addEventListener('drop', (e) => { e.preventDefault(); label.classList.remove('tw-border-ocean-500'); add(e.dataTransfer.files); });
  });
  root.querySelectorAll('[data-jdate]').forEach(initDatePicker);
}

// ---------- انتخابگر تاریخ شمسی ----------
function initDatePicker(wrap) {
  const hidden = wrap.querySelector('input[type=hidden]');
  const btn = wrap.querySelector('button');
  const label = wrap.querySelector('[data-jdate-label]');
  let pop = null;
  let view = null;

  const set = (date) => {
    hidden.value = date ? date.toISOString() : '';
    label.textContent = date ? fmtDate(date) : 'انتخاب تاریخ';
    label.classList.toggle('tw-text-slate-400', !date);
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const close = () => { pop?.remove(); pop = null; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside); };
  const outside = (e) => { if (pop && !wrap.contains(e.target)) close(); };

  const draw = () => {
    const { jy, jm } = view;
    const first = toGregorian(jy, jm, 1);
    const offset = weekdayIndex(first);
    const len = monthLength(jy, jm);
    const sel = hidden.value ? toJalali(hidden.value) : null;
    const today = toJalali(new Date());
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(html`<span></span>`);
    for (let d = 1; d <= len; d++) {
      const isSel = sel && sel.jy === jy && sel.jm === jm && sel.jd === d;
      const isToday = today.jy === jy && today.jm === jm && today.jd === d;
      cells.push(html`<button type="button" data-day="${d}" class="tw-flex tw-h-9 tw-items-center tw-justify-center tw-rounded-lg tw-text-sm ${isSel ? 'tw-bg-ocean-600 tw-text-white tw-font-bold' : isToday ? 'tw-border tw-border-ocean-300 tw-text-ocean-700 tw-font-bold' : 'hover:tw-bg-slate-100'}">${faNum(d)}</button>`);
    }
    pop.innerHTML = String(html`
      <div class="tw-flex tw-items-center tw-justify-between tw-mb-2">
        <button type="button" data-nav="-1" class="tw-h-8 tw-w-8 tw-rounded-lg hover:tw-bg-slate-100" aria-label="ماه قبل">${icon('fa-chevron-right')}</button>
        <span class="tw-text-sm tw-font-bold">${MONTHS[jm - 1]} ${faNum(jy).replace(/٬/g, '')}</span>
        <button type="button" data-nav="1" class="tw-h-8 tw-w-8 tw-rounded-lg hover:tw-bg-slate-100" aria-label="ماه بعد">${icon('fa-chevron-left')}</button>
      </div>
      <div class="tw-grid tw-grid-cols-7 tw-gap-1 tw-text-center tw-text-[11px] tw-font-bold tw-text-ink-soft tw-mb-1">${WEEKDAYS.map((w) => html`<span>${w}</span>`)}</div>
      <div class="tw-grid tw-grid-cols-7 tw-gap-1">${cells}</div>
      <div class="tw-mt-2 tw-flex tw-justify-between tw-border-t tw-border-slate-100 tw-pt-2 tw-text-xs">
        <button type="button" data-today class="shn-btn-link">امروز</button>
        <button type="button" data-clear class="tw-text-ink-muted hover:tw-text-accent-600">پاک کردن</button>
      </div>`);
  };

  btn.addEventListener('click', () => {
    if (pop) { close(); return; }
    const base = hidden.value ? toJalali(hidden.value) : toJalali(new Date());
    view = { jy: base.jy, jm: base.jm };
    pop = document.createElement('div');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'انتخاب تاریخ');
    pop.className = 'tw-absolute tw-z-30 tw-mt-2 tw-w-72 tw-rounded-2xl tw-border tw-border-surface-line tw-bg-white tw-p-3 tw-shadow-card';
    wrap.appendChild(pop);
    btn.setAttribute('aria-expanded', 'true');
    draw();
    document.addEventListener('mousedown', outside);
    pop.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      const dayBtn = e.target.closest('[data-day]');
      if (nav) {
        view.jm += Number(nav.dataset.nav);
        if (view.jm < 1) { view.jm = 12; view.jy -= 1; }
        if (view.jm > 12) { view.jm = 1; view.jy += 1; }
        draw();
      } else if (dayBtn) {
        const g = toGregorian(view.jy, view.jm, Number(dayBtn.dataset.day));
        g.setHours(12, 0, 0, 0); // ظهر: جلوگیری از جابجایی روز هنگام تبدیل به UTC
        set(g); close(); btn.focus();
      } else if (e.target.closest('[data-today]')) {
        const t = new Date(); t.setHours(12, 0, 0, 0); set(t); close(); btn.focus();
      } else if (e.target.closest('[data-clear]')) {
        set(null); close(); btn.focus();
      }
    });
  });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pop) { e.stopPropagation(); close(); btn.focus(); } });
}

// ---------- کپچا ----------
export function captchaField() {
  return html`<div data-field="CaptchaAnswer" data-captcha>
    <label class="shn-label" for="f-CaptchaAnswer">کد امنیتی <span class="tw-text-accent-600">*</span></label>
    <div class="tw-flex tw-items-center tw-gap-2">
      <input type="hidden" name="CaptchaToken">
      <input id="f-CaptchaAnswer" name="CaptchaAnswer" class="shn-input tw-max-w-[10rem] tw-text-center tw-tracking-[.3em]" inputmode="numeric" autocomplete="off" required aria-describedby="f-CaptchaAnswer-err">
      <img alt="کد امنیتی" class="tw-h-11 tw-w-[140px] tw-rounded-lg tw-border tw-border-surface-line tw-bg-slate-100" data-captcha-img>
      <button type="button" class="tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-lg tw-bg-slate-100 hover:tw-bg-slate-200" data-captcha-refresh aria-label="کد جدید">${icon('fa-rotate')}</button>
    </div>
    <span id="f-CaptchaAnswer-err" class="shn-error" hidden></span>
    <!-- فیلد تله برای ربات‌ها: کاربر واقعی آن را نمی‌بیند -->
    <div class="tw-sr-only" aria-hidden="true"><label>وب‌سایت<input name="Website_hp" tabindex="-1" autocomplete="off"></label></div>
  </div>`;
}

export async function loadCaptcha(root) {
  const box = root.querySelector('[data-captcha]');
  if (!box) return;
  const img = box.querySelector('[data-captcha-img]');
  const refresh = async () => {
    try {
      const c = await getCaptcha();
      img.src = c.image;
      box.querySelector('[name=CaptchaToken]').value = c.token;
      box.querySelector('[name=CaptchaAnswer]').value = '';
    } catch {
      img.alt = 'بارگذاری کد امنیتی ناموفق بود';
    }
  };
  if (!box.dataset.bound) {
    box.dataset.bound = '1';
    box.querySelector('[data-captcha-refresh]').addEventListener('click', refresh);
  }
  await refresh();
}
