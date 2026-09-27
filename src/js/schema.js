// تعریف انواع محتوا (Content Type) — منبع واحد برای فرم‌ها، کارت‌ها، کارتابل و اسکریپت ساخت لیست‌ها.
// قانون مهم: هر ستونی که در لیست عمومی تعریف شود برای کاربر ناشناس قابل خواندن است (شیرپوینت امنیت ستونی ندارد).
// پس اطلاعات محرمانه (مثل مبلغ قرارداد یا اطلاعات تماس نماینده) هرگز نباید در این لیست‌ها باشد.

export const WORKFLOW = {
  Draft: { label: 'پیش‌نویس', tone: 'slate', icon: 'fa-pen-to-square' },
  Submitted: { label: 'در انتظار بررسی هلدینگ', tone: 'amber', icon: 'fa-hourglass-half' },
  Returned: { label: 'برگشت جهت اصلاح', tone: 'orange', icon: 'fa-rotate-left' },
  Rejected: { label: 'رد شده', tone: 'red', icon: 'fa-ban' },
  Published: { label: 'منتشر شده', tone: 'green', icon: 'fa-circle-check' },
  Archived: { label: 'بایگانی', tone: 'slate', icon: 'fa-box-archive' }
};

// مقدار _ModerationStatus بومی شیرپوینت برای هر وضعیت
export const MODERATION = { Approved: 0, Denied: 1, Pending: 2 };

export const AUDIT_ACTIONS = {
  Create: 'ایجاد پیش‌نویس',
  Update: 'ویرایش',
  Submit: 'ارسال برای بررسی',
  Approve: 'تأیید و انتشار',
  Return: 'برگشت جهت اصلاح',
  Reject: 'رد نهایی',
  Archive: 'بایگانی',
  Restore: 'بازگردانی از بایگانی',
  CallStatus: 'تغییر وضعیت فراخوان'
};

export const PRIORITIES = [
  { value: 'Urgent', label: 'فوری', tone: 'red' },
  { value: 'High', label: 'بالا', tone: 'orange' },
  { value: 'Medium', label: 'متوسط', tone: 'amber' },
  { value: 'Normal', label: 'عادی', tone: 'slate' }
];

export const CALL_STATUS = [
  { value: 'Open', label: 'فراخوان فعال', tone: 'green' },
  { value: 'Evaluating', label: 'در حال ارزیابی پیشنهادها', tone: 'blue' },
  { value: 'Contracted', label: 'منجر به قرارداد', tone: 'purple' },
  { value: 'Closed', label: 'بسته شده', tone: 'slate' }
];

const TRL = Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: `TRL ${i + 1}` }));

const opt = (...labels) => labels.map((l) => ({ value: l, label: l }));

// فیلدهای پرتکرار
const F = {
  title: (label = 'عنوان') => ({ name: 'Title', label, type: 'text', required: true, max: 160 }),
  domain: { name: 'Domain', label: 'حوزه‌ی تخصصی (از حوزه‌های ۷گانه)', type: 'domain', required: true },
  summary: { name: 'Summary', label: 'خلاصه', type: 'note', required: true, max: 400, rows: 3, hint: 'حداکثر ۴۰۰ کاراکتر؛ در کارت‌ها و نتایج جستجو نمایش داده می‌شود.' },
  description: { name: 'Description', label: 'شرح کامل', type: 'note', rows: 6 },
  progress: { name: 'Progress', label: 'درصد پیشرفت', type: 'percent' },
  start: { name: 'StartDate', label: 'تاریخ شروع', type: 'date' },
  end: { name: 'EndDate', label: 'تاریخ پایان', type: 'date' }
};

export const TYPES = {
  challenges: {
    key: 'challenges', list: 'TechChallenges', owner: 'company', public: true,
    label: 'مسئله فناورانه', plural: 'مسائل فناورانه (RFP)', codePrefix: 'RFP',
    icon: 'fa-circle-question', tone: 'amber',
    description: 'نیازها و چالش‌های فناورانه‌ی شرکت‌های تابعه برای دریافت طرح پیشنهادی از شرکت‌های دانش‌بنیان',
    fields: [
      F.title('عنوان مسئله'),
      F.domain,
      { name: 'Priority', label: 'اولویت', type: 'choice', options: PRIORITIES, required: true },
      { name: 'Deadline', label: 'مهلت دریافت پیشنهاد', type: 'date', required: true, future: true },
      F.summary,
      { name: 'ProblemStatement', label: 'شرح کامل چالش', type: 'note', required: true, rows: 6 },
      { name: 'CurrentSolution', label: 'وضعیت یا راهکار فعلی', type: 'note', rows: 4 },
      { name: 'ExpectedOutcome', label: 'دستاورد و خروجی مورد انتظار', type: 'note', required: true, rows: 4 },
      { name: 'TRL', label: 'سطح آمادگی فناوری مورد انتظار', type: 'choice', options: TRL, hint: 'TRL 1 پژوهش پایه … TRL 9 محصول تجاری اثبات‌شده' },
      { name: 'Keywords', label: 'کلیدواژه‌ها', type: 'text', max: 200, hint: 'با ویرگول جدا کنید' },
      { name: 'Attachments', label: 'پیوست‌ها (مشخصات فنی، نقشه، …)', type: 'files' },
      { name: 'CallStatus', label: 'وضعیت فراخوان', type: 'choice', options: CALL_STATUS, holdingOnly: true }
    ],
    card: { meta: ['Domain', 'Priority'], date: 'Deadline' }
  },

  rd: {
    key: 'rd', list: 'RDProjects', owner: 'company', public: true,
    label: 'طرح R&D', plural: 'طرح‌های تحقیق و توسعه (R&D)', codePrefix: 'RD',
    icon: 'fa-flask', tone: 'purple',
    description: 'پروژه‌های تحقیق و توسعه‌ی شرکت‌های تابعه با دانشگاه‌ها و شرکت‌های دانش‌بنیان',
    fields: [
      F.title('عنوان طرح'), F.domain,
      { name: 'Partner', label: 'مجری / همکار', type: 'text', max: 160 },
      { name: 'ProjectStatus', label: 'وضعیت اجرا', type: 'choice', options: opt('در حال اجرا', 'تکمیل شده', 'متوقف شده'), required: true },
      F.start, F.end, F.progress, F.summary, F.description
    ],
    card: { meta: ['Domain', 'ProjectStatus'], date: 'StartDate', progress: 'Progress' }
  },

  products: {
    key: 'products', list: 'Products', owner: 'company', public: true,
    label: 'محصول دانش‌بنیان', plural: 'محصولات و خدمات دانش‌بنیان', codePrefix: 'PRD',
    icon: 'fa-award', tone: 'green',
    description: 'محصولات و خدمات فناورانه‌ی تولیدشده یا بومی‌سازی‌شده در شرکت‌های تابعه',
    fields: [
      F.title('نام محصول / خدمت'), F.domain,
      { name: 'CertNo', label: 'شماره گواهی دانش‌بنیان', type: 'text', max: 60 },
      { name: 'Website', label: 'وب‌سایت / کاتالوگ آنلاین', type: 'url' },
      F.summary, F.description
    ],
    card: { meta: ['Domain', 'CertNo'] }
  },

  contracts: {
    key: 'contracts', list: 'Contracts', owner: 'company', public: true,
    label: 'قرارداد رفع نیاز', plural: 'قراردادهای رفع نیاز', codePrefix: 'CNT',
    icon: 'fa-file-contract', tone: 'cyan',
    description: 'قراردادهای منعقدشده برای حل مسائل فناورانه (مبلغ قرارداد در سامانه‌ی عمومی ثبت نمی‌شود)',
    fields: [
      F.title('موضوع قرارداد'), F.domain,
      { name: 'Contractor', label: 'طرف قرارداد', type: 'text', required: true, max: 160 },
      { name: 'ContractDate', label: 'تاریخ انعقاد', type: 'date', required: true },
      { name: 'DurationMonths', label: 'مدت (ماه)', type: 'number', min: 1, max: 120 },
      { name: 'ContractStatus', label: 'وضعیت', type: 'choice', options: opt('در حال اجرا', 'خاتمه یافته'), required: true },
      F.summary
    ],
    card: { meta: ['Domain', 'Contractor'], date: 'ContractDate' }
  },

  plans: {
    key: 'plans', list: 'DevelopmentPlans', owner: 'company', public: true,
    label: 'طرح توسعه‌ای', plural: 'طرح‌های توسعه‌ای', codePrefix: 'DEV',
    icon: 'fa-chart-line', tone: 'red',
    description: 'طرح‌های توسعه‌ی ظرفیت، تکمیل زنجیره ارزش و محصولات جدید',
    fields: [
      F.title('عنوان طرح'), F.domain,
      { name: 'Location', label: 'محل اجرا', type: 'text', max: 160 },
      { name: 'PlanStatus', label: 'وضعیت', type: 'choice', options: opt('مطالعاتی', 'در حال اجرا', 'بهره‌برداری شده'), required: true },
      F.start, F.end, F.progress, F.summary, F.description
    ],
    card: { meta: ['Domain', 'PlanStatus'], progress: 'Progress' }
  },

  patents: {
    key: 'patents', list: 'Patents', owner: 'company', public: true,
    label: 'اختراع', plural: 'اختراعات ثبت‌شده', codePrefix: 'PAT',
    icon: 'fa-certificate', tone: 'amber',
    description: 'اختراعات ثبت‌شده‌ی داخلی و بین‌المللی کارکنان و شرکت‌های تابعه',
    fields: [
      F.title('عنوان اختراع'), F.domain,
      { name: 'PatentNo', label: 'شماره ثبت', type: 'text', required: true, max: 60 },
      { name: 'Authority', label: 'مرجع ثبت', type: 'choice', options: opt('داخلی', 'بین‌المللی'), required: true },
      { name: 'RegDate', label: 'تاریخ ثبت', type: 'date', required: true },
      { name: 'Inventors', label: 'مخترعین', type: 'text', max: 255 },
      F.summary
    ],
    card: { meta: ['Domain', 'Authority'], date: 'RegDate' }
  },

  mous: {
    key: 'mous', list: 'MoUs', owner: 'company', public: true,
    label: 'تفاهم‌نامه', plural: 'تفاهم‌نامه‌ها', codePrefix: 'MOU',
    icon: 'fa-handshake', tone: 'blue',
    description: 'تفاهم‌نامه‌های همکاری با دانشگاه‌ها، پژوهشگاه‌ها و شرکت‌های دانش‌بنیان',
    fields: [
      F.title('موضوع تفاهم‌نامه'), F.domain,
      { name: 'Party', label: 'طرف تفاهم‌نامه', type: 'text', required: true, max: 160 },
      { name: 'SignDate', label: 'تاریخ امضا', type: 'date', required: true },
      { name: 'EndDate', label: 'تاریخ اعتبار', type: 'date' },
      F.summary
    ],
    card: { meta: ['Domain', 'Party'], date: 'SignDate' }
  },

  events: {
    key: 'events', list: 'Events', owner: 'holding', public: true,
    label: 'رویداد', plural: 'رویدادها و نمایشگاه‌ها', codePrefix: 'EVT',
    icon: 'fa-calendar-check', tone: 'blue', noCompany: true,
    description: 'نمایشگاه‌ها، همایش‌ها و رویدادهای نوآوری هلدینگ و شرکت‌های تابعه',
    fields: [
      F.title('عنوان رویداد'),
      { name: 'EventType', label: 'نوع رویداد', type: 'choice', options: opt('نمایشگاه', 'همایش', 'رویداد نوآوری', 'وبینار', 'نشست تخصصی'), required: true },
      { name: 'StartDate', label: 'تاریخ برگزاری', type: 'date', required: true },
      F.end,
      { name: 'Location', label: 'محل برگزاری', type: 'text', max: 200 },
      { name: 'Link', label: 'لینک ثبت‌نام / اطلاعات بیشتر', type: 'url' },
      F.summary
    ],
    card: { meta: ['EventType', 'Location'], date: 'StartDate' }
  },

  publications: {
    key: 'publications', list: 'Publications', owner: 'holding', public: true,
    label: 'نشریه / گزارش', plural: 'انتشارات و گزارش‌ها', codePrefix: 'PUB',
    icon: 'fa-file-lines', tone: 'green', noCompany: true,
    description: 'گزارش‌ها، کتاب‌ها و بروشورهای منتشرشده توسط هلدینگ شستان',
    fields: [
      F.title('عنوان'),
      { name: 'PubType', label: 'نوع', type: 'choice', options: opt('گزارش', 'کتاب', 'مقاله', 'بروشور'), required: true },
      { name: 'PubDate', label: 'تاریخ انتشار', type: 'date', required: true },
      F.summary,
      { name: 'Attachments', label: 'فایل', type: 'files' }
    ],
    card: { meta: ['PubType'], date: 'PubDate' }
  },

  companies: {
    key: 'companies', list: 'Companies', owner: 'company', public: true, singleton: true,
    label: 'پروفایل شرکت', plural: 'پروفایل شرکت‌ها', codePrefix: 'CMP',
    icon: 'fa-building', tone: 'blue', noCompany: true,
    description: 'اطلاعات معرفی شرکت‌های تابعه',
    fields: [
      { name: 'Title', label: 'نام شرکت', type: 'text', required: true, max: 160, holdingOnly: true },
      { name: 'Category', label: 'دسته‌بندی', type: 'category', required: true, holdingOnly: true },
      { name: 'ShortDesc', label: 'معرفی کوتاه', type: 'note', required: true, max: 300, rows: 3 },
      { name: 'About', label: 'درباره‌ی شرکت', type: 'note', rows: 6 },
      { name: 'Established', label: 'سال تأسیس', type: 'number', min: 1300, max: 1500 },
      { name: 'Website', label: 'وب‌سایت', type: 'url' },
      { name: 'PublicPhone', label: 'تلفن عمومی', type: 'phone' },
      { name: 'PublicEmail', label: 'ایمیل عمومی', type: 'email' },
      { name: 'Address', label: 'نشانی', type: 'note', rows: 2, max: 300 }
    ]
  },

  // اطلاعات تماس نماینده: لیست جدا، بدون دسترسی ناشناس
  contacts: {
    key: 'contacts', list: 'CompanyContacts', owner: 'company', public: false, singleton: true,
    label: 'نماینده فناوری', plural: 'نمایندگان فناوری', codePrefix: 'REP',
    icon: 'fa-id-card', tone: 'slate',
    description: 'فقط برای کاربران واردشده نمایش داده می‌شود',
    fields: [
      { name: 'Title', label: 'نام و نام خانوادگی نماینده', type: 'text', required: true, max: 120 },
      { name: 'RepTitle', label: 'سمت', type: 'text', required: true, max: 120 },
      { name: 'RepEmail', label: 'ایمیل', type: 'email', required: true },
      { name: 'RepPhone', label: 'تلفن مستقیم / داخلی', type: 'phone', required: true }
    ]
  }
};

/** انواع قابل ثبت توسط شرکت‌ها (غیر از پروفایل) */
export const COMPANY_TYPES = ['challenges', 'rd', 'products', 'contracts', 'plans', 'patents', 'mous'];
/** انواع نمایش داده‌شده در صفحه‌ی catalog */
export const CATALOG_TYPES = ['rd', 'products', 'contracts', 'plans', 'patents', 'mous', 'events', 'publications'];
/** انواعی که هلدینگ بررسی می‌کند */
export const REVIEW_TYPES = ['challenges', 'rd', 'products', 'contracts', 'plans', 'patents', 'mous', 'companies', 'contacts'];

export const typeOf = (key) => TYPES[key] || null;
export const fieldOf = (type, name) => TYPES[type]?.fields.find((f) => f.name === name);

export function choiceLabel(field, value) {
  if (!field?.options) return value;
  return field.options.find((o) => o.value === value)?.label ?? value;
}
