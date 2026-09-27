// پیاده‌سازی مخزن داده روی SharePoint Server 2019.
//  - خواندن: REST (/_api) با odata=nometadata
//  - نوشتن: JSOM (sp.js) — چون ایجاد آیتم داخل پوشه‌ی شرکت و تغییر _ModerationStatus در JSOM
//    روی همه‌ی نسخه‌های 2016/2019/SE پایدار است.
//  - امنیت واقعی با مجوزهای شیرپوینت اعمال می‌شود؛ این لایه فقط از آن پیروی می‌کند.
//
// ⚠ این فایل روی فارم واقعی باید تست شود (در محیط توسعه فقط حالت mock قابل اجراست).

import { CONFIG } from '../config.js';
import { TYPES, REVIEW_TYPES } from '../schema.js';
import { storage } from '../core/util.js';
import { jalaliYear } from '../core/format.js';

const session = storage('session');
const web = () => CONFIG.dataSiteUrl.replace(/\/$/, '');
const listUrl = (title) => `${web()}/_api/web/lists/getbytitle('${encodeURIComponent(title.replace(/'/g, "''"))}')`;
const typeList = (type) => CONFIG.lists[type] || TYPES[type].list;

// ---------- HTTP ----------
async function request(url, { method = 'GET', body, headers = {}, digest = false, raw = false } = {}) {
  const h = { Accept: 'application/json;odata=nometadata', ...headers };
  if (digest) h['X-RequestDigest'] = await getDigest();
  const res = await fetch(url, { method, body, headers: h, credentials: 'same-origin' });
  if (!res.ok) {
    let msg = `خطای ارتباط با سرور (${res.status})`;
    try { const j = await res.json(); msg = j?.error?.message?.value || j?.['odata.error']?.message?.value || msg; } catch { /* ignore */ }
    const e = new Error(msg); e.status = res.status; throw e;
  }
  if (raw) return res;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

let digestCache = null;
async function getDigest() {
  if (digestCache && digestCache.expires > Date.now()) return digestCache.value;
  const res = await fetch(`${web()}/_api/contextinfo`, { method: 'POST', headers: { Accept: 'application/json;odata=nometadata' }, credentials: 'same-origin' });
  const j = await res.json();
  digestCache = { value: j.FormDigestValue, expires: Date.now() + (j.FormDigestTimeoutSeconds - 60) * 1000 };
  return digestCache.value;
}

async function getAll(url) {
  // دنبال کردن صفحه‌بندی ($skiptoken) تا سقف ۵۰۰۰ آیتم
  let next = url;
  const out = [];
  while (next && out.length < 5000) {
    const j = await request(next);
    out.push(...(j.value || []));
    next = j['odata.nextLink'] || null;
  }
  return out;
}

// ---------- ساخت Query ----------
const COMMON = ['Id', 'Created', 'Modified', 'ItemCode', 'WorkflowStatus', 'OData__ModerationStatus', 'SubmittedOn', 'PublishedOn', 'ReviewedOn', 'ReviewComments', 'Author/Title', 'Reviewer/Title'];

function selectFor(type) {
  const def = TYPES[type];
  const select = [...COMMON];
  const expand = new Set(['Author', 'Reviewer']);
  if (!def.noCompany) { select.push('Company/Id', 'Company/Title'); expand.add('Company'); }
  if (type === 'companies') select.push('CompanyCode', 'Icon');
  for (const f of def.fields) {
    if (f.type === 'domain') { select.push('Domain/Id', 'Domain/Title'); expand.add('Domain'); } else if (f.type === 'category') { select.push('Category/Id', 'Category/Title'); expand.add('Category'); } else if (f.type === 'files') { select.push('Attachments', 'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl'); expand.add('AttachmentFiles'); } else select.push(f.name);
  }
  return `$select=${[...new Set(select)].join(',')}&$expand=${[...expand].join(',')}`;
}

function shape(type, r) {
  const def = TYPES[type];
  const o = { type, Id: r.Id, Code: type === 'companies' ? r.CompanyCode : r.ItemCode, Created: r.Created, Modified: r.Modified, SubmittedOn: r.SubmittedOn, PublishedOn: r.PublishedOn, ReviewedOn: r.ReviewedOn, AuthorTitle: r.Author?.Title, ReviewerTitle: r.Reviewer?.Title, WorkflowStatus: r.WorkflowStatus, Moderation: r.OData__ModerationStatus };
  for (const f of def.fields) {
    if (f.type === 'domain') { o.DomainId = r.Domain?.Id ?? null; o.DomainTitle = r.Domain?.Title ?? ''; } else if (f.type === 'category') { o.CategoryId = r.Category?.Id ?? null; o.CategoryTitle = r.Category?.Title ?? ''; } else if (f.type === 'files') o.Attachments = (r.AttachmentFiles || []).map((a) => ({ name: a.FileName, url: a.ServerRelativeUrl })); else o[f.name] = r[f.name];
  }
  if (type === 'companies') { o.CompanyId = r.Id; o.CompanyTitle = r.Title; o.Icon = r.Icon || 'fa-building'; } else if (!def.noCompany) { o.CompanyId = r.Company?.Id ?? null; o.CompanyTitle = r.Company?.Title ?? ''; }
  o.LastComment = r.ReviewComments ? { Comment: r.ReviewComments, Actor: r.Reviewer?.Title, Date: r.ReviewedOn } : null;
  o.HasPublishedVersion = !!r.PublishedOn;
  return o;
}

// ---------- کاربر جاری و نقش ----------
// نقش بر اساس «مجوز مؤثر» تعیین می‌شود نه عضویت مستقیم گروه؛ چون کاربران FBA/LDAP از طریق گروه‌های AD
// (Role Claim) عضو گروه‌های شیرپوینت می‌شوند و /currentuser/groups آن‌ها را برنمی‌گرداند.
const PERM = { ViewListItems: 0x1, AddListItems: 0x2, EditListItems: 0x4, ApproveItems: 0x10, ManageLists: 0x800 };
const has = (perm, bit) => perm && (Number(perm.Low) & bit) === bit;

export async function getCurrentUser() {
  const ctx = window._spPageContextInfo || {};
  if (!ctx.userId) return { isAnonymous: true, role: 'public' };
  const cached = session.get('shn.user');
  if (cached && cached.userId === ctx.userId && cached.expires > Date.now()) return cached.user;

  const me = await request(`${web()}/_api/web/currentuser?$select=Id,Title,Email,LoginName`);
  const perms = await request(`${listUrl(typeList('challenges'))}/EffectiveBasePermissions`);
  const user = { isAnonymous: false, Id: me.Id, Title: me.Title, Email: me.Email, role: 'public' };
  if (has(perms, PERM.ApproveItems)) {
    user.role = 'holding';
    user.isAdmin = has(perms, PERM.ManageLists);
  } else {
    // شرکتی که کاربر روی آیتم پروفایلش حق ویرایش دارد
    const rows = await request(`${listUrl(typeList('companies'))}/items?$select=Id,Title,EffectiveBasePermissions&$top=500`);
    const mine = (rows.value || []).find((r) => has(r.EffectiveBasePermissions, PERM.EditListItems));
    if (mine) { user.role = 'company'; user.companyId = mine.Id; user.companyTitle = mine.Title; }
  }
  session.set('shn.user', { userId: ctx.userId, expires: Date.now() + CONFIG.roleCacheMinutes * 60000, user });
  return user;
}

// ---------- خواندن عمومی ----------
// فقط نسخه‌های تأییدشده (OData__ModerationStatus eq 0). کاربر ناشناس در هر صورت فقط همین را می‌بیند؛
// فیلتر برای کاربران واردشده هم لازم است تا در صفحات عمومی پیش‌نویس‌ها نمایش داده نشوند.
const PUBLIC_FILTER = "OData__ModerationStatus eq 0 and WorkflowStatus ne 'Archived'";

async function cached(key, loader, minutes = 5) {
  const hit = session.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const data = await loader();
  session.set(key, { expires: Date.now() + minutes * 60000, data });
  return data;
}

export const getDomains = () => cached('shn.domains', async () => (await getAll(`${listUrl(CONFIG.lists.domains)}/items?$select=Id,Title,DomainKey,Icon,Tone,Description,SortOrder&$filter=IsActive eq 1&$orderby=SortOrder`))
  .map((d) => ({ Id: d.Id, Title: d.Title, Key: d.DomainKey, Icon: d.Icon || 'fa-circle', Tone: d.Tone || 'sky', Description: d.Description, SortOrder: d.SortOrder })), 30);

export const getCategories = () => cached('shn.categories', async () => (await getAll(`${listUrl(CONFIG.lists.categories)}/items?$select=Id,Title&$orderby=SortOrder`)), 30);

export async function getPublicItems(type) {
  return cached(`shn.pub.${type}`, async () => {
    const rows = await getAll(`${listUrl(typeList(type))}/items?${selectFor(type)}&$filter=${encodeURIComponent(PUBLIC_FILTER)}&$orderby=Id desc&$top=500`);
    return rows.map((r) => shape(type, r));
  });
}

export async function getPublicItem(type, id) {
  const all = await getPublicItems(type);
  return all.find((x) => x.Id === Number(id)) || null;
}

export async function getCompanyContact(companyId) {
  const rows = await request(`${listUrl(typeList('contacts'))}/items?${selectFor('contacts')}&$filter=${encodeURIComponent(`CompanyId eq ${Number(companyId)} and OData__ModerationStatus eq 0`)}&$top=1`);
  return rows.value?.[0] ? shape('contacts', rows.value[0]) : null;
}

// ---------- پنل شرکت ----------
export async function getMyItems(type) {
  const u = await getCurrentUser();
  const filter = type === 'companies' ? `Id eq ${u.companyId}` : `CompanyId eq ${u.companyId}`;
  const rows = await getAll(`${listUrl(typeList(type))}/items?${selectFor(type)}&$filter=${encodeURIComponent(filter)}&$orderby=Modified desc&$top=500`);
  return rows.map((r) => shape(type, r));
}

export async function getItem(type, id) {
  try {
    const r = await request(`${listUrl(typeList(type))}/items(${Number(id)})?${selectFor(type)}`);
    return shape(type, r);
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

/** آخرین نسخه‌ی تأییدشده از تاریخچه‌ی نسخه‌ها (برای مقایسه در کارتابل) */
export async function getPublishedVersion(type, id) {
  try {
    const j = await request(`${listUrl(typeList(type))}/items(${Number(id)})/versions`);
    const v = (j.value || []).find((x) => Number(x.OData__ModerationStatus ?? x._ModerationStatus) === 0);
    if (!v) return null;
    const o = { type, Id: Number(id) };
    for (const f of TYPES[type].fields) {
      if (f.type === 'domain') { o.DomainTitle = v.Domain?.LookupValue ?? v.Domain ?? ''; } else if (f.type !== 'files' && f.type !== 'category') o[f.name] = v[f.name];
    }
    return o;
  } catch {
    return null; // در صورت عدم پشتیبانی endpoint، مقایسه نمایش داده نمی‌شود
  }
}

// ---------- JSOM ----------
function jsomReady() {
  return new Promise((resolve, reject) => {
    if (window.SP?.ClientContext) { resolve(); return; }
    if (!window.SP?.SOD) { reject(new Error('sp.js در صفحه بارگذاری نشده است')); return; }
    window.SP.SOD.executeFunc('sp.js', 'SP.ClientContext', resolve);
  });
}

function exec(ctx) {
  return new Promise((resolve, reject) => ctx.executeQueryAsync(resolve, (_, args) => reject(new Error(args.get_message()))));
}

function toSpValue(field, value) {
  const SP = window.SP;
  if (value === '' || value == null) return null;
  if (field.type === 'domain' || field.type === 'category' || field.type === 'company') {
    const lv = new SP.FieldLookupValue(); lv.set_lookupId(Number(value)); return lv;
  }
  if (field.type === 'number' || field.type === 'percent') return Number(value);
  return value;
}

async function companyFolderUrl(listTitle, companyId) {
  const [root, company] = await Promise.all([
    request(`${listUrl(listTitle)}/RootFolder?$select=ServerRelativeUrl`),
    request(`${listUrl(typeList('companies'))}/items(${Number(companyId)})?$select=CompanyCode`)
  ]);
  return `${root.ServerRelativeUrl}/${company.CompanyCode}`;
}

async function jsomSave(type, id, set, { folderUrl, moderation, moderationComment } = {}) {
  await jsomReady();
  const SP = window.SP;
  const ctx = new SP.ClientContext(web());
  const list = ctx.get_web().get_lists().getByTitle(typeList(type));
  let item;
  if (id) item = list.getItemById(Number(id));
  else {
    const info = new SP.ListItemCreationInformation();
    if (folderUrl) info.set_folderUrl(folderUrl);
    item = list.addItem(info);
  }
  Object.entries(set).forEach(([k, v]) => item.set_item(k, v));
  if (moderation != null) {
    item.set_item('_ModerationStatus', moderation);
    if (moderationComment != null) item.set_item('_ModerationComments', moderationComment);
  }
  item.update();
  ctx.load(item, 'Id');
  await exec(ctx);
  return item.get_id();
}

async function addAttachments(type, id, files) {
  for (const file of files) {
    const buf = await file.arrayBuffer();
    await request(`${listUrl(typeList(type))}/items(${id})/AttachmentFiles/add(FileName='${encodeURIComponent(file.name.replace(/'/g, "''"))}')`, { method: 'POST', body: buf, digest: true });
  }
}

async function writeAudit(type, item, action, comment = '') {
  try {
    const u = await getCurrentUser();
    await jsomSaveRaw(CONFIG.lists.audit, {
      Title: (item?.Title || '').slice(0, 255), ListName: type, ItemId: item.Id, Action: action, ActionComment: comment || '',
      CompanyRef: item.CompanyId || null, ActorName: u.Title
    });
  } catch (e) {
    console.warn('audit log failed', e); // ثبت لاگ نباید عملیات اصلی را متوقف کند
  }
}

async function jsomSaveRaw(listTitle, set) {
  await jsomReady();
  const SP = window.SP;
  const ctx = new SP.ClientContext(web());
  const item = ctx.get_web().get_lists().getByTitle(listTitle).addItem(new SP.ListItemCreationInformation());
  Object.entries(set).forEach(([k, v]) => item.set_item(k, v));
  item.update();
  await exec(ctx);
}

async function notify(to, subject, body) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return;
  try {
    await request(`${web()}/_api/SP.Utilities.Utility.SendEmail`, {
      method: 'POST', digest: true,
      headers: { 'Content-Type': 'application/json;odata=verbose', Accept: 'application/json;odata=verbose' },
      body: JSON.stringify({ properties: { __metadata: { type: 'SP.Utilities.EmailProperties' }, To: { results: recipients }, Subject: subject, Body: body } })
    });
  } catch (e) {
    console.warn('email failed', e);
  }
}

async function holdingEmails() {
  try {
    const j = await request(`${listUrl(CONFIG.lists.settings)}/items?$select=Value&$filter=Title eq 'HoldingNotifyEmails'&$top=1`);
    return String(j.value?.[0]?.Value || '').split(/[,;\s]+/).filter(Boolean);
  } catch { return []; }
}

// ---------- ذخیره ----------
export async function saveItem(type, id, values, { submit = false, files = [] } = {}) {
  await jsomReady();
  const u = await getCurrentUser();
  const def = TYPES[type];
  const set = {};
  for (const f of def.fields) {
    if (f.type === 'files' || !(f.name in values)) continue;
    if (u.role === 'company' && f.holdingOnly) continue;
    set[f.name] = toSpValue(f, values[f.name]);
  }
  const stamp = new Date().toISOString();
  let folderUrl;
  if (!id && !def.noCompany && u.role === 'company') {
    folderUrl = await companyFolderUrl(typeList(type), u.companyId);
    const cl = new window.SP.FieldLookupValue();
    cl.set_lookupId(u.companyId);
    set.Company = cl;
  }

  if (u.role === 'holding') {
    set.WorkflowStatus = 'Published';
    set.ReviewedOn = stamp;
    if (!id) set.PublishedOn = stamp;
  } else {
    set.WorkflowStatus = submit ? 'Submitted' : 'Draft';
    if (submit) set.SubmittedOn = stamp;
  }
  if (!id && type === 'challenges' && !set.CallStatus) set.CallStatus = 'Open';

  const newId = await jsomSave(type, id, set, { folderUrl, moderation: u.role === 'holding' ? 0 : null });
  if (!id) {
    // کد رهگیری بعد از دریافت شناسه ساخته می‌شود
    await jsomSave(type, newId, { ItemCode: `${def.codePrefix}-${jalaliYear()}-${String(newId).padStart(4, '0')}` }, { moderation: u.role === 'holding' ? 0 : null });
  }
  if (files.length) await addAttachments(type, newId, files);
  session.remove(`shn.pub.${type}`);

  const saved = await getItem(type, newId);
  await writeAudit(type, saved, submit ? 'Submit' : id ? 'Update' : 'Create');
  if (submit && u.role === 'company') {
    await notify(await holdingEmails(), `درخواست جدید برای بررسی: ${saved.Title}`, `<div dir="rtl">شرکت «${u.companyTitle}» یک ${def.label} با عنوان «${saved.Title}» برای بررسی ارسال کرده است.</div>`);
  }
  return saved;
}

// ---------- کارتابل هلدینگ ----------
export async function getReviewQueue() {
  const lists = await Promise.all(REVIEW_TYPES.map(async (type) => {
    const rows = await getAll(`${listUrl(typeList(type))}/items?${selectFor(type)}&$filter=${encodeURIComponent("WorkflowStatus eq 'Submitted'")}&$top=500`);
    return rows.map((r) => shape(type, r));
  }));
  return lists.flat().sort((a, b) => new Date(a.SubmittedOn) - new Date(b.SubmittedOn));
}

export async function getAllItems(type) {
  const rows = await getAll(`${listUrl(typeList(type))}/items?${selectFor(type)}&$orderby=Modified desc&$top=500`);
  return rows.map((r) => shape(type, r));
}

const REVIEW_MAP = {
  Approve: { status: 'Published', moderation: 0 },
  Return: { status: 'Returned', moderation: 1 },
  Reject: { status: 'Rejected', moderation: 1 },
  Archive: { status: 'Archived', moderation: 0 },
  Restore: { status: 'Published', moderation: 0 }
};

async function review(type, id, action, comment = '') {
  await jsomReady();
  const u = await getCurrentUser();
  const before = await getItem(type, id);
  const m = REVIEW_MAP[action];
  const stamp = new Date().toISOString();
  const reviewer = new window.SP.FieldUserValue();
  reviewer.set_lookupId(u.Id);
  const set = { WorkflowStatus: m.status, ReviewedOn: stamp, Reviewer: reviewer };
  if (comment) set.ReviewComments = comment; // ستون Append-only: تاریخچه در Version History حفظ می‌شود
  if (action === 'Approve' && !before.PublishedOn) set.PublishedOn = stamp;
  await jsomSave(type, id, set, { moderation: m.moderation, moderationComment: comment });
  session.remove(`shn.pub.${type}`);
  const after = await getItem(type, id);
  await writeAudit(type, after, action, comment);

  if (['Approve', 'Return', 'Reject'].includes(action)) {
    const author = await request(`${listUrl(typeList(type))}/items(${Number(id)})?$select=Author/EMail&$expand=Author`);
    const labels = { Approve: 'تأیید و منتشر شد', Return: 'جهت اصلاح برگشت داده شد', Reject: 'رد شد' };
    await notify(author?.Author?.EMail, `${TYPES[type].label} «${after.Title}» ${labels[action]}`,
      `<div dir="rtl">${TYPES[type].label} «${after.Title}» توسط هلدینگ ${labels[action]}.${comment ? `<br><b>توضیحات:</b> ${comment.replace(/</g, '&lt;')}` : ''}</div>`);
  }
  return after;
}

export const approve = (type, id, comment = '') => review(type, id, 'Approve', comment);
export const returnItem = (type, id, reason) => review(type, id, 'Return', reason);
export const reject = (type, id, reason) => review(type, id, 'Reject', reason);
export const archive = (type, id, reason = '') => review(type, id, 'Archive', reason);
export const restore = (type, id) => review(type, id, 'Restore', '');

export async function setCallStatus(id, status) {
  await jsomSave('challenges', id, { CallStatus: status }, { moderation: 0 });
  session.remove('shn.pub.challenges');
  const it = await getItem('challenges', id);
  await writeAudit('challenges', it, 'CallStatus', status);
}

export async function getHistory(type, id) {
  const filter = `ListName eq '${type}' and ItemId eq ${Number(id)}`;
  const rows = await getAll(`${listUrl(CONFIG.lists.audit)}/items?$select=Created,ActorName,Action,ActionComment&$filter=${encodeURIComponent(filter)}&$orderby=Created asc&$top=200`);
  return rows.map((r) => ({ Date: r.Created, Actor: r.ActorName, Action: r.Action, Comment: r.ActionComment }));
}

export async function getAudit(limit = 50) {
  const j = await request(`${listUrl(CONFIG.lists.audit)}/items?$select=Id,Created,ListName,ItemId,Title,CompanyRefId,Action,ActorName,ActionComment&$orderby=Created desc&$top=${limit}`);
  return (j.value || []).map((r) => ({ Id: r.Id, Date: r.Created, Type: r.ListName, ItemId: r.ItemId, ItemTitle: r.Title, CompanyId: r.CompanyRefId, Action: r.Action, Actor: r.ActorName, Comment: r.ActionComment }));
}

export async function getMessages() {
  const rows = await getAll(`${listUrl(CONFIG.lists.messages)}/items?$select=Id,Title,Organization,Phone,Email,Subject,Message,Created,HandledStatus&$orderby=Created desc&$top=500`);
  return rows.map((r) => ({ ...r, Status: r.HandledStatus || 'New' }));
}

export async function setMessageStatus(id, status) {
  await jsomReady();
  const ctx = new window.SP.ClientContext(web());
  const item = ctx.get_web().get_lists().getByTitle(CONFIG.lists.messages).getItemById(Number(id));
  item.set_item('HandledStatus', status);
  item.update();
  await exec(ctx);
}

export async function getProposals(challengeId) {
  const filter = challengeId ? `&$filter=${encodeURIComponent(`ChallengeId eq ${Number(challengeId)}`)}` : '';
  const rows = await getAll(`${listUrl(CONFIG.lists.proposals)}/items?$select=Id,Title,Challenge/Id,Challenge/Title,ApplicantCompany,ContactName,Phone,Email,CertNo,ProposalSummary,EvaluationStatus,EvaluatorComment,TrackingCode,Created,AttachmentFiles/FileName,AttachmentFiles/ServerRelativeUrl&$expand=Challenge,AttachmentFiles${filter}&$orderby=Created desc&$top=500`);
  return rows.map((r) => ({ ...r, ChallengeId: r.Challenge?.Id, ChallengeTitle: r.Challenge?.Title, Status: r.EvaluationStatus || 'New', Files: (r.AttachmentFiles || []).map((a) => ({ name: a.FileName, url: a.ServerRelativeUrl })) }));
}

export async function setProposalStatus(id, status, comment = '') {
  await jsomReady();
  const ctx = new window.SP.ClientContext(web());
  const item = ctx.get_web().get_lists().getByTitle(CONFIG.lists.proposals).getItemById(Number(id));
  item.set_item('EvaluationStatus', status);
  item.set_item('EvaluatorComment', comment);
  item.update();
  await exec(ctx);
}

// ---------- فرم‌های عمومی: هندلر سمت سرور (Shastan.Portal.wsp) ----------
// لیست‌های Proposals و ContactMessages هیچ مجوزی برای کاربر ناشناس ندارند؛ هندلر پس از بررسی کپچا،
// اعتبارسنجی و محدودیت نرخ، با دسترسی سیستمی ذخیره می‌کند.
export async function getCaptcha() {
  const j = await request(`${CONFIG.captchaUrl}?t=${Date.now()}`, { headers: { Accept: 'application/json' } });
  return { token: j.token, image: j.image };
}

async function postPublic(kind, data, files = []) {
  const fd = new FormData();
  fd.append('kind', kind);
  Object.entries(data).forEach(([k, v]) => fd.append(k, v ?? ''));
  files.forEach((f) => fd.append('files', f, f.name));
  const res = await fetch(CONFIG.publicHandler, { method: 'POST', body: fd, credentials: 'same-origin' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.ok) {
    const e = new Error(j.message || 'ارسال ناموفق بود. لطفاً دوباره تلاش کنید.');
    e.field = j.field; throw e;
  }
  return j;
}

export const submitProposal = (data, files) => postPublic('proposal', data, files);
export const submitContact = (data) => postPublic('contact', data);

export function resetDemo() { /* فقط در حالت نمایشی */ }
export function getDemoRole() { return null; }
export function setDemoRole() { /* فقط در حالت نمایشی */ }
