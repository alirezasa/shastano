<%@ Assembly Name="Microsoft.SharePoint.IdentityModel, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Page Language="C#" AutoEventWireup="false" Inherits="Microsoft.SharePoint.IdentityModel.Pages.FormsSignInPage" %>
<%--
  صفحه‌ی ورود اختصاصی سکوی نوآوری شستان (FBA + LdapMembershipProvider روی Active Directory)
  محل استقرار: 16\TEMPLATE\LAYOUTS\Shastan\login.aspx  →  https://<site>/_layouts/15/Shastan/login.aspx
  در Central Admin → Web Applications → Authentication Providers → Zone: Internet →
    Sign In Page URL = Custom Sign In Page: /_layouts/15/Shastan/login.aspx
  نکته: کلاس پایه (FormsSignInPage) کنترل asp:Login با شناسه‌ی signInControl را پیدا و احراز هویت و
  بازگشت به آدرس Source را خودش انجام می‌دهد؛ این صفحه فقط ظاهر را عوض می‌کند و کد سمت سرور ندارد.
--%>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head runat="server">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>ورود | سکوی نوآوری و فناوری شستان</title>
  <link rel="icon" type="image/svg+xml" href="/_layouts/15/Shastan/assets/img/logo-mark.svg">
  <link rel="stylesheet" href="/_layouts/15/Shastan/assets/vendor/fontawesome/css/all.min.css">
  <link rel="stylesheet" href="/_layouts/15/Shastan/assets/css/shastan.css">
</head>
<body class="shn-body">
<div id="shastan-app" data-page="sp-login">
  <div class="tw-flex tw-min-h-screen">
    <div class="shn-hero tw-relative tw-hidden tw-overflow-hidden tw-p-12 tw-text-white lg:tw-flex lg:tw-w-1/2 lg:tw-flex-col lg:tw-justify-between">
      <div class="shn-hero-grid tw-absolute tw-inset-0" aria-hidden="true"></div>
      <a href="/" class="tw-relative tw-flex tw-items-center tw-gap-3">
        <span class="shn-logo-mark tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-xl tw-shadow-md"><i class="fa-solid fa-lightbulb tw-text-xl" aria-hidden="true"></i></span>
        <span><b class="tw-block tw-text-lg">سکوی نوآوری و فناوری شستان</b><span class="tw-text-xs tw-text-white/75">شرکت سرمایه‌گذاری تجاری شستان</span></span>
      </a>
      <div class="tw-relative tw-max-w-md">
        <h2 class="tw-text-3xl tw-font-bold tw-leading-[1.6]">ورود کاربران شرکت‌های تابعه و هلدینگ</h2>
        <ul class="tw-mt-8 tw-space-y-5 tw-text-sm">
          <li class="tw-flex tw-gap-3"><span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-white/15"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i></span><span><b class="tw-block">ثبت مسائل و دستاوردها</b><span class="tw-text-white/75">ثبت و پیگیری اطلاعات شرکت تا مرحله‌ی انتشار</span></span></li>
          <li class="tw-flex tw-gap-3"><span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-white/15"><i class="fa-solid fa-list-check" aria-hidden="true"></i></span><span><b class="tw-block">کارتابل بررسی هلدینگ</b><span class="tw-text-white/75">تأیید، برگشت یا رد درخواست‌ها با ثبت سابقه</span></span></li>
          <li class="tw-flex tw-gap-3"><span class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-white/15"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i></span><span><b class="tw-block">ورود امن با حساب سازمانی</b><span class="tw-text-white/75">همان نام کاربری و رمز عبور شبکه‌ی سازمان</span></span></li>
        </ul>
      </div>
      <p class="tw-relative tw-text-xs tw-text-white/60">کلیه حقوق این سامانه متعلق به شرکت سرمایه‌گذاری تجاری شستان است.</p>
    </div>

    <main class="tw-flex tw-flex-1 tw-items-center tw-justify-center tw-p-6">
      <div class="tw-w-full tw-max-w-md">
        <a href="/" class="tw-mb-8 tw-flex tw-items-center tw-gap-3 lg:tw-hidden">
          <span class="shn-logo-mark tw-flex tw-h-11 tw-w-11 tw-items-center tw-justify-center tw-rounded-xl tw-text-white"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i></span>
          <b>سکوی نوآوری و فناوری شستان</b>
        </a>
        <h1 class="tw-text-2xl tw-font-bold">ورود به سامانه</h1>
        <p class="tw-mt-2 tw-text-sm tw-text-ink-muted">با نام کاربری و رمز عبور سازمانی (Active Directory) وارد شوید.</p>

        <form id="form1" runat="server" class="tw-mt-6" autocomplete="off">
          <asp:Login ID="signInControl" runat="server" RenderOuterTable="false"
                     FailureText="نام کاربری یا رمز عبور نادرست است." DisplayRememberMe="true">
            <LayoutTemplate>
              <asp:Panel runat="server" DefaultButton="login" CssClass="tw-space-y-5">
                <div class="shn-login-error tw-rounded-xl tw-border tw-border-accent-200 tw-bg-accent-50 tw-p-3 tw-text-sm tw-text-accent-800" role="alert"><asp:Literal ID="FailureText" runat="server" EnableViewState="false" /></div>
                <div>
                  <asp:Label runat="server" AssociatedControlID="UserName" CssClass="shn-label" Text="نام کاربری" />
                  <div class="tw-relative">
                    <i class="fa-regular fa-user tw-pointer-events-none tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-ink-soft" aria-hidden="true"></i>
                    <asp:TextBox ID="UserName" runat="server" CssClass="shn-input tw-pr-10 tw-text-left" dir="ltr" autocomplete="username" autofocus="autofocus" aria-describedby="shn-user-hint" />
                  </div>
                  <span id="shn-user-hint" class="shn-hint">نام کاربری شبکه، بدون نام دامنه (مثال: a.rezaei)</span>
                  <asp:RequiredFieldValidator runat="server" ControlToValidate="UserName" Display="Dynamic" CssClass="shn-error" ErrorMessage="نام کاربری را وارد کنید." />
                </div>
                <div>
                  <asp:Label runat="server" AssociatedControlID="Password" CssClass="shn-label" Text="رمز عبور" />
                  <div class="tw-relative">
                    <i class="fa-solid fa-lock tw-pointer-events-none tw-absolute tw-right-3 tw-top-1/2 -tw-translate-y-1/2 tw-text-ink-soft" aria-hidden="true"></i>
                    <asp:TextBox ID="Password" runat="server" TextMode="Password" CssClass="shn-input tw-px-10 tw-text-left" dir="ltr" autocomplete="current-password" data-password="1" />
                    <button type="button" class="tw-absolute tw-left-2 tw-top-1/2 tw-flex tw-h-8 tw-w-8 -tw-translate-y-1/2 tw-items-center tw-justify-center tw-rounded-lg tw-text-ink-soft hover:tw-bg-slate-100" onclick="shnTogglePassword(this)" aria-label="نمایش رمز عبور"><i class="fa-regular fa-eye" aria-hidden="true"></i></button>
                  </div>
                  <asp:RequiredFieldValidator runat="server" ControlToValidate="Password" Display="Dynamic" CssClass="shn-error" ErrorMessage="رمز عبور را وارد کنید." />
                </div>
                <div class="tw-flex tw-items-center tw-justify-between tw-text-sm">
                  <label class="tw-flex tw-items-center tw-gap-2"><asp:CheckBox ID="RememberMe" runat="server" /> مرا به خاطر بسپار</label>
                  <span class="tw-text-xs tw-text-ink-muted">فراموشی رمز: تماس با واحد IT</span>
                </div>
                <asp:Button ID="login" runat="server" CommandName="Login" Text="ورود" CssClass="shn-btn shn-btn-brand shn-btn-lg tw-w-full" />
              </asp:Panel>
            </LayoutTemplate>
          </asp:Login>
        </form>

        <div class="tw-mt-8 tw-flex tw-items-center tw-justify-between tw-border-t tw-border-surface-line tw-pt-5 tw-text-xs tw-text-ink-muted">
          <a href="/" class="hover:tw-text-ocean-700"><i class="fa-solid fa-arrow-right tw-ms-1" aria-hidden="true"></i> بازگشت به سایت</a>
          <span><i class="fa-solid fa-lock tw-ms-1 tw-text-brand-600" aria-hidden="true"></i> ارتباط امن</span>
        </div>
      </div>
    </main>
  </div>
</div>
<script>
  function shnTogglePassword(btn) {
    var p = btn.parentNode.querySelector('input');
    var show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور');
    btn.innerHTML = '<i class="fa-regular ' + (show ? 'fa-eye-slash' : 'fa-eye') + '" aria-hidden="true"></i>';
  }
</script>
</body>
</html>
