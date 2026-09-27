// تعریف لیست‌ها و کتابخانه‌های شیرپوینت از روی schema.js (منبع واحد).
// خروجی: dist/sharepoint/provisioning/lists.json که Install-ShastanPortal.ps1 آن را می‌خواند.
import { TYPES, WORKFLOW, PRIORITIES, CALL_STATUS } from '../src/js/schema.js';

// access:
//   public         کاربر ناشناس: فقط مشاهده‌ی محتوای تأییدشده
//   authenticated  فقط کاربران واردشده (بدون ناشناس)
//   holding        فقط هلدینگ (و در صورت scope=folder، هر شرکت در پوشه‌ی خودش)
// scope:
//   folder  یک پوشه با مجوز اختصاصی برای هر شرکت (نام پوشه = CompanyCode)
//   item    آیتم هر شرکت مجوز اختصاصی دارد (لیست شرکت‌ها)
// companyRole: سطح دسترسی گروه شرکت روی پوشه/آیتم خودش (Contribute | Read)

const text = (name, label, max = 255, extra = {}) => ({ name, label, type: 'Text', max, ...extra });
const note = (name, label, extra = {}) => ({ name, label, type: 'Note', ...extra });

const WORKFLOW_FIELDS = [
  text('ItemCode', 'کد', 40, { indexed: true }),
  { name: 'WorkflowStatus', label: 'وضعیت گردش‌کار', type: 'Choice', choices: Object.keys(WORKFLOW), default: 'Draft', indexed: true },
  { name: 'SubmittedOn', label: 'تاریخ ارسال', type: 'DateTime' },
  { name: 'ReviewedOn', label: 'تاریخ بررسی', type: 'DateTime' },
  { name: 'PublishedOn', label: 'تاریخ انتشار', type: 'DateTime' },
  { name: 'Reviewer', label: 'بررسی‌کننده', type: 'User' },
  note('ReviewComments', 'آخرین نظر بررسی‌کننده')
];

function mapField(f) {
  switch (f.type) {
    case 'files': return null; // پیوست یا فایل کتابخانه
    case 'note': return note(f.name, f.label);
    case 'choice': return { name: f.name, label: f.label, type: 'Choice', choices: f.options.map((o) => o.value), indexed: ['CallStatus', 'Priority'].includes(f.name) };
    case 'domain': return { name: 'Domain', label: f.label, type: 'Lookup', lookupList: 'TechDomains', indexed: true };
    case 'category': return { name: 'Category', label: f.label, type: 'Lookup', lookupList: 'CompanyCategories' };
    case 'date': return { name: f.name, label: f.label, type: 'DateOnly' };
    case 'number': return { name: f.name, label: f.label, type: 'Number', min: f.min ?? null, maxValue: f.max ?? null };
    case 'percent': return { name: f.name, label: f.label, type: 'Number', min: 0, maxValue: 100 };
    default: return text(f.name, f.label, Math.min(f.max || 255, 255));
  }
}

function typeList(key, extra) {
  const def = TYPES[key];
  const fields = [];
  for (const f of def.fields) {
    const m = mapField(f);
    if (m) fields.push(m);
  }
  if (!def.noCompany) fields.push({ name: 'Company', label: 'شرکت', type: 'Lookup', lookupList: 'Companies', indexed: true });
  return {
    key,
    title: def.list,
    description: def.plural,
    template: def.library ? 'DocumentLibrary' : 'GenericList',
    moderated: true,
    attachments: !def.library && def.fields.some((f) => f.type === 'files'),
    fields: [...fields, ...WORKFLOW_FIELDS],
    ...extra
  };
}

export function listDefinitions() {
  return [
    // --- اطلاعات پایه (منبع Lookup ها؛ باید اول ساخته شوند)
    {
      key: 'categories', title: 'CompanyCategories', description: 'دسته‌بندی شرکت‌ها', template: 'GenericList', access: 'public', moderated: false,
      fields: [text('Title', 'عنوان دسته'), { name: 'SortOrder', label: 'ترتیب', type: 'Number' }]
    },
    {
      key: 'domains', title: 'TechDomains', description: 'حوزه‌های ۷گانه‌ی فناورانه', template: 'GenericList', access: 'public', moderated: false,
      fields: [text('Title', 'عنوان حوزه'), text('DomainKey', 'کلید'), text('Icon', 'آیکن (FontAwesome)', 60), text('Tone', 'رنگ', 20), note('Description', 'توضیح'),
        { name: 'SortOrder', label: 'ترتیب', type: 'Number' }, { name: 'IsActive', label: 'فعال', type: 'Boolean', default: true }]
    },
    // --- شرکت‌ها (هر شرکت آیتم خودش را ویرایش می‌کند؛ تغییرات نیازمند تأیید هلدینگ)
    typeList('companies', {
      access: 'public', scope: 'item', companyRole: 'Contribute',
      extraFields: [text('CompanyCode', 'کد شرکت', 20, { indexed: true }), text('Icon', 'آیکن (FontAwesome)', 60), { name: 'SortOrder', label: 'ترتیب', type: 'Number' }, { name: 'IsActive', label: 'فعال', type: 'Boolean', default: true }]
    }),
    // --- محتوای شرکت‌ها (پوشه‌ی اختصاصی هر شرکت)
    ...['challenges', 'rd', 'products', 'contracts', 'plans', 'patents', 'mous'].map((k) => typeList(k, { access: 'public', scope: 'folder', companyRole: 'Contribute' })),
    // --- نماینده‌ی فناوری: فقط کاربران واردشده
    typeList('contacts', { access: 'authenticated', scope: 'folder', companyRole: 'Contribute' }),
    // --- محتوای هلدینگ
    typeList('events', { access: 'public' }),
    typeList('publications', { access: 'public' }),
    {
      key: 'logos', title: 'CompanyLogos', description: 'لوگوی شرکت‌ها (تصویر PNG/SVG؛ نشانی فایل در پروفایل شرکت درج می‌شود)', template: 'DocumentLibrary', access: 'public', moderated: false,
      fields: []
    },
    // --- ورودی‌های عمومی (ذخیره فقط از طریق PublicSubmit.ashx)
    {
      key: 'proposals', title: 'Proposals', description: 'پیشنهادهای شرکت‌های دانش‌بنیان برای مسائل فناورانه', template: 'GenericList', access: 'holding', scope: 'folder', companyRole: 'Read',
      moderated: false, attachments: true,
      fields: [text('Title', 'عنوان'), { name: 'Challenge', label: 'مسئله', type: 'Lookup', lookupList: 'TechChallenges', indexed: true },
        text('ApplicantCompany', 'شرکت / تیم متقاضی'), text('ContactName', 'نام رابط'), text('Phone', 'تلفن', 40), text('Email', 'ایمیل', 120),
        text('CertNo', 'شماره گواهی دانش‌بنیان', 60), note('ProposalSummary', 'خلاصه‌ی پیشنهاد'),
        { name: 'EvaluationStatus', label: 'وضعیت ارزیابی', type: 'Choice', choices: ['New', 'Reviewing', 'Shortlisted', 'Accepted', 'Rejected'], default: 'New', indexed: true },
        note('EvaluatorComment', 'نظر ارزیاب'), text('TrackingCode', 'کد رهگیری', 40, { indexed: true }), text('SourceIp', 'IP فرستنده', 64)]
    },
    {
      key: 'messages', title: 'ContactMessages', description: 'پیام‌های فرم تماس', template: 'GenericList', access: 'holding', moderated: false,
      fields: [text('Title', 'نام فرستنده'), text('Organization', 'شرکت / سازمان'), text('Phone', 'تلفن', 40), text('Email', 'ایمیل', 120), text('Subject', 'موضوع', 120),
        note('Message', 'متن پیام'), { name: 'HandledStatus', label: 'وضعیت', type: 'Choice', choices: ['New', 'Answered'], default: 'New', indexed: true },
        note('Response', 'پاسخ'), text('TrackingCode', 'کد پیگیری', 40), text('SourceIp', 'IP فرستنده', 64)]
    },
    // --- عملیاتی
    {
      key: 'audit', title: 'AuditLog', description: 'لاگ عملیات و سابقه‌ی نظرات', template: 'GenericList', access: 'holding', scope: 'folder', companyRole: 'Contribute', moderated: false,
      fields: [text('Title', 'عنوان مورد'), text('ListName', 'نوع', 40, { indexed: true }), { name: 'ItemId', label: 'شناسه‌ی مورد', type: 'Number', indexed: true },
        text('Action', 'عملیات', 40), note('ActionComment', 'توضیحات'), { name: 'CompanyRef', label: 'شرکت', type: 'Lookup', lookupList: 'Companies' }, text('ActorName', 'کاربر', 120)]
    },
    {
      key: 'settings', title: 'SiteSettings', description: 'تنظیمات سکو (کلید / مقدار)', template: 'GenericList', access: 'authenticated', moderated: false,
      fields: [text('Title', 'کلید'), note('Value', 'مقدار')]
    },
    // --- صفحات پنل (بدون دسترسی ناشناس؛ باز کردن آن‌ها صفحه‌ی ورود را نشان می‌دهد)
    { key: 'panelPages', title: 'PanelPages', description: 'صفحات پنل شرکت‌ها و کارتابل هلدینگ', template: 'DocumentLibrary', access: 'authenticated', moderated: false, fields: [] }
  ].map((l) => ({ ...l, fields: [...(l.fields || []), ...(l.extraFields || [])], extraFields: undefined }));
}

// مقادیر پایه‌ی واقعی طرح (نه داده‌ی نمایشی)
export const SEED = {
  domains: [
    { Title: 'بهبود و تحول در فرآیند', DomainKey: 'process', Icon: 'fa-gears', Tone: 'sky', Description: 'بهینه‌سازی خطوط تولید، کاهش ضایعات و افزایش بازدهی عملیاتی.' },
    { Title: 'بومی‌سازی و ساخت داخل', DomainKey: 'localization', Icon: 'fa-wrench', Tone: 'amber', Description: 'تولید داخلی قطعات، کاتالیست‌ها و تجهیزات های‌تک.' },
    { Title: 'هوشمندسازی و تحول دیجیتال', DomainKey: 'digital', Icon: 'fa-brain', Tone: 'indigo', Description: 'به‌کارگیری IoT، هوش مصنوعی و سامانه‌های تصمیم‌یار.' },
    { Title: 'محیط زیست و اقتصاد پایدار', DomainKey: 'environment', Icon: 'fa-leaf', Tone: 'green', Description: 'کاهش کربن، بازیافت پساب و مدیریت پسماندهای صنعتی.' },
    { Title: 'زنجیره ارزش و توسعه محصول', DomainKey: 'value-chain', Icon: 'fa-link', Tone: 'red', Description: 'تکمیل زنجیره پایین‌دستی و محصولات با ارزش افزوده بالا.' },
    { Title: 'مواد اولیه و مصرفی', DomainKey: 'materials', Icon: 'fa-boxes-packing', Tone: 'purple', Description: 'تأمین پایدار مواد شیمیایی، افزودنی‌ها و خوراک واحدها.' },
    { Title: 'مدیریت انرژی و یوتیلیتی', DomainKey: 'energy', Icon: 'fa-bolt', Tone: 'cyan', Description: 'کاهش مصرف انرژی، بازیابی حرارت و ارتقای بازدهی نیروگاهی.' }
  ],
  priorities: PRIORITIES.map((p) => p.value),
  callStatus: CALL_STATUS.map((c) => c.value)
};
