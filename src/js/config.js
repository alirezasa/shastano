// پیکربندی مرکزی سامانه.
// حالت «mock» برای پیش‌نمایش بدون شیرپوینت است (داده در localStorage)، حالت «sp» روی SharePoint 2019 با REST کار می‌کند.
// تشخیص خودکار: اگر _spPageContextInfo وجود داشته باشد یعنی صفحه داخل شیرپوینت است.

const spCtx = typeof window !== 'undefined' ? window._spPageContextInfo : undefined;
const override = typeof window !== 'undefined' ? window.SHASTAN_CONFIG || {} : {};

export const CONFIG = {
  mode: override.mode || (spCtx ? 'sp' : 'mock'),

  // آدرس Site Collection ریشه که لیست‌ها در آن هستند (پنل‌ها در زیرسایت /panel قرار دارند)
  dataSiteUrl: override.dataSiteUrl || (spCtx ? spCtx.siteAbsoluteUrl : ''),

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

  // هندلر سمت سرور (WSP) برای فرم‌های عمومی: کپچا، اعتبارسنجی، ذخیره با دسترسی سیستمی
  publicHandler: override.publicHandler || '/_layouts/15/Shastan/PublicSubmit.ashx',
  captchaUrl: override.captchaUrl || '/_layouts/15/Shastan/Captcha.ashx',
  loginUrl: override.loginUrl || '/_layouts/15/Authenticate.aspx',
  logoutUrl: override.logoutUrl || '/_layouts/15/SignOut.aspx',

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
      home: 'Pages/default.aspx', challenges: 'Pages/challenges.aspx', challenge: 'Pages/challenge.aspx', companies: 'Pages/companies.aspx',
      company: 'Pages/company.aspx', catalog: 'Pages/catalog.aspx', contact: 'Pages/contact.aspx', login: null,
      companyPanel: 'panel/Pages/company.aspx', adminPanel: 'panel/Pages/admin.aspx'
    }
  }
};

export const IS_MOCK = CONFIG.mode === 'mock';
