import { html, mount, shn, qs, setQs, debounce } from '../core/util.js';
import { faNum } from '../core/format.js';
import { TYPES, CATALOG_TYPES } from '../schema.js';
import { getDomains, getPublicItems, queryPublic } from '../data/repository.js';
import { itemCard, skeletonCards, emptyState, errorState, pagination, pageHeader, icon, TONE } from '../ui/components.js';
import { url } from '../ui/urls.js';
import { bindItemDialogs, openItemDialog } from './shared.js';
import { CONFIG } from '../config.js';

export async function init() {
  const type = CATALOG_TYPES.includes(qs('type')) ? qs('type') : 'rd';
  const def = TYPES[type];
  document.title = `${def.plural} | سکوی نوآوری و فناوری شستان`;
  const isMedia = ['events', 'publications'].includes(type);

  mount(shn('catalog-head'), pageHeader({
    title: html`<span class="tw-inline-flex tw-items-center tw-gap-3"><span class="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-2xl ${TONE[def.tone].soft}">${icon(def.icon, 'tw-text-xl')}</span>${def.plural}</span>`,
    subtitle: def.description,
    crumbs: [{ label: 'صفحه اصلی', href: url('home') }, { label: isMedia ? 'رسانه' : 'دستاوردها' }, { label: def.plural }],
    actions: html`<nav class="tw-flex tw-flex-wrap tw-gap-1.5" aria-label="انواع دستاورد">${CATALOG_TYPES.filter((t) => ['events', 'publications'].includes(t) === isMedia).map((t) => html`
      <a href="${url('catalog', { type: t })}" class="shn-chip tw-px-3 tw-py-1.5 tw-text-xs ${t === type ? 'tw-bg-ocean-600 tw-text-white' : 'tw-bg-slate-100 tw-text-ink hover:tw-bg-slate-200'}" ${t === type ? html`aria-current="page"` : ''}>${TYPES[t].plural}</a>`)}</nav>`
  }));

  const form = shn('catalog-filters');
  const hasDomain = def.fields.some((f) => f.type === 'domain');
  form.querySelector('[data-only="company"]').hidden = !!def.noCompany;
  form.querySelector('[data-only="domain"]').hidden = !hasDomain;
  if (type === 'events') form.elements.sort.insertAdjacentHTML('afterbegin', '<option value="upcoming">نزدیک‌ترین رویداد</option>');

  const [domains, companies] = await Promise.all([getDomains().catch(() => []), getPublicItems('companies').catch(() => [])]);
  form.elements.domain.insertAdjacentHTML('beforeend', String(html`${domains.map((d) => html`<option value="${d.Id}">${d.Title}</option>`)}`));
  form.elements.company.insertAdjacentHTML('beforeend', String(html`${companies.map((c) => html`<option value="${c.Id}">${c.Title}</option>`)}`));
  const state = { type, q: qs('q') || '', company: qs('company') || 'all', domain: qs('domain') || 'all', sort: qs('sort') || (type === 'events' ? 'upcoming' : 'newest'), page: Number(qs('page')) || 1 };
  ['q', 'company', 'domain', 'sort'].forEach((k) => { form.elements[k].value = state[k]; });

  const run = async () => {
    setQs({ ...state, type });
    const grid = shn('catalog');
    mount(grid, skeletonCards(6));
    try {
      const res = await queryPublic(type, {
        search: state.q, companyId: state.company === 'all' ? null : state.company, domainId: state.domain === 'all' ? null : state.domain,
        sort: state.sort, page: state.page, pageSize: CONFIG.pageSize
      });
      state.page = res.page;
      shn('catalog-count').textContent = `${faNum(res.total)} مورد`;
      mount(grid, res.items.length ? html`${res.items.map((x) => itemCard(x))}` : emptyState('موردی یافت نشد.'));
      mount(shn('catalog-pager'), pagination(res));
    } catch (e) {
      mount(grid, errorState(e));
    }
  };
  const fromForm = () => { ['q', 'company', 'domain', 'sort'].forEach((k) => { state[k] = form.elements[k].value; }); state.page = 1; run(); };
  form.addEventListener('change', fromForm);
  form.elements.q.addEventListener('input', debounce(fromForm, 300));
  form.addEventListener('submit', (e) => { e.preventDefault(); fromForm(); });
  shn('catalog-pager').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { state.page = Number(b.dataset.page); run(); } });
  bindItemDialogs(shn('catalog'));
  await run();
  if (qs('id')) openItemDialog(type, qs('id'));
}
