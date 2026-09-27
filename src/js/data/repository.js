// نقطه‌ی ورود واحد به داده‌ها. صفحات فقط با این ماژول کار می‌کنند و از منبع داده (mock یا شیرپوینت) بی‌خبرند.
import { IS_MOCK } from '../config.js';
import * as mock from './mock-provider.js';
import * as sp from './sp-provider.js';
import { normalizeFa } from '../core/util.js';
import { daysLeft } from '../core/format.js';
import { TYPES } from '../schema.js';

const P = IS_MOCK ? mock : sp;

export const {
  getCurrentUser, getDomains, getCategories, getPublicItems, getPublicItem, getCompanyContact,
  getMyItems, getItem, getPublishedVersion, saveItem, getReviewQueue, getAllItems,
  approve, returnItem, reject, archive, restore, setCallStatus, getHistory, getAudit,
  getMessages, setMessageStatus, getProposals, setProposalStatus,
  getCaptcha, submitProposal, submitContact, resetDemo, getDemoRole, setDemoRole
} = P;

/** آیا فراخوان هنوز پیشنهاد می‌پذیرد؟ */
export const isOpenCall = (c) => c.CallStatus === 'Open' && (daysLeft(c.Deadline) ?? 1) >= 0;

function textOf(item) {
  const def = TYPES[item.type];
  const parts = [item.Title, item.Code, item.CompanyTitle, item.DomainTitle, item.Summary, item.Keywords, item.ShortDesc];
  def?.fields.filter((f) => f.type === 'text').forEach((f) => parts.push(item[f.name]));
  return normalizeFa(parts.filter(Boolean).join(' '));
}

/**
 * جستجو، فیلتر و صفحه‌بندی سمت کلاینت روی اقلام منتشرشده.
 * (برای چند هزار قلم کافی است؛ برای حجم بیشتر به Search API منتقل شود.)
 */
export async function queryPublic(type, { search = '', domainId, companyId, priority, callStatus, categoryId, sort = 'newest', page = 1, pageSize = 9 } = {}) {
  let items = await getPublicItems(type);
  const q = normalizeFa(search);
  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    items = items.filter((it) => { const t = textOf(it); return words.every((w) => t.includes(w)); });
  }
  if (domainId) items = items.filter((it) => it.DomainId === Number(domainId));
  if (companyId) items = items.filter((it) => it.CompanyId === Number(companyId));
  if (categoryId) items = items.filter((it) => it.CategoryId === Number(categoryId));
  if (priority) items = items.filter((it) => it.Priority === priority);
  if (callStatus === 'open') items = items.filter(isOpenCall);
  else if (callStatus) items = items.filter((it) => it.CallStatus === callStatus);

  const dateField = TYPES[type]?.card?.date;
  const sorters = {
    newest: (a, b) => new Date(b.PublishedOn || b.Created) - new Date(a.PublishedOn || a.Created),
    deadline: (a, b) => (isOpenCall(b) - isOpenCall(a)) || new Date(a.Deadline) - new Date(b.Deadline),
    date: (a, b) => new Date(b[dateField] || 0) - new Date(a[dateField] || 0),
    upcoming: (a, b) => new Date(a.StartDate) - new Date(b.StartDate),
    title: (a, b) => String(a.Title).localeCompare(String(b.Title), 'fa')
  };
  items = [...items].sort(sorters[sort] || sorters.newest);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, Number(page) || 1), pages);
  return { items: items.slice((p - 1) * pageSize, p * pageSize), total, page: p, pages };
}

/** آمار صفحه‌ی اول (فقط محتوای منتشرشده) */
export async function getStats() {
  const keys = ['companies', 'challenges', 'products', 'rd', 'contracts', 'plans'];
  const lists = await Promise.all(keys.map((k) => getPublicItems(k)));
  const out = {};
  keys.forEach((k, i) => { out[k] = lists[i].length; });
  out.openChallenges = lists[1].filter(isOpenCall).length;
  return out;
}

/** شمارش مسائل فعال هر حوزه */
export async function getDomainCounts() {
  const items = await getPublicItems('challenges');
  const counts = {};
  items.filter(isOpenCall).forEach((c) => { counts[c.DomainId] = (counts[c.DomainId] || 0) + 1; });
  return counts;
}

/** شمارش اقلام منتشرشده به ازای هر شرکت برای کارت‌های دایرکتوری */
export async function getCompanyCounts() {
  const [ch, rd, pr] = await Promise.all(['challenges', 'rd', 'products'].map((k) => getPublicItems(k)));
  const counts = {};
  const add = (list, key) => list.forEach((x) => { (counts[x.CompanyId] ||= { challenges: 0, rd: 0, products: 0 })[key] += 1; });
  add(ch, 'challenges'); add(rd, 'rd'); add(pr, 'products');
  return counts;
}
