<%@ WebHandler Language="C#" Class="Shastan.Portal.PublicSubmitHandler" %>
<%@ Assembly Name="Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Assembly Name="System.Web.Extensions, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
// ذخیره‌ی فرم‌های عمومی سکوی نوآوری شستان (کاربر ناشناس):
//   kind=proposal  پیشنهاد شرکت دانش‌بنیان برای یک مسئله → لیست Proposals (پوشه‌ی شرکت صاحب مسئله)
//   kind=contact   پیام تماس → لیست ContactMessages
// لیست‌ها هیچ مجوزی برای ناشناس ندارند؛ این هندلر پس از بررسی کپچا، فیلد تله، محدودیت نرخ، اعتبار فیلدها و
// نوع/حجم فایل، با دسترسی سیستمی ذخیره و به هلدینگ ایمیل می‌کند.
// پاسخ: {"ok":true,"trackingCode":"P-1405-0012"}  یا  {"ok":false,"message":"...","field":"..."}
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Script.Serialization;
using System.Web.Security;
using Microsoft.SharePoint;
using Microsoft.SharePoint.Administration;
using Microsoft.SharePoint.Utilities;

namespace Shastan.Portal
{
    public class PublicSubmitHandler : IHttpHandler
    {
        private const string CaptchaPurpose = "Shastan.Captcha.v1";   // باید با Captcha.ashx یکسان باشد
        private const int MaxFiles = 3;
        private const int MaxFileBytes = 10 * 1024 * 1024;
        private const int MaxRequestsPerWindow = 5;                     // برای هر IP
        private static readonly TimeSpan RateWindow = TimeSpan.FromMinutes(10);
        private static readonly string[] AllowedExtensions = { ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".rar" };

        public bool IsReusable { get { return true; } }

        private class ValidationException : Exception
        {
            public string Field { get; private set; }
            public ValidationException(string message, string field) : base(message) { Field = field; }
        }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            try
            {
                if (!string.Equals(context.Request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
                    throw new ValidationException("درخواست نامعتبر است.", null);

                HttpRequest req = context.Request;
                string kind = Field(req, "kind", 20);

                // فیلد تله: ربات‌ها آن را پر می‌کنند؛ پاسخ موفق ساختگی تا ربات متوجه نشود
                if (!string.IsNullOrEmpty(req.Form["Website_hp"])) { Write(context, new { ok = true, trackingCode = "-" }); return; }

                string ip = ClientIp(req);
                if (!RateAllowed(ip)) throw new ValidationException("تعداد درخواست‌ها بیش از حد مجاز است. چند دقیقه‌ی دیگر دوباره تلاش کنید.", null);

                if (!ValidateCaptcha(req.Form["CaptchaToken"], req.Form["CaptchaAnswer"]))
                    throw new ValidationException("کد امنیتی نادرست یا منقضی شده است.", "CaptchaAnswer");

                Guid siteId = SPContext.Current.Site.ID;
                Guid webId = SPContext.Current.Web.ID;
                string tracking = null;

                if (kind == "proposal") tracking = SaveProposal(req, siteId, webId, ip);
                else if (kind == "contact") tracking = SaveContact(req, siteId, webId, ip);
                else throw new ValidationException("نوع فرم نامعتبر است.", null);

                Write(context, new { ok = true, trackingCode = tracking });
            }
            catch (ValidationException ex)
            {
                context.Response.StatusCode = 400;
                Write(context, new { ok = false, message = ex.Message, field = ex.Field });
            }
            catch (Exception ex)
            {
                SPDiagnosticsService.Local.WriteTrace(0, new SPDiagnosticsCategory("Shastan", TraceSeverity.Unexpected, EventSeverity.Error),
                    TraceSeverity.Unexpected, "Shastan PublicSubmit error: {0}", new object[] { ex.ToString() });
                context.Response.StatusCode = 500;
                Write(context, new { ok = false, message = "خطای سرور؛ لطفاً بعداً دوباره تلاش کنید." });
            }
        }

        // ------------------------------------------------------------------ پیشنهاد
        private static string SaveProposal(HttpRequest req, Guid siteId, Guid webId, string ip)
        {
            int challengeId;
            if (!int.TryParse(req.Form["ChallengeId"], out challengeId)) throw new ValidationException("مسئله نامعتبر است.", null);
            string applicant = Required(req, "ApplicantCompany", 160);
            string contactName = Required(req, "ContactName", 120);
            string phone = Required(req, "Phone", 20);
            string email = Required(req, "Email", 120);
            string certNo = Field(req, "CertNo", 60);
            string summary = Required(req, "ProposalSummary", 2000);
            if (!Regex.IsMatch(NormalizeDigits(phone).Replace(" ", "").Replace("-", ""), @"^(\+98|0)?9\d{9}$")) throw new ValidationException("شماره‌ی همراه معتبر نیست.", "Phone");
            if (!IsEmail(email)) throw new ValidationException("نشانی ایمیل معتبر نیست.", "Email");
            var files = ReadFiles(req);

            string tracking = null;
            SPSecurity.RunWithElevatedPrivileges(delegate
            {
                using (var site = new SPSite(siteId))
                using (var web = site.OpenWeb(webId))
                {
                    web.AllowUnsafeUpdates = true;
                    SPList challenges = web.Lists["TechChallenges"];
                    SPListItem ch;
                    try { ch = challenges.GetItemById(challengeId); } catch { throw new ValidationException("مسئله یافت نشد.", null); }

                    // فقط مسئله‌ی منتشرشده، با فراخوان باز و مهلت معتبر
                    if (ch.ModerationInformation == null || ch.ModerationInformation.Status != SPModerationStatusType.Approved ||
                        Convert.ToString(ch["WorkflowStatus"]) != "Published" || Convert.ToString(ch["CallStatus"]) != "Open")
                        throw new ValidationException("این فراخوان در حال حاضر پیشنهاد نمی‌پذیرد.", null);
                    if (ch["Deadline"] != null && ((DateTime)ch["Deadline"]).Date < DateTime.Today)
                        throw new ValidationException("مهلت ارسال پیشنهاد برای این مسئله به پایان رسیده است.", null);

                    // پوشه‌ی شرکت صاحب مسئله (تا شرکت فقط پیشنهادهای مسائل خودش را ببیند)
                    SPList proposals = web.Lists["Proposals"];
                    string folderUrl = proposals.RootFolder.ServerRelativeUrl;
                    var companyLookup = new SPFieldLookupValue(Convert.ToString(ch["Company"]));
                    if (companyLookup.LookupId > 0)
                    {
                        SPListItem company = web.Lists["Companies"].GetItemById(companyLookup.LookupId);
                        string code = Convert.ToString(company["CompanyCode"]);
                        SPFolder f = web.GetFolder(folderUrl + "/" + code);
                        if (f.Exists) folderUrl = f.ServerRelativeUrl;
                    }

                    SPListItem item = proposals.AddItem(folderUrl, SPFileSystemObjectType.File, null);
                    item["Title"] = Truncate(applicant + " — " + ch.Title, 255);
                    item["Challenge"] = new SPFieldLookupValue(ch.ID, ch.Title);
                    item["ApplicantCompany"] = applicant;
                    item["ContactName"] = contactName;
                    item["Phone"] = phone;
                    item["Email"] = email;
                    item["CertNo"] = certNo;
                    item["ProposalSummary"] = summary;
                    item["EvaluationStatus"] = "New";
                    item["SourceIp"] = ip;
                    item.Update();

                    tracking = "P-" + JalaliYear() + "-" + item.ID.ToString("0000");
                    item["TrackingCode"] = tracking;
                    foreach (var file in files) item.Attachments.Add(file.Key, file.Value);
                    item.Update();

                    Notify(web, "پیشنهاد جدید برای مسئله: " + ch.Title,
                        "<div dir='rtl'>پیشنهاد جدیدی از «" + HttpUtility.HtmlEncode(applicant) + "» برای مسئله‌ی «" + HttpUtility.HtmlEncode(ch.Title) +
                        "» ثبت شد.<br>کد رهگیری: " + tracking + "</div>");
                }
            });
            return tracking;
        }

        // ------------------------------------------------------------------ پیام تماس
        private static string SaveContact(HttpRequest req, Guid siteId, Guid webId, string ip)
        {
            string name = Required(req, "Title", 120);
            string org = Field(req, "Organization", 160);
            string phone = Required(req, "Phone", 20);
            string email = Field(req, "Email", 120);
            string subject = Required(req, "Subject", 120);
            string message = Required(req, "Message", 2000);
            if (!Regex.IsMatch(NormalizeDigits(phone), @"^[0-9+\-\s]{8,20}$")) throw new ValidationException("شماره تماس معتبر نیست.", "Phone");
            if (email.Length > 0 && !IsEmail(email)) throw new ValidationException("نشانی ایمیل معتبر نیست.", "Email");

            string tracking = null;
            SPSecurity.RunWithElevatedPrivileges(delegate
            {
                using (var site = new SPSite(siteId))
                using (var web = site.OpenWeb(webId))
                {
                    web.AllowUnsafeUpdates = true;
                    SPListItem item = web.Lists["ContactMessages"].AddItem();
                    item["Title"] = name;
                    item["Organization"] = org;
                    item["Phone"] = phone;
                    item["Email"] = email;
                    item["Subject"] = subject;
                    item["Message"] = message;
                    item["HandledStatus"] = "New";
                    item["SourceIp"] = ip;
                    item.Update();
                    tracking = "M-" + JalaliYear() + "-" + item.ID.ToString("0000");
                    item["TrackingCode"] = tracking;
                    item.Update();

                    Notify(web, "پیام جدید در سکوی نوآوری: " + subject,
                        "<div dir='rtl'><b>" + HttpUtility.HtmlEncode(name) + "</b> (" + HttpUtility.HtmlEncode(phone) + ")<br>" +
                        HttpUtility.HtmlEncode(message).Replace("\n", "<br>") + "<br>کد پیگیری: " + tracking + "</div>");
                }
            });
            return tracking;
        }

        // ------------------------------------------------------------------ ابزارها
        private static string Field(HttpRequest req, string name, int max)
        {
            string v = (req.Form[name] ?? "").Trim();
            if (v.Length > max) throw new ValidationException("طول مقدار وارد‌شده بیش از حد مجاز است.", name);
            return v;
        }

        private static string Required(HttpRequest req, string name, int max)
        {
            string v = Field(req, name, max);
            if (v.Length == 0) throw new ValidationException("این فیلد الزامی است.", name);
            return v;
        }

        private static bool IsEmail(string s) { return Regex.IsMatch(s, @"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"); }

        private static string Truncate(string s, int max) { return s.Length <= max ? s : s.Substring(0, max); }

        private static List<KeyValuePair<string, byte[]>> ReadFiles(HttpRequest req)
        {
            var result = new List<KeyValuePair<string, byte[]>>();
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < req.Files.Count; i++)
            {
                HttpPostedFile f = req.Files[i];
                if (f == null || f.ContentLength == 0) continue;
                if (result.Count >= MaxFiles) throw new ValidationException("حداکثر " + MaxFiles + " فایل مجاز است.", "Attachments");
                string name = Path.GetFileName(f.FileName ?? "file");
                string ext = Path.GetExtension(name).ToLowerInvariant();
                if (Array.IndexOf(AllowedExtensions, ext) < 0) throw new ValidationException("نوع فایل «" + name + "» مجاز نیست.", "Attachments");
                if (f.ContentLength > MaxFileBytes) throw new ValidationException("حجم فایل «" + name + "» بیش از ۱۰ مگابایت است.", "Attachments");
                name = Regex.Replace(name, @"[~#%&*{}\\:<>?/+|""']", "_");
                while (names.Contains(name)) name = "_" + name;
                names.Add(name);
                using (var ms = new MemoryStream()) { f.InputStream.CopyTo(ms); result.Add(new KeyValuePair<string, byte[]>(name, ms.ToArray())); }
            }
            return result;
        }

        private static bool RateAllowed(string ip)
        {
            string key = "shn-rate-" + ip;
            var cache = HttpRuntime.Cache;
            lock (typeof(PublicSubmitHandler))
            {
                int count = cache[key] is int ? (int)cache[key] : 0;
                if (count >= MaxRequestsPerWindow) return false;
                cache.Insert(key, count + 1, null, DateTime.UtcNow.Add(RateWindow), System.Web.Caching.Cache.NoSlidingExpiration);
                return true;
            }
        }

        private static string ClientIp(HttpRequest req)
        {
            // در صورت وجود Reverse Proxy مورد اعتماد، X-Forwarded-For را در آن تنظیم و اینجا استفاده کنید
            return req.UserHostAddress ?? "unknown";
        }

        private static string JalaliYear()
        {
            return new PersianCalendar().GetYear(DateTime.Now).ToString(CultureInfo.InvariantCulture);
        }

        private static void Notify(SPWeb web, string subject, string body)
        {
            try
            {
                if (!SPUtility.IsEmailServerSet(web)) return;
                SPList settings = web.Lists.TryGetList("SiteSettings");
                if (settings == null) return;
                var q = new SPQuery { Query = "<Where><Eq><FieldRef Name='Title'/><Value Type='Text'>HoldingNotifyEmails</Value></Eq></Where>", RowLimit = 1 };
                SPListItemCollection rows = settings.GetItems(q);
                if (rows.Count == 0) return;
                string emails = Convert.ToString(rows[0]["Value"]);
                foreach (string to in emails.Split(new[] { ',', ';', ' ', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries))
                    SPUtility.SendEmail(web, false, false, to.Trim(), subject, body);
            }
            catch { /* ایمیل نباید ثبت فرم را ناموفق کند */ }
        }

        // ---- کپچا (هم‌ارز Captcha.ashx؛ هر .ashx جداگانه کامپایل می‌شود و نمی‌تواند کد دیگری را صدا بزند)
        private static bool ValidateCaptcha(string token, string answer)
        {
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(answer)) return false;
            try
            {
                byte[] raw = MachineKey.Unprotect(HttpServerUtility.UrlTokenDecode(token), CaptchaPurpose);
                if (raw == null) return false;
                string[] parts = Encoding.UTF8.GetString(raw).Split('|');
                if (parts.Length != 3) return false;
                if (DateTime.UtcNow.Ticks > long.Parse(parts[1], CultureInfo.InvariantCulture)) return false;
                string usedKey = "shn-captcha-used-" + parts[2];
                if (HttpRuntime.Cache[usedKey] != null) return false;
                HttpRuntime.Cache.Insert(usedKey, true, null, DateTime.UtcNow.AddMinutes(20), System.Web.Caching.Cache.NoSlidingExpiration);
                return string.Equals(parts[0], NormalizeDigits(answer).Trim(), StringComparison.Ordinal);
            }
            catch { return false; }
        }

        private static string NormalizeDigits(string s)
        {
            var sb = new StringBuilder(s.Length);
            foreach (char ch in s)
            {
                if (ch >= '۰' && ch <= '۹') sb.Append((char)('0' + (ch - '۰')));
                else if (ch >= '٠' && ch <= '٩') sb.Append((char)('0' + (ch - '٠')));
                else sb.Append(ch);
            }
            return sb.ToString();
        }

        private static void Write(HttpContext context, object value)
        {
            context.Response.Write(new JavaScriptSerializer().Serialize(value));
        }
    }
}
