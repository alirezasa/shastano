// اجزای مشترک رابط کاربری (همه خروجی html`` امن دارند)
import { html, raw } from '../core/util.js';
import { fmtDate, faNum, daysLeft } from '../core/format.js';
import { WORKFLOW, PRIORITIES, CALL_STATUS, TYPES, fieldOf, choiceLabel } from '../schema.js';
import { url } from './urls.js';
import { isOpenCall } from '../data/repository.js';

// کلاس‌های کامل (برای اسکن Tailwind باید به‌صورت کامل نوشته شوند)
export const TONE = {
  slate: { chip: 'tw-bg-slate-100 tw-text-slate-700', soft: 'tw-bg-slate-100 tw-text-slate-600', solid: 'tw-bg-slate-600' },
  amber: { chip: 'tw-bg-amber-100 tw-text-amber-800', soft: 'tw-bg-amber-50 tw-text-amber-600', solid: 'tw-bg-amber-500' },
  orange: { chip: 'tw-bg-orange-100 tw-text-orange-800', soft: 'tw-bg-orange-50 tw-text-orange-600', solid: 'tw-bg-orange-500' },
  red: { chip: 'tw-bg-accent-100 tw-text-accent-800', soft: 'tw-bg-accent-50 tw-text-accent-600', solid: 'tw-bg-accent-600' },
  green: { chip: 'tw-bg-brand-100 tw-text-brand-800', soft: 'tw-bg-brand-50 tw-text-brand-600', solid: 'tw-bg-brand-600' },
  blue: { chip: 'tw-bg-ocean-100 tw-text-ocean-800', soft: 'tw-bg-ocean-50 tw-text-ocean-600', solid: 'tw-bg-ocean-600' },
  sky: { chip: 'tw-bg-sky-100 tw-text-sky-800', soft: 'tw-bg-sky-50 tw-text-sky-600', solid: 'tw-bg-sky-600' },
  cyan: { chip: 'tw-bg-cyan-100 tw-text-cyan-800', soft: 'tw-bg-cyan-50 tw-text-cyan-600', solid: 'tw-bg-cyan-600' },
  purple: { chip: 'tw-bg-purple-100 tw-text-purple-800', soft: 'tw-bg-purple-50 tw-text-purple-600', solid: 'tw-bg-purple-600' },
  indigo: { chip: 'tw-bg-indigo-100 tw-text-indigo-800', soft: 'tw-bg-indigo-50 tw-text-indigo-600', solid: 'tw-bg-indigo-600' }
};
const tone = (t) => TONE[t] || TONE.slate;

export const icon = (name, cls = '') => {
  const base = /fa-(regular|brands)\b/.test(name) ? name : `fa-solid ${name}`;
  return html`<i class="${base} ${cls}" aria-hidden="true"></i>`;
};

export function statusBadge(status) {
  const s = WORKFLOW[status] || WORKFLOW.Draft;
  return html`<span class="shn-badge ${tone(s.tone).chip}">${icon(s.icon, 'tw-text-[10px]')}${s.label}</span>`;
}

export function priorityBadge(value) {
  const p = PRIORITIES.find((x) => x.value === value);
  if (!p) return '';
  return html`<span class="shn-chip ${tone(p.tone).chip}">${icon('fa-signal', 'tw-text-[9px]')}اولویت ${p.label}</span>`;
}

export function callBadge(item) {
  if (item.CallStatus === 'Open' && !isOpenCall(item)) return html`<span class="shn-badge ${TONE.slate.chip}">مهلت به پایان رسیده</span>`;
  const c = CALL_STATUS.find((x) => x.value === item.CallStatus);
  return c ? html`<span class="shn-badge ${tone(c.tone).chip}">${c.label}</span>` : '';
}

export function deadlineBadge(date) {
  const d = daysLeft(date);
  if (d == null) return '';
  if (d < 0) return html`<span class="tw-text-xs tw-text-ink-soft">${icon('fa-clock')} مهلت: ${fmtDate(date)}</span>`;
  const urgent = d <= 7;
  return html`<span class="tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold ${urgent ? 'tw-text-accent-700' : 'tw-text-ink-muted'}">
    ${icon('fa-clock')} ${d === 0 ? 'آخرین روز مهلت' : `${faNum(d)} روز تا پایان مهلت`}</span>`;
}

export function domainChip(title) {
  return title ? html`<span class="shn-chip tw-bg-slate-100 tw-text-slate-600">${icon('fa-layer-group', 'tw-text-[9px]')}${title}</span>` : '';
}

export function progressBar(value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return html`<div class="tw-flex tw-items-center tw-gap-2" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="پیشرفت">
    <div class="tw-h-2 tw-flex-1 tw-overflow-hidden tw-rounded-full tw-bg-slate-100"><div class="tw-h-full tw-rounded-full ${v >= 100 ? 'tw-bg-brand-600' : 'tw-bg-ocean-600'}" style="width:${v}%"></div></div>
    <span class="tw-text-xs tw-font-bold tw-text-ink-muted">${faNum(v)}٪</span></div>`;
}

export function challengeCard(c, { compact = false } = {}) {
  return html`
  <article class="shn-card shn-card-hover tw-flex tw-flex-col tw-p-5">
    <div class="tw-flex tw-items-start tw-justify-between tw-gap-3">
      <a href="${url('company', { id: c.CompanyId })}" class="shn-chip tw-bg-ocean-50 tw-text-ocean-700 hover:tw-bg-ocean-100 tw-max-w-[65%] tw-truncate">${icon('fa-building', 'tw-text-[9px]')}${c.CompanyTitle}</a>
      ${callBadge(c)}
    </div>
    <h3 class="tw-mt-3 tw-text-base tw-font-bold tw-leading-7">
      <a href="${url('challenge', { id: c.Id })}" class="hover:tw-text-ocean-700">${c.Title}</a>
    </h3>
    ${compact ? '' : html`<p class="tw-mt-2 tw-text-sm tw-leading-7 tw-text-ink-muted shn-line-clamp-2">${c.Summary}</p>`}
    <div class="tw-mt-3 tw-flex tw-flex-wrap tw-gap-1.5">${domainChip(c.DomainTitle)}${priorityBadge(c.Priority)}</div>
    <div class="tw-mt-auto tw-flex tw-items-center tw-justify-between tw-gap-2 tw-border-t tw-border-slate-100 tw-pt-3 tw-mt-4">
      ${deadlineBadge(c.Deadline)}
      <a href="${url('challenge', { id: c.Id })}" class="shn-btn-link tw-text-xs tw-inline-flex tw-items-center tw-gap-1">${isOpenCall(c) ? 'جزئیات و ارسال پیشنهاد' : 'مشاهده جزئیات'} ${icon('fa-arrow-left', 'tw-text-[10px]')}</a>
    </div>
  </article>`;
}

/** کارت عمومی برای انواع دستاوردها */
export function itemCard(it, { onOpen = true } = {}) {
  const def = TYPES[it.type];
  const t = tone(def.tone);
  const meta = (def.card?.meta || []).map((name) => {
    if (name === 'Domain') return domainChip(it.DomainTitle);
    const f = fieldOf(it.type, name);
    const v = choiceLabel(f, it[name]);
    return v ? html`<span class="shn-chip tw-bg-slate-100 tw-text-slate-600">${v}</span>` : '';
  });
  const dateField = def.card?.date;
  return html`
  <article class="shn-card shn-card-hover tw-flex tw-flex-col tw-p-5">
    <div class="tw-flex tw-items-start tw-gap-3">
      <span class="tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl ${t.soft}">${icon(def.icon, 'tw-text-lg')}</span>
      <div class="tw-min-w-0 tw-flex-1">
        <h3 class="tw-text-base tw-font-bold tw-leading-7">${onOpen ? html`<button type="button" class="tw-text-right hover:tw-text-ocean-700" data-open-item="${it.type}:${it.Id}">${it.Title}</button>` : it.Title}</h3>
        ${it.CompanyTitle ? html`<a href="${url('company', { id: it.CompanyId })}" class="tw-text-xs tw-font-bold tw-text-ocean-700 hover:tw-underline">${it.CompanyTitle}</a>` : ''}
      </div>
    </div>
    <p class="tw-mt-3 tw-text-sm tw-leading-7 tw-text-ink-muted shn-line-clamp-3">${it.Summary}</p>
    <div class="tw-mt-3 tw-flex tw-flex-wrap tw-gap-1.5">${meta}</div>
    ${def.card?.progress ? html`<div class="tw-mt-3">${progressBar(it[def.card.progress])}</div>` : ''}
    <div class="tw-mt-auto tw-flex tw-items-center tw-justify-between tw-border-t tw-border-slate-100 tw-pt-3 tw-mt-4 tw-text-xs tw-text-ink-muted">
      <span>${dateField && it[dateField] ? html`${icon('fa-regular fa-calendar')} ${fmtDate(it[dateField])}` : html`&nbsp;`}</span>
      ${onOpen ? html`<button type="button" class="shn-btn-link tw-text-xs" data-open-item="${it.type}:${it.Id}">جزئیات ${icon('fa-arrow-left', 'tw-text-[10px]')}</button>` : ''}
    </div>
  </article>`;
}

export function companyCard(c, counts = {}) {
  return html`
  <article class="shn-card shn-card-hover tw-flex tw-flex-col tw-p-6">
    <div class="tw-flex tw-items-center tw-gap-3">
      <span class="tw-flex tw-h-14 tw-w-14 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-ocean-50 tw-text-2xl tw-text-ocean-700">${icon(c.Icon || 'fa-building')}</span>
      <div class="tw-min-w-0">
        <h3 class="tw-truncate tw-text-lg tw-font-bold"><a href="${url('company', { id: c.Id })}" class="hover:tw-text-ocean-700">${c.Title}</a></h3>
        ${c.CategoryTitle ? html`<span class="shn-chip tw-bg-slate-100 tw-text-slate-600">${c.CategoryTitle}</span>` : ''}
      </div>
    </div>
    <p class="tw-mt-4 tw-text-sm tw-leading-7 tw-text-ink-muted shn-line-clamp-2">${c.ShortDesc}</p>
    <dl class="tw-mt-4 tw-grid tw-grid-cols-3 tw-gap-2 tw-text-center">
      ${[['مسئله', counts.challenges], ['طرح R&D', counts.rd], ['محصول', counts.products]].map(([l, v]) => html`
        <div class="tw-rounded-xl tw-bg-slate-50 tw-py-2"><dt class="tw-text-[11px] tw-text-ink-muted">${l}</dt><dd class="tw-text-base tw-font-bold">${faNum(v || 0)}</dd></div>`)}
    </dl>
    <a href="${url('company', { id: c.Id })}" class="shn-btn tw-mt-5 tw-bg-surface-dark tw-text-white hover:tw-bg-ocean-700">صفحه اختصاصی شرکت ${icon('fa-arrow-left', 'tw-text-xs')}</a>
  </article>`;
}

export function skeletonCards(n = 3) {
  return html`${Array.from({ length: n }, () => html`
    <div class="shn-card tw-p-5" aria-hidden="true">
      <div class="shn-skeleton tw-h-4 tw-w-1/3"></div>
      <div class="shn-skeleton tw-mt-4 tw-h-5 tw-w-5/6"></div>
      <div class="shn-skeleton tw-mt-2 tw-h-4 tw-w-full"></div>
      <div class="shn-skeleton tw-mt-2 tw-h-4 tw-w-2/3"></div>
      <div class="shn-skeleton tw-mt-6 tw-h-4 tw-w-1/2"></div>
    </div>`)}`;
}

export function emptyState(title, text = '', action = '') {
  return html`
  <div class="tw-col-span-full tw-rounded-card tw-border tw-border-dashed tw-border-slate-300 tw-bg-white tw-px-6 tw-py-14 tw-text-center">
    <span class="tw-mx-auto tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-slate-100 tw-text-2xl tw-text-ink-soft">${icon('fa-folder-open')}</span>
    <h3 class="tw-mt-4 tw-text-base tw-font-bold">${title}</h3>
    ${text ? html`<p class="tw-mt-1 tw-text-sm tw-text-ink-muted">${text}</p>` : ''}
    ${action ? html`<div class="tw-mt-5">${action}</div>` : ''}
  </div>`;
}

export function errorState(err) {
  return html`
  <div class="tw-col-span-full tw-rounded-card tw-border tw-border-accent-200 tw-bg-accent-50 tw-px-6 tw-py-10 tw-text-center tw-text-accent-800">
    ${icon('fa-triangle-exclamation', 'tw-text-2xl')}
    <p class="tw-mt-3 tw-font-bold">دریافت اطلاعات با خطا مواجه شد.</p>
    <p class="tw-mt-1 tw-text-sm">${err?.message || ''}</p>
    <button type="button" class="shn-btn shn-btn-ghost tw-mt-4" onclick="location.reload()">تلاش مجدد</button>
  </div>`;
}

export function pagination({ page, pages }) {
  if (pages <= 1) return '';
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const btn = (p, label, disabled, current) => html`<button type="button" data-page="${p}" ${disabled ? raw('disabled') : ''} ${current ? raw('aria-current="page"') : ''}
    class="tw-flex tw-h-10 tw-min-w-[2.5rem] tw-items-center tw-justify-center tw-rounded-xl tw-px-3 tw-text-sm tw-font-bold ${current ? 'tw-bg-ocean-600 tw-text-white' : 'tw-bg-white tw-border tw-border-surface-line hover:tw-bg-slate-50'}">${label}</button>`;
  return html`<nav class="tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-1.5" aria-label="صفحه‌بندی">
    ${btn(page - 1, raw('<i class="fa-solid fa-chevron-right" aria-hidden="true"></i><span class="tw-sr-only">قبلی</span>'), page <= 1)}
    ${nums.map((n) => (n === '…' ? html`<span class="tw-px-1 tw-text-ink-soft">…</span>` : btn(n, faNum(n), false, n === page)))}
    ${btn(page + 1, raw('<i class="fa-solid fa-chevron-left" aria-hidden="true"></i><span class="tw-sr-only">بعدی</span>'), page >= pages)}
  </nav>`;
}

export function breadcrumb(items) {
  return html`<nav aria-label="مسیر صفحه" class="tw-text-xs tw-text-ink-muted"><ol class="tw-flex tw-flex-wrap tw-items-center tw-gap-1.5">
    ${items.map((it, i) => html`<li class="tw-flex tw-items-center tw-gap-1.5">${i ? icon('fa-chevron-left', 'tw-text-[9px] tw-text-ink-soft') : ''}
      ${it.href ? html`<a href="${it.href}" class="hover:tw-text-ocean-700">${it.label}</a>` : html`<span class="tw-font-bold tw-text-ink" aria-current="page">${it.label}</span>`}</li>`)}
  </ol></nav>`;
}

export function pageHeader({ title, subtitle, crumbs, actions = '' }) {
  return html`
  <div class="tw-border-b tw-border-surface-line tw-bg-white">
    <div class="shn-container tw-py-8">
      ${crumbs ? breadcrumb(crumbs) : ''}
      <div class="tw-mt-3 tw-flex tw-flex-col tw-gap-4 md:tw-flex-row md:tw-items-end md:tw-justify-between">
        <div>
          <h1 class="tw-text-2xl sm:tw-text-3xl tw-font-bold">${title}</h1>
          ${subtitle ? html`<p class="tw-mt-2 tw-max-w-3xl tw-text-sm tw-leading-7 tw-text-ink-muted">${subtitle}</p>` : ''}
        </div>
        ${actions}
      </div>
    </div>
  </div>`;
}

export function fileSize(n) {
  if (!n) return '';
  return n > 1048576 ? `${faNum((n / 1048576).toFixed(1))} مگابایت` : `${faNum(Math.ceil(n / 1024))} کیلوبایت`;
}
