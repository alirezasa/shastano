import { CONFIG, IS_MOCK, siteUrl } from '../config.js';

/** ساخت آدرس صفحه با پارامترها؛ در حالت mock نسبت به ریشه‌ی dist و در شیرپوینت نسبت به Site Collection */
export function url(name, params = {}) {
  const map = CONFIG.pages[IS_MOCK ? 'mock' : 'sp'];
  const path = map[name] ?? map.home;
  const base = IS_MOCK
    ? (document.getElementById('shastan-app')?.dataset.root || './')
    : `${CONFIG.dataSiteUrl.replace(/\/$/, '')}/`;
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
  return `${base}${path}${q ? `?${q}` : ''}`;
}

export function loginUrl(returnTo = location.href) {
  if (IS_MOCK) return url('login', { ReturnUrl: returnTo });
  return `${siteUrl(CONFIG.loginUrl)}?Source=${encodeURIComponent(returnTo)}`;
}

export function logoutUrl() {
  return IS_MOCK ? url('home') : siteUrl(CONFIG.logoutUrl);
}
