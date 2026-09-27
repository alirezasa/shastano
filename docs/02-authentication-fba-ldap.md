# راه‌اندازی ورود کاربران با صفحه‌ی اختصاصی (FBA + LDAP روی Active Directory)

> تصمیم: کاربران شرکت‌های تابعه و هلدینگ در AD هستند، سایت روی اینترنت منتشر می‌شود و صفحه‌ی ورود پیش‌فرض شیرپوینت (پنجره‌ی NTLM مرورگر) مناسب نیست.
> راهکار: **Forms-Based Authentication** با `LdapMembershipProvider` روی همان AD + صفحه‌ی ورود اختصاصی `login.aspx`.
> کاربر همان نام کاربری/رمز شبکه را در یک صفحه‌ی زیبا وارد می‌کند؛ رمز عبور در شیرپوینت ذخیره نمی‌شود و مستقیماً با AD بررسی می‌شود.

---

## ۱. معماری Zoneها

| Zone | آدرس | احراز هویت | کاربرد |
|------|------|-----------|--------|
| **Default** | `https://innovation.shastan.local` (داخلی) | Windows (NTLM) | فقط Crawl جستجو و مدیریت فنی |
| **Internet** | `https://innovation.shastan.ir` | **Anonymous + FBA (LDAP)** | همه‌ی کاربران: عمومی، شرکت‌ها و هلدینگ |

⚠️ همه‌ی کاربران (حتی کارکنان هلدینگ در شبکه‌ی داخلی) باید از آدرس Internet وارد شوند.
هویت FBA (`i:0#.f|shastanldapmember|a.rezaei`) با هویت Windows همان شخص (`i:0#.w|shastan\a.rezaei`) از نظر شیرپوینت **دو کاربر متفاوت** است؛ مجوزها فقط به هویت‌های FBA داده می‌شود.

## ۲. ساختار پیشنهادی در Active Directory

```
OU=Shastan Portal
 ├─ OU=Users            ← کاربران شرکت‌ها و هلدینگ (یا کاربران فعلی دامین؛ فقط userContainer را تنظیم کنید)
 └─ OU=Groups
     ├─ SHN-Holding-Admins
     ├─ SHN-Holding-Reviewers
     ├─ SHN-Company-001-Editors      ← یک گروه برای هر شرکت (کد شرکت = CompanyCode در لیست Companies)
     ├─ SHN-Company-002-Editors
     └─ ...
```

- مدیریت اعضا فقط در AD انجام می‌شود (افزودن کارشناس جدید شرکت = عضو کردن او در گروه AD همان شرکت).
- یک حساب سرویس فقط‌خواندنی برای اتصال LDAP (مثلاً `svc-sp-ldap`).
- اتصال با **LDAPS (پورت 636)**؛ گواهی کنترلر دامنه باید روی سرورهای شیرپوینت معتبر باشد.

## ۳. تعریف Providerها

نام‌ها در همه‌ی فایل‌ها باید یکسان باشند: `ShastanLdapMember` و `ShastanLdapRole`.

```xml
<!-- Membership -->
<add name="ShastanLdapMember"
     type="Microsoft.Office.Server.Security.LdapMembershipProvider, Microsoft.Office.Server, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c"
     server="dc01.shastan.local" port="636" useSSL="true"
     connectionUsername="SHASTAN\svc-sp-ldap" connectionPassword="********"
     userDNAttribute="distinguishedName"
     userNameAttribute="sAMAccountName"
     userContainer="OU=Shastan Portal,DC=shastan,DC=local"
     userObjectClass="person"
     userFilter="(&amp;(objectClass=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
     scope="Subtree"
     otherRequiredUserAttributes="sn,givenname,cn,mail" />

<!-- Roles (گروه‌های AD) -->
<add name="ShastanLdapRole"
     type="Microsoft.Office.Server.Security.LdapRoleProvider, Microsoft.Office.Server, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c"
     server="dc01.shastan.local" port="636" useSSL="true"
     connectionUsername="SHASTAN\svc-sp-ldap" connectionPassword="********"
     groupContainer="OU=Groups,OU=Shastan Portal,DC=shastan,DC=local"
     groupNameAttribute="cn"
     groupNameAlternateSearchAttribute="samAccountName"
     groupMemberAttribute="member"
     userNameAttribute="sAMAccountName"
     dnAttribute="distinguishedName"
     groupFilter="(&amp;(objectClass=group))"
     userFilter="(&amp;(objectClass=person))"
     scope="Subtree" />
```

`userFilter` بالا حساب‌های غیرفعال AD را کنار می‌گذارد.

## ۴. سه فایل web.config (روی **همه‌ی** سرورهای شیرپوینت)

> قبل از هر تغییر از فایل‌ها نسخه‌ی پشتیبان بگیرید.

**الف) Central Administration** (برای People Picker در CA)
```xml
<system.web>
  <membership defaultProvider="AspNetSqlMembershipProvider">
    <providers> <!-- ShastanLdapMember --> </providers>
  </membership>
  <roleManager enabled="true" defaultProvider="AspNetWindowsTokenRoleProvider">
    <providers> <!-- ShastanLdapRole --> </providers>
  </roleManager>
</system.web>
```

**ب) Security Token Service** — `%ProgramFiles%\Common Files\microsoft shared\Web Server Extensions\16\WebServices\SecurityToken\web.config`
قبل از `</configuration>`:
```xml
<system.web>
  <membership>
    <providers> <!-- ShastanLdapMember --> </providers>
  </membership>
  <roleManager enabled="true">
    <providers> <!-- ShastanLdapRole --> </providers>
  </roleManager>
</system.web>
```

**ج) سایت IIS مربوط به Zone Internet** — شیرپوینت بخش `<membership defaultProvider="i">` و `<roleManager defaultProvider="c">` را دارد؛ فقط دو Provider را داخل `<providers>` همان بخش‌ها اضافه کنید (پیش‌فرض‌ها را تغییر ندهید).

## ۵. PowerShell (SharePoint Management Shell)

```powershell
$wa  = Get-SPWebApplication "https://innovation.shastan.local"

# ۱) Provider احراز هویت FBA
$ap = New-SPAuthenticationProvider -ASPNETMembershipProvider "ShastanLdapMember" -ASPNETRoleProviderName "ShastanLdapRole"

# ۲) گسترش Web Application به Zone اینترنت با HTTPS و دسترسی ناشناس
$wa | New-SPWebApplicationExtension -Name "Shastan Innovation - Internet" -Zone Internet `
      -URL "https://innovation.shastan.ir" -Port 443 -SecureSocketsLayer `
      -AuthenticationProvider $ap -AllowAnonymousAccess

# ۳) صفحه‌ی ورود اختصاصی
Set-SPWebApplication -Identity $wa -Zone Internet -SignInRedirectURL "/_layouts/15/Shastan/login.aspx"

# ۴) اجازه‌ی خواندن لیست از REST برای کاربر ناشناس (در SP 2013+ به‌صورت پیش‌فرض مسدود است)
$wa.ClientCallableSettings.AnonymousRestrictedTypes.Remove([Microsoft.SharePoint.SPList], "GetItems")
$wa.Update()
```

سپس در IIS، گواهی SSL را روی Binding پورت 443 سایت جدید قرار دهید.

## ۶. دادن مجوز به گروه‌های AD

گروه‌های AD به‌صورت **Role Claim** به گروه‌های شیرپوینت اضافه می‌شوند:

```powershell
$web = Get-SPWeb "https://innovation.shastan.ir"
function Add-AdGroupToSpGroup($adGroup, $spGroup) {
  # Role Claim رمزگذاری‌شده‌ی گروه AD: c:0-.f|<نام role provider با حروف کوچک>|<نام گروه>
  $claimStr = "c:0-.f|shastanldaprole|$($adGroup.ToLower())"
  $user = $web.EnsureUser($claimStr)
  $web.SiteGroups[$spGroup].AddUser($user)
}
Add-AdGroupToSpGroup "SHN-Holding-Reviewers" "SHN-Holding-Reviewers"
Add-AdGroupToSpGroup "SHN-Company-001-Editors" "SHN-Company-001-Editors"
```

(اسکریپت کامل ساخت گروه‌ها، لیست‌ها و مجوزها در فاز ۲ تحویل می‌شود.)

> نقش کاربر در رابط کاربری (شرکت / هلدینگ) از روی **مجوز مؤثر** تشخیص داده می‌شود، نه از `/_api/web/currentuser/groups`؛
> چون عضویت از طریق گروه AD (Role Claim) در آن endpoint دیده نمی‌شود. جزئیات در `src/js/data/sp-provider.js` → `getCurrentUser`.

## ۷. استقرار صفحه‌ی ورود

فایل‌ها (خروجی `npm run build`):
```
dist/sharepoint/layouts/Shastan/login.aspx
dist/sharepoint/layouts/Shastan/assets/…   (CSS، فونت، آیکن)
```
→ کپی در `…\16\TEMPLATE\LAYOUTS\Shastan\` روی **همه‌ی سرورهای وب**.
در فاز ۶ همین فایل‌ها داخل بسته‌ی `Shastan.Portal.wsp` قرار می‌گیرند تا با `Add-SPSolution`/`Install-SPSolution` روی همه‌ی سرورها یکسان نصب شوند.

صفحه کد سمت سرور ندارد: از کلاس `FormsSignInPage` خود شیرپوینت ارث می‌برد و فقط ظاهر کنترل `asp:Login` را عوض می‌کند.
آدرس خروج: `/_layouts/15/SignOut.aspx`.

## ۸. سخت‌سازی (سایت اینترنتی)

- فقط HTTPS؛ HSTS در IIS.
- **Account Lockout Policy** در AD فعال باشد (محافظت در برابر حدس رمز). چون ورود از اینترنت است، یک **Reverse Proxy / WAF** جلوی سرور، نرخ درخواست به `login.aspx` را محدود کند.
- قابلیت **Limited-access user permission lockdown mode** خاموش است، چون REST را برای کاربر ناشناس می‌بندد؛ حفاظت لیست‌های غیرعمومی با AnonymousPermMask خالی انجام می‌شود (بخش ۵ راهنمای استقرار). فرم‌ها و نمای لیست‌های عمومی فقط همان داده‌ی منتشرشده را نشان می‌دهند.
- مدت اعتبار کوکی FBA: `Set-SPSecurityTokenServiceConfig -FormsTokenLifetime 60` (دقیقه) و در صورت نیاز `-LogonTokenCacheExpirationWindow`.
- ⚠️ پشتیبانی SharePoint Server 2019 در ۱۴ ژوئیه‌ی ۲۰۲۶ تمام شده است؛ آخرین CU نصب باشد و مهاجرت به Subscription Edition برنامه‌ریزی شود.

## ۹. چک‌لیست تست

- [ ] کاربر ناشناس صفحات عمومی را بدون درخواست ورود می‌بیند.
- [ ] کلیک «ورود» → `login.aspx` با ظاهر سکو (نه پنجره‌ی مرورگر).
- [ ] رمز اشتباه → پیام «نام کاربری یا رمز عبور نادرست است».
- [ ] کاربر غیرفعال در AD نمی‌تواند وارد شود.
- [ ] کاربر شرکت ۰۰۱ بعد از ورود به «پنل شرکت» هدایت می‌شود و فقط داده‌های شرکت خودش را می‌بیند.
- [ ] کاربر هلدینگ «کارتابل» را می‌بیند.
- [ ] Crawl جستجو از Zone Default بدون خطا انجام می‌شود.
