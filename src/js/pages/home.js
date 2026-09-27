import { html, mount, shn } from '../core/util.js';
import { faNum } from '../core/format.js';
import { getStats, getDomains, getDomainCounts, queryPublic, getPublicItems } from '../data/repository.js';
import { challengeCard, skeletonCards, errorState, emptyState, icon, TONE } from '../ui/components.js';
import { url } from '../ui/urls.js';

const STAT_CARDS = [
  { key: 'companies', label: 'شرکت‌های تابعه', icon: 'fa-building', tone: 'blue', href: () => url('companies') },
  { key: 'challenges', label: 'مسائل فناورانه', icon: 'fa-circle-question', tone: 'amber', href: () => url('challenges') },
  { key: 'products', label: 'محصولات دانش‌بنیان', icon: 'fa-award', tone: 'green', href: () => url('catalog', { type: 'products' }) },
  { key: 'rd', label: 'طرح‌های R&D', icon: 'fa-flask', tone: 'purple', href: () => url('catalog', { type: 'rd' }) },
  { key: 'contracts', label: 'قراردادهای رفع نیاز', icon: 'fa-file-contract', tone: 'cyan', href: () => url('catalog', { type: 'contracts' }) },
  { key: 'plans', label: 'طرح‌های توسعه‌ای', icon: 'fa-chart-line', tone: 'red', href: () => url('catalog', { type: 'plans' }) }
];

export async function init() {
  const heroForm = shn('hero-search');
  heroForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.href = url('challenges', { q: heroForm.elements.q.value.trim() });
  });

  renderStats();
  renderDomains();
  renderLatest();
  renderEvents();
  renderCompanyStrip();
}

async function renderStats() {
  const el = shn('stats');
  try {
    const s = await getStats();
    const open = shn('hero-open');
    if (open) open.textContent = faNum(s.openChallenges);
    mount(el, html`${STAT_CARDS.map((c) => html`
      <a href="${c.href()}" class="shn-card shn-card-hover tw-group tw-p-5 tw-text-center">
        <span class="tw-mx-auto tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-xl ${TONE[c.tone].soft} tw-transition group-hover:tw-scale-110">${icon(c.icon, 'tw-text-lg')}</span>
        <span class="tw-mt-3 tw-block tw-text-3xl tw-font-bold" data-countup="${s[c.key]}">${faNum(s[c.key])}</span>
        <span class="tw-mt-1 tw-block tw-text-xs tw-font-bold tw-text-ink-muted">${c.label}</span>
      </a>`)}`);
    countUp(el);
  } catch (e) {
    mount(el, errorState(e));
  }
}

function countUp(root) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('[data-countup]').forEach((n) => {
    const target = Number(n.dataset.countup);
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / 900);
      n.textContent = faNum(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function renderDomains() {
  const el = shn('domains');
  try {
    const [domains, counts] = await Promise.all([getDomains(), getDomainCounts()]);
    mount(el, html`${domains.map((d, i) => html`
      <a href="${url('challenges', { domain: d.Id })}" class="shn-card shn-card-hover tw-flex tw-gap-4 tw-p-5">
        <span class="tw-flex tw-h-12 tw-w-12 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl ${(TONE[d.Tone] || TONE.sky).soft}">${icon(d.Icon, 'tw-text-xl')}</span>
        <span class="tw-min-w-0">
          <b class="tw-block tw-text-sm">${faNum(i + 1)}. ${d.Title}</b>
          <span class="tw-mt-1 tw-block tw-text-xs tw-leading-6 tw-text-ink-muted">${d.Description}</span>
          <span class="tw-mt-2 tw-inline-flex tw-items-center tw-gap-1 tw-text-xs tw-font-bold tw-text-ocean-700">${faNum(counts[d.Id] || 0)} فراخوان فعال ${icon('fa-arrow-left', 'tw-text-[10px]')}</span>
        </span>
      </a>`)}
      <a href="${url('challenges')}" class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-rounded-card tw-border-2 tw-border-dashed tw-border-ocean-200 tw-bg-ocean-50/60 tw-p-5 tw-text-center tw-text-ocean-700 hover:tw-bg-ocean-50">
        ${icon('fa-magnifying-glass-chart', 'tw-text-2xl')}<b class="tw-text-sm">مشاهده‌ی همه‌ی مسائل</b><span class="tw-text-xs">جستجو و فیلتر پیشرفته</span>
      </a>`);
  } catch (e) {
    mount(el, errorState(e));
  }
}

async function renderLatest() {
  const el = shn('latest');
  mount(el, skeletonCards(3));
  try {
    const { items } = await queryPublic('challenges', { callStatus: 'open', sort: 'newest', pageSize: 6 });
    mount(el, items.length ? html`${items.map((c) => challengeCard(c))}` : emptyState('در حال حاضر فراخوان فعالی وجود ندارد.'));
  } catch (e) {
    mount(el, errorState(e));
  }
}

async function renderEvents() {
  const el = shn('events');
  try {
    const all = await getPublicItems('events');
    const upcoming = all.filter((e) => new Date(e.EndDate || e.StartDate) >= new Date(new Date().toDateString()))
      .sort((a, b) => new Date(a.StartDate) - new Date(b.StartDate)).slice(0, 3);
    mount(el, upcoming.length ? html`${upcoming.map((e) => {
      const d = new Date(e.StartDate);
      const dayNum = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(d);
      const month = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' }).format(d);
      return html`<li class="tw-flex tw-gap-4 tw-rounded-2xl tw-p-3 hover:tw-bg-slate-50">
        <span class="tw-flex tw-h-16 tw-w-16 tw-shrink-0 tw-flex-col tw-items-center tw-justify-center tw-rounded-2xl tw-bg-accent-50 tw-text-accent-700">
          <b class="tw-text-xl tw-leading-none">${dayNum}</b><span class="tw-mt-1 tw-text-[11px] tw-font-bold">${month}</span></span>
        <span class="tw-min-w-0">
          <span class="shn-chip tw-bg-slate-100 tw-text-slate-600">${e.EventType}</span>
          <b class="tw-mt-1 tw-block tw-text-sm tw-leading-6">${e.Title}</b>
          <span class="tw-text-xs tw-text-ink-muted">${icon('fa-location-dot')} ${e.Location || '—'}</span>
        </span></li>`;
    })}` : html`<li class="tw-p-6 tw-text-center tw-text-sm tw-text-ink-muted">رویداد پیش‌رویی ثبت نشده است.</li>`);
  } catch (e) {
    mount(el, html`<li>${errorState(e)}</li>`);
  }
}

async function renderCompanyStrip() {
  const el = shn('company-strip');
  try {
    const list = await getPublicItems('companies');
    mount(el, html`${list.map((c) => html`
      <a href="${url('company', { id: c.Id })}" class="tw-flex tw-items-center tw-gap-3 tw-rounded-2xl tw-border tw-border-surface-line tw-bg-white tw-px-4 tw-py-3 tw-text-sm tw-font-bold tw-transition hover:tw-border-ocean-300 hover:tw-text-ocean-700">
        <span class="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-bg-ocean-50 tw-text-ocean-700">${icon(c.Icon || 'fa-building')}</span>${c.Title}</a>`)}`);
  } catch {
    el.hidden = true;
  }
}

