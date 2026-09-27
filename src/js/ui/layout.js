// رفتارهای مشترک قالب: منو، منوی موبایل، جستجو، ناحیه‌ی کاربر، سوئیچ نقش در حالت نمایشی
import { html, mount, shn, $$ } from '../core/util.js';
import { fmtToday, faNum } from '../core/format.js';
import { IS_MOCK } from '../config.js';
import { icon } from './components.js';
import { url, loginUrl, logoutUrl } from './urls.js';
import { getCurrentUser, getReviewQueue, setDemoRole, getDemoRole, resetDemo, getPublicItems } from '../data/repository.js';

const ACHIEVEMENT_PAGES = ['catalog'];

export async function initLayout(page) {
  const today = shn('today');
  if (today) today.textContent = fmtToday();

  // لینک فعال منو
  const active = ACHIEVEMENT_PAGES.includes(page)
    ? (['events', 'publications'].includes(new URLSearchParams(location.search).get('type')) ? 'media' : 'achievements')
    : page === 'company' ? 'companies' : page === 'challenge' ? 'challenges' : page;
  $$(`[data-nav="${active}"]`).forEach((a) => { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); });

  initDropdowns();
  initDrawer();
  initSearch();
  initStickyShadow();

  const user = await getCurrentUser().catch(() => ({ isAnonymous: true, role: 'public' }));
  renderUserArea(user);
  if (IS_MOCK) renderDevBar(user);
  const note = shn('mode-note');
  if (note && IS_MOCK) note.textContent = 'نسخه‌ی نمایشی — داده‌ها ساختگی هستند';
  return user;
}

function initDropdowns() {
  const closeAll = (except) => $$('[data-shn-dropdown]').forEach((b) => {
    if (b === except) return;
    b.setAttribute('aria-expanded', 'false');
    const p = document.getElementById(b.getAttribute('aria-controls'));
    if (p) p.hidden = true;
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-shn-dropdown]');
    if (btn) {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') === 'true';
      closeAll(btn);
      btn.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
      return;
    }
    if (!e.target.closest('.shn-dropdown')) closeAll();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
}

function initDrawer() {
  const drawer = document.getElementById('shn-drawer');
  if (!drawer) return;
  const opener = document.querySelector('[data-shn-open="drawer"]');
  const close = () => { drawer.hidden = true; opener?.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; };
  opener?.addEventListener('click', () => {
    drawer.hidden = false; opener.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden';
    drawer.querySelector('[data-shn-close]:not(div)')?.focus();
  });
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-shn-close]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) close(); });
}

function initSearch() {
  const box = document.getElementById('shn-search');
  if (!box) return;
  const input = box.querySelector('input');
  const open = () => { box.hidden = false; setTimeout(() => input.focus(), 30); };
  const close = () => { box.hidden = true; };
  $$('[data-shn-open="search"]').forEach((b) => b.addEventListener('click', open));
  box.addEventListener('click', (e) => { if (e.target.closest('[data-shn-close]')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !box.hidden) close();
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); open(); }
  });
  shn('search-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    location.href = url('challenges', { q: input.value.trim() });
  });
}

function initStickyShadow() {
  const header = shn('header');
  if (!header) return;
  const on = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', on, { passive: true });
  on();
}

async function renderUserArea(user) {
  const area = shn('user-area');
  const actions = shn('header-actions');
  const drawerUser = shn('drawer-user');
  if (!area) return;

  if (user.isAnonymous) {
    mount(area, html`<a href="${loginUrl()}" class="shn-btn tw-bg-white tw-text-brand-700 hover:tw-bg-brand-50 tw-shadow-sm">${icon('fa-right-to-bracket')}<span class="tw-hidden sm:tw-inline">ورود شرکت‌ها و هلدینگ</span><span class="sm:tw-hidden">ورود</span></a>`);
    mount(drawerUser, html`<a href="${loginUrl()}" class="shn-btn shn-btn-brand tw-w-full">${icon('fa-right-to-bracket')} ورود شرکت‌ها و هلدینگ</a>`);
    return;
  }

  const panelLink = user.role === 'holding' ? url('adminPanel') : user.role === 'company' ? url('companyPanel') : null;
  const roleLabel = user.role === 'holding' ? 'هلدینگ شستان' : user.companyTitle || 'کاربر سامانه';
  if (actions && user.role === 'holding') {
    mount(actions, html`<a href="${url('adminPanel')}" class="shn-btn shn-btn-sm shn-btn-warning tw-py-2">${icon('fa-list-check')} کارتابل <span class="tw-rounded-full tw-bg-slate-950 tw-px-1.5 tw-text-[10px] tw-text-amber-300" data-shn="queue-count">…</span></a>`);
    getReviewQueue().then((q) => { const c = shn('queue-count'); if (c) c.textContent = faNum(q.length); }).catch(() => {});
  } else if (actions && user.role === 'company') {
    mount(actions, html`<a href="${url('companyPanel', { view: 'new', type: 'challenges' })}" class="shn-btn shn-btn-sm tw-bg-white/15 tw-text-white hover:tw-bg-white/25 tw-py-2">${icon('fa-plus')} ثبت مسئله جدید</a>`);
  }

  const initials = (user.Title || '?').trim().split(/\s+/).slice(-1)[0].slice(0, 1);
  mount(area, html`<div class="tw-relative">
    <button type="button" class="tw-flex tw-items-center tw-gap-2 tw-rounded-xl tw-bg-white/10 tw-py-1.5 tw-pe-3 tw-ps-1.5 hover:tw-bg-white/20" data-shn-dropdown aria-expanded="false" aria-controls="shn-dd-user">
      <span class="tw-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-bg-white tw-font-bold tw-text-brand-700">${initials}</span>
      <span class="tw-hidden md:tw-block tw-max-w-[10rem] tw-text-right tw-leading-tight"><b class="tw-block tw-truncate tw-text-xs tw-whitespace-nowrap">${user.Title}</b><span class="tw-block tw-truncate tw-text-[10px] tw-text-white/75">${roleLabel}</span></span>
      ${icon('fa-chevron-down', 'tw-text-[10px] tw-hidden md:tw-block')}
    </button>
    <div id="shn-dd-user" class="shn-dropdown tw-left-0" hidden>
      <div class="tw-border-b tw-border-slate-100 tw-px-3 tw-pb-3 tw-pt-1"><b class="tw-block tw-text-sm">${user.Title}</b><span class="tw-text-xs tw-text-ink-muted">${roleLabel}</span></div>
      ${panelLink ? html`<a class="shn-dropdown-item tw-mt-1" href="${panelLink}">${icon(user.role === 'holding' ? 'fa-list-check' : 'fa-gauge', 'tw-mt-1 tw-text-ocean-600')}<span>${user.role === 'holding' ? 'کارتابل و مدیریت' : 'پنل شرکت'}</span></a>` : ''}
      ${user.role === 'company' ? html`<a class="shn-dropdown-item" href="${url('company', { id: user.companyId })}">${icon('fa-building', 'tw-mt-1 tw-text-ocean-600')}<span>صفحه‌ی عمومی شرکت</span></a>` : ''}
      <a class="shn-dropdown-item tw-text-accent-700" href="${logoutUrl()}" data-logout>${icon('fa-right-from-bracket', 'tw-mt-1')}<span>خروج</span></a>
    </div>
  </div>`);
  mount(drawerUser, html`<div class="tw-rounded-xl tw-bg-slate-50 tw-p-3">
    <b class="tw-block tw-text-sm">${user.Title}</b><span class="tw-text-xs tw-text-ink-muted">${roleLabel}</span>
    <div class="tw-mt-3 tw-flex tw-gap-2">
      ${panelLink ? html`<a href="${panelLink}" class="shn-btn shn-btn-sm shn-btn-primary tw-flex-1">${user.role === 'holding' ? 'کارتابل' : 'پنل شرکت'}</a>` : ''}
      <a href="${logoutUrl()}" class="shn-btn shn-btn-sm shn-btn-ghost" data-logout>خروج</a>
    </div></div>`);
  if (IS_MOCK) {
    document.addEventListener('click', (e) => { if (e.target.closest('[data-logout]')) setDemoRole('public'); });
  }
}

// نوار شبیه‌سازی نقش — فقط در نسخه‌ی نمایشی. در شیرپوینت نقش از مجوزهای واقعی تعیین می‌شود.
async function renderDevBar(user) {
  const root = shn('dev-root');
  if (!root) return;
  const state = getDemoRole();
  const companies = await getPublicItems('companies').catch(() => []);
  mount(root, html`
    <div class="tw-fixed tw-bottom-5 tw-right-5 tw-z-[75] shn-no-print">
      <details class="tw-rounded-2xl tw-bg-surface-dark tw-text-xs tw-text-slate-200 tw-shadow-2xl">
        <summary class="tw-flex tw-cursor-pointer tw-list-none tw-items-center tw-gap-2 tw-px-4 tw-py-2.5 tw-font-bold">${icon('fa-flask-vial', 'tw-text-amber-400')} حالت نمایشی: ${user.isAnonymous ? 'کاربر عمومی' : user.role === 'holding' ? 'هلدینگ' : 'شرکت تابعه'}</summary>
        <div class="tw-w-64 tw-space-y-3 tw-border-t tw-border-slate-700 tw-p-4">
          <p class="tw-leading-6 tw-text-slate-400">این نوار فقط برای تست سناریوهاست. در شیرپوینت نقش کاربر از مجوزهای واقعی تشخیص داده می‌شود.</p>
          <label class="tw-block">نقش
            <select class="tw-mt-1 tw-w-full tw-rounded-lg tw-bg-slate-800 tw-p-2" data-dev-role>
              <option value="public" ${state.role === 'public' ? 'selected' : ''}>کاربر عمومی (بدون ورود)</option>
              <option value="company" ${state.role === 'company' ? 'selected' : ''}>کاربر شرکت تابعه</option>
              <option value="holding" ${state.role === 'holding' ? 'selected' : ''}>کاربر هلدینگ</option>
            </select></label>
          <label class="tw-block" data-dev-company-wrap ${state.role === 'company' ? '' : 'hidden'}>شرکت
            <select class="tw-mt-1 tw-w-full tw-rounded-lg tw-bg-slate-800 tw-p-2" data-dev-company>
              ${companies.map((c) => html`<option value="${c.Id}" ${state.companyId === c.Id ? 'selected' : ''}>${c.Title}</option>`)}
            </select></label>
          <div class="tw-flex tw-gap-2">
            <button type="button" class="shn-btn shn-btn-sm shn-btn-primary tw-flex-1" data-dev-apply>اعمال</button>
            <button type="button" class="shn-btn shn-btn-sm tw-bg-slate-700 tw-text-white hover:tw-bg-slate-600" data-dev-reset title="بازگردانی داده‌های نمونه">${icon('fa-rotate-left')}</button>
          </div>
        </div>
      </details>
    </div>`);
  const roleSel = root.querySelector('[data-dev-role]');
  roleSel.addEventListener('change', () => { root.querySelector('[data-dev-company-wrap]').hidden = roleSel.value !== 'company'; });
  root.querySelector('[data-dev-apply]').addEventListener('click', () => {
    setDemoRole(roleSel.value, root.querySelector('[data-dev-company]').value);
    location.reload();
  });
  root.querySelector('[data-dev-reset]').addEventListener('click', () => { resetDemo(); location.reload(); });
}
