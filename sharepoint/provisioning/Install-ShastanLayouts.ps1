<#
.SYNOPSIS
  کپی فایل‌های سمت سرور سکو در پوشه‌ی LAYOUTS شیرپوینت (روی «همه‌ی» سرورهای وب فارم اجرا شود).

.DESCRIPTION
  ..\layouts\Shastan\  →  %CommonProgramFiles%\microsoft shared\Web Server Extensions\16\TEMPLATE\LAYOUTS\Shastan\
    PublicSubmit.ashx  ذخیره‌ی فرم‌های عمومی (پیشنهاد، تماس) با کپچا و محدودیت نرخ
    Captcha.ashx       تولید کپچا
    login.aspx         صفحه‌ی ورود اختصاصی (برای زمان راه‌اندازی FBA روی دامنه)
    assets\            CSS و فونت صفحه‌ی ورود
  آدرس: http(s)://<site>/_layouts/15/Shastan/...
#>
$ErrorActionPreference = 'Stop'
if (-not (Get-PSSnapin Microsoft.SharePoint.PowerShell -ErrorAction SilentlyContinue)) {
  Add-PSSnapin Microsoft.SharePoint.PowerShell
}
$source = Join-Path (Split-Path $PSScriptRoot -Parent) 'layouts\Shastan'
$target = [Microsoft.SharePoint.Utilities.SPUtility]::GetVersionedGenericSetupPath('TEMPLATE\LAYOUTS\Shastan', 15)
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force
Write-Host "[OK] $source → $target" -ForegroundColor Green
Write-Host "این اسکریپت را روی سایر سرورهای وب (WFE) فارم هم اجرا کنید." -ForegroundColor Yellow
