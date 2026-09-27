// داده‌های نمونه برای حالت پیش‌نمایش (mock). در حالت شیرپوینت استفاده نمی‌شود.
// تاریخ‌ها نسبت به «امروز» ساخته می‌شوند تا مهلت‌ها همیشه معتبر باشند.

const day = 86400000;
const at = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString();

export const MOCK_USERS = {
  public: null,
  company: { Id: 11, Title: 'مهندس رضایی', Email: 'rezaei@fanavaran.example', role: 'company' },
  holding: { Id: 2, Title: 'دکتر احمدی', Email: 'ahmadi@shastan.example', role: 'holding', isAdmin: true }
};

export const DOMAINS = [
  { Id: 1, Title: 'بهبود و تحول در فرآیند', Key: 'process', Icon: 'fa-gears', Tone: 'sky', SortOrder: 1, Description: 'بهینه‌سازی خطوط تولید، کاهش ضایعات و افزایش بازدهی عملیاتی.' },
  { Id: 2, Title: 'بومی‌سازی و ساخت داخل', Key: 'localization', Icon: 'fa-wrench', Tone: 'amber', SortOrder: 2, Description: 'تولید داخلی قطعات، کاتالیست‌ها و تجهیزات های‌تک.' },
  { Id: 3, Title: 'هوشمندسازی و تحول دیجیتال', Key: 'digital', Icon: 'fa-brain', Tone: 'indigo', SortOrder: 3, Description: 'به‌کارگیری IoT، هوش مصنوعی و سامانه‌های تصمیم‌یار.' },
  { Id: 4, Title: 'محیط زیست و اقتصاد پایدار', Key: 'environment', Icon: 'fa-leaf', Tone: 'green', SortOrder: 4, Description: 'کاهش کربن، بازیافت پساب و مدیریت پسماندهای صنعتی.' },
  { Id: 5, Title: 'زنجیره ارزش و توسعه محصول', Key: 'value-chain', Icon: 'fa-link', Tone: 'red', SortOrder: 5, Description: 'تکمیل زنجیره پایین‌دستی و محصولات با ارزش افزوده بالا.' },
  { Id: 6, Title: 'مواد اولیه و مصرفی', Key: 'materials', Icon: 'fa-boxes-packing', Tone: 'purple', SortOrder: 6, Description: 'تأمین پایدار مواد شیمیایی، افزودنی‌ها و خوراک واحدها.' },
  { Id: 7, Title: 'مدیریت انرژی و یوتیلیتی', Key: 'energy', Icon: 'fa-bolt', Tone: 'cyan', SortOrder: 7, Description: 'کاهش مصرف انرژی، بازیابی حرارت و ارتقای بازدهی نیروگاهی.' }
];

export const CATEGORIES = [
  { Id: 1, Title: 'پتروشیمی' }, { Id: 2, Title: 'نفت و قیر' }, { Id: 3, Title: 'روانکار' },
  { Id: 4, Title: 'سرمایه‌گذاری' }, { Id: 5, Title: 'خدمات مهندسی' }
];

// ---- اقلام دارای گردش‌کار ----
// هر رکورد: { Id, CompanyId, WorkflowStatus, data, published, comments, Created, ... }
// published = نسخه‌ی تأییدشده‌ای که عموم می‌بینند (معادل آخرین نسخه‌ی Approved در شیرپوینت)

function published(fields, extra = {}) {
  return { WorkflowStatus: 'Published', Moderation: 0, data: fields, published: { ...fields }, comments: [], PublishedOn: extra.PublishedOn || at(-30), Created: extra.Created || at(-45), ...extra };
}

function pending(fields, extra = {}) {
  return { WorkflowStatus: 'Submitted', Moderation: 2, data: fields, published: null, comments: [], SubmittedOn: extra.SubmittedOn || at(-2), Created: extra.Created || at(-3), ...extra };
}

const companies = [
  { Id: 1, Code: '001', Icon: 'fa-flask', data: { Title: 'پتروشیمی فن‌آوران', CategoryId: 1, ShortDesc: 'تولیدکننده متانول، اسید استیک و منوکسید کربن در منطقه ویژه اقتصادی پتروشیمی.', About: 'پتروشیمی فن‌آوران با ظرفیت اسمی بیش از یک میلیون تن متانول در سال، از تولیدکنندگان اصلی محصولات پایه‌ی شیمیایی کشور است.\nواحد تحقیق و توسعه‌ی شرکت با تمرکز بر بومی‌سازی کاتالیست‌ها و بهینه‌سازی مصرف انرژی فعالیت می‌کند.', Established: 1373, Website: 'https://fanavaran.example', PublicPhone: '061-52320000', PublicEmail: 'info@fanavaran.example', Address: 'بندر ماهشهر، منطقه ویژه اقتصادی پتروشیمی' } },
  { Id: 2, Code: '002', Icon: 'fa-industry', data: { Title: 'پتروشیمی خراسان', CategoryId: 1, ShortDesc: 'بزرگ‌ترین مجتمع تولید کودهای شیمیایی، اوره و ملامین در شمال شرق کشور.', About: 'پتروشیمی خراسان با تولید آمونیاک، اوره و ملامین نقش کلیدی در تأمین نیاز بخش کشاورزی دارد.', Established: 1364, Website: 'https://khpc.example', PublicPhone: '0584-2290000', PublicEmail: 'info@khpc.example', Address: 'بجنورد، کیلومتر ۱۰ جاده اسفراین' } },
  { Id: 3, Code: '003', Icon: 'fa-oil-well', data: { Title: 'نفت پاسارگاد', CategoryId: 2, ShortDesc: 'بزرگ‌ترین تولیدکننده‌ی قیر در منطقه با شش کارخانه‌ی تولیدی.', About: 'نفت پاسارگاد با تولید انواع قیر، عایق‌های رطوبتی و محصولات نفتی، سهم عمده‌ای از بازار داخلی و صادراتی را در اختیار دارد.', Established: 1340, Website: 'https://pasargad.example', PublicPhone: '021-88000000', PublicEmail: 'info@pasargad.example', Address: 'تهران، خیابان شهید بهشتی' } },
  { Id: 4, Code: '004', Icon: 'fa-atom', data: { Title: 'پتروشیمی آبادان', CategoryId: 1, ShortDesc: 'قدیمی‌ترین مجتمع پتروشیمی کشور، تولیدکننده‌ی PVC و سود پرک.', About: 'پتروشیمی آبادان از پیشگامان صنعت پتروشیمی ایران است و در زمینه‌ی تولید پی‌وی‌سی و کلر-آلکالی فعالیت دارد.', Established: 1345, Website: '', PublicPhone: '061-53260000', PublicEmail: 'info@abadan-pc.example', Address: 'آبادان، جاده بهمنشیر' } },
  { Id: 5, Code: '005', Icon: 'fa-droplet', data: { Title: 'نفت ایرانول', CategoryId: 3, ShortDesc: 'تولیدکننده‌ی انواع روغن موتور و روانکارهای صنعتی.', About: 'نفت ایرانول با دو پالایشگاه در تهران و آبادان، طیف گسترده‌ای از روانکارهای خودرویی و صنعتی را تولید می‌کند.', Established: 1351, Website: 'https://iranol.example', PublicPhone: '021-82110000', PublicEmail: 'info@iranol.example', Address: 'تهران، بزرگراه آفریقا' } },
  { Id: 6, Code: '006', Icon: 'fa-chart-pie', data: { Title: 'سرمایه‌گذاری صنایع پتروشیمی', CategoryId: 4, ShortDesc: 'هلدینگ تخصصی مدیریت شرکت‌های صنعتی و تولیدی زنجیره‌ی پتروشیمی.', About: 'این شرکت با مدیریت سبد سرمایه‌گذاری در زنجیره‌ی پتروشیمی، توسعه‌ی طرح‌های پایین‌دستی را دنبال می‌کند.', Established: 1370, Website: '', PublicPhone: '021-88700000', PublicEmail: 'info@piic.example', Address: 'تهران، خیابان ولیعصر' } },
  { Id: 7, Code: '007', Icon: 'fa-helmet-safety', data: { Title: 'مهندسی و ساختمان صنایع نفت', CategoryId: 5, ShortDesc: 'پیمانکار عمومی EPC در طرح‌های نفت، گاز و پتروشیمی.', About: 'ارائه‌ی خدمات مهندسی، تأمین کالا و اجرای طرح‌های صنعتی بزرگ.', Established: 1357, Website: '', PublicPhone: '021-84000000', PublicEmail: 'info@oiec.example', Address: 'تهران، میدان ونک' } },
  { Id: 8, Code: '008', Icon: 'fa-vial', data: { Title: 'پتروشیمی شازند', CategoryId: 1, ShortDesc: 'تولیدکننده‌ی پلی‌اتیلن، پلی‌پروپیلن و مونواتیلن گلایکول.', About: 'مجتمع پتروشیمی شازند با خوراک نفتا و گاز مایع، تأمین‌کننده‌ی بخش مهمی از پلیمرهای کشور است.', Established: 1368, Website: '', PublicPhone: '086-32620000', PublicEmail: 'info@shazand.example', Address: 'اراک، شازند' } }
].map((c) => ({ ...published(c.data), Id: c.Id, Code: c.Code, Icon: c.Icon, CompanyId: c.Id }));

const contacts = [
  { CompanyId: 1, data: { Title: 'مهندس رضایی', RepTitle: 'مدیر تحقیق و توسعه', RepEmail: 'rd@fanavaran.example', RepPhone: '021-42575000 داخلی 304' } },
  { CompanyId: 2, data: { Title: 'دکتر کریمی', RepTitle: 'معاون فناوری', RepEmail: 'tech@khpc.example', RepPhone: '0584-2290120' } },
  { CompanyId: 3, data: { Title: 'مهندس موسوی', RepTitle: 'رئیس واحد نوآوری', RepEmail: 'innovation@pasargad.example', RepPhone: '021-88000450' } },
  { CompanyId: 5, data: { Title: 'مهندس نوری', RepTitle: 'مدیر R&D', RepEmail: 'rd@iranol.example', RepPhone: '021-82110300' } }
].map((c, i) => ({ ...published(c.data), Id: i + 1, CompanyId: c.CompanyId }));

const L = 'فراخوان‌های این مسئله برای شرکت‌های دانش‌بنیان، پژوهشگاه‌ها و تیم‌های فناور باز است.';

const challenges = [
  { CompanyId: 1, s: published({ Title: 'بومی‌سازی کاتالیست سنتز متانول با دانش فنی داخلی', DomainId: 2, Priority: 'Urgent', Deadline: at(28), Summary: 'طراحی و تولید کاتالیست مس-روی-آلومینا با عمر کاری حداقل چهار سال برای راکتورهای سنتز متانول.', ProblemStatement: 'کاتالیست فعلی واحد سنتز متانول به‌طور کامل وارداتی است و هر چهار سال یک‌بار تعویض می‌شود.\nمحدودیت‌های تأمین، زمان‌بندی تعمیرات اساسی را با ریسک جدی مواجه کرده است.', CurrentSolution: 'خرید از دو تأمین‌کننده‌ی خارجی با زمان تحویل بیش از ۹ ماه.', ExpectedOutcome: 'دانش فنی تولید در مقیاس نیمه‌صنعتی، تست عملکرد در راکتور پایلوت و در نهایت تولید انبوه.', TRL: '6', Keywords: 'کاتالیست، متانول، بومی‌سازی', CallStatus: 'Open' }, { PublishedOn: at(-12) }) },
  { CompanyId: 2, s: published({ Title: 'بهینه‌سازی مصرف انرژی در کوره‌های واحد آمونیاک', DomainId: 7, Priority: 'Medium', Deadline: at(45), Summary: 'کاهش ۱۵ درصدی مصرف گاز طبیعی کوره‌های ریفرمر اولیه از طریق بهینه‌سازی احتراق و بازیابی حرارت.', ProblemStatement: 'راندمان حرارتی کوره‌های ریفرمر زیر ۸۵ درصد است و دمای گاز خروجی از دودکش بالاست.', CurrentSolution: 'تنظیم دستی مشعل‌ها بر اساس تجربه‌ی اپراتور.', ExpectedOutcome: 'طراحی سیستم کنترل پیشرفته‌ی احتراق و پیشنهاد مبدل بازیاب حرارت.', TRL: '7', Keywords: 'انرژی، کوره، احتراق', CallStatus: 'Open' }, { PublishedOn: at(-9) }) },
  { CompanyId: 3, s: published({ Title: 'پایش هوشمند خوردگی خطوط لوله با حسگرهای IoT', DomainId: 3, Priority: 'High', Deadline: at(19), Summary: 'استقرار شبکه‌ی حسگر بی‌سیم برای پایش آنلاین ضخامت و نرخ خوردگی خطوط انتقال قیر داغ.', ProblemStatement: 'بازرسی دوره‌ای دستی، خوردگی‌های موضعی را دیر شناسایی می‌کند و منجر به توقف‌های برنامه‌ریزی‌نشده می‌شود.', CurrentSolution: 'اندازه‌گیری فراصوتی دستی هر شش ماه.', ExpectedOutcome: 'حسگرهای مقاوم به دمای ۲۵۰ درجه، درگاه داده و داشبورد تحلیل پیش‌بینانه.', TRL: '5', Keywords: 'IoT، خوردگی، پایش وضعیت', CallStatus: 'Open' }, { PublishedOn: at(-6) }) },
  { CompanyId: 4, s: published({ Title: 'بازیافت پساب صنعتی و دستیابی به تخلیه‌ی صفر (ZLD)', DomainId: 4, Priority: 'Urgent', Deadline: at(60), Summary: 'طراحی فرآیند تصفیه و بازیافت پساب واحد کلر-آلکالی با هدف تخلیه‌ی صفر مایع.', ProblemStatement: 'پساب شور واحد کلر-آلکالی حاوی جیوه و نمک‌های محلول است و الزامات زیست‌محیطی سخت‌تر شده‌اند.', CurrentSolution: 'تصفیه‌ی اولیه و تخلیه به حوضچه‌های تبخیر.', ExpectedOutcome: 'مطالعه‌ی امکان‌سنجی، طراحی پایه و اجرای پایلوت ZLD.', TRL: '6', Keywords: 'ZLD، پساب، محیط زیست', CallStatus: 'Open' }, { PublishedOn: at(-4) }) },
  { CompanyId: 5, s: published({ Title: 'تولید افزودنی‌های روغن موتور با فرمولاسیون داخلی', DomainId: 6, Priority: 'High', Deadline: at(35), Summary: 'دستیابی به دانش فنی تولید بسته‌ی افزودنی (Additive Package) سطح API SN.', ProblemStatement: 'بیش از ۸۰ درصد افزودنی‌های مصرفی وارداتی است.', CurrentSolution: 'واردات بسته‌های کامل افزودنی.', ExpectedOutcome: 'فرمولاسیون، تست‌های موتوری و اخذ تأییدیه.', TRL: '4', Keywords: 'افزودنی، روانکار', CallStatus: 'Open' }, { PublishedOn: at(-15) }) },
  { CompanyId: 8, s: published({ Title: 'توسعه‌ی گرید پلی‌پروپیلن مخصوص الیاف بی‌بافت', DomainId: 5, Priority: 'Medium', Deadline: at(52), Summary: 'توسعه‌ی گرید جدید با شاخص جریان مذاب بالا برای بازار الیاف بی‌بافت پزشکی.', ProblemStatement: 'بازار داخلی گرید MFI بالا را از واردات تأمین می‌کند.', CurrentSolution: '—', ExpectedOutcome: 'فرمولاسیون، تولید آزمایشی و تأیید مشتریان کلیدی.', TRL: '6', Keywords: 'پلی‌پروپیلن، الیاف', CallStatus: 'Open' }, { PublishedOn: at(-20) }) },
  { CompanyId: 1, s: published({ Title: 'سامانه‌ی نگهداری و تعمیرات پیش‌بینانه‌ی کمپرسورها', DomainId: 3, Priority: 'Normal', Deadline: at(-5), Summary: 'پیش‌بینی خرابی کمپرسورهای سنتز با تحلیل ارتعاشات و یادگیری ماشین.', ProblemStatement: 'توقف‌های ناگهانی کمپرسورها هزینه‌ی سنگینی به تولید تحمیل می‌کند.', CurrentSolution: 'نگهداری زمان‌محور.', ExpectedOutcome: 'مدل پیش‌بینی و داشبورد هشدار.', TRL: '7', Keywords: 'PdM، یادگیری ماشین', CallStatus: 'Evaluating' }, { PublishedOn: at(-50) }) },
  { CompanyId: 2, s: published({ Title: 'جایگزینی داخلی غشاهای جداسازی هیدروژن', DomainId: 2, Priority: 'High', Deadline: at(-40), Summary: 'ساخت داخل غشاهای پلیمری واحد بازیافت هیدروژن.', ProblemStatement: 'غشاهای وارداتی با محدودیت تأمین روبه‌رو هستند.', CurrentSolution: 'واردات.', ExpectedOutcome: 'نمونه‌ی صنعتی و تست میدانی.', TRL: '6', Keywords: 'غشا، هیدروژن', CallStatus: 'Contracted' }, { PublishedOn: at(-120) }) },
  { CompanyId: 3, s: published({ Title: 'کاهش انتشار ترکیبات آلی فرار در مخازن قیر', DomainId: 4, Priority: 'Medium', Deadline: at(22), Summary: 'راهکار مهندسی برای جمع‌آوری و تصفیه‌ی بخارات مخازن ذخیره‌ی قیر.', ProblemStatement: 'انتشار VOC در مخازن باز، سلامت کارکنان و الزامات محیط زیستی را تحت تأثیر قرار داده است.', CurrentSolution: 'تهویه‌ی طبیعی.', ExpectedOutcome: 'طراحی سیستم جمع‌آوری بخار و واحد تصفیه.', TRL: '7', Keywords: 'VOC، قیر', CallStatus: 'Open' }, { PublishedOn: at(-2) }) },
  // در انتظار بررسی (همان نمونه‌های کارتابل قالب اولیه)
  { CompanyId: 1, s: pending({ Title: 'بازیابی گازهای مشعل (Flare) مجتمع', DomainId: 4, Priority: 'High', Deadline: at(70), Summary: 'طراحی واحد بازیافت گازهای ارسالی به مشعل و بازگرداندن آن به شبکه‌ی سوخت.', ProblemStatement: 'حجم قابل‌توجهی گاز در شرایط عادی به مشعل ارسال و سوزانده می‌شود.', ExpectedOutcome: 'طراحی پایه‌ی واحد FGRS و برآورد اقتصادی.', TRL: '7', Keywords: 'فلر، بازیافت گاز', CallStatus: 'Open' }, { SubmittedOn: at(-1) }) },
  { CompanyId: 5, s: pending({ Title: 'ساخت داخل مکانیکال سیل‌های پمپ‌های فرآیندی', DomainId: 2, Priority: 'Medium', Deadline: at(55), Summary: 'طراحی و ساخت مکانیکال سیل‌های دوگانه برای پمپ‌های روغن پایه.', ProblemStatement: 'مکانیکال سیل‌ها قطعه‌ای پرمصرف و وارداتی هستند.', ExpectedOutcome: 'نمونه‌ی اولیه و تست ۲۰۰۰ ساعته.', TRL: '5', Keywords: 'سیل، پمپ', CallStatus: 'Open' }, { SubmittedOn: at(-2) }) },
  { CompanyId: 6, s: pending({ Title: 'اتوماسیون انبارها با فناوری RFID', DomainId: 3, Priority: 'Normal', Deadline: at(40), Summary: 'ردیابی لحظه‌ای کالا و قطعات یدکی در انبارهای مرکزی.', ProblemStatement: 'مغایرت انبار و زمان طولانی شمارش.', ExpectedOutcome: 'پیاده‌سازی پایلوت در یک انبار.', TRL: '8', Keywords: 'RFID، انبار', CallStatus: 'Open' }, { SubmittedOn: at(-3) }) },
  // برگشت‌خورده و پیش‌نویس برای شرکت ۱ (کاربر نمونه‌ی شرکت)
  { CompanyId: 1, s: { WorkflowStatus: 'Returned', Moderation: 1, published: null, SubmittedOn: at(-6), ReviewedOn: at(-4), ReviewerTitle: 'دکتر احمدی', Created: at(-8),
    data: { Title: 'کاهش مصرف آب برج‌های خنک‌کننده', DomainId: 7, Priority: 'Medium', Deadline: at(30), Summary: 'کاهش مصرف آب جبرانی برج‌های خنک‌کن.', ProblemStatement: 'مصرف آب بالا.', ExpectedOutcome: 'کاهش مصرف.', CallStatus: 'Open' },
    comments: [{ Date: at(-4), Actor: 'دکتر احمدی', Action: 'Return', Comment: 'شرح چالش بسیار کلی است. لطفاً میزان فعلی مصرف آب، ظرفیت برج‌ها و هدف کمی کاهش مصرف را اضافه کنید.' }] } },
  { CompanyId: 1, s: { WorkflowStatus: 'Draft', Moderation: 2, published: null, Created: at(-1), comments: [],
    data: { Title: 'پوشش‌های ضدخوردگی نانوساختار برای مخازن', DomainId: 2, Priority: 'Normal', Deadline: at(90), Summary: 'پیش‌نویس در حال تکمیل', ProblemStatement: '', ExpectedOutcome: '', CallStatus: 'Open' } } }
].map((c, i) => ({ Id: 100 + i, CompanyId: c.CompanyId, ...c.s }));

function simple(list) {
  return list.map((x, i) => ({ Id: i + 1, CompanyId: x.c ?? null, ...(x.pending ? pending(x.f) : published(x.f, { PublishedOn: at(-(i * 7 + 3)) })) }));
}

const rd = simple([
  { c: 1, f: { Title: 'توسعه‌ی کاتالیست سنتز متانول در مقیاس پایلوت', DomainId: 2, Partner: 'پژوهشگاه صنعت نفت', ProjectStatus: 'در حال اجرا', StartDate: at(-200), EndDate: at(160), Progress: 55, Summary: 'ساخت و آزمون کاتالیست در راکتور پایلوت ۵ لیتری.', Description: '' } },
  { c: 2, f: { Title: 'مدل‌سازی دیجیتال‌توأمان واحد اوره', DomainId: 3, Partner: 'دانشگاه صنعتی شریف', ProjectStatus: 'در حال اجرا', StartDate: at(-120), EndDate: at(240), Progress: 30, Summary: 'ساخت Digital Twin برای بهینه‌سازی برخط شرایط عملیاتی.', Description: '' } },
  { c: 3, f: { Title: 'قیر اصلاح‌شده با پلیمر برای مناطق گرمسیر', DomainId: 5, Partner: 'دانشگاه تهران', ProjectStatus: 'تکمیل شده', StartDate: at(-500), EndDate: at(-60), Progress: 100, Summary: 'توسعه‌ی فرمولاسیون قیر PMB با مقاومت شیارشدگی بالا.', Description: '' } },
  { c: 5, f: { Title: 'روغن‌های زیست‌تخریب‌پذیر هیدرولیک', DomainId: 4, Partner: 'شرکت دانش‌بنیان سبزروان', ProjectStatus: 'در حال اجرا', StartDate: at(-90), EndDate: at(270), Progress: 20, Summary: 'تولید روغن هیدرولیک بر پایه‌ی استرهای گیاهی.', Description: '' } },
  { c: 4, f: { Title: 'بازیابی جیوه از لجن واحد کلر-آلکالی', DomainId: 4, Partner: 'دانشگاه شیراز', ProjectStatus: 'در حال اجرا', StartDate: at(-150), EndDate: at(200), Progress: 45, Summary: 'فرآیند تثبیت و بازیابی جیوه از پسماند جامد.', Description: '' } },
  { c: 8, f: { Title: 'کاتالیست زیگلر-ناتا نسل جدید', DomainId: 2, Partner: 'پژوهشگاه پلیمر و پتروشیمی', ProjectStatus: 'در حال اجرا', StartDate: at(-300), EndDate: at(100), Progress: 70, Summary: 'بومی‌سازی کاتالیست تولید پلی‌پروپیلن.', Description: '' } }
]);

const products = simple([
  { c: 1, f: { Title: 'کاتالیست ریفرمینگ بخار FNV-R12', DomainId: 2, CertNo: 'DB-1402-1187', Website: '', Summary: 'کاتالیست نیکلی ریفرمینگ با عملکرد معادل نمونه‌های وارداتی.', Description: '' } },
  { c: 5, f: { Title: 'روغن توربین گازی با عمر بالا', DomainId: 6, CertNo: 'DB-1401-0932', Website: 'https://iranol.example', Summary: 'روغن توربین با پایداری اکسیداسیون بالای ۱۰۰۰۰ ساعت.', Description: '' } },
  { c: 3, f: { Title: 'عایق رطوبتی نانو اصلاح‌شده', DomainId: 5, CertNo: 'DB-1400-0421', Website: '', Summary: 'ایزوگام با افزودنی نانو و مقاومت UV بالا.', Description: '' } },
  { c: 8, f: { Title: 'مستربچ ضد UV پلی‌اتیلن', DomainId: 5, CertNo: 'DB-1402-2210', Website: '', Summary: 'افزودنی پایدارکننده‌ی نوری برای فیلم‌های کشاورزی.', Description: '' } }
]);

const contracts = simple([
  { c: 2, f: { Title: 'ساخت غشاهای جداسازی هیدروژن', DomainId: 2, Contractor: 'شرکت دانش‌بنیان غشاگستر', ContractDate: at(-35), DurationMonths: 18, ContractStatus: 'در حال اجرا', Summary: 'قرارداد ساخت و تست میدانی ۲۰ مدول غشایی.' } },
  { c: 1, f: { Title: 'استقرار سامانه‌ی پایش ارتعاشات', DomainId: 3, Contractor: 'شرکت هوشمندسازان صنعت', ContractDate: at(-80), DurationMonths: 12, ContractStatus: 'در حال اجرا', Summary: 'نصب ۱۲۰ حسگر ارتعاش روی تجهیزات دوار.' } },
  { c: 3, f: { Title: 'تأمین داخلی پمپ‌های قیر', DomainId: 2, Contractor: 'پمپ‌سازی ایران', ContractDate: at(-210), DurationMonths: 10, ContractStatus: 'خاتمه یافته', Summary: 'ساخت و تحویل ۸ دستگاه پمپ دنده‌ای قیر داغ.' } },
  { c: 4, f: { Title: 'مطالعه‌ی امکان‌سنجی ZLD', DomainId: 4, Contractor: 'پژوهشکده محیط زیست', ContractDate: at(-20), DurationMonths: 6, ContractStatus: 'در حال اجرا', Summary: 'مطالعات پایه و انتخاب فناوری.' } },
  { c: 5, f: { Title: 'بازیابی حرارت واحد تقطیر در خلأ', DomainId: 7, Contractor: 'شرکت مهندسی انرژی پاک', ContractDate: at(-150), DurationMonths: 9, ContractStatus: 'در حال اجرا', Summary: 'طراحی و نصب مبدل‌های بازیاب.' } }
]);

const plans = simple([
  { c: 1, f: { Title: 'طرح تولید فرمالدهید از متانول', DomainId: 5, Location: 'بندر ماهشهر', PlanStatus: 'در حال اجرا', StartDate: at(-400), EndDate: at(300), Progress: 62, Summary: 'تکمیل زنجیره‌ی ارزش متانول با ظرفیت ۱۰۰ هزار تن.', Description: '' } },
  { c: 2, f: { Title: 'توسعه‌ی واحد ملامین', DomainId: 5, Location: 'بجنورد', PlanStatus: 'مطالعاتی', StartDate: at(-30), EndDate: at(700), Progress: 8, Summary: 'افزایش ظرفیت ملامین به ۴۰ هزار تن.', Description: '' } },
  { c: 8, f: { Title: 'نیروگاه سیکل ترکیبی داخلی', DomainId: 7, Location: 'اراک', PlanStatus: 'بهره‌برداری شده', StartDate: at(-900), EndDate: at(-40), Progress: 100, Summary: 'تأمین پایدار برق و بخار مجتمع.', Description: '' } }
]);

const patents = simple([
  { c: 1, f: { Title: 'روش تولید کاتالیست مس-روی با توزیع حفره‌ی کنترل‌شده', DomainId: 2, PatentNo: '108452', Authority: 'داخلی', RegDate: at(-300), Inventors: 'رضایی، حسینی', Summary: 'روش هم‌رسوبی جدید برای افزایش سطح فعال.' } },
  { c: 5, f: { Title: 'فرمولاسیون روغن دنده‌ی سنتتیک', DomainId: 6, PatentNo: 'US 11,2xx,xxx', Authority: 'بین‌المللی', RegDate: at(-500), Inventors: 'نوری، صادقی', Summary: 'روغن دنده با پایداری برشی بالا.' } },
  { c: 3, f: { Title: 'افزودنی ضدعریان‌شدگی قیر', DomainId: 5, PatentNo: '101937', Authority: 'داخلی', RegDate: at(-650), Inventors: 'موسوی', Summary: 'افزودنی آمینی برای افزایش چسبندگی قیر به سنگدانه.' } }
]);

const mous = simple([
  { c: 1, f: { Title: 'همکاری پژوهشی در حوزه‌ی کاتالیست', DomainId: 2, Party: 'پژوهشگاه صنعت نفت', SignDate: at(-240), EndDate: at(490), Summary: 'تعریف پروژه‌های مشترک و استفاده از آزمایشگاه‌ها.' } },
  { c: 2, f: { Title: 'راه‌اندازی مرکز نوآوری کشاورزی هوشمند', DomainId: 3, Party: 'پارک علم و فناوری خراسان', SignDate: at(-100), EndDate: at(630), Summary: 'حمایت از استارتاپ‌های حوزه‌ی کود و کشاورزی.' } },
  { c: 3, f: { Title: 'تفاهم‌نامه‌ی آموزش و پژوهش راه‌سازی', DomainId: 5, Party: 'دانشگاه صنعتی امیرکبیر', SignDate: at(-400), EndDate: at(330), Summary: 'پژوهش مشترک در زمینه‌ی قیرهای اصلاح‌شده.' } }
]);

const events = simple([
  { f: { Title: 'نمایشگاه بین‌المللی نفت، گاز و پتروشیمی', EventType: 'نمایشگاه', StartDate: at(24), EndDate: at(27), Location: 'تهران، محل دائمی نمایشگاه‌های بین‌المللی', Link: '', Summary: 'حضور هلدینگ شستان و شرکت‌های تابعه در غرفه‌ی مشترک.' } },
  { f: { Title: 'رویداد نوآوری باز: چالش‌های انرژی', EventType: 'رویداد نوآوری', StartDate: at(10), EndDate: at(11), Location: 'مرکز نوآوری شستان', Link: '', Summary: 'ارائه‌ی مسائل حوزه‌ی انرژی به شرکت‌های دانش‌بنیان و تیم‌های فناور.' } },
  { f: { Title: 'وبینار معرفی نظام مسائل فناورانه', EventType: 'وبینار', StartDate: at(5), EndDate: null, Location: 'برخط', Link: '', Summary: 'آشنایی با فرایند ارسال پیشنهاد و ارزیابی.' } },
  { f: { Title: 'همایش ملی بومی‌سازی تجهیزات صنعت نفت', EventType: 'همایش', StartDate: at(-30), EndDate: at(-29), Location: 'اصفهان', Link: '', Summary: 'ارائه‌ی دستاوردهای بومی‌سازی شرکت‌های تابعه.' } }
]);

const publications = simple([
  { f: { Title: 'گزارش سالانه‌ی نوآوری و فناوری ۱۴۰۴', PubType: 'گزارش', PubDate: at(-60), Summary: 'مروری بر مسائل، قراردادها و دستاوردهای فناورانه‌ی سال گذشته.' } },
  { f: { Title: 'راهنمای ارسال طرح پیشنهادی (RFP)', PubType: 'بروشور', PubDate: at(-20), Summary: 'فرایند، معیارهای ارزیابی و قالب طرح پیشنهادی.' } },
  { f: { Title: 'نقشه‌ی راه فناوری زنجیره‌ی متانول', PubType: 'کتاب', PubDate: at(-180), Summary: 'تحلیل فناوری‌های کلیدی و اولویت‌های سرمایه‌گذاری.' } }
]);

// ویرایش در انتظار روی محتوای منتشرشده (نمونه برای مقایسه‌ی نسخه‌ها در کارتابل)
products[0].data = { ...products[0].data, Summary: 'کاتالیست نیکلی ریفرمینگ بخار با عملکرد معادل نمونه‌های وارداتی و عمر کاری ۵ سال (تأییدشده در تست میدانی).', CertNo: 'DB-1404-0311' };
products[0].WorkflowStatus = 'Submitted';
products[0].Moderation = 2;
products[0].SubmittedOn = at(-1);

export function buildSeed() {
  return {
    version: 3,
    items: { companies, contacts, challenges, rd, products, contracts, plans, patents, mous, events, publications },
    messages: [
      { Id: 1, Title: 'علی محمدی', Organization: 'شرکت فناوران نوین', Phone: '09120000000', Email: 'a.mohammadi@example.com', Subject: 'همکاری', Message: 'درخواست جلسه برای معرفی توانمندی‌های شرکت در حوزه‌ی کاتالیست.', Created: at(-1), Status: 'New' },
      { Id: 2, Title: 'سارا کاظمی', Organization: '', Phone: '09350000000', Email: 'kazemi@example.com', Subject: 'سؤال', Message: 'آیا شرکت‌های غیر دانش‌بنیان هم می‌توانند پیشنهاد ارسال کنند؟', Created: at(-3), Status: 'Answered' }
    ],
    proposals: [
      { Id: 1, ChallengeId: 100, ApplicantCompany: 'شرکت دانش‌بنیان کاتالیست‌سازان', ContactName: 'دکتر شریفی', Phone: '09121111111', Email: 'sharifi@example.com', CertNo: 'DB-1401-5521', ProposalSummary: 'تجربه‌ی تولید کاتالیست مشابه در مقیاس ۵ تن در سال؛ پیشنهاد اجرای پایلوت ۶ ماهه.', Files: [{ name: 'proposal.pdf', size: 482000 }], Created: at(-2), Status: 'New', TrackingCode: 'P-1405-0001' }
    ],
    audit: [
      { Id: 1, Date: at(-4), Type: 'challenges', ItemId: 112, ItemTitle: 'کاهش مصرف آب برج‌های خنک‌کننده', CompanyId: 1, Action: 'Return', Actor: 'دکتر احمدی', Comment: 'شرح چالش بسیار کلی است.' },
      { Id: 2, Date: at(-2), Type: 'challenges', ItemId: 108, ItemTitle: 'کاهش انتشار ترکیبات آلی فرار در مخازن قیر', CompanyId: 3, Action: 'Approve', Actor: 'دکتر احمدی', Comment: '' }
    ],
    seq: 5000
  };
}
