// کارتابل و مدیریت هلدینگ
import { html, mount, shn, qs, normalizeFa } from '../core/util.js';
import { faNum, fmtDate, relTime, daysLeft } from '../core/format.js';
import { TYPES, REVIEW_TYPES, WORKFLOW, CALL_STATUS, AUDIT_ACTIONS, choiceLabel } from '../schema.js';
import {
  getReviewQueue, getAllItems, getItem, getPublishedVersion, getHistory, approve, returnItem, reject, archive, restore,
  setCallStatus, getMessages, setMessageStatus, getProposals, setProposalStatus, getAudit, getDomains, getCategories,
  getPublicItems, saveItem
} from '../data/repository.js';
import { icon, statusBadge, errorState, TONE, fileSize, callBadge } from '../ui/components.js';
import { renderFields, collectFields, showErrors, enhanceForm } from '../ui/forms.js';
import { openDialog, confirmDialog, toast } from '../ui/overlay.js';
import { url } from '../ui/urls.js';
import { renderShell, accessDenied, statCard, timeline, itemsTable } from './panel-shell.js';
import { itemDetails, fieldValue } from './shared.js';

const link = (p) => url('adminPanel', p);
const CONTENT_TYPES = [...REVIEW_TYPES, 'events', 'publications'];
const PROPOSAL_STATUS = { New: 'جدید', Reviewing: 'در حال ارزیابی', Shortlisted: 'منتخب', Accepted: 'پذیرفته‌شده', Rejected: 'رد شده' };

export async function init(user) {
  const root = shn('panel');
  if (user.role !== 'holding') { accessDenied(root, user, 'holding'); return; }
  const view = qs('view') || 'inbox';
  const type = CONTENT_TYPES.includes(qs('type')) ? qs('type') : null;
  const [queue, messages] = await Promise.all([getReviewQueue(), getMessages().catch(() => [])]);
  const newMessages = messages.filter((m) => m.Status === 'New').length;

  const nav = [
    { key: 'inbox', label: 'کارتابل بررسی', icon: 'fa-list-check', href: link({}), badge: queue.length },
    { divider: 'مدیریت محتوا' },
    ...CONTENT_TYPES.map((t) => ({ key: `content:${t}`, label: TYPES[t].plural.replace(' (RFP)', ''), icon: TYPES[t].icon, href: link({ view: 'content', type: t }) })),
    { divider: 'ورودی‌های عمومی' },
    { key: 'proposals', label: 'پیشنهادهای دریافتی', icon: 'fa-inbox', href: link({ view: 'proposals' }) },
    { key: 'messages', label: 'پیام‌های تماس', icon: 'fa-envelope', href: link({ view: 'messages' }), badge: newMessages },
    { divider: 'گزارش و پایش' },
    { key: 'reports', label: 'گزارش‌ها', icon: 'fa-chart-column', href: link({ view: 'reports' }) },
    { key: 'audit', label: 'لاگ عملیات', icon: 'fa-clock-rotate-left', href: link({ view: 'audit' }) }
  ];
  const active = view === 'content' || view === 'form' ? `content:${type}` : view;
  const main = renderShell(root, { title: 'کارتابل مدیریت، بررسی و تأیید اطلاعات', subtitle: `${user.Title} — اطلاعات ارسالی شرکت‌های تابعه را بررسی، تأیید یا برای اصلاح برگردانید.`, badge: 'پنل هلدینگ شستان', nav, active });

  try {
    if (view === 'content' && type) await renderContent(main, type);
    else if (view === 'form' && type) await renderAdminForm(main, type, Number(qs('id')) || null);
    else if (view === 'proposals') await renderProposals(main);
    else if (view === 'messages') renderMessages(main, messages);
    else if (view === 'reports') await renderReports(main, queue);
    else if (view === 'audit') await renderAudit(main);
    else renderInbox(main, queue, newMessages);
  } catch (e) {
    mount(main, errorState(e));
  }
}

// ---------- کارتابل ----------
function renderInbox(main, queue, newMessages) {
  const filter = qs('type') || 'all';
  const shown = filter === 'all' ? queue : queue.filter((x) => x.type === filter);
  const edits = queue.filter((x) => x.HasPublishedVersion).length;
  const oldest = queue.length ? Math.max(...queue.map((x) => -daysLeft(x.SubmittedOn))) : 0;
  const byType = REVIEW_TYPES.map((t) => [t, queue.filter((x) => x.type === t).length]).filter(([, n]) => n);

  mount(main, html`
    <div class="tw-grid tw-grid-cols-2 tw-gap-4 xl:tw-grid-cols-4">
      ${statCard({ label: 'در انتظار بررسی', value: queue.length, icon: 'fa-hourglass-half', tone: 'amber' })}
      ${statCard({ label: 'ویرایش محتوای منتشرشده', value: edits, icon: 'fa-code-compare', tone: 'blue' })}
      ${statCard({ label: 'قدیمی‌ترین درخواست (روز)', value: Math.max(0, oldest), icon: 'fa-stopwatch', tone: oldest > 5 ? 'red' : 'slate' })}
      ${statCard({ label: 'پیام تماس جدید', value: newMessages, icon: 'fa-envelope', tone: 'green', href: link({ view: 'messages' }) })}
    </div>
    <div class="tw-mt-6 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
      <div class="tw-flex tw-flex-wrap tw-gap-1.5" role="group" aria-label="فیلتر نوع">
        <a href="${link({})}" class="shn-chip tw-px-3 tw-py-1.5 tw-text-xs ${filter === 'all' ? 'tw-bg-ocean-600 tw-text-white' : 'tw-bg-white tw-border tw-border-surface-line'}">همه (${faNum(queue.length)})</a>
        ${byType.map(([t, n]) => html`<a href="${link({ type: t })}" class="shn-chip tw-px-3 tw-py-1.5 tw-text-xs ${filter === t ? 'tw-bg-ocean-600 tw-text-white' : 'tw-bg-white tw-border tw-border-surface-line'}">${TYPES[t].plural.replace(' (RFP)', '')} (${faNum(n)})</a>`)}
      </div>
      <button type="button" class="shn-btn shn-btn-sm shn-btn-brand" data-bulk hidden>${icon('fa-check-double')} تأیید گروهی (<span data-bulk-count>0</span>)</button>
    </div>
    <div class="tw-mt-4">
    ${itemsTable(shown, {
      empty: 'کارتابل خالی است؛ درخواستی در انتظار بررسی نیست.',
      columns: [
        { label: html`<input type="checkbox" class="tw-h-4 tw-w-4" data-check-all aria-label="انتخاب همه">`, render: (it) => html`<input type="checkbox" class="tw-h-4 tw-w-4" data-check="${it.type}:${it.Id}" aria-label="انتخاب ${it.Title}">` },
        { label: 'نوع', cls: 'tw-whitespace-nowrap', render: (it) => html`<span class="shn-chip ${TONE[TYPES[it.type].tone].chip}">${icon(TYPES[it.type].icon, 'tw-text-[9px]')}${TYPES[it.type].label}</span>` },
        { label: 'عنوان', render: (it) => html`<button type="button" class="tw-text-right tw-font-bold hover:tw-text-ocean-700" data-review="${it.type}:${it.Id}">${it.Title}</button>
          <span class="tw-block tw-text-[11px] tw-text-ink-muted" dir="ltr">${it.Code || ''}</span>` },
        { label: 'شرکت', cls: 'tw-text-xs', render: (it) => it.CompanyTitle },
        { label: 'نوع درخواست', cls: 'tw-whitespace-nowrap', render: (it) => (it.HasPublishedVersion ? html`<span class="shn-badge tw-bg-ocean-100 tw-text-ocean-800">${icon('fa-code-compare', 'tw-text-[9px]')}ویرایش</span>` : html`<span class="shn-badge tw-bg-brand-100 tw-text-brand-800">${icon('fa-plus', 'tw-text-[9px]')}جدید</span>`) },
        { label: 'ارسال', cls: 'tw-whitespace-nowrap tw-text-xs tw-text-ink-muted', render: (it) => html`<time datetime="${it.SubmittedOn}" title="${fmtDate(it.SubmittedOn)}">${relTime(it.SubmittedOn)}</time>` }
      ],
      actions: (it) => html`<button type="button" class="shn-btn shn-btn-sm shn-btn-primary" data-review="${it.type}:${it.Id}">${icon('fa-magnifying-glass')} بررسی</button>`
    })}</div>`);

  const bulkBtn = main.querySelector('[data-bulk]');
  const checks = () => [...main.querySelectorAll('[data-check]:checked')];
  const sync = () => { const n = checks().length; bulkBtn.hidden = !n; main.querySelector('[data-bulk-count]').textContent = faNum(n); };
  main.addEventListener('change', (e) => {
    if (e.target.matches('[data-check-all]')) main.querySelectorAll('[data-check]').forEach((c) => { c.checked = e.target.checked; });
    sync();
  });
  bulkBtn?.addEventListener('click', async () => {
    const sel = checks().map((c) => c.dataset.check.split(':'));
    const ok = await confirmDialog({ title: 'تأیید گروهی', message: `${faNum(sel.length)} مورد تأیید و منتشر می‌شود. ادامه می‌دهید؟`, confirmText: 'تأیید و انتشار', tone: 'brand' });
    if (!ok) return;
    bulkBtn.disabled = true;
    for (const [t, id] of sel) await approve(t, id, 'تأیید گروهی');
    toast(`${faNum(sel.length)} مورد منتشر شد.`);
    setTimeout(() => location.reload(), 700);
  });
  main.addEventListener('click', (e) => {
    const b = e.target.closest('[data-review]');
    if (b) { const [t, id] = b.dataset.review.split(':'); openReview(t, Number(id)); }
  });
  const deep = qs('review');
  if (deep) { const [t, id] = deep.split(':'); openReview(t, Number(id)); }
}

function diffTable(type, oldV, newV) {
  const rows = TYPES[type].fields.filter((f) => f.type !== 'files').map((f) => {
    const key = f.type === 'domain' ? 'DomainTitle' : f.type === 'category' ? 'CategoryTitle' : f.name;
    const a = oldV[key] ?? ''; const b = newV[key] ?? '';
    if (String(a) === String(b)) return null;
    return html`<tr><th scope="row" class="tw-w-32 tw-bg-slate-50 tw-p-3 tw-text-right tw-align-top tw-text-xs tw-font-bold tw-text-ink-muted">${f.label}</th>
      <td class="tw-p-3 tw-align-top tw-text-xs tw-leading-6"><del class="tw-rounded tw-bg-accent-50 tw-text-accent-800 tw-decoration-accent-400">${fieldValue(f, oldV) || '—'}</del></td>
      <td class="tw-p-3 tw-align-top tw-text-xs tw-leading-6"><ins class="tw-rounded tw-bg-brand-50 tw-text-brand-800 tw-no-underline">${fieldValue(f, newV) || '—'}</ins></td></tr>`;
  }).filter(Boolean);
  if (!rows.length) return html`<p class="tw-text-sm tw-text-ink-muted">تفاوتی در فیلدها یافت نشد (ممکن است فقط پیوست تغییر کرده باشد).</p>`;
  return html`<div class="tw-overflow-x-auto tw-rounded-xl tw-border tw-border-surface-line"><table class="tw-w-full tw-text-right">
    <thead><tr class="tw-text-[11px] tw-text-ink-muted"><th class="tw-p-2"></th><th class="tw-p-2 tw-text-right">نسخه‌ی منتشرشده</th><th class="tw-p-2 tw-text-right">تغییرات جدید</th></tr></thead>
    <tbody class="tw-divide-y tw-divide-slate-100">${rows}</tbody></table></div>`;
}

async function openReview(type, id) {
  const dlg = openDialog({ title: 'بررسی درخواست', side: true, body: html`<div class="shn-skeleton tw-h-8 tw-w-2/3"></div><div class="shn-skeleton tw-mt-4 tw-h-64"></div>` });
  const [it, history] = await Promise.all([getItem(type, id), getHistory(type, id)]);
  if (!it) { mount(dlg.body, errorState({ message: 'مورد یافت نشد.' })); return; }
  const pub = it.HasPublishedVersion ? await getPublishedVersion(type, id) : null;
  const def = TYPES[type];
  const pending = it.WorkflowStatus === 'Submitted';
  mount(dlg.body, html`
    <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
      <span class="shn-chip ${TONE[def.tone].chip}">${icon(def.icon, 'tw-text-[9px]')}${def.label}</span>
      ${statusBadge(it.WorkflowStatus)} ${it.Code ? html`<span class="tw-text-xs tw-text-ink-muted" dir="ltr">${it.Code}</span>` : ''}
    </div>
    <h3 class="tw-mt-3 tw-text-lg tw-font-bold tw-leading-8">${it.Title}</h3>
    <p class="tw-mt-1 tw-text-xs tw-text-ink-muted">${it.CompanyTitle ? html`${icon('fa-building')} ${it.CompanyTitle} · ` : ''}ارسال توسط ${it.AuthorTitle || '—'} · ${fmtDate(it.SubmittedOn || it.Modified)}</p>
    ${pub ? html`<section class="tw-mt-5"><h4 class="tw-mb-2 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-bold">${icon('fa-code-compare', 'tw-text-ocean-600')} مقایسه با نسخه‌ی منتشرشده</h4>${diffTable(type, pub, it)}</section>` : ''}
    <section class="tw-mt-6 tw-border-t tw-border-slate-100 tw-pt-5"><h4 class="tw-mb-3 tw-text-sm tw-font-bold">جزئیات کامل</h4>${itemDetails(it)}</section>
    <section class="tw-mt-6 tw-border-t tw-border-slate-100 tw-pt-5"><h4 class="tw-mb-3 tw-text-sm tw-font-bold">سابقه</h4>${timeline(history)}</section>`);

  const footer = document.createElement('div');
  footer.className = 'tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2 tw-border-t tw-border-surface-line tw-bg-slate-50 tw-px-5 tw-py-3';
  mount(footer, pending ? html`
    <button type="button" class="shn-btn shn-btn-danger" data-act="reject">${icon('fa-ban')} رد نهایی</button>
    <button type="button" class="shn-btn shn-btn-warning" data-act="return">${icon('fa-rotate-left')} برگشت جهت اصلاح</button>
    <button type="button" class="shn-btn shn-btn-brand" data-act="approve">${icon('fa-check')} تأیید و انتشار</button>` : html`<span class="tw-text-xs tw-text-ink-muted">این مورد در وضعیت «${WORKFLOW[it.WorkflowStatus]?.label}» است.</span>`);
  dlg.body.after(footer);

  footer.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    const cfg = {
      approve: { title: 'تأیید و انتشار', message: `«${it.Title}» تأیید و در سایت عمومی منتشر می‌شود.`, confirmText: 'تأیید و انتشار', tone: 'brand', reason: { label: 'توضیحات (اختیاری)', required: false } },
      return: { title: 'برگشت جهت اصلاح', message: 'درخواست برای اصلاح به شرکت برگردانده می‌شود. دلیل و موارد اصلاحی را دقیق بنویسید.', confirmText: 'برگشت به شرکت', tone: 'warning', reason: { label: 'موارد اصلاحی', required: true, placeholder: 'مثلاً: شرح چالش کلی است؛ میزان فعلی مصرف و هدف کمی را اضافه کنید.' } },
      reject: { title: 'رد نهایی', message: 'درخواست به‌طور نهایی رد می‌شود و شرکت امکان ارسال مجدد آن را ندارد.', confirmText: 'رد نهایی', tone: 'danger', reason: { label: 'دلیل رد', required: true } }
    }[act];
    const res = await confirmDialog(cfg);
    if (!res) return;
    footer.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      if (act === 'approve') await approve(type, id, res.reason);
      if (act === 'return') await returnItem(type, id, res.reason);
      if (act === 'reject') await reject(type, id, res.reason);
      toast({ approve: 'تأیید و منتشر شد.', return: 'برای اصلاح به شرکت برگشت داده شد.', reject: 'درخواست رد شد.' }[act]);
      dlg.close();
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      toast(err.message, 'error');
      footer.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    }
  });
}

// ---------- مدیریت محتوا ----------
async function renderContent(main, type) {
  const def = TYPES[type];
  const items = await getAllItems(type);
  const status = qs('status') || 'all';
  const q = normalizeFa(qs('q') || '');
  let shown = status === 'all' ? items : items.filter((x) => x.WorkflowStatus === status);
  if (q) shown = shown.filter((x) => normalizeFa(`${x.Title} ${x.CompanyTitle} ${x.Code}`).includes(q));
  const holdingOwned = def.owner === 'holding';

  mount(main, html`
    <div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
      <h2 class="tw-text-lg tw-font-bold">${def.plural}</h2>
      <div class="tw-flex tw-gap-2">
        <form class="tw-flex" role="search" data-content-search><input name="q" type="search" value="${qs('q') || ''}" class="shn-input tw-py-2" placeholder="جستجو…" aria-label="جستجو"></form>
        ${holdingOwned ? html`<a href="${link({ view: 'form', type })}" class="shn-btn shn-btn-primary">${icon('fa-plus')} ${def.label} جدید</a>` : ''}
      </div>
    </div>
    <div class="tw-mb-4 tw-flex tw-flex-wrap tw-gap-1.5">
      ${['all', ...Object.keys(WORKFLOW)].map((s) => {
        const n = s === 'all' ? items.length : items.filter((x) => x.WorkflowStatus === s).length;
        if (s !== 'all' && !n) return '';
        return html`<a href="${link({ view: 'content', type, status: s === 'all' ? '' : s })}" class="shn-chip tw-px-3 tw-py-1.5 tw-text-xs ${status === s ? 'tw-bg-ocean-600 tw-text-white' : 'tw-bg-white tw-border tw-border-surface-line'}">${s === 'all' ? 'همه' : WORKFLOW[s].label} (${faNum(n)})</a>`;
      })}
    </div>
    ${itemsTable(shown, {
      columns: [
        { label: 'عنوان', render: (it) => html`<button type="button" class="tw-text-right tw-font-bold hover:tw-text-ocean-700" data-view="${it.Id}">${it.Title}</button><span class="tw-block tw-text-[11px] tw-text-ink-muted" dir="ltr">${it.Code || ''}</span>` },
        ...(def.noCompany ? [] : [{ label: 'شرکت', cls: 'tw-text-xs', render: (it) => it.CompanyTitle }]),
        { label: 'وضعیت', render: (it) => html`${statusBadge(it.WorkflowStatus)}${type === 'challenges' && it.WorkflowStatus === 'Published' ? html`<span class="tw-mt-1 tw-block">${callBadge(it)}</span>` : ''}` },
        { label: 'آخرین تغییر', cls: 'tw-whitespace-nowrap tw-text-xs tw-text-ink-muted', render: (it) => relTime(it.Modified) }
      ],
      actions: (it) => html`<div class="tw-flex tw-justify-center tw-gap-1">
        ${it.WorkflowStatus === 'Submitted' ? html`<a href="${link({ review: `${type}:${it.Id}` })}" class="shn-btn shn-btn-sm shn-btn-primary">بررسی</a>` : ''}
        ${type === 'challenges' && it.WorkflowStatus === 'Published' ? html`<button type="button" class="shn-btn shn-btn-sm shn-btn-soft" data-call="${it.Id}" title="وضعیت فراخوان">${icon('fa-bullhorn')}<span class="tw-sr-only">وضعیت فراخوان</span></button>` : ''}
        ${holdingOwned ? html`<a href="${link({ view: 'form', type, id: it.Id })}" class="shn-btn shn-btn-sm shn-btn-soft" title="ویرایش">${icon('fa-pen')}<span class="tw-sr-only">ویرایش</span></a>` : ''}
        ${it.WorkflowStatus === 'Published' ? html`<button type="button" class="shn-btn shn-btn-sm shn-btn-soft" data-archive="${it.Id}" title="بایگانی">${icon('fa-box-archive')}<span class="tw-sr-only">بایگانی</span></button>` : ''}
        ${it.WorkflowStatus === 'Archived' ? html`<button type="button" class="shn-btn shn-btn-sm shn-btn-soft" data-restore="${it.Id}" title="بازگردانی">${icon('fa-box-open')}<span class="tw-sr-only">بازگردانی</span></button>` : ''}
      </div>`
    })}`);

  main.querySelector('[data-content-search]').addEventListener('submit', (e) => {
    e.preventDefault();
    location.href = link({ view: 'content', type, status: status === 'all' ? '' : status, q: e.target.elements.q.value.trim() });
  });
  main.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]');
    const a = e.target.closest('[data-archive]');
    const r = e.target.closest('[data-restore]');
    const c = e.target.closest('[data-call]');
    if (v) {
      const it = items.find((x) => x.Id === Number(v.dataset.view));
      const history = await getHistory(type, it.Id);
      openDialog({ title: def.label, side: true, body: html`<div class="tw-flex tw-items-center tw-gap-2">${statusBadge(it.WorkflowStatus)}</div><h3 class="tw-mt-3 tw-text-lg tw-font-bold">${it.Title}</h3>
        <div class="tw-mt-4">${itemDetails(it)}</div><h4 class="tw-mb-3 tw-mt-6 tw-text-sm tw-font-bold">سابقه</h4>${timeline(history)}` });
    } else if (a) {
      const res = await confirmDialog({ title: 'بایگانی', message: 'این مورد از سایت عمومی حذف و در بایگانی نگهداری می‌شود.', confirmText: 'بایگانی', tone: 'danger', reason: { label: 'دلیل (اختیاری)', required: false } });
      if (res) { await archive(type, a.dataset.archive, res.reason); toast('بایگانی شد.'); setTimeout(() => location.reload(), 500); }
    } else if (r) {
      await restore(type, r.dataset.restore); toast('بازگردانی و منتشر شد.'); setTimeout(() => location.reload(), 500);
    } else if (c) {
      const it = items.find((x) => x.Id === Number(c.dataset.call));
      const dlg = openDialog({
        title: 'وضعیت فراخوان', size: 'md',
        body: html`<p class="tw-text-sm tw-font-bold">${it.Title}</p><label class="shn-label tw-mt-4" for="call-status">وضعیت جدید</label>
          <select id="call-status" class="shn-input">${CALL_STATUS.map((s) => html`<option value="${s.value}" ${s.value === it.CallStatus ? 'selected' : ''}>${s.label}</option>`)}</select>`,
        footer: html`<button type="button" class="shn-btn shn-btn-ghost" data-dlg-close>انصراف</button><button type="button" class="shn-btn shn-btn-primary" data-save-call>ذخیره</button>`
      });
      dlg.el.querySelector('[data-save-call]').addEventListener('click', async () => {
        await setCallStatus(it.Id, dlg.el.querySelector('#call-status').value);
        toast('وضعیت فراخوان به‌روزرسانی شد.'); dlg.close(); setTimeout(() => location.reload(), 500);
      });
    }
  });
}

async function renderAdminForm(main, type, id) {
  const def = TYPES[type];
  if (def.owner !== 'holding') { mount(main, errorState({ message: 'این نوع محتوا توسط شرکت‌ها ثبت می‌شود.' })); return; }
  const [domains, categories, item] = await Promise.all([getDomains(), getCategories(), id ? getItem(type, id) : null]);
  mount(main, html`<form class="shn-card tw-overflow-hidden" novalidate data-admin-form>
    <div class="tw-border-b tw-border-surface-line tw-px-6 tw-py-4"><h2 class="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">${icon(def.icon, 'tw-text-ocean-600')}${id ? 'ویرایش' : 'ثبت'} ${def.label}</h2></div>
    <div class="tw-px-6 tw-py-6">
      <p class="tw-mb-5 tw-rounded-xl tw-bg-slate-50 tw-p-3 tw-text-xs tw-text-ink-muted">${icon('fa-circle-info', 'tw-ms-1')} محتوای ثبت‌شده توسط هلدینگ بلافاصله منتشر می‌شود.</p>
      ${renderFields(type, item || {}, { role: 'holding', domains, categories })}
    </div>
    <div class="tw-flex tw-justify-between tw-border-t tw-border-surface-line tw-bg-slate-50 tw-px-6 tw-py-4">
      <a href="${link({ view: 'content', type })}" class="shn-btn shn-btn-ghost">انصراف</a>
      <button type="submit" class="shn-btn shn-btn-brand">${icon('fa-check')} ذخیره و انتشار</button>
    </div></form>`);
  const form = main.querySelector('[data-admin-form]');
  enhanceForm(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { values, files, errors } = collectFields(form, type, { role: 'holding' });
    if (!showErrors(form, errors)) return;
    try {
      await saveItem(type, id, values, { files });
      toast('ذخیره و منتشر شد.');
      setTimeout(() => { location.href = link({ view: 'content', type }); }, 500);
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ---------- پیشنهادها و پیام‌ها ----------
async function renderProposals(main) {
  const list = await getProposals();
  mount(main, html`<h2 class="tw-mb-4 tw-text-lg tw-font-bold">پیشنهادهای دریافتی از شرکت‌های دانش‌بنیان</h2>
    ${itemsTable(list, {
      empty: 'پیشنهادی دریافت نشده است.',
      columns: [
        { label: 'مسئله', render: (p) => html`<a href="${url('challenge', { id: p.ChallengeId })}" target="_blank" class="tw-font-bold hover:tw-text-ocean-700">${p.ChallengeTitle}</a><span class="tw-block tw-text-[11px] tw-text-ink-muted" dir="ltr">${p.TrackingCode || ''}</span>` },
        { label: 'متقاضی', render: (p) => html`<b class="tw-block">${p.ApplicantCompany}</b><span class="tw-text-xs tw-text-ink-muted">${p.ContactName} · <span dir="ltr">${p.Phone}</span></span>${p.CertNo ? html`<span class="tw-block tw-text-[11px] tw-text-brand-700">${icon('fa-award')} ${p.CertNo}</span>` : ''}` },
        { label: 'خلاصه', cls: 'tw-max-w-xs tw-text-xs tw-leading-6', render: (p) => html`${p.ProposalSummary}${(p.Files || []).map((f) => html`<span class="tw-mt-1 tw-block tw-text-ink-muted">${icon('fa-paperclip')} ${f.name} ${fileSize(f.size)}</span>`)}` },
        { label: 'تاریخ', cls: 'tw-whitespace-nowrap tw-text-xs', render: (p) => fmtDate(p.Created) }
      ],
      actions: (p) => html`<label class="tw-sr-only" for="ps-${p.Id}">وضعیت</label><select id="ps-${p.Id}" class="shn-input tw-w-36 tw-py-1.5 tw-text-xs" data-proposal="${p.Id}">
        ${Object.entries(PROPOSAL_STATUS).map(([k, v]) => html`<option value="${k}" ${p.Status === k ? 'selected' : ''}>${v}</option>`)}</select>`
    })}`);
  main.addEventListener('change', async (e) => {
    const s = e.target.closest('[data-proposal]');
    if (s) { await setProposalStatus(s.dataset.proposal, s.value); toast('وضعیت پیشنهاد به‌روزرسانی شد.'); }
  });
}

function renderMessages(main, messages) {
  mount(main, html`<h2 class="tw-mb-4 tw-text-lg tw-font-bold">پیام‌های تماس</h2>
    ${itemsTable(messages, {
      empty: 'پیامی وجود ندارد.',
      columns: [
        { label: 'فرستنده', render: (m) => html`<b class="tw-block">${m.Title}</b><span class="tw-text-xs tw-text-ink-muted">${m.Organization || '—'}</span><span class="tw-block tw-text-xs tw-text-ink-muted" dir="ltr">${m.Phone} ${m.Email || ''}</span>` },
        { label: 'موضوع', cls: 'tw-text-xs', render: (m) => m.Subject },
        { label: 'پیام', cls: 'tw-max-w-sm tw-text-xs tw-leading-6', render: (m) => m.Message },
        { label: 'تاریخ', cls: 'tw-whitespace-nowrap tw-text-xs', render: (m) => relTime(m.Created) }
      ],
      actions: (m) => (m.Status === 'New'
        ? html`<button type="button" class="shn-btn shn-btn-sm shn-btn-brand" data-msg="${m.Id}">${icon('fa-check')} پاسخ داده شد</button>`
        : html`<span class="shn-badge tw-bg-brand-100 tw-text-brand-800">${icon('fa-check', 'tw-text-[9px]')}پاسخ داده شده</span>`)
    })}`);
  main.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-msg]');
    if (b) { await setMessageStatus(b.dataset.msg, 'Answered'); toast('وضعیت پیام به‌روزرسانی شد.'); setTimeout(() => location.reload(), 400); }
  });
}

// ---------- گزارش‌ها ----------
// نمودار میله‌ای افقی تک‌سری (یک رنگ، برچسب مستقیم مقدار، راهنمای hover با title)
function barChart(rows, { color = 'tw-bg-ocean-600', label }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return html`<figure class="shn-card tw-p-5">
    <figcaption class="tw-mb-4 tw-text-sm tw-font-bold">${label}</figcaption>
    ${rows.length ? html`<ul class="tw-space-y-2.5">${rows.map((r) => html`<li class="tw-grid tw-grid-cols-[9rem_1fr] tw-items-center tw-gap-3 tw-text-xs" title="${r.label}: ${faNum(r.value)}">
      <span class="tw-truncate tw-text-ink-muted">${r.label}</span>
      <span class="tw-flex tw-items-center tw-gap-2"><span class="tw-h-3 tw-rounded-e ${r.color || color}" style="width:${Math.max(r.value ? 2 : 0, (r.value / max) * 100)}%"></span><b class="tw-text-ink">${faNum(r.value)}</b></span>
    </li>`)}</ul>` : html`<p class="tw-text-xs tw-text-ink-muted">داده‌ای وجود ندارد.</p>`}
  </figure>`;
}

async function renderReports(main, queue) {
  const [domains, companies, challenges, proposals, ...rest] = await Promise.all([
    getDomains(), getPublicItems('companies'), getAllItems('challenges'), getProposals(),
    ...['rd', 'products', 'contracts', 'plans', 'patents', 'mous'].map((t) => getAllItems(t))
  ]);
  const all = [...challenges, ...rest.flat()];
  const published = challenges.filter((c) => c.WorkflowStatus === 'Published');
  const reviewed = all.filter((x) => x.SubmittedOn && x.ReviewedOn && new Date(x.ReviewedOn) >= new Date(x.SubmittedOn));
  const avgDays = reviewed.length ? reviewed.reduce((s, x) => s + (new Date(x.ReviewedOn) - new Date(x.SubmittedOn)) / 86400000, 0) / reviewed.length : 0;
  const contracted = published.filter((c) => c.CallStatus === 'Contracted').length;

  const byDomain = domains.map((d) => ({ label: d.Title, value: published.filter((c) => c.DomainId === d.Id).length })).sort((a, b) => b.value - a.value);
  const byCompany = companies.map((c) => ({ label: c.Title, value: all.filter((x) => x.CompanyId === c.Id && x.WorkflowStatus === 'Published').length })).sort((a, b) => b.value - a.value);
  const statusColor = { Draft: 'tw-bg-slate-400', Submitted: 'tw-bg-amber-500', Returned: 'tw-bg-orange-500', Rejected: 'tw-bg-accent-600', Published: 'tw-bg-brand-600', Archived: 'tw-bg-slate-600' };
  const byStatus = Object.keys(WORKFLOW).map((s) => ({ label: WORKFLOW[s].label, value: all.filter((x) => x.WorkflowStatus === s).length, color: statusColor[s] }));

  mount(main, html`
    <div class="tw-grid tw-grid-cols-2 tw-gap-4 xl:tw-grid-cols-4">
      ${statCard({ label: 'مسائل منتشرشده', value: published.length, icon: 'fa-circle-question', tone: 'amber' })}
      ${statCard({ label: 'پیشنهاد دریافتی', value: proposals.length, icon: 'fa-inbox', tone: 'blue' })}
      ${statCard({ label: 'میانگین زمان بررسی (روز)', value: Math.round(avgDays * 10) / 10, icon: 'fa-stopwatch', tone: 'slate', hint: `بر اساس ${faNum(reviewed.length)} بررسی` })}
      ${statCard({ label: 'مسائل منجر به قرارداد', value: contracted, icon: 'fa-file-signature', tone: 'green', hint: published.length ? `${faNum(Math.round((contracted / published.length) * 100))}٪ از مسائل منتشرشده` : '' })}
    </div>
    <div class="tw-mt-6 tw-grid tw-gap-6 xl:tw-grid-cols-2">
      ${barChart(byDomain, { label: 'مسائل منتشرشده به تفکیک حوزه' })}
      ${barChart(byCompany, { label: 'محتوای منتشرشده به تفکیک شرکت (همه‌ی انواع)' })}
      ${barChart(byStatus, { label: 'وضعیت گردش‌کار همه‌ی اقلام شرکت‌ها' })}
      <div class="shn-card tw-p-5"><p class="tw-mb-4 tw-text-sm tw-font-bold">درخواست‌های در انتظار به تفکیک نوع</p>
        <ul class="tw-space-y-2 tw-text-sm">${REVIEW_TYPES.map((t) => html`<li class="tw-flex tw-items-center tw-justify-between tw-rounded-lg tw-bg-slate-50 tw-px-3 tw-py-2"><span>${TYPES[t].plural.replace(' (RFP)', '')}</span><b>${faNum(queue.filter((x) => x.type === t).length)}</b></li>`)}</ul></div>
    </div>
    <p class="tw-mt-4 tw-text-xs tw-text-ink-muted">${icon('fa-circle-info', 'tw-ms-1')} برای خروجی Excel می‌توانید از نمای لیست‌ها در شیرپوینت (Export to Excel) استفاده کنید.</p>`);
}

async function renderAudit(main) {
  const rows = await getAudit(100);
  mount(main, html`<h2 class="tw-mb-4 tw-text-lg tw-font-bold">لاگ عملیات</h2>
    ${itemsTable(rows, {
      empty: 'عملیاتی ثبت نشده است.',
      columns: [
        { label: 'زمان', cls: 'tw-whitespace-nowrap tw-text-xs', render: (r) => html`<time datetime="${r.Date}" title="${fmtDate(r.Date)}">${relTime(r.Date)}</time>` },
        { label: 'عملیات', cls: 'tw-whitespace-nowrap', render: (r) => html`<b class="tw-text-xs">${AUDIT_ACTIONS[r.Action] || r.Action}</b>` },
        { label: 'مورد', render: (r) => html`<span class="tw-block tw-text-sm">${r.ItemTitle}</span><span class="tw-text-[11px] tw-text-ink-muted">${TYPES[r.Type]?.label || r.Type}</span>` },
        { label: 'کاربر', cls: 'tw-text-xs', render: (r) => r.Actor },
        { label: 'توضیحات', cls: 'tw-max-w-xs tw-text-xs tw-leading-6', render: (r) => (r.Action === 'CallStatus' ? choiceLabel(TYPES.challenges.fields.find((f) => f.name === 'CallStatus'), r.Comment) : r.Comment) }
      ]
    })}`);
}
