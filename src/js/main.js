// نقطه‌ی ورود: راه‌اندازی قالب و ماژول صفحه بر اساس data-page
import { initLayout } from './ui/layout.js';
import * as home from './pages/home.js';
import * as challenges from './pages/challenges.js';
import * as challenge from './pages/challenge.js';
import * as companies from './pages/companies.js';
import * as company from './pages/company.js';
import * as catalog from './pages/catalog.js';
import * as contact from './pages/contact.js';
import * as login from './pages/login.js';
import * as companyPanel from './pages/company-panel.js';
import * as adminPanel from './pages/admin-panel.js';

const PAGES = { home, challenges, challenge, companies, company, catalog, contact, login, 'company-panel': companyPanel, 'admin-panel': adminPanel };

async function boot() {
  const app = document.getElementById('shastan-app');
  if (!app) return;
  // در شیرپوینت #shastan-app در مستر پیج است و شناسه‌ی صفحه در خود صفحه (data-shn-page) قرار دارد
  const page = document.querySelector('[data-shn-page]')?.dataset.shnPage || app.dataset.page;
  try {
    const user = page === 'login' ? null : await initLayout(page);
    await PAGES[page]?.init(user);
  } catch (e) {
    console.error('[shastan]', e);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
