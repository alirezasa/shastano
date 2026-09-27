import { html, mount, shn, qs, paragraphs, safeUrl } from '../core/util.js';
import { faNum } from '../core/format.js';
import { getPublicItem, getPublicItems, getCompanyContact, getCurrentUser } from '../data/repository.js';
import { breadcrumb, challengeCard, itemCard, icon, emptyState, errorState } from '../ui/components.js';
import { url, loginUrl } from '../ui/urls.js';
import { bindItemDialogs } from './shared.js';
import { TYPES } from '../schema.js';

const TABS = [
  { key: 'about', label: 'درباره شرکت', icon: 'fa-circle-info' },
  { key: 'challenges', label: 'مسائل فناورانه', icon: 'fa-circle-question' },
  { key: 'rd', label: 'طرح‌های R&D', icon: 'fa-flask' },
  { key: 'products', label: 'محصولات', icon: 'fa-award' },
  { key: 'more', label: 'سایر دستاوردها', icon: 'fa-trophy' },
  { key: 'contact', label: 'نماینده فناوری', icon: 'fa-id-card' }
];
const MORE = ['contracts', 'plans', 'patents', 'mous'];

export async function init() {
  const root = shn('company');
  const id = Number(qs('id'));
  mount(root, html`<div class="shn-container tw-py-10"><div class="shn-skeleton tw-h-40"></div></div>`);
  let c;
  try {
    c = id ? await getPublicItem('companies', id) : null;
  } catch (e) {
    mount(root, html`<div class="shn-container tw-py-10">${errorState(e)}</div>`);
    return;
  }
  if (!c) {
    mount(root, html`<div class="shn-container tw-py-10">${emptyState('شرکت مورد نظر یافت نشد.', '', html`<a class="shn-btn shn-btn-primary" href="${url('companies')}">دایرکتوری شرکت‌ها</a>`)}</div>`);
    return;
  }
  document.title = `${c.Title} | سکوی نوآوری و فناوری شستان`;

  const types = ['challenges', 'rd', 'products', ...MORE];
  const lists = await Promise.all(types.map((t) => getPublicItems(t).then((l) => l.filter((x) => x.CompanyId === c.Id)).catch(() => [])));
  const data = Object.fromEntries(types.map((t, i) => [t, lists[i]]));
  const counts = { challenges: data.challenges.length, rd: data.rd.length, products: data.products.length, more: MORE.reduce((s, t) => s + data[t].length, 0) };
  const active = TABS.some((t) => t.key === qs('tab')) ? qs('tab') : 'about';

  mount(root, html`
    <div class="tw-border-b tw-border-surface-line tw-bg-white">
      <div class="shn-container tw-pt-8">
        ${breadcrumb([{ label: 'صفحه اصلی', href: url('home') }, { label: 'شرکت‌های تابعه', href: url('companies') }, { label: c.Title }])}
        <div class="tw-mt-5 tw-flex tw-flex-col tw-gap-6 md:tw-flex-row md:tw-items-center md:tw-justify-between">
          <div class="tw-flex tw-items-center tw-gap-4">
            <span class="tw-flex tw-h-20 tw-w-20 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-3xl tw-bg-ocean-600 tw-text-4xl tw-text-white tw-shadow-lg">${icon(c.Icon || 'fa-building')}</span>
            <div>
              <h1 class="tw-text-2xl tw-font-bold sm:tw-text-3xl">${c.Title}</h1>
              <div class="tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-text-xs tw-text-ink-muted">
                ${c.CategoryTitle ? html`<span class="shn-chip tw-bg-slate-100 tw-text-slate-600">${c.CategoryTitle}</span>` : ''}
                ${c.Established ? html`<span>${icon('fa-calendar')} تأسیس ${faNum(c.Established).replace(/٬/g, '')}</span>` : ''}
                ${c.Website ? html`<a href="${safeUrl(c.Website)}" target="_blank" rel="noopener noreferrer" class="hover:tw-text-ocean-700" dir="ltr">${icon('fa-globe')} ${c.Website.replace(/^https?:\/\//, '')}</a>` : ''}
              </div>
            </div>
          </div>
          <dl class="tw-grid tw-grid-cols-4 tw-gap-2 tw-text-center">
            ${[['مسئله', counts.challenges], ['طرح R&D', counts.rd], ['محصول', counts.products], ['سایر', counts.more]].map(([l, v]) => html`
              <div class="tw-min-w-[4.5rem] tw-rounded-2xl tw-border tw-border-surface-line tw-px-3 tw-py-2"><dt class="tw-text-[11px] tw-text-ink-muted">${l}</dt><dd class="tw-text-xl tw-font-bold tw-text-ocean-700">${faNum(v)}</dd></div>`)}
          </dl>
        </div>
        <div class="tw-mt-6 tw-flex tw-gap-6 tw-overflow-x-auto shn-scroll" role="tablist" aria-label="بخش‌های صفحه شرکت">
          ${TABS.map((t) => html`<button type="button" role="tab" id="tab-${t.key}" aria-controls="panel-${t.key}" aria-selected="${t.key === active}" tabindex="${t.key === active ? 0 : -1}" class="shn-tab" data-tab="${t.key}">
            ${icon(t.icon, 'tw-ms-1 tw-text-xs')}${t.label}${counts[t.key] != null ? html` <span class="tw-text-xs tw-text-ink-soft">(${faNum(counts[t.key])})</span>` : ''}</button>`)}
        </div>
      </div>
    </div>
    <div class="shn-container tw-py-8">
      ${TABS.map((t) => html`<section id="panel-${t.key}" role="tabpanel" aria-labelledby="tab-${t.key}" ${t.key === active ? '' : 'hidden'} data-panel="${t.key}"></section>`)}
    </div>`);

  const panels = {
    about: () => html`<div class="tw-grid tw-gap-6 lg:tw-grid-cols-3">
      <div class="shn-card tw-p-6 lg:tw-col-span-2"><h2 class="tw-mb-3 tw-text-base tw-font-bold">معرفی شرکت</h2>
        <p class="tw-text-sm tw-font-bold tw-leading-8">${c.ShortDesc}</p>
        <div class="shn-prose tw-mt-3 tw-text-sm tw-leading-8 tw-text-ink/90">${paragraphs(c.About)}</div></div>
      <div class="shn-card tw-space-y-4 tw-p-6 tw-text-sm"><h2 class="tw-text-base tw-font-bold">اطلاعات تماس عمومی</h2>
        ${c.Address ? html`<p class="tw-flex tw-gap-2">${icon('fa-location-dot', 'tw-mt-1 tw-text-ink-soft')}<span>${c.Address}</span></p>` : ''}
        ${c.PublicPhone ? html`<p class="tw-flex tw-gap-2">${icon('fa-phone', 'tw-mt-1 tw-text-ink-soft')}<span dir="ltr">${c.PublicPhone}</span></p>` : ''}
        ${c.PublicEmail ? html`<p class="tw-flex tw-gap-2">${icon('fa-envelope', 'tw-mt-1 tw-text-ink-soft')}<a href="mailto:${c.PublicEmail}" class="hover:tw-text-ocean-700" dir="ltr">${c.PublicEmail}</a></p>` : ''}
      </div></div>`,
    challenges: () => grid(data.challenges.map((x) => challengeCard(x)), 'این شرکت هنوز مسئله‌ی منتشرشده‌ای ندارد.'),
    rd: () => grid(data.rd.map((x) => itemCard(x)), 'طرح R&D منتشرشده‌ای ثبت نشده است.'),
    products: () => grid(data.products.map((x) => itemCard(x)), 'محصول منتشرشده‌ای ثبت نشده است.'),
    more: () => html`${MORE.map((t) => (data[t].length ? html`<h2 class="tw-mb-4 tw-mt-2 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">${icon(TYPES[t].icon, 'tw-text-ink-soft')}${TYPES[t].plural}</h2>
      <div class="tw-mb-8 tw-grid tw-grid-cols-1 tw-gap-5 md:tw-grid-cols-2 lg:tw-grid-cols-3">${data[t].map((x) => itemCard(x))}</div>` : ''))}
      ${counts.more ? '' : emptyState('دستاورد دیگری ثبت نشده است.')}`,
    contact: renderContact
  };

  async function renderContact() {
    const user = await getCurrentUser().catch(() => ({ isAnonymous: true }));
    if (user.isAnonymous) {
      return html`<div class="shn-card tw-mx-auto tw-max-w-xl tw-p-8 tw-text-center">
        <span class="tw-mx-auto tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-2xl tw-bg-amber-50 tw-text-2xl tw-text-amber-600">${icon('fa-lock')}</span>
        <h2 class="tw-mt-4 tw-text-base tw-font-bold">اطلاعات نماینده‌ی فناوری فقط برای کاربران واردشده نمایش داده می‌شود</h2>
        <p class="tw-mt-2 tw-text-sm tw-text-ink-muted">برای ارتباط عمومی از اطلاعات تماس شرکت یا فرم تماس با هلدینگ استفاده کنید.</p>
        <div class="tw-mt-5 tw-flex tw-justify-center tw-gap-2"><a href="${loginUrl()}" class="shn-btn shn-btn-primary">${icon('fa-right-to-bracket')} ورود</a><a href="${url('contact')}" class="shn-btn shn-btn-ghost">تماس با هلدینگ</a></div></div>`;
    }
    const rep = await getCompanyContact(c.Id).catch(() => null);
    if (!rep) return emptyState('نماینده‌ی فناوری برای این شرکت ثبت نشده است.');
    return html`<div class="shn-card tw-max-w-2xl tw-p-6">
      <h2 class="tw-mb-4 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">${icon('fa-id-card', 'tw-text-ocean-600')} نماینده‌ی فناوری و نوآوری</h2>
      <dl class="tw-grid tw-grid-cols-1 tw-gap-4 tw-text-sm sm:tw-grid-cols-2">
        <div><dt class="tw-text-xs tw-text-ink-muted">نام و نام خانوادگی</dt><dd class="tw-font-bold">${rep.Title}</dd></div>
        <div><dt class="tw-text-xs tw-text-ink-muted">سمت</dt><dd class="tw-font-bold">${rep.RepTitle}</dd></div>
        <div><dt class="tw-text-xs tw-text-ink-muted">ایمیل</dt><dd class="tw-font-bold"><a href="mailto:${rep.RepEmail}" dir="ltr" class="hover:tw-text-ocean-700">${rep.RepEmail}</a></dd></div>
        <div><dt class="tw-text-xs tw-text-ink-muted">تلفن</dt><dd class="tw-font-bold" dir="ltr">${rep.RepPhone}</dd></div>
      </dl></div>`;
  }

  const rendered = new Set();
  const show = async (key) => {
    root.querySelectorAll('[data-tab]').forEach((b) => { const on = b.dataset.tab === key; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    root.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== key; });
    const panel = root.querySelector(`[data-panel="${key}"]`);
    if (!rendered.has(key)) { rendered.add(key); mount(panel, await panels[key]()); }
    const u = new URL(location.href);
    if (key === 'about') u.searchParams.delete('tab'); else u.searchParams.set('tab', key);
    history.replaceState(null, '', u);
  };
  root.querySelector('[role=tablist]').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  root.querySelector('[role=tablist]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...root.querySelectorAll('[data-tab]')];
    const i = tabs.indexOf(document.activeElement);
    const next = tabs[(i + (e.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length]; // RTL
    next.focus(); show(next.dataset.tab);
  });
  bindItemDialogs(root);
  show(active);
}

function grid(cards, empty) {
  return cards.length ? html`<div class="tw-grid tw-grid-cols-1 tw-gap-5 md:tw-grid-cols-2 lg:tw-grid-cols-3">${cards}</div>` : emptyState(empty);
}
