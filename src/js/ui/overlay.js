// مودال، پنل کناری، تأیید و پیام شناور — با مدیریت فوکوس و کلید Esc
import { html, mount, shn } from '../core/util.js';
import { icon } from './components.js';

let lastFocus = null;
const openStack = [];

function trapFocus(root) {
  const f = root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])');
  (f[0] || root).focus();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openStack.length) openStack[openStack.length - 1].close();
});

/**
 * باز کردن مودال یا پنل کناری
 * @param {{title:string, body:any, footer?:any, size?:'md'|'lg'|'xl', side?:boolean, onClose?:Function}} o
 */
export function openDialog({ title, body, footer = '', size = 'lg', side = false, onClose }) {
  lastFocus = document.activeElement;
  const root = shn('modal-root');
  const wrap = document.createElement('div');
  const widths = { md: 'tw-max-w-lg', lg: 'tw-max-w-2xl', xl: 'tw-max-w-4xl' };
  const panelCls = side
    ? 'tw-absolute tw-inset-y-0 tw-left-0 tw-flex tw-w-full tw-max-w-2xl tw-flex-col tw-bg-white tw-shadow-2xl'
    : `tw-relative tw-mx-auto tw-my-8 tw-flex tw-max-h-[calc(100vh-4rem)] tw-w-[94%] ${widths[size]} tw-flex-col tw-rounded-2xl tw-bg-white tw-shadow-2xl`;
  mount(wrap, html`
    <div class="tw-fixed tw-inset-0 tw-z-[70] tw-overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="shn-dlg-title">
      <div class="tw-fixed tw-inset-0 tw-bg-slate-950/60 tw-backdrop-blur-[2px]" data-dlg-close></div>
      <div class="${panelCls}">
        <div class="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-surface-line tw-px-5 tw-py-4">
          <h2 id="shn-dlg-title" class="tw-text-base tw-font-bold">${title}</h2>
          <button type="button" class="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-lg tw-text-ink-muted hover:tw-bg-slate-100" data-dlg-close aria-label="بستن">${icon('fa-xmark')}</button>
        </div>
        <div class="tw-flex-1 tw-overflow-y-auto tw-px-5 tw-py-5 shn-scroll" data-dlg-body>${body}</div>
        ${footer ? html`<div class="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2 tw-border-t tw-border-surface-line tw-bg-slate-50 tw-px-5 tw-py-3 tw-rounded-b-2xl" data-dlg-footer>${footer}</div>` : ''}
      </div>
    </div>`);
  root.appendChild(wrap);
  document.documentElement.style.overflow = 'hidden';

  const api = {
    el: wrap,
    body: wrap.querySelector('[data-dlg-body]'),
    footer: wrap.querySelector('[data-dlg-footer]'),
    close() {
      wrap.remove();
      const i = openStack.indexOf(api);
      if (i >= 0) openStack.splice(i, 1);
      if (!openStack.length) document.documentElement.style.overflow = '';
      onClose?.();
      lastFocus?.focus?.();
    }
  };
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-dlg-close]')) api.close(); });
  openStack.push(api);
  trapFocus(wrap.querySelector('[role=dialog] > div:last-child'));
  return api;
}

/** پرسش تأیید با امکان دریافت دلیل (اجباری یا اختیاری) */
export function confirmDialog({ title, message, confirmText = 'تأیید', tone = 'primary', reason = null }) {
  return new Promise((resolve) => {
    let done = false;
    const btnCls = { primary: 'shn-btn-primary', danger: 'shn-btn-danger', brand: 'shn-btn-brand', warning: 'shn-btn-warning' }[tone];
    const dlg = openDialog({
      title,
      size: 'md',
      body: html`
        <p class="tw-text-sm tw-leading-7">${message}</p>
        ${reason ? html`<div class="tw-mt-4">
          <label class="shn-label" for="shn-reason">${reason.label}${reason.required ? html` <span class="tw-text-accent-600">*</span>` : ''}</label>
          <textarea id="shn-reason" rows="4" class="shn-input" placeholder="${reason.placeholder || ''}"></textarea>
          <span class="shn-error" data-reason-error hidden>وارد کردن این مورد الزامی است (حداقل ۱۰ کاراکتر).</span>
        </div>` : ''}`,
      footer: html`<button type="button" class="shn-btn shn-btn-ghost" data-dlg-close>انصراف</button>
        <button type="button" class="shn-btn ${btnCls}" data-confirm>${confirmText}</button>`,
      onClose: () => { if (!done) resolve(null); }
    });
    dlg.el.querySelector('[data-confirm]').addEventListener('click', () => {
      const ta = dlg.el.querySelector('#shn-reason');
      const value = ta ? ta.value.trim() : '';
      if (reason?.required && value.length < 10) {
        dlg.el.querySelector('[data-reason-error]').hidden = false;
        ta.setAttribute('aria-invalid', 'true');
        ta.focus();
        return;
      }
      done = true;
      resolve({ reason: value });
      dlg.close();
    });
  });
}

export function toast(message, type = 'success') {
  const root = shn('toast-root');
  if (!root) return;
  const icons = { success: 'fa-circle-check tw-text-brand-400', error: 'fa-circle-exclamation tw-text-accent-400', info: 'fa-circle-info tw-text-ocean-300' };
  const el = document.createElement('div');
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  mount(el, html`<div class="tw-flex tw-max-w-sm tw-items-start tw-gap-3 tw-rounded-2xl tw-bg-surface-dark tw-px-4 tw-py-3 tw-text-sm tw-text-white tw-shadow-2xl">
    <i class="fa-solid ${icons[type] || icons.info} tw-mt-1" aria-hidden="true"></i><span class="tw-leading-6">${message}</span></div>`);
  root.appendChild(el);
  setTimeout(() => el.remove(), type === 'error' ? 7000 : 4500);
}
