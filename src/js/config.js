// پیکربندی مرکزی سامانه.
// حالت «mock» برای پیش‌نمایش بدون شیرپوینت است (داده در localStorage)، حالت «sp» روی SharePoint 2019 با REST کار می‌کند.
// تشخیص خودکار: اگر _spPageContextInfo وجود داشته باشد یعنی صفحه داخل شیرپوینت است.

const spCtx = typeof window !== 'undefined' ? window._spPageContextInfo : undefined;
const override = typeof window !== 'undefined' ? window.SHASTAN_CONFIG || {} : {};

/** آدرس سایت از روی مسیر صفحه (…/SitePages/x.aspx یا …/PanelPages/x.aspx) در صورت نبود _spPageContextInfo */
function siteFromLocation() {
  if (typeof location === 'undefined') return '';
  const m = location.pathname.match(/^(.*?)\/(SitePages|PanelPages)\//i);
  return location.origin + (m ? m[1] : '');
}

export const CONFIG = {
  // نسخه‌ی شیرپوینت (مستر پیج) mode را صریحاً 'sp' تعیین می‌کند؛ نسخه‌ی شیرپوینت اصلاً داده‌ی نمایشی ندارد.
  mode: override.mode || (spCtx ? 'sp' : 'mock'),

  // آدرس سایتی که لیست‌ها در آن هستند (web ریشه‌ی Site Collection)
  dataSiteUrl: override.dataSiteUrl || (spCtx ? spCtx.webAbsoluteUrl || spCtx.siteAbsoluteUrl : siteFromLocation()),

  // نام لیست‌ها در شیرپوینت (Title لیست)
  lists: {
    companies: 'Companies',
    contacts: 'CompanyContacts',
    categories: 'CompanyCategories',
    domains: 'TechDomains',
    challenges: 'TechChallenges',
    rd: 'RDProjects',
    products: 'Products',
    contracts: 'Contracts',
    plans: 'DevelopmentPlans',
    patents: 'Patents',
    mous: 'MoUs',
    events: 'Events',
    publications: 'Publications',
    messages: 'ContactMessages',
    proposals: 'Proposals',
    audit: 'AuditLog',
    settings: 'SiteSettings'
  },

  // هندلرهای سمت سرور (LAYOUTS\\Shastan) برای فرم‌های عمومی: کپچا، اعتبارسنجی، ذخیره با دسترسی سیستمی
  // نسبت به آدرس سایت ساخته می‌شوند تا SPContext سایت درست باشد.
  publicHandler: override.publicHandler || '_layouts/15/Shastan/PublicSubmit.ashx',
  captchaUrl: override.captchaUrl || '_layouts/15/Shastan/Captcha.ashx',
  loginUrl: override.loginUrl || '_layouts/15/Authenticate.aspx',
  logoutUrl: override.logoutUrl || '_layouts/15/SignOut.aspx',

  pageSize: 9,
  roleCacheMinutes: 10,

  // آدرس صفحات در هر حالت
  pages: {
    mock: {
      home: 'index.html', challenges: 'challenges.html', challenge: 'challenge.html', companies: 'companies.html',
      company: 'company.html', catalog: 'catalog.html', contact: 'contact.html', login: 'login.html',
      companyPanel: 'panel/company.html', adminPanel: 'panel/admin.html'
    },
    sp: {
      home: 'SitePages/index.aspx', challenges: 'SitePages/challenges.aspx', challenge: 'SitePages/challenge.aspx', companies: 'SitePages/companies.aspx',
      company: 'SitePages/company.aspx', catalog: 'SitePages/catalog.aspx', contact: 'SitePages/contact.aspx', login: null,
      companyPanel: 'PanelPages/company.aspx', adminPanel: 'PanelPages/admin.aspx'
    }
  }
};

export const IS_MOCK = CONFIG.mode === 'mock';

/** آدرس کامل یک مسیر نسبت به سایت داده */
export const siteUrl = (path = '') => `${CONFIG.dataSiteUrl.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`;
