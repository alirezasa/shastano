<#
.SYNOPSIS
  بررسی دسترسی کاربر ناشناس (بدون ورود) به صفحات، فایل‌ها و REST سکو.
.DESCRIPTION
  درخواست‌ها بدون هیچ اعتبارنامه‌ای ارسال می‌شوند، دقیقاً مثل مرورگر کاربر عمومی.
  «مورد انتظار» برای هر آدرس نوشته شده؛ هر ردیف ✖ یعنی تنظیمات دسترسی ناشناس کامل نیست.
#>
param([string]$ConfigPath = (Join-Path $PSScriptRoot 'shastan.config.json'))
$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$base = $config.SiteUrl.TrimEnd('/')
$api = "$base/_api/web/lists/getbytitle"

$tests = @(
  @{ Name = 'صفحه‌ی اصلی'; Url = "$base/SitePages/index.aspx"; Expect = 200 },
  @{ Name = 'فایل CSS قالب'; Url = "$base/SiteAssets/shastan/css/shastan.css"; Expect = 200 },
  @{ Name = 'REST: حوزه‌ها'; Url = "$api('TechDomains')/items?`$select=Title&`$top=1"; Expect = 200 },
  @{ Name = 'REST: شرکت‌ها (تأییدشده)'; Url = "$api('Companies')/items?`$select=Title,Category/Title&`$expand=Category&`$filter=OData__ModerationStatus eq 0&`$top=1"; Expect = 200 },
  @{ Name = 'REST: مسائل فناورانه'; Url = "$api('TechChallenges')/items?`$select=Title,Domain/Title,Company/Title&`$expand=Domain,Company&`$top=1"; Expect = 200 },
  @{ Name = 'REST: نماینده‌ها (نباید باز شود)'; Url = "$api('CompanyContacts')/items?`$select=Title&`$top=1"; Expect = 401 },
  @{ Name = 'REST: پیشنهادها (نباید باز شود)'; Url = "$api('Proposals')/items?`$select=Title&`$top=1"; Expect = 401 },
  @{ Name = 'کپچا'; Url = "$base/_layouts/15/Shastan/Captcha.ashx"; Expect = 200 }
)

$fail = 0
foreach ($t in $tests) {
  $status = 0; $detail = ''
  try {
    $r = Invoke-WebRequest -Uri $t.Url -UseBasicParsing -Headers @{ Accept = 'application/json;odata=nometadata' } -MaximumRedirection 0 -ErrorAction Stop
    $status = [int]$r.StatusCode
    if ($t.Url -like '*/_api/*') { $detail = "$(([regex]::Matches($r.Content, '"Title"')).Count) مورد" }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $status = [int]$resp.StatusCode
      try { $body = (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd(); if ($body -match '"value"\s*:\s*"([^"]+)"') { $detail = $Matches[1] } } catch { }
    } else { $detail = $_.Exception.Message }
  }
  $ok = if ($t.Expect -eq 401) { $status -in 302, 401, 403 } else { $status -eq $t.Expect }
  if (-not $ok) { $fail++ }
  $mark = if ($ok) { '✔' } else { '✖' }
  $color = if ($ok) { 'Green' } else { 'Red' }
  Write-Host ("{0} {1,-34} {2,4}  (انتظار: {3})  {4}" -f $mark, $t.Name, $status, $(if ($t.Expect -eq 401) { '401/403' } else { $t.Expect }), $detail) -ForegroundColor $color
}
if ($fail) { Write-Host "`n$fail مورد مطابق انتظار نبود؛ خروجی را برای بررسی ارسال کنید." -ForegroundColor Yellow }
else { Write-Host "`nدسترسی ناشناس درست تنظیم شده است." -ForegroundColor Green }
