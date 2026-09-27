import { html, mount, shn, qs, setQs, debounce } from '../core/util.js';
import { faNum } from '../core/format.js';
import { getDomains, getPublicItems, queryPublic } from '../data/repository.js';
import { challengeCard, skeletonCards, emptyState, errorState, pagination } from '../ui/components.js';
import { CONFIG } from '../config.js';

export async function init() {
  const form = shn('filters');
  const sort = shn('sort');
  const state = {
    q: qs('q') || '', status: qs('status') || 'all', domain: qs('domain') || 'all',
    company: qs('company') || 'all', priority: qs('priority') || 'all', sort: qs('sort') || 'newest', page: Number(qs('page')) || 1
  };

  const [domains, companies] = await Promise.all([getDomains().catch(() => []), getPublicItems('companies').catch(() => [])]);
  form.elements.domain.insertAdjacentHTML('beforeend', String(html`${domains.map((d) => html`<option value="${d.Id}">${d.Title}</option>`)}`));
  form.elements.company.insertAdjacentHTML('beforeend', String(html`${companies.map((c) => html`<option value="${c.Id}">${c.Title}</option>`)}`));
  ['q', 'status', 'domain', 'company', 'priority'].forEach((k) => { form.elements[k].value = state[k]; });
  sort.value = state.sort;

  const run = async () => {
    setQs(state);
    const results = shn('results');
    mount(results, skeletonCards(6));
    try {
      const res = await queryPublic('challenges', {
        search: state.q,
        callStatus: state.status === 'all' ? '' : state.status,
        domainId: state.domain === 'all' ? null : state.domain,
        companyId: state.company === 'all' ? null : state.company,
        priority: state.priority === 'all' ? '' : state.priority,
        sort: state.sort, page: state.page, pageSize: CONFIG.pageSize
      });
      state.page = res.page;
      shn('result-count').textContent = `${faNum(res.total)} مسئله یافت شد`;
      mount(results, res.items.length ? html`${res.items.map((c) => challengeCard(c))}` : emptyState('مسئله‌ای با این مشخصات یافت نشد.', 'فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.'));
      mount(shn('pager'), pagination(res));
    } catch (e) {
      mount(results, errorState(e));
    }
  };

  const fromForm = () => {
    ['q', 'status', 'domain', 'company', 'priority'].forEach((k) => { state[k] = form.elements[k].value; });
    state.page = 1;
    run();
  };
  form.addEventListener('change', fromForm);
  form.elements.q.addEventListener('input', debounce(fromForm, 300));
  form.addEventListener('submit', (e) => { e.preventDefault(); fromForm(); });
  form.addEventListener('reset', () => setTimeout(fromForm));
  sort.addEventListener('change', () => { state.sort = sort.value; state.page = 1; run(); });
  shn('pager').addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]');
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page);
    run();
    shn('result-count').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  run();
}
