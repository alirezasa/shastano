// قالب مشترک پنل‌ها (منوی کناری + ناحیه‌ی محتوا) و کنترل دسترسی
import { html, mount } from '../core/util.js';
import { faNum, fmtDate, relTime } from '../core/format.js';
import { icon, statusBadge } from '../ui/components.js';
import { url, loginUrl } from '../ui/urls.js';
import { AUDIT_ACTIONS } from '../schema.js';

export function renderShell(root, { title, subtitle, badge, nav, active }) {
  mount(root, html`
    <div class="tw-bg-surface-dark tw-text-white">
      <div class="shn-container tw-flex tw-flex-col tw-gap-2 tw-py-6 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
        <div>
          ${badge ? html`<span class="tw-inline-block tw-rounded tw-bg-amber-500 tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-bold tw-text-slate-950">${badge}</span>` : ''}
          <h1 class="tw-mt-1 tw-text-xl tw-font-bold">${title}</h1>
          ${subtitle ? html`<p class="tw-text-xs tw-text-slate-300">${subtitle}</p>` : ''}
        </div>
      </div>
    </div>
    <div class="shn-container tw-grid tw-grid-cols-1 tw-gap-6 tw-py-6 lg:tw-grid-cols-[15rem_1fr]">
      <nav class="tw-min-w-0 lg:tw-sticky lg:tw-top-24 lg:tw-self-start" aria-label="منوی پنل">
        <div class="tw-flex tw-gap-1 tw-overflow-x-auto tw-rounded-2xl tw-bg-white tw-p-2 tw-shadow-soft lg:tw-flex-col shn-scroll">
          ${nav.map((n) => (n.divider ? html`<p class="tw-hidden tw-px-3 tw-pb-1 tw-pt-3 tw-text-[11px] tw-font-bold tw-text-ink-soft lg:tw-block">${n.divider}</p>` : html`
            <a href="${n.href}" class="shn-side-link tw-shrink-0 ${n.key === active ? 'is-active' : ''}" ${n.key === active ? html`aria-current="page"` : ''}>
              ${icon(n.icon, 'tw-w-5 tw-text-center')}<span class="tw-flex-1 tw-whitespace-nowrap">${n.label}</span>
              ${n.badge ? html`<span class="tw-rounded-full tw-bg-accent-600 tw-px-2 tw-text-[11px] tw-text-white">${faNum(n.badge)}</span>` : ''}
            </a>`))}
        </div>
      </nav>
      <section data-shn="panel-main" class="tw-min-w-0" aria-live="polite"></section>
    </div>`);
  return root.querySelector('[data-shn="panel-main"]');
}

export function accessDenied(root, user, need) {
  const isAnon = user.isAnonymous;
  mount(root, html`<div class="shn-container tw-py-16"><div class="shn-card tw-mx-auto tw-max-w-lg tw-p-10 tw-text-center">
    <span class="tw-mx-auto tw-flex tw-h-16 tw-w-16 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-amber-50 tw-text-3xl tw-text-amber-600">${icon(isAnon ? 'fa-right-to-bracket' : 'fa-lock')}</span>
    <h1 class="tw-mt-5 tw-text-lg tw-font-bold">${isAnon ? 'برای دسترسی به این بخش وارد شوید' : 'شما به این بخش دسترسی ندارید'}</h1>
    <p class="tw-mt-2 tw-text-sm tw-leading-7 tw-text-ink-muted">این بخش مخصوص ${need === 'holding' ? 'کاربران هلدینگ شستان' : 'کاربران شرکت‌های تابعه'} است.</p>
    <div class="tw-mt-6 tw-flex tw-justify-center tw-gap-2">
      ${isAnon ? html`<a href="${loginUrl()}" class="shn-btn shn-btn-brand">ورود به سامانه</a>` : ''}
      ${user.role === 'holding' ? html`<a href="${url('adminPanel')}" class="shn-btn shn-btn-primary">کارتابل هلدینگ</a>` : ''}
      ${user.role === 'company' ? html`<a href="${url('companyPanel')}" class="shn-btn shn-btn-primary">پنل شرکت</a>` : ''}
      <a href="${url('home')}" class="shn-btn shn-btn-ghost">صفحه اصلی</a>
    </div></div></div>`);
}

export function statCard({ label, value, icon: ic, tone, href, hint }) {
  const tones = {
    amber: 'tw-bg-amber-50 tw-text-amber-600', orange: 'tw-bg-orange-50 tw-text-orange-600', green: 'tw-bg-brand-50 tw-text-brand-600',
    slate: 'tw-bg-slate-100 tw-text-slate-600', blue: 'tw-bg-ocean-50 tw-text-ocean-600', red: 'tw-bg-accent-50 tw-text-accent-600'
  };
  const inner = html`<span class="tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-xl ${tones[tone] || tones.slate}">${icon(ic, 'tw-text-lg')}</span>
    <span><span class="tw-block tw-text-2xl tw-font-bold">${faNum(value)}</span><span class="tw-block tw-text-xs tw-font-bold tw-text-ink-muted">${label}</span>
    ${hint ? html`<span class="tw-block tw-text-[11px] tw-text-ink-soft">${hint}</span>` : ''}</span>`;
  return href
    ? html`<a href="${href}" class="shn-card shn-card-hover tw-flex tw-items-center tw-gap-4 tw-p-5">${inner}</a>`
    : html`<div class="shn-card tw-flex tw-items-center tw-gap-4 tw-p-5">${inner}</div>`;
}

/** خط زمانی سابقه‌ی یک قلم */
export function timeline(entries) {
  if (!entries?.length) return html`<p class="tw-text-sm tw-text-ink-muted">سابقه‌ای ثبت نشده است.</p>`;
  const tone = { Approve: 'tw-bg-brand-600', Return: 'tw-bg-orange-500', Reject: 'tw-bg-accent-600', Submit: 'tw-bg-amber-500', Archive: 'tw-bg-slate-500' };
  return html`<ol class="tw-relative tw-space-y-5 tw-border-r-2 tw-border-slate-100 tw-pr-5">
    ${[...entries].reverse().map((e) => html`<li class="tw-relative">
      <span class="tw-absolute -tw-right-[27px] tw-top-1.5 tw-h-3 tw-w-3 tw-rounded-full tw-ring-4 tw-ring-white ${tone[e.Action] || 'tw-bg-ocean-500'}"></span>
      <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-x-2 tw-text-sm"><b>${AUDIT_ACTIONS[e.Action] || e.Action}</b><span class="tw-text-xs tw-text-ink-muted">${e.Actor} · <time datetime="${e.Date}" title="${fmtDate(e.Date)}">${relTime(e.Date)}</time></span></div>
      ${e.Comment ? html`<p class="tw-mt-1 tw-rounded-xl tw-bg-slate-50 tw-p-3 tw-text-sm tw-leading-7">${e.Comment}</p>` : ''}
    </li>`)}
  </ol>`;
}

export function itemsTable(items, { columns, actions, empty = 'موردی وجود ندارد.' }) {
  if (!items.length) return html`<div class="shn-card tw-p-10 tw-text-center tw-text-sm tw-text-ink-muted">${icon('fa-inbox', 'tw-mb-3 tw-block tw-text-3xl tw-text-ink-soft')}${empty}</div>`;
  return html`<div class="shn-card tw-overflow-hidden"><div class="tw-relative tw-overflow-x-auto"><table class="shn-table">
    <thead><tr>${columns.map((c) => html`<th scope="col">${c.label}</th>`)}${actions ? html`<th scope="col" class="tw-text-center">عملیات</th>` : ''}</tr></thead>
    <tbody>${items.map((it) => html`<tr>${columns.map((c) => html`<td class="${c.cls || ''}">${c.render(it)}</td>`)}${actions ? html`<td class="tw-whitespace-nowrap tw-text-center">${actions(it)}</td>` : ''}</tr>`)}</tbody>
  </table></div></div>`;
}

export { statusBadge };
