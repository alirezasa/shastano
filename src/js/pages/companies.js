import { html, mount, shn, qs, setQs, debounce } from '../core/util.js';
import { faNum } from '../core/format.js';
import { getCategories, queryPublic, getCompanyCounts } from '../data/repository.js';
import { companyCard, skeletonCards, emptyState, errorState } from '../ui/components.js';

export async function init() {
  const form = shn('company-filters');
  const grid = shn('companies');
  mount(grid, skeletonCards(6));
  const [cats, counts] = await Promise.all([getCategories().catch(() => []), getCompanyCounts().catch(() => ({}))]);
  form.elements.category.insertAdjacentHTML('beforeend', String(html`${cats.map((c) => html`<option value="${c.Id}">${c.Title}</option>`)}`));
  form.elements.q.value = qs('q') || '';
  form.elements.category.value = qs('category') || 'all';

  const run = async () => {
    const q = form.elements.q.value.trim();
    const category = form.elements.category.value;
    setQs({ q, category });
    try {
      const { items, total } = await queryPublic('companies', { search: q, categoryId: category === 'all' ? null : category, sort: 'title', pageSize: 500 });
      shn('company-count').textContent = `${faNum(total)} شرکت تولیدی و خدمات مهندسی در حوزه‌ی نفت، گاز، پتروشیمی و صنایع وابسته`;
      mount(grid, items.length ? html`${items.map((c) => companyCard(c, counts[c.Id]))}` : emptyState('شرکتی با این مشخصات یافت نشد.'));
    } catch (e) {
      mount(grid, errorState(e));
    }
  };
  form.addEventListener('input', debounce(run, 250));
  form.addEventListener('change', run);
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  run();
}
