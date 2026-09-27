import { html, mount, shn } from '../core/util.js';
import { submitContact } from '../data/repository.js';
import { captchaField, loadCaptcha, showErrors } from '../ui/forms.js';
import { openDialog, toast } from '../ui/overlay.js';
import { icon } from '../ui/components.js';

export function init() {
  const form = shn('contact-form');
  mount(shn('captcha-slot'), captchaField());
  loadCaptcha(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    const errors = {};
    ['Title', 'Phone', 'Subject', 'Message'].forEach((k) => { if (!String(d[k] || '').trim()) errors[k] = 'این فیلد الزامی است.'; });
    if (d.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.Email)) errors.Email = 'نشانی ایمیل معتبر نیست.';
    if (d.Phone && !/^[0-9۰-۹+\-\s]{8,20}$/.test(d.Phone)) errors.Phone = 'شماره تماس معتبر نیست.';
    if (!d.CaptchaAnswer) errors.CaptchaAnswer = 'کد امنیتی را وارد کنید.';
    if (!showErrors(form, errors) || d.Website_hp) return;
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const res = await submitContact(d);
      form.reset();
      openDialog({
        title: 'پیام شما ارسال شد', size: 'md',
        body: html`<div class="tw-text-center"><span class="tw-mx-auto tw-flex tw-h-16 tw-w-16 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-50 tw-text-3xl tw-text-brand-600">${icon('fa-circle-check')}</span>
          <p class="tw-mt-4 tw-text-sm">پیام شما ثبت و به روابط عمومی ارجاع شد.</p>
          <p class="tw-mt-3 tw-text-sm">کد پیگیری: <b class="tw-rounded-lg tw-bg-slate-100 tw-px-3 tw-py-1" dir="ltr">${res.trackingCode}</b></p></div>`,
        footer: html`<button type="button" class="shn-btn shn-btn-primary" data-dlg-close>بستن</button>`
      });
    } catch (err) {
      if (err.field) showErrors(form, { [err.field]: err.message }); else toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      loadCaptcha(form);
    }
  });
}
