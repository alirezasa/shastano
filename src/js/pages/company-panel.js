// پنل شرکت تابعه: داشبورد، اقلام من، فرم ثبت/ویرایش، پروفایل، نماینده، پیشنهادهای دریافتی
import { html, mount, shn, qs } from '../core/util.js';
import { faNum, fmtDate, relTime } from '../core/format.js';
import { TYPES, COMPANY_TYPES, WORKFLOW } from '../schema.js';
import { getCurrentUser, getMyItems, getItem, saveItem, getDomains, getCategories, getHistory, getProposals, getPublishedVersion } from '../data/repository.js';
import { icon, statusBadge, errorState, TONE, fileSize } from '../ui/components.js';
import { renderFields, collectFields, showErrors, enhanceForm } from '../ui/forms.js';
import { toast, confirmDialog } from '../ui/overlay.js';
import { url } from '../ui/urls.js';
import { renderShell, accessDenied, statCard, timeline, itemsTable } from './panel-shell.js';
import { itemDetails } from './shared.js';

const link = (params) => url('companyPanel', params);
const EDITABLE = ['Draft', 'Returned', 'Published', 'Submitted'];

export async function init(user) {
  const root = shn('panel');
  if (user.role !== 'company') { accessDenied(root, user, 'company'); return; }

  const view = qs('view') || 'dashboard';
  const type = COMPANY_TYPES.includes(qs('type')) ? qs('type') : null;
  const all = await Promise.all(COMPANY_TYPES.map((t) => getMyItems(t).catch(() => [])));
  const mine = Object.fromEntries(COMPANY_TYPES.map((t, i) => [t, all[i]]));
  const flat = all.flat();
  const returned = flat.filter((x) => x.WorkflowStatus === 'Returned');

  const nav = [
    { key: 'dashboard', label: 'داشبورد', icon: 'fa-gauge', href: link({}) },
    { divider: 'اطلاعات شرکت' },
    ...COMPANY_TYPES.map((t) => ({ key: `list:${t}`, label: TYPES[t].plural.replace(' (RFP)', ''), icon: TYPES[t].icon, href: link({ view: 'list', type: t }), badge: mine[t].filter((x) => x.WorkflowStatus === 'Returned').length })),
    { divider: 'تنظیمات' },
    { key: 'profile', label: 'پروفایل شرکت', icon: 'fa-building', href: link({ view: 'profile' }) },
    { key: 'contact', label: 'نماینده فناوری', icon: 'fa-id-card', href: link({ view: 'contact' }) },
    { key: 'proposals', label: 'پیشنهادهای دریافتی', icon: 'fa-inbox', href: link({ view: 'proposals' }) }
  ];
  const active = view === 'list' || view === 'new' || view === 'edit' || view === 'item' ? `list:${type}` : view;
  const main = renderShell(root, { title: user.companyTitle, subtitle: `${user.Title} — پنل ثبت و پیگیری اطلاعات شرکت`, badge: 'پنل شرکت تابعه', nav, active });

  try {
    if (view === 'list' && type) renderList(main, type, mine[type]);
    else if ((view === 'new' || view === 'edit') && type) await renderForm(main, type, view === 'edit' ? Number(qs('id')) : null, user);
    else if (view === 'item' && type) await renderItem(main, type, Number(qs('id')));
    else if (view === 'profile') await renderSingleton(main, 'companies', user);
    else if (view === 'contact') await renderSingleton(main, 'contacts', user);
    else if (view === 'proposals') await renderProposals(main);
    else renderDashboard(main, user, flat, returned);
  } catch (e) {
    mount(main, errorState(e));
  }
}

function renderDashboard(main, user, flat, returned) {
  const count = (s) => flat.filter((x) => x.WorkflowStatus === s).length;
  const recent = [...flat].sort((a, b) => new Date(b.Modified) - new Date(a.Modified)).slice(0, 6);
  mount(main, html`
    <div class="tw-grid tw-grid-cols-2 tw-gap-4 xl:tw-grid-cols-4">
      ${statCard({ label: 'پیش‌نویس', value: count('Draft'), icon: 'fa-pen-to-square', tone: 'slate' })}
      ${statCard({ label: 'در انتظار بررسی هلدینگ', value: count('Submitted'), icon: 'fa-hourglass-half', tone: 'amber' })}
      ${statCard({ label: 'برگشت جهت اصلاح', value: count('Returned'), icon: 'fa-rotate-left', tone: 'orange' })}
      ${statCard({ label: 'منتشرشده', value: count('Published'), icon: 'fa-circle-check', tone: 'green' })}
    </div>

    ${returned.length ? html`<div class="tw-mt-6 tw-rounded-card tw-border tw-border-orange-200 tw-bg-orange-50 tw-p-5">
      <h2 class="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold tw-text-orange-800">${icon('fa-triangle-exclamation')} ${faNum(returned.length)} مورد نیاز به اصلاح دارد</h2>
      <ul class="tw-mt-3 tw-space-y-2">${returned.map((it) => html`<li class="tw-flex tw-flex-col tw-gap-2 tw-rounded-xl tw-bg-white tw-p-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
        <div class="tw-min-w-0"><b class="tw-block tw-text-sm">${it.Title}</b>
          <p class="tw-mt-1 tw-text-xs tw-leading-6 tw-text-ink-muted">${icon('fa-comment-dots', 'tw-ms-1')} ${it.LastComment?.Comment || ''}</p></div>
        <a href="${link({ view: 'edit', type: it.type, id: it.Id })}" class="shn-btn shn-btn-sm shn-btn-warning tw-shrink-0">${icon('fa-pen')} اصلاح و ارسال مجدد</a></li>`)}</ul>
    </div>` : ''}

    <div class="tw-mt-6 tw-grid tw-gap-6 xl:tw-grid-cols-3">
      <div class="xl:tw-col-span-2">
        <h2 class="tw-mb-3 tw-text-base tw-font-bold">آخرین تغییرات</h2>
        ${itemsTable(recent, {
          empty: 'هنوز موردی ثبت نکرده‌اید.',
          columns: [
            { label: 'عنوان', render: (it) => html`<a href="${link({ view: 'item', type: it.type, id: it.Id })}" class="tw-font-bold hover:tw-text-ocean-700">${it.Title}</a><span class="tw-block tw-text-xs tw-text-ink-muted">${TYPES[it.type].label}</span>` },
            { label: 'وضعیت', render: (it) => statusBadge(it.WorkflowStatus) },
            { label: 'آخرین تغییر', cls: 'tw-text-xs tw-text-ink-muted tw-whitespace-nowrap', render: (it) => relTime(it.Modified) }
          ]
        })}
      </div>
      <div>
        <h2 class="tw-mb-3 tw-text-base tw-font-bold">ثبت سریع</h2>
        <div class="tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-2 xl:tw-grid-cols-1">
          ${COMPANY_TYPES.map((t) => html`<a href="${link({ view: 'new', type: t })}" class="shn-card shn-card-hover tw-flex tw-items-center tw-gap-3 tw-p-3 tw-text-sm tw-font-bold">
            <span class="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg ${TONE[TYPES[t].tone].soft}">${icon(TYPES[t].icon)}</span>${TYPES[t].label} جدید ${icon('fa-plus', 'tw-me-auto tw-text-xs tw-text-ink-soft')}</a>`)}
        </div>
      </div>
    </div>`);
}

function renderList(main, type, items) {
  const def = TYPES[type];
  const filter = qs('status') || 'all';
  const shown = filter === 'all' ? items : items.filter((x) => x.WorkflowStatus === filter);
  mount(main, html`
    <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
      <h2 class="tw-text-lg tw-font-bold">${def.plural}</h2>
      <a href="${link({ view: 'new', type })}" class="shn-btn shn-btn-primary">${icon('fa-plus')} ${def.label} جدید</a>
    </div>
    <div class="tw-mb-4 tw-flex tw-flex-wrap tw-gap-1.5" role="group" aria-label="فیلتر وضعیت">
      ${['all', 'Draft', 'Submitted', 'Returned', 'Published', 'Rejected', 'Archived'].map((s) => {
        const n = s === 'all' ? items.length : items.filter((x) => x.WorkflowStatus === s).length;
        if (s !== 'all' && !n) return '';
        return html`<a href="${link({ view: 'list', type, status: s === 'all' ? '' : s })}" class="shn-chip tw-px-3 tw-py-1.5 tw-text-xs ${filter === s ? 'tw-bg-ocean-600 tw-text-white' : 'tw-bg-white tw-border tw-border-surface-line'}">${s === 'all' ? 'همه' : WORKFLOW[s].label} (${faNum(n)})</a>`;
      })}
    </div>
    ${itemsTable(shown, {
      empty: `هنوز ${def.label}ی ثبت نشده است.`,
      columns: [
        { label: 'کد', cls: 'tw-text-xs tw-text-ink-muted tw-whitespace-nowrap', render: (it) => html`<span dir="ltr">${it.Code || '—'}</span>` },
        { label: 'عنوان', render: (it) => html`<a href="${link({ view: 'item', type, id: it.Id })}" class="tw-font-bold hover:tw-text-ocean-700">${it.Title}</a>
          ${it.WorkflowStatus !== 'Published' && it.HasPublishedVersion ? html`<span class="tw-mt-1 tw-block tw-text-[11px] tw-text-ocean-700">${icon('fa-circle-info')} نسخه‌ی قبلی همچنان منتشرشده است</span>` : ''}` },
        { label: 'وضعیت', render: (it) => statusBadge(it.WorkflowStatus) },
        { label: 'آخرین تغییر', cls: 'tw-text-xs tw-text-ink-muted tw-whitespace-nowrap', render: (it) => relTime(it.Modified) }
      ],
      actions: (it) => html`<div class="tw-flex tw-justify-center tw-gap-1">
        <a href="${link({ view: 'item', type, id: it.Id })}" class="shn-btn shn-btn-sm shn-btn-soft" title="مشاهده">${icon('fa-eye')}<span class="tw-sr-only">مشاهده</span></a>
        ${EDITABLE.includes(it.WorkflowStatus) ? html`<a href="${link({ view: 'edit', type, id: it.Id })}" class="shn-btn shn-btn-sm shn-btn-soft" title="ویرایش">${icon('fa-pen')}<span class="tw-sr-only">ویرایش</span></a>` : ''}
      </div>`
    })}`);
}

async function renderForm(main, type, id, user) {
  const def = TYPES[type];
  const [domains, categories, item] = await Promise.all([getDomains(), getCategories(), id ? getItem(type, id) : null]);
  if (id && !item) { mount(main, errorState({ message: 'مورد یافت نشد یا به آن دسترسی ندارید.' })); return; }
  if (item && !EDITABLE.includes(item.WorkflowStatus)) { mount(main, errorState({ message: 'این مورد در وضعیت فعلی قابل ویرایش نیست.' })); return; }
  mountForm(main, { type, item, domains, categories, user, back: link({ view: 'list', type }), title: id ? `ویرایش ${def.label}` : `ثبت ${def.label} جدید` });
}

async function renderSingleton(main, type, user) {
  const [domains, categories, items] = await Promise.all([getDomains(), getCategories(), getMyItems(type)]);
  const item = items[0] || null;
  const title = type === 'companies' ? 'پروفایل شرکت' : 'اطلاعات نماینده‌ی فناوری';
  const note = type === 'contacts'
    ? 'این اطلاعات فقط برای کاربران واردشده (شرکت‌های تابعه و هلدینگ) نمایش داده می‌شود و در دسترس کاربران عمومی نیست.'
    : 'نام و دسته‌بندی شرکت توسط هلدینگ تعیین می‌شود. سایر تغییرات پس از تأیید هلدینگ در صفحه‌ی عمومی شرکت نمایش داده می‌شوند.';
  mountForm(main, { type, item, domains, categories, user, back: link({}), title, note, readonly: type === 'companies' ? ['Title', 'Category'] : [] });
}

function mountForm(main, { type, item, domains, categories, user, back, title, note = '', readonly = [] }) {
  const def = TYPES[type];
  const values = item || {};
  mount(main, html`
    <form class="shn-card tw-overflow-hidden" novalidate data-shn="item-form">
      <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-surface-line tw-px-6 tw-py-4">
        <h2 class="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">${icon(def.icon, 'tw-text-ocean-600')}${title}</h2>
        ${item ? html`<span class="tw-flex tw-items-center tw-gap-2">${item.Code ? html`<span class="tw-text-xs tw-text-ink-muted" dir="ltr">${item.Code}</span>` : ''}${statusBadge(item.WorkflowStatus)}</span>` : ''}
      </div>
      <div class="tw-space-y-5 tw-px-6 tw-py-6">
        ${item?.WorkflowStatus === 'Returned' && item.LastComment ? html`<div class="tw-rounded-xl tw-border tw-border-orange-200 tw-bg-orange-50 tw-p-4 tw-text-sm tw-leading-7 tw-text-orange-900">
          <b class="tw-flex tw-items-center tw-gap-2">${icon('fa-comment-dots')} نظر کارشناس هلدینگ (${item.LastComment.Actor || ''}):</b>
          <p class="tw-mt-1">${item.LastComment.Comment}</p></div>` : ''}
        ${item?.HasPublishedVersion ? html`<div class="tw-rounded-xl tw-bg-ocean-50 tw-p-4 tw-text-sm tw-leading-7 tw-text-ocean-900">${icon('fa-circle-info', 'tw-ms-1')}
          این مورد منتشر شده است. تغییرات شما پس از ارسال، دوباره توسط هلدینگ بررسی می‌شود و تا زمان تأیید، <b>نسخه‌ی فعلی همچنان به‌صورت عمومی نمایش داده می‌شود</b>.</div>` : ''}
        ${note ? html`<div class="tw-rounded-xl tw-bg-slate-50 tw-p-4 tw-text-sm tw-leading-7 tw-text-ink-muted">${icon('fa-lock', 'tw-ms-1')} ${note}</div>` : ''}
        ${!def.noCompany ? html`<div><span class="shn-label">شرکت</span><div class="shn-input tw-bg-slate-100 tw-font-bold tw-text-ink-muted">${icon('fa-building', 'tw-ms-1')} ${user.companyTitle}</div></div>` : ''}
        ${renderFields(type, values, { role: 'company', domains, categories, readonly })}
      </div>
      <div class="tw-flex tw-flex-col-reverse tw-gap-2 tw-border-t tw-border-surface-line tw-bg-slate-50 tw-px-6 tw-py-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
        <a href="${back}" class="shn-btn shn-btn-ghost">انصراف</a>
        <div class="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
          <button type="button" class="shn-btn shn-btn-soft" data-action="draft">${icon('fa-floppy-disk')} ذخیره پیش‌نویس</button>
          <button type="submit" class="shn-btn shn-btn-primary" data-action="submit">${icon('fa-paper-plane')} ارسال برای بررسی هلدینگ</button>
        </div>
      </div>
    </form>`);

  const form = shn('item-form', main);
  enhanceForm(form);
  let dirty = false;
  form.addEventListener('input', () => { dirty = true; });
  const leave = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', leave);

  const save = async (submit) => {
    const { values: v, files, errors } = collectFields(form, type, { role: 'company', requireAll: submit });
    if (!v.Title && !readonly.includes('Title')) errors.Title = 'عنوان الزامی است.';
    readonly.forEach((r) => { delete errors[r]; delete v[r]; delete v[r === 'Category' ? 'CategoryId' : r]; });
    if (!showErrors(form, errors)) { toast('لطفاً موارد مشخص‌شده را اصلاح کنید.', 'error'); return; }
    if (submit) {
      const ok = await confirmDialog({ title: 'ارسال برای بررسی', message: 'پس از ارسال، این مورد در کارتابل هلدینگ قرار می‌گیرد و پس از تأیید منتشر می‌شود. ادامه می‌دهید؟', confirmText: 'ارسال' });
      if (!ok) return;
    }
    const buttons = form.querySelectorAll('[data-action]');
    buttons.forEach((b) => { b.disabled = true; });
    try {
      const saved = await saveItem(type, item?.Id || null, v, { submit, files });
      dirty = false;
      window.removeEventListener('beforeunload', leave);
      toast(submit ? 'برای بررسی هلدینگ ارسال شد.' : 'پیش‌نویس ذخیره شد.');
      setTimeout(() => { location.href = def.singleton ? link({ view: type === 'companies' ? 'profile' : 'contact' }) : link({ view: 'item', type, id: saved.Id }); }, 600);
    } catch (e) {
      toast(e.message, 'error');
      buttons.forEach((b) => { b.disabled = false; });
    }
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); save(true); });
  form.querySelector('[data-action="draft"]').addEventListener('click', () => save(false));
}

async function renderItem(main, type, id) {
  const it = await getItem(type, id);
  if (!it) { mount(main, errorState({ message: 'مورد یافت نشد یا به آن دسترسی ندارید.' })); return; }
  const [history, pub] = await Promise.all([getHistory(type, id), it.HasPublishedVersion && it.WorkflowStatus !== 'Published' ? getPublishedVersion(type, id) : null]);
  const def = TYPES[type];
  mount(main, html`
    <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
      <a href="${link({ view: 'list', type })}" class="tw-text-sm tw-text-ink-muted hover:tw-text-ocean-700">${icon('fa-arrow-right', 'tw-ms-1')} ${def.plural}</a>
      <div class="tw-flex tw-gap-2">
        ${it.WorkflowStatus === 'Published' && def.public ? html`<a href="${type === 'challenges' ? url('challenge', { id }) : url('catalog', { type, id })}" class="shn-btn shn-btn-ghost" target="_blank">${icon('fa-arrow-up-right-from-square')} مشاهده در سایت</a>` : ''}
        ${EDITABLE.includes(it.WorkflowStatus) ? html`<a href="${link({ view: 'edit', type, id })}" class="shn-btn shn-btn-primary">${icon('fa-pen')} ویرایش</a>` : ''}
      </div>
    </div>
    <div class="tw-grid tw-gap-6 xl:tw-grid-cols-3">
      <article class="shn-card tw-p-6 xl:tw-col-span-2">
        <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">${statusBadge(it.WorkflowStatus)}${it.Code ? html`<span class="tw-text-xs tw-text-ink-muted" dir="ltr">${it.Code}</span>` : ''}</div>
        <h2 class="tw-mt-3 tw-text-xl tw-font-bold tw-leading-9">${it.Title}</h2>
        ${pub ? html`<p class="tw-mt-2 tw-rounded-xl tw-bg-ocean-50 tw-p-3 tw-text-xs tw-text-ocean-900">${icon('fa-circle-info', 'tw-ms-1')} نسخه‌ی منتشرشده با عنوان «${pub.Title}» تا زمان تأیید تغییرات، در سایت نمایش داده می‌شود.</p>` : ''}
        <div class="tw-mt-5 tw-border-t tw-border-slate-100 tw-pt-5">${itemDetails(it)}</div>
      </article>
      <aside class="shn-card tw-p-6">
        <h3 class="tw-mb-4 tw-text-sm tw-font-bold">سابقه و نظرات</h3>
        ${timeline(history)}
        <dl class="tw-mt-6 tw-space-y-2 tw-border-t tw-border-slate-100 tw-pt-4 tw-text-xs">
          <div class="tw-flex tw-justify-between"><dt class="tw-text-ink-muted">ایجاد</dt><dd>${fmtDate(it.Created)}</dd></div>
          <div class="tw-flex tw-justify-between"><dt class="tw-text-ink-muted">آخرین ارسال</dt><dd>${fmtDate(it.SubmittedOn)}</dd></div>
          <div class="tw-flex tw-justify-between"><dt class="tw-text-ink-muted">انتشار</dt><dd>${fmtDate(it.PublishedOn)}</dd></div>
        </dl>
      </aside>
    </div>`);
}

async function renderProposals(main) {
  const list = await getProposals();
  mount(main, html`
    <h2 class="tw-mb-2 tw-text-lg tw-font-bold">پیشنهادهای دریافتی برای مسائل شرکت</h2>
    <p class="tw-mb-4 tw-text-sm tw-text-ink-muted">ارزیابی و تعیین وضعیت پیشنهادها توسط هلدینگ انجام می‌شود.</p>
    ${itemsTable(list, {
      empty: 'هنوز پیشنهادی دریافت نشده است.',
      columns: [
        { label: 'مسئله', render: (p) => html`<b class="tw-text-sm">${p.ChallengeTitle}</b><span class="tw-block tw-text-[11px] tw-text-ink-muted" dir="ltr">${p.TrackingCode || ''}</span>` },
        { label: 'متقاضی', render: (p) => html`<b class="tw-block">${p.ApplicantCompany}</b><span class="tw-text-xs tw-text-ink-muted">${p.ContactName} · <span dir="ltr">${p.Phone}</span></span>` },
        { label: 'خلاصه', cls: 'tw-max-w-xs tw-text-xs tw-leading-6', render: (p) => p.ProposalSummary },
        { label: 'فایل', cls: 'tw-text-xs', render: (p) => html`${(p.Files || []).map((f) => html`<span class="tw-block">${icon('fa-paperclip')} ${f.name} ${fileSize(f.size)}</span>`)}` },
        { label: 'تاریخ', cls: 'tw-text-xs tw-whitespace-nowrap', render: (p) => fmtDate(p.Created) }
      ]
    })}`);
}
