// پیاده‌سازی نمایشی مخزن داده روی localStorage.
// رفتار را دقیقاً مثل شیرپوینت شبیه‌سازی می‌کند:
//  - عموم فقط نسخه‌ی تأییدشده (published) را می‌بینند؛ ویرایش در انتظار روی آن اثری ندارد
//  - شرکت فقط اقلام خودش را می‌بیند و فقط در پوشه‌ی خودش ثبت می‌کند
//  - فقط هلدینگ می‌تواند تأیید / برگشت / رد کند
import { buildSeed, MOCK_USERS, DOMAINS, CATEGORIES } from './mock-data.js';
import { TYPES, REVIEW_TYPES } from '../schema.js';
import { storage, clone } from '../core/util.js';
import { jalaliYear } from '../core/format.js';

const KEY = 'shn.mock.db';
const ROLE_KEY = 'shn.mock.role';
const store = storage('local');
const now = () => new Date().toISOString();
const wait = (ms = 120 + Math.random() * 180) => new Promise((r) => setTimeout(r, ms));

let db = null;

function load() {
  if (db) return db;
  const saved = store.get(KEY);
  db = saved && saved.version === buildSeed().version ? saved : buildSeed();
  // کد رهگیری برای اقلام نمونه
  Object.entries(db.items).forEach(([type, list]) => list.forEach((it) => { if (!it.Code) it.Code = makeCode(type, it); }));
  persist();
  return db;
}
function persist() { store.set(KEY, db); }

function makeCode(type, it) {
  if (type === 'companies') return it.Code;
  const prefix = TYPES[type]?.codePrefix || 'ITM';
  return `${prefix}-${jalaliYear(it.Created || now())}-${String(it.Id).padStart(4, '0')}`;
}

export function resetDemo() {
  store.remove(KEY);
  db = null;
  load();
}

// ---------- کاربر و نقش ----------
export function getDemoRole() {
  return store.get(ROLE_KEY, { role: 'public', companyId: 1 });
}
export function setDemoRole(role, companyId = 1) {
  store.set(ROLE_KEY, { role, companyId: Number(companyId) || 1 });
}

export async function getCurrentUser() {
  load();
  const { role, companyId } = getDemoRole();
  if (role === 'public' || !MOCK_USERS[role]) return { isAnonymous: true, role: 'public' };
  const u = MOCK_USERS[role];
  const user = { isAnonymous: false, Id: u.Id, Title: u.Title, Email: u.Email, role: u.role, isAdmin: !!u.isAdmin };
  if (role === 'company') {
    const c = db.items.companies.find((x) => x.Id === companyId) || db.items.companies[0];
    user.companyId = c.Id;
    user.companyTitle = c.data.Title;
  }
  return user;
}

async function requireUser(roles) {
  const u = await getCurrentUser();
  if (u.isAnonymous || (roles && !roles.includes(u.role))) {
    const e = new Error('دسترسی غیرمجاز'); e.status = 403; throw e;
  }
  return u;
}

// ---------- تبدیل رکورد به شکل استاندارد ----------
function domainTitle(id) { return DOMAINS.find((d) => d.Id === id)?.Title || ''; }
function categoryTitle(id) { return CATEGORIES.find((c) => c.Id === id)?.Title || ''; }
function companyRec(id) { return load().items.companies.find((c) => c.Id === id); }

function shape(type, it, view) {
  const fields = view === 'public' ? it.published : it.data;
  const company = TYPES[type].noCompany ? null : companyRec(it.CompanyId);
  const out = {
    ...fields,
    Id: it.Id,
    type,
    Code: it.Code,
    CompanyId: type === 'companies' ? it.Id : it.CompanyId,
    CompanyTitle: type === 'companies' ? fields.Title : company?.published?.Title || company?.data?.Title || '',
    DomainTitle: domainTitle(fields.DomainId),
    CategoryTitle: categoryTitle(fields.CategoryId),
    Icon: it.Icon,
    Created: it.Created,
    Modified: it.Modified || it.Created,
    SubmittedOn: it.SubmittedOn,
    PublishedOn: it.PublishedOn,
    ReviewedOn: it.ReviewedOn,
    ReviewerTitle: it.ReviewerTitle,
    AuthorTitle: it.AuthorTitle || (company ? `کارشناس ${company.data.Title}` : 'هلدینگ شستان'),
    Attachments: fields.Attachments || []
  };
  if (view !== 'public') {
    out.WorkflowStatus = it.WorkflowStatus;
    out.HasPublishedVersion = !!it.published;
    out.Comments = clone(it.comments || []);
    out.LastComment = it.comments?.length ? it.comments[it.comments.length - 1] : null;
  } else {
    out.WorkflowStatus = 'Published';
  }
  return out;
}

const isPublic = (it) => it.published && it.published.WorkflowStatus !== 'Archived' && it.WorkflowStatus !== 'Archived';

// ---------- خواندن عمومی ----------
export async function getDomains() { await wait(60); return clone(DOMAINS); }
export async function getCategories() { await wait(40); return clone(CATEGORIES); }

export async function getPublicItems(type) {
  await wait();
  return load().items[type].filter(isPublic).map((it) => shape(type, it, 'public'));
}

export async function getPublicItem(type, id) {
  await wait();
  const it = load().items[type].find((x) => x.Id === Number(id));
  return it && isPublic(it) ? shape(type, it, 'public') : null;
}

export async function getCompanyContact(companyId) {
  await requireUser();
  await wait();
  const it = load().items.contacts.find((x) => x.CompanyId === Number(companyId) && isPublic(x));
  return it ? shape('contacts', it, 'public') : null;
}

// ---------- پنل شرکت ----------
export async function getMyItems(type) {
  const u = await requireUser(['company']);
  await wait();
  const list = load().items[type];
  const mine = type === 'companies' ? list.filter((x) => x.Id === u.companyId) : list.filter((x) => x.CompanyId === u.companyId);
  return mine.map((it) => shape(type, it, 'latest')).sort((a, b) => new Date(b.Modified) - new Date(a.Modified));
}

export async function getItem(type, id) {
  const u = await requireUser();
  await wait();
  const it = load().items[type].find((x) => x.Id === Number(id));
  if (!it) return null;
  const owner = type === 'companies' ? it.Id : it.CompanyId;
  if (u.role === 'company' && owner !== u.companyId) return null; // مثل Draft Item Security
  return shape(type, it, 'latest');
}

export async function getPublishedVersion(type, id) {
  await requireUser(['holding', 'company']);
  const it = load().items[type].find((x) => x.Id === Number(id));
  return it?.published ? shape(type, it, 'public') : null;
}

function addAudit(type, it, action, actor, comment = '') {
  const title = (it.data && it.data.Title) || '';
  db.audit.unshift({ Id: ++db.seq, Date: now(), Type: type, ItemId: it.Id, ItemTitle: title, CompanyId: type === 'companies' ? it.Id : it.CompanyId, Action: action, Actor: actor, Comment: comment });
  (it.comments ||= []).push({ Date: now(), Actor: actor, Action: action, Comment: comment });
}

/**
 * ذخیره‌ی قلم توسط شرکت (یا هلدینگ برای انواع مالکیت هلدینگ).
 * values: فقط فیلدهای schema؛ opts.submit = ارسال برای بررسی
 */
export async function saveItem(type, id, values, { submit = false, files = [] } = {}) {
  const u = await requireUser(['company', 'holding']);
  await wait(250);
  load();
  const def = TYPES[type];
  const list = db.items[type];
  const cleaned = { ...values };
  if (u.role === 'company') def.fields.filter((f) => f.holdingOnly).forEach((f) => delete cleaned[f.name]);
  if (files.length) cleaned.Attachments = files.map((f) => ({ name: f.name, size: f.size }));

  let it;
  if (id) {
    it = list.find((x) => x.Id === Number(id));
    if (!it) throw new Error('قلم یافت نشد');
    const owner = type === 'companies' ? it.Id : it.CompanyId;
    if (u.role === 'company' && owner !== u.companyId) { const e = new Error('دسترسی غیرمجاز'); e.status = 403; throw e; }
    if (!files.length && it.data.Attachments) cleaned.Attachments = it.data.Attachments;
    it.data = { ...it.data, ...cleaned };
    it.Modified = now();
    addAudit(type, it, submit ? 'Submit' : 'Update', u.Title);
  } else {
    if (def.singleton && u.role === 'company' && type === 'companies') throw new Error('پروفایل شرکت قابل ایجاد مجدد نیست');
    it = { Id: ++db.seq, CompanyId: def.noCompany ? null : u.companyId ?? null, data: cleaned, published: null, comments: [], Created: now(), Modified: now(), AuthorTitle: u.Title };
    if (type === 'challenges' && !it.data.CallStatus) it.data.CallStatus = 'Open';
    it.Code = makeCode(type, it);
    list.push(it);
    addAudit(type, it, submit ? 'Submit' : 'Create', u.Title);
  }

  // هر ویرایش توسط کاربر بدون حق تأیید، قلم را به Pending می‌برد (مثل Content Approval)
  if (u.role === 'holding') {
    it.WorkflowStatus = 'Published'; it.Moderation = 0; it.published = { ...it.data, WorkflowStatus: 'Published' };
    it.PublishedOn ||= now(); it.ReviewedOn = now(); it.ReviewerTitle = u.Title;
  } else {
    it.WorkflowStatus = submit ? 'Submitted' : 'Draft';
    it.Moderation = 2;
    if (submit) it.SubmittedOn = now();
  }
  persist();
  return shape(type, it, 'latest');
}

// ---------- کارتابل هلدینگ ----------
export async function getReviewQueue() {
  await requireUser(['holding']);
  await wait();
  load();
  return REVIEW_TYPES.flatMap((type) => db.items[type].filter((x) => x.WorkflowStatus === 'Submitted').map((it) => shape(type, it, 'latest')))
    .sort((a, b) => new Date(a.SubmittedOn) - new Date(b.SubmittedOn));
}

export async function getAllItems(type) {
  await requireUser(['holding']);
  await wait();
  return load().items[type].map((it) => shape(type, it, 'latest')).sort((a, b) => new Date(b.Modified) - new Date(a.Modified));
}

async function review(type, id, action, comment) {
  const u = await requireUser(['holding']);
  await wait(250);
  load();
  const it = db.items[type].find((x) => x.Id === Number(id));
  if (!it) throw new Error('قلم یافت نشد');
  it.ReviewedOn = now();
  it.ReviewerTitle = u.Title;
  it.Modified = now();
  if (action === 'Approve') {
    it.WorkflowStatus = 'Published'; it.Moderation = 0;
    it.published = { ...it.data, WorkflowStatus: 'Published' };
    it.PublishedOn ||= now();
  } else if (action === 'Return') {
    it.WorkflowStatus = 'Returned'; it.Moderation = 1;
  } else if (action === 'Reject') {
    it.WorkflowStatus = 'Rejected'; it.Moderation = 1;
  } else if (action === 'Archive') {
    it.WorkflowStatus = 'Archived'; it.Moderation = 0;
    if (it.published) it.published.WorkflowStatus = 'Archived';
  } else if (action === 'Restore') {
    it.WorkflowStatus = 'Published'; it.Moderation = 0;
    if (it.published) it.published.WorkflowStatus = 'Published';
  }
  addAudit(type, it, action, u.Title, comment);
  persist();
  return shape(type, it, 'latest');
}

export const approve = (type, id, comment = '') => review(type, id, 'Approve', comment);
export const returnItem = (type, id, reason) => review(type, id, 'Return', reason);
export const reject = (type, id, reason) => review(type, id, 'Reject', reason);
export const archive = (type, id, reason = '') => review(type, id, 'Archive', reason);
export const restore = (type, id) => review(type, id, 'Restore', '');

export async function setCallStatus(id, status) {
  const u = await requireUser(['holding']);
  await wait();
  const it = load().items.challenges.find((x) => x.Id === Number(id));
  it.data.CallStatus = status;
  if (it.published) it.published.CallStatus = status;
  addAudit('challenges', it, 'CallStatus', u.Title, status);
  persist();
}

export async function getHistory(type, id) {
  await requireUser();
  const it = load().items[type].find((x) => x.Id === Number(id));
  return clone(it?.comments || []);
}

export async function getAudit(limit = 50) {
  await requireUser(['holding']);
  await wait();
  return clone(load().audit.slice(0, limit));
}

export async function getMessages() {
  await requireUser(['holding']);
  await wait();
  return clone(load().messages).sort((a, b) => new Date(b.Created) - new Date(a.Created));
}

export async function setMessageStatus(id, status) {
  await requireUser(['holding']);
  const m = load().messages.find((x) => x.Id === Number(id));
  if (m) { m.Status = status; persist(); }
}

export async function getProposals(challengeId) {
  const u = await requireUser(['holding', 'company']);
  await wait();
  load();
  let list = db.proposals;
  if (challengeId) list = list.filter((p) => p.ChallengeId === Number(challengeId));
  if (u.role === 'company') {
    const mine = new Set(db.items.challenges.filter((c) => c.CompanyId === u.companyId).map((c) => c.Id));
    list = list.filter((p) => mine.has(p.ChallengeId));
  }
  return clone(list).map((p) => ({ ...p, ChallengeTitle: db.items.challenges.find((c) => c.Id === p.ChallengeId)?.data.Title || '' }))
    .sort((a, b) => new Date(b.Created) - new Date(a.Created));
}

export async function setProposalStatus(id, status, comment = '') {
  await requireUser(['holding']);
  const p = load().proposals.find((x) => x.Id === Number(id));
  if (p) { p.Status = status; p.EvaluatorComment = comment; persist(); }
}

// ---------- فرم‌های عمومی (در شیرپوینت: هندلر سمت سرور) ----------
let captcha = null;
export async function getCaptcha() {
  const code = String(Math.floor(10000 + Math.random() * 90000));
  captcha = { token: String(Math.random()).slice(2), code };
  return { token: captcha.token, image: drawCaptcha(code) };
}

function drawCaptcha(code) {
  const c = document.createElement('canvas');
  c.width = 140; c.height = 44;
  const g = c.getContext('2d');
  g.fillStyle = '#f1f5f9'; g.fillRect(0, 0, 140, 44);
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = `hsl(${Math.random() * 360},40%,70%)`;
    g.beginPath(); g.moveTo(Math.random() * 140, Math.random() * 44); g.lineTo(Math.random() * 140, Math.random() * 44); g.stroke();
  }
  g.font = 'bold 24px Tahoma, sans-serif';
  g.textBaseline = 'middle';
  [...code].forEach((ch, i) => {
    g.save();
    g.translate(18 + i * 24, 22);
    g.rotate((Math.random() - 0.5) * 0.5);
    g.fillStyle = '#1f2933';
    g.fillText(ch, -7, 0);
    g.restore();
  });
  return c.toDataURL('image/png');
}

function checkCaptcha(token, answer) {
  const ok = captcha && captcha.token === token && captcha.code === String(answer).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
  captcha = null;
  if (!ok) { const e = new Error('کد امنیتی نادرست است.'); e.field = 'CaptchaAnswer'; throw e; }
}

export async function submitProposal(data, files = []) {
  await wait(400);
  checkCaptcha(data.CaptchaToken, data.CaptchaAnswer);
  load();
  const ch = db.items.challenges.find((c) => c.Id === Number(data.ChallengeId));
  if (!ch || !isPublic(ch) || ch.published.CallStatus !== 'Open') throw new Error('این فراخوان در حال حاضر پیشنهاد نمی‌پذیرد.');
  const id = ++db.seq;
  const tracking = `P-${jalaliYear()}-${String(id).slice(-4)}`;
  db.proposals.push({
    Id: id, ChallengeId: ch.Id, ApplicantCompany: data.ApplicantCompany, ContactName: data.ContactName, Phone: data.Phone, Email: data.Email,
    CertNo: data.CertNo, ProposalSummary: data.ProposalSummary, Files: files.map((f) => ({ name: f.name, size: f.size })), Created: now(), Status: 'New', TrackingCode: tracking
  });
  persist();
  return { ok: true, trackingCode: tracking };
}

export async function submitContact(data) {
  await wait(400);
  checkCaptcha(data.CaptchaToken, data.CaptchaAnswer);
  load();
  const id = ++db.seq;
  db.messages.push({ Id: id, Title: data.Title, Organization: data.Organization, Phone: data.Phone, Email: data.Email, Subject: data.Subject, Message: data.Message, Created: now(), Status: 'New' });
  persist();
  return { ok: true, trackingCode: `M-${jalaliYear()}-${String(id).slice(-4)}` };
}

export function fileUrl() { return null; }
