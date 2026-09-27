import { html, mount, shn, qs, paragraphs } from '../core/util.js';
import { fmtDate, faNum, daysLeft } from '../core/format.js';
import { getPublicItem, getPublicItems, isOpenCall, submitProposal, queryPublic } from '../data/repository.js';
import { breadcrumb, callBadge, priorityBadge, domainChip, challengeCard, icon, errorState, emptyState, fileSize } from '../ui/components.js';
import { captchaField, loadCaptcha, enhanceForm, validateFiles, showErrors } from '../ui/forms.js';
import { toast, openDialog } from '../ui/overlay.js';
import { url } from '../ui/urls.js';
import { TRL_LABEL } from './shared.js';

export async function init() {
  const root = shn('detail');
  const id = Number(qs('id'));
  mount(root, html`<div class="shn-container tw-py-10"><div class="shn-skeleton tw-h-8 tw-w-1/2"></div><div class="shn-skeleton tw-mt-4 tw-h-40"></div></div>`);
  let c;
  try {
    c = id ? await getPublicItem('challenges', id) : null;
  } catch (e) {
    mount(root, html`<div class="shn-container tw-py-10">${errorState(e)}</div>`);
    return;
  }
  if (!c) {
    mount(root, html`<div class="shn-container tw-py-10">${emptyState('مسئله‌ی مورد نظر یافت نشد یا هنوز منتشر نشده است.', '', html`<a href="${url('challenges')}" class="shn-btn shn-btn-primary">بازگشت به نظام مسائل</a>`)}</div>`);
    return;
  }
  document.title = `${c.Title} | سکوی نوآوری و فناوری شستان`;
  const open = isOpenCall(c);
  const left = daysLeft(c.Deadline);
  const company = (await getPublicItems('companies').catch(() => [])).find((x) => x.Id === c.CompanyId);
  const keywords = String(c.Keywords || '').split(/[,،]/).map((k) => k.trim()).filter(Boolean);

  const section = (title, body, ic) => (body ? html`<section class="shn-card tw-p-6">
      <h2 class="tw-mb-3 tw-flex tw-items-center tw-gap-2 tw-text-base tw-font-bold">${icon(ic, 'tw-text-ocean-600')}${title}</h2>
      <div class="shn-prose tw-text-sm tw-leading-8 tw-text-ink/90">${paragraphs(body)}</div></section>` : '');

  mount(root, html`
    <div class="tw-border-b tw-border-surface-line tw-bg-white">
      <div class="shn-container tw-py-8">
        ${breadcrumb([{ label: 'صفحه اصلی', href: url('home') }, { label: 'نظام مسائل فناورانه', href: url('challenges') }, { label: c.Code || 'جزئیات' }])}
        <div class="tw-mt-4 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <a href="${url('company', { id: c.CompanyId })}" class="shn-chip tw-bg-ocean-50 tw-text-ocean-700">${icon('fa-building', 'tw-text-[9px]')}${c.CompanyTitle}</a>
          ${callBadge(c)} ${domainChip(c.DomainTitle)} ${priorityBadge(c.Priority)}
        </div>
        <h1 class="tw-mt-3 tw-text-2xl tw-font-bold tw-leading-[1.7] sm:tw-text-3xl">${c.Title}</h1>
        <p class="tw-mt-3 tw-max-w-4xl tw-text-sm tw-leading-8 tw-text-ink-muted">${c.Summary}</p>
      </div>
    </div>
    <div class="shn-container tw-grid tw-gap-6 tw-py-8 lg:tw-grid-cols-3">
      <div class="tw-space-y-6 lg:tw-col-span-2">
        ${section('شرح کامل چالش', c.ProblemStatement, 'fa-circle-exclamation')}
        ${section('وضعیت یا راهکار فعلی', c.CurrentSolution, 'fa-screwdriver-wrench')}
        ${section('دستاورد و خروجی مورد انتظار', c.ExpectedOutcome, 'fa-bullseye')}
        ${keywords.length ? html`<section class="shn-card tw-p-6"><h2 class="tw-mb-3 tw-text-base tw-font-bold">کلیدواژه‌ها</h2>
          <div class="tw-flex tw-flex-wrap tw-gap-2">${keywords.map((k) => html`<a href="${url('challenges', { q: k })}" class="shn-chip tw-bg-slate-100 tw-px-3 tw-py-1 tw-text-xs tw-text-ink hover:tw-bg-ocean-50"># ${k}</a>`)}</div></section>` : ''}
        ${c.Attachments?.length ? html`<section class="shn-card tw-p-6"><h2 class="tw-mb-3 tw-text-base tw-font-bold">اسناد و پیوست‌ها</h2>
          <ul class="tw-space-y-2">${c.Attachments.map((a) => html`<li><a href="${a.url || '#'}" ${a.url ? '' : 'data-demo-file'} class="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-surface-line tw-px-4 tw-py-3 tw-text-sm hover:tw-bg-slate-50">${icon('fa-file-arrow-down', 'tw-text-ocean-600')}<span class="tw-flex-1">${a.name}</span><span class="tw-text-xs tw-text-ink-soft">${fileSize(a.size)}</span></a></li>`)}</ul></section>` : ''}

        <section id="proposal" class="shn-card tw-scroll-mt-28 tw-p-6" aria-labelledby="h-proposal">
          <h2 id="h-proposal" class="tw-flex tw-items-center tw-gap-2 tw-text-lg tw-font-bold">${icon('fa-paper-plane', 'tw-text-brand-600')}ارسال طرح پیشنهادی</h2>
          ${open ? html`
          <p class="tw-mt-2 tw-text-sm tw-leading-7 tw-text-ink-muted">ارسال پیشنهاد نیازی به ثبت‌نام ندارد. پس از ارسال، کد رهگیری دریافت می‌کنید و کارشناسان هلدینگ با شما تماس خواهند گرفت.</p>
          <form class="tw-mt-5 tw-space-y-5" data-shn="proposal-form" novalidate>
            <input type="hidden" name="ChallengeId" value="${c.Id}">
            <div class="tw-grid tw-grid-cols-1 tw-gap-5 sm:tw-grid-cols-2">
              ${field('ApplicantCompany', 'نام شرکت / تیم / مؤسسه', 'text', true)}
              ${field('ContactName', 'نام و نام خانوادگی رابط', 'text', true)}
              ${field('Phone', 'تلفن همراه', 'tel', true, 'ltr', '09xxxxxxxxx')}
              ${field('Email', 'ایمیل', 'email', true, 'ltr')}
              ${field('CertNo', 'شماره گواهی دانش‌بنیان (در صورت وجود)', 'text', false)}
            </div>
            <div data-field="ProposalSummary">
              <label class="shn-label" for="f-ProposalSummary">خلاصه‌ی راهکار پیشنهادی <span class="tw-text-accent-600">*</span></label>
              <textarea id="f-ProposalSummary" name="ProposalSummary" rows="5" maxlength="2000" class="shn-input tw-leading-7" required placeholder="رویکرد فنی، سوابق مرتبط، زمان‌بندی تقریبی…"></textarea>
              <span class="shn-error" hidden></span>
            </div>
            <div data-field="Attachments">
              <span class="shn-label">فایل طرح پیشنهادی (PDF، Word، …)</span>
              <div>
                <label class="tw-flex tw-cursor-pointer tw-flex-col tw-items-center tw-gap-1 tw-rounded-xl tw-border-2 tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-px-4 tw-py-6 tw-text-center tw-text-sm tw-text-ink-muted hover:tw-border-ocean-400">
                  ${icon('fa-cloud-arrow-up', 'tw-text-2xl tw-text-ocean-600')}<span><b class="tw-text-ocean-700">انتخاب فایل</b> — حداکثر ۱۰ مگابایت</span>
                  <input name="Attachments" type="file" multiple class="tw-sr-only" data-files accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar">
                </label>
                <ul class="tw-mt-2 tw-space-y-1 tw-text-xs" data-file-list></ul>
              </div>
              <span class="shn-error" hidden></span>
            </div>
            <div class="tw-relative">${captchaField()}</div>
            <label class="tw-flex tw-items-start tw-gap-2 tw-text-sm" data-field="Consent">
              <input type="checkbox" name="Consent" class="tw-mt-1.5 tw-h-4 tw-w-4 tw-accent-brand-600" required>
              <span>اطلاعات ارسالی صحیح است و با استفاده‌ی هلدینگ شستان از آن برای ارزیابی پیشنهاد موافقم.</span>
            </label>
            <span class="shn-error" data-consent-error hidden>تأیید این مورد الزامی است.</span>
            <div class="tw-flex tw-justify-end">
              <button type="submit" class="shn-btn shn-btn-brand shn-btn-lg">${icon('fa-paper-plane')} ارسال پیشنهاد</button>
            </div>
          </form>` : html`
          <div class="tw-mt-4 tw-rounded-xl tw-bg-slate-50 tw-p-5 tw-text-sm tw-leading-7 tw-text-ink-muted">${icon('fa-lock', 'tw-ms-1')} مهلت ارسال پیشنهاد برای این مسئله به پایان رسیده یا فراخوان در مرحله‌ی ارزیابی است. <a href="${url('challenges', { status: 'open' })}" class="shn-btn-link">مشاهده‌ی فراخوان‌های باز</a></div>`}
        </section>
      </div>

      <aside class="tw-space-y-6">
        <div class="shn-card tw-p-6 lg:tw-sticky lg:tw-top-24">
          ${open ? html`<div class="tw-rounded-2xl tw-p-4 tw-text-center ${left <= 7 ? 'tw-bg-accent-50 tw-text-accent-700' : 'tw-bg-brand-50 tw-text-brand-700'}">
            <span class="tw-block tw-text-xs tw-font-bold">زمان باقی‌مانده</span>
            <b class="tw-block tw-text-3xl">${faNum(Math.max(0, left))}</b><span class="tw-text-xs">روز تا پایان مهلت</span></div>` : ''}
          <dl class="tw-mt-4 tw-divide-y tw-divide-slate-100 tw-text-sm">
            ${info('کد مسئله', c.Code)}
            ${info('مهلت ارسال پیشنهاد', fmtDate(c.Deadline))}
            ${info('حوزه', c.DomainTitle)}
            ${info('سطح آمادگی فناوری', c.TRL ? TRL_LABEL(c.TRL) : '—')}
            ${info('تاریخ انتشار', fmtDate(c.PublishedOn))}
          </dl>
          ${open ? html`<a href="#proposal" class="shn-btn shn-btn-brand tw-mt-5 tw-w-full">${icon('fa-paper-plane')} ارسال پیشنهاد</a>` : ''}
          <button type="button" class="shn-btn shn-btn-ghost tw-mt-2 tw-w-full" data-copy-link>${icon('fa-link')} کپی لینک این مسئله</button>
        </div>
        ${company ? html`<a href="${url('company', { id: company.Id })}" class="shn-card shn-card-hover tw-block tw-p-6">
          <span class="tw-text-xs tw-font-bold tw-text-ink-muted">شرکت صاحب مسئله</span>
          <span class="tw-mt-3 tw-flex tw-items-center tw-gap-3"><span class="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-xl tw-bg-ocean-50 tw-text-xl tw-text-ocean-700">${icon(company.Icon || 'fa-building')}</span>
          <span><b class="tw-block">${company.Title}</b><span class="tw-text-xs tw-text-ink-muted">${company.CategoryTitle}</span></span></span>
          <p class="tw-mt-3 tw-text-xs tw-leading-6 tw-text-ink-muted">${company.ShortDesc}</p></a>` : ''}
      </aside>
    </div>
    <section class="shn-container tw-pb-4" data-shn="related-wrap" hidden>
      <h2 class="shn-section-title tw-mb-5">مسائل مرتبط</h2>
      <div class="tw-grid tw-grid-cols-1 tw-gap-5 md:tw-grid-cols-3" data-shn="related"></div>
    </section>`);

  root.querySelector('[data-copy-link]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('لینک مسئله کپی شد.'); } catch { toast(location.href, 'info'); }
  });
  root.addEventListener('click', (e) => { if (e.target.closest('[data-demo-file]')) { e.preventDefault(); toast('در نسخه‌ی نمایشی فایل‌ها ذخیره نمی‌شوند.', 'info'); } });

  if (open) initProposalForm(root, c);
  renderRelated(c);
}

function field(name, label, type, required, dir = '', placeholder = '') {
  return html`<div data-field="${name}">
    <label class="shn-label" for="f-${name}">${label}${required ? html` <span class="tw-text-accent-600">*</span>` : ''}</label>
    <input id="f-${name}" name="${name}" type="${type}" class="shn-input ${dir === 'ltr' ? 'tw-text-left' : ''}" ${dir ? html`dir="${dir}"` : ''} ${required ? 'required' : ''} maxlength="160" placeholder="${placeholder}" autocomplete="off">
    <span class="shn-error" hidden></span>
  </div>`;
}

function info(label, value) {
  return html`<div class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-py-3"><dt class="tw-text-ink-muted">${label}</dt><dd class="tw-font-bold">${value || '—'}</dd></div>`;
}

function initProposalForm(root, c) {
  const form = shn('proposal-form', root);
  enhanceForm(form);
  loadCaptcha(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form).entries());
    const files = form.querySelector('[data-files]')._files || [];
    const errors = {};
    for (const k of ['ApplicantCompany', 'ContactName', 'Phone', 'Email', 'ProposalSummary']) if (!String(fd[k] || '').trim()) errors[k] = 'این فیلد الزامی است.';
    if (fd.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fd.Email)) errors.Email = 'نشانی ایمیل معتبر نیست.';
    if (fd.Phone && !/^(\+98|0)?9\d{9}$/.test(String(fd.Phone).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\s|-/g, ''))) errors.Phone = 'شماره‌ی همراه معتبر نیست.';
    if (!fd.CaptchaAnswer) errors.CaptchaAnswer = 'کد امنیتی را وارد کنید.';
    const fe = validateFiles(files);
    if (fe) errors.Attachments = fe;
    form.querySelector('[data-consent-error]').hidden = !!fd.Consent;
    if (!showErrors(form, errors) || !fd.Consent) return;
    if (fd.Website_hp) return; // ربات

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> در حال ارسال…';
    try {
      const res = await submitProposal({ ...fd, ChallengeId: c.Id }, files);
      form.reset();
      form.querySelector('[data-files]')._files = [];
      form.querySelector('[data-file-list]').innerHTML = '';
      openDialog({
        title: 'پیشنهاد شما ثبت شد',
        size: 'md',
        body: html`<div class="tw-text-center">
          <span class="tw-mx-auto tw-flex tw-h-16 tw-w-16 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-50 tw-text-3xl tw-text-brand-600">${icon('fa-circle-check')}</span>
          <p class="tw-mt-4 tw-text-sm tw-leading-7">پیشنهاد شما برای «${c.Title}» با موفقیت ثبت شد.</p>
          <p class="tw-mt-3 tw-text-sm">کد رهگیری: <b class="tw-rounded-lg tw-bg-slate-100 tw-px-3 tw-py-1" dir="ltr">${res.trackingCode}</b></p>
          <p class="tw-mt-3 tw-text-xs tw-text-ink-muted">این کد را برای پیگیری‌های بعدی نگه دارید.</p></div>`,
        footer: html`<button type="button" class="shn-btn shn-btn-primary" data-dlg-close>متوجه شدم</button>`
      });
    } catch (err) {
      if (err.field) showErrors(form, { [err.field]: err.message });
      else toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> ارسال پیشنهاد';
      loadCaptcha(form);
    }
  });
}

async function renderRelated(c) {
  try {
    const { items } = await queryPublic('challenges', { domainId: c.DomainId, sort: 'deadline', pageSize: 4 });
    const rel = items.filter((x) => x.Id !== c.Id).slice(0, 3);
    if (!rel.length) return;
    shn('related-wrap').hidden = false;
    mount(shn('related'), html`${rel.map((x) => challengeCard(x, { compact: true }))}`);
  } catch { /* اختیاری */ }
}
