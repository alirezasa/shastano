<#
.SYNOPSIS
  بارگذاری مستر پیج، صفحات و فایل‌های قالب سکو در سایت شیرپوینت.

.DESCRIPTION
  از داخل پوشه‌ی dist\sharepoint\provisioning اجرا شود (خروجی npm run build).
  هر بار که قالب یا کدها تغییر کرد، build و سپس همین اسکریپت را دوباره اجرا کنید.
    ..\masterpage\shastan.master   → /_catalogs/masterpage/shastan.master
    ..\SitePages\*.aspx            → /SitePages
    ..\PanelPages\*.aspx           → /PanelPages
    ..\SiteAssets\shastan\**       → /SiteAssets/shastan
#>
[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'shastan.config.json')
)

$ErrorActionPreference = 'Stop'
if (-not (Get-PSSnapin Microsoft.SharePoint.PowerShell -ErrorAction SilentlyContinue)) {
  Add-PSSnapin Microsoft.SharePoint.PowerShell
}
$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$package = Split-Path $PSScriptRoot -Parent
$site = Get-SPSite $config.SiteUrl
$web = $site.RootWeb
$webRel = $web.ServerRelativeUrl.TrimEnd('/')
# ---------------------------------------------------------------- بررسی مجوز حساب اجراکننده
# Farm Admin بودن برای تغییر محتوای سایت کافی نیست؛ حساب باید Site Collection Admin باشد یا
# در User Policy مربوط به Web Application دسترسی Full Control داشته باشد.
$runAs = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$hasFull = $false
try { $hasFull = $web.DoesUserHavePermissions([Microsoft.SharePoint.SPBasePermissions]::FullMask) } catch { }
if (-not $hasFull) {
  $claim = "i:0#.w|$($runAs.ToLower())"
  throw @"
حساب «$runAs» روی سایت $($web.Url) دسترسی Full Control ندارد (Access denied).
یکی از دو راه زیر را در همین SharePoint Management Shell اجرا کنید و سپس اسکریپت را دوباره اجرا کنید:

  # راه ۱ (پیشنهادی): Full Control از طریق User Policy وب اپلیکیشن
  `$wa = Get-SPWebApplication "$($web.Site.WebApplication.Url)"
  `$p = `$wa.Policies.Add("$claim", "Shastan Installer")
  `$p.PolicyRoleBindings.Add(`$wa.PolicyRoles.GetSpecialRole("FullControl"))
  `$wa.Update()

  # راه ۲: مدیر دوم Site Collection
  Set-SPSite -Identity "$($web.Site.Url)" -SecondaryOwnerAlias "$runAs"
"@
}
Write-Host "حساب اجرا: $runAs (Full Control ✔)"

function Publish-File($file) {
  if ($file.CheckOutType -ne [Microsoft.SharePoint.SPFile+SPCheckOutType]::None) {
    $file.CheckIn('Shastan deploy', [Microsoft.SharePoint.SPCheckinType]::MajorCheckIn)
  }
  $list = $file.Item.ParentList
  if ($list.EnableMinorVersions -and $file.Level -ne [Microsoft.SharePoint.SPFileLevel]::Published) { $file.Publish('Shastan deploy') }
  if ($list.EnableModeration -and $file.Item.ModerationInformation.Status -ne [Microsoft.SharePoint.SPModerationStatusType]::Approved) { $file.Approve('Shastan deploy') }
}

function Get-Folder([string]$serverRelativeUrl) {
  $folder = $web.GetFolder($serverRelativeUrl)
  if ($folder.Exists) { return $folder }
  $parent = Get-Folder ($serverRelativeUrl.Substring(0, $serverRelativeUrl.LastIndexOf('/')))
  return $parent.SubFolders.Add($serverRelativeUrl)
}

function Upload-Directory([string]$localDir, [string]$targetUrl) {
  if (-not (Test-Path $localDir)) { throw "پوشه یافت نشد: $localDir — ابتدا npm run build را اجرا کنید." }
  $root = (Resolve-Path $localDir).Path.TrimEnd('\')
  $count = 0
  Get-ChildItem $root -Recurse -File | Where-Object { $_.Extension -ne '.map' } | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
    $dest = "$targetUrl/$rel"
    $folder = Get-Folder ($dest.Substring(0, $dest.LastIndexOf('/')))
    $existing = $web.GetFile($dest)
    if ($existing.Exists -and $existing.CheckOutType -eq [Microsoft.SharePoint.SPFile+SPCheckOutType]::None -and $existing.Item -and $existing.Item.ParentList.ForceCheckout) {
      $existing.CheckOut()
    }
    $file = $folder.Files.Add($dest, [IO.File]::ReadAllBytes($_.FullName), $true)
    Publish-File $file
    $count++
  }
  Write-Host "    [OK] $count فایل → $targetUrl" -ForegroundColor Green
}

Write-Host "`n==> مستر پیج" -ForegroundColor Cyan
Upload-Directory (Join-Path $package 'masterpage') "$webRel/_catalogs/masterpage"

Write-Host "`n==> فایل‌های قالب (CSS، JS، فونت، آیکن)" -ForegroundColor Cyan
Upload-Directory (Join-Path $package 'SiteAssets\shastan') "$webRel/SiteAssets/shastan"

Write-Host "`n==> صفحات عمومی" -ForegroundColor Cyan
Upload-Directory (Join-Path $package 'SitePages') "$webRel/SitePages"

Write-Host "`n==> صفحات پنل" -ForegroundColor Cyan
Upload-Directory (Join-Path $package 'PanelPages') "$webRel/PanelPages"

$web.Dispose(); $site.Dispose()
Write-Host "`nاستقرار کامل شد: $($config.SiteUrl)" -ForegroundColor Green
