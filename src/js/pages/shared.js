// توابع کمکی مشترک بین صفحات
import { faNum } from '../core/format.js';

const TRL_TEXT = ['', 'اصول پایه', 'مفهوم فناوری', 'اثبات مفهوم', 'تأیید آزمایشگاهی', 'تأیید در محیط مرتبط', 'نمونه در محیط مرتبط', 'نمونه در محیط عملیاتی', 'سامانه‌ی کامل و تأییدشده', 'اثبات در عملیات واقعی'];
export const TRL_LABEL = (v) => `TRL ${faNum(v)} — ${TRL_TEXT[Number(v)] || ''}`;

import { html, paragraphs, safeUrl } from '../core/util.js';
import { fmtDate } from '../core/format.js';
import { TYPES, choiceLabel } from '../schema.js';
import { getPublicItem } from '../data/repository.js';
import { openDialog, toast } from '../ui/overlay.js';
import { icon, progressBar, domainChip, fileSize } from '../ui/components.js';
import { url } from '../ui/urls.js';

/** نمایش مقدار یک فیلد برای خواندن */
export function fieldValue(f, it) {
  if (f.type === 'domain') return it.DomainTitle || '—';
  if (f.type === 'category') return it.CategoryTitle || '—';
  const v = it[f.name];
  if (v == null || v === '') return '—';
  if (f.type === 'date') return fmtDate(v);
  if (f.type === 'choice') return choiceLabel(f, v);
  if (f.type === 'percent') return progressBar(v);
  if (f.type === 'number') return faNum(v);
  if (f.type === 'url') return html`<a href="${safeUrl(v)}" target="_blank" rel="noopener noreferrer" class="shn-btn-link" dir="ltr">${v}</a>`;
  if (f.type === 'email') return html`<a href="mailto:${v}" class="shn-btn-link" dir="ltr">${v}</a>`;
  if (f.type === 'note') return html`<div class="shn-prose tw-leading-7">${paragraphs(v)}</div>`;
  return String(v);
}

/** جزئیات کامل یک قلم (برای مودال عمومی و کارتابل) */
export function itemDetails(it, { skip = [] } = {}) {
  const def = TYPES[it.type];
  const fields = def.fields.filter((f) => f.type !== 'files' && !f.holdingOnly && f.name !== 'Title' && !skip.includes(f.name));
  const short = fields.filter((f) => f.type !== 'note');
  const long = fields.filter((f) => f.type === 'note');
  return html`
    <dl class="tw-grid tw-grid-cols-1 tw-gap-x-6 tw-gap-y-3 tw-text-sm sm:tw-grid-cols-2">
      ${short.map((f) => html`<div><dt class="tw-text-xs tw-text-ink-muted">${f.label}</dt><dd class="tw-mt-0.5 tw-font-bold">${fieldValue(f, it)}</dd></div>`)}
    </dl>
    ${long.map((f) => (it[f.name] ? html`<div class="tw-mt-5"><h3 class="tw-mb-1 tw-text-xs tw-font-bold tw-text-ink-muted">${f.label}</h3><div class="tw-text-sm">${fieldValue(f, it)}</div></div>` : ''))}
    ${it.Attachments?.length ? html`<div class="tw-mt-5"><h3 class="tw-mb-2 tw-text-xs tw-font-bold tw-text-ink-muted">پیوست‌ها</h3>
      <ul class="tw-space-y-1.5">${it.Attachments.map((a) => html`<li><a href="${a.url || '#'}" ${a.url ? '' : 'data-demo-file'} class="tw-flex tw-items-center tw-gap-2 tw-rounded-lg tw-bg-slate-50 tw-px-3 tw-py-2 tw-text-sm hover:tw-bg-slate-100">${icon('fa-paperclip', 'tw-text-ocean-600')}${a.name}<span class="tw-me-auto tw-text-xs tw-text-ink-soft">${fileSize(a.size)}</span></a></li>`)}</ul></div>` : ''}`;
}

export async function openItemDialog(type, id) {
  const it = await getPublicItem(type, id);
  if (!it) { toast('این مورد یافت نشد.', 'error'); return; }
  const def = TYPES[type];
  const dlg = openDialog({
    title: def.label,
    body: html`
      <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-gap-2">${domainChip(it.DomainTitle)}${it.Code ? html`<span class="shn-chip tw-bg-slate-100 tw-text-slate-500" dir="ltr">${it.Code}</span>` : ''}</div>
      <h3 class="tw-text-lg tw-font-bold tw-leading-8">${it.Title}</h3>
      ${it.CompanyTitle ? html`<a href="${url('company', { id: it.CompanyId })}" class="tw-mt-1 tw-inline-flex tw-items-center tw-gap-1 tw-text-sm tw-font-bold tw-text-ocean-700 hover:tw-underline">${icon('fa-building', 'tw-text-xs')}${it.CompanyTitle}</a>` : ''}
      <div class="tw-mt-5 tw-border-t tw-border-slate-100 tw-pt-5">${itemDetails(it)}</div>`,
    footer: html`<button type="button" class="shn-btn shn-btn-ghost" data-dlg-close>بستن</button>`
  });
  dlg.el.addEventListener('click', (e) => { if (e.target.closest('[data-demo-file]')) { e.preventDefault(); toast('در نسخه‌ی نمایشی فایل‌ها ذخیره نمی‌شوند.', 'info'); } });
}

/** فعال‌سازی کلیک روی [data-open-item] در یک ناحیه */
export function bindItemDialogs(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-item]');
    if (!b) return;
    const [type, id] = b.dataset.openItem.split(':');
    openItemDialog(type, id);
  });
}
