<#
.SYNOPSIS
  نصب و پیکربندی سکوی نوآوری و فناوری شستان روی SharePoint Server 2019 (سمت سرور).

.DESCRIPTION
  روی یکی از سرورهای شیرپوینت با «SharePoint Management Shell» (Run as Administrator) و با حسابی که
  Farm Admin و Site Collection Admin است اجرا شود. اسکریپت idempotent است: اجرای مجدد، موارد موجود را
  حذف نمی‌کند و فقط موارد جاافتاده را اضافه/اصلاح می‌کند.

  کارها:
    1. تنظیمات Web Application (دسترسی ناشناس در Zone، اجازه‌ی خواندن REST برای ناشناس)
    2. Featureها (خاموش کردن MDS، روشن کردن Lockdown Mode)
    3. سطوح دسترسی سفارشی و گروه‌ها
    4. لیست‌ها و کتابخانه‌ها با ستون‌ها، Content Approval، Versioning و مجوزها (از lists.json)
    5. داده‌های پایه‌ی واقعی: ۷ حوزه، دسته‌بندی‌ها، شرکت‌ها (از companies.csv)، تنظیمات
    6. پوشه‌ی اختصاصی هر شرکت با مجوز مجزا
    7. صفحه‌ی خانه‌ی سایت

.EXAMPLE
  .\Install-ShastanPortal.ps1
  .\Install-ShastanPortal.ps1 -ConfigPath .\shastan.config.json -WhatIfOnly
#>
[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'shastan.config.json'),
  # فقط بررسی پیش‌نیازها و نمایش برنامه، بدون تغییر
  [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'
if (-not (Get-PSSnapin Microsoft.SharePoint.PowerShell -ErrorAction SilentlyContinue)) {
  Add-PSSnapin Microsoft.SharePoint.PowerShell
}

function Write-Step([string]$m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok([string]$m) { Write-Host "    [OK] $m" -ForegroundColor Green }
function Write-Note([string]$m) { Write-Host "    [!] $m" -ForegroundColor Yellow }

# ---------------------------------------------------------------- ورودی‌ها
$config = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$defs = Get-Content (Join-Path $PSScriptRoot 'lists.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$csvPath = Join-Path $PSScriptRoot $config.CompaniesCsv
if (-not (Test-Path $csvPath)) {
  throw "فایل شرکت‌ها یافت نشد: $csvPath`nاز روی companies.sample.csv یک فایل companies.csv بسازید و اطلاعات واقعی شرکت‌ها را وارد کنید."
}
# جداکننده خودکار: Tab (کپی از Excel)، کاما، یا ; (Excel فارسی/اروپایی)
$header = (Get-Content $csvPath -Encoding UTF8 -TotalCount 1)
$delimiter = if ($header -match "`t") { "`t" } elseif ($header -match ';' -and $header -notmatch ',') { ';' } else { ',' }
$companies = @(Import-Csv $csvPath -Encoding UTF8 -Delimiter $delimiter | Where-Object { $_.CompanyCode -and $_.CompanyCode.Trim() })
foreach ($c in $companies) { foreach ($p in $c.PSObject.Properties) { if ($p.Value -is [string]) { $p.Value = $p.Value.Trim() } } }

# اعتبارسنجی قبل از هر تغییری در شیرپوینت
$problems = @()
foreach ($c in $companies) {
  if ($c.CompanyCode -notmatch '^[A-Za-z0-9_-]{1,20}$') { $problems += "کد شرکت نامعتبر: '$($c.CompanyCode)' (فقط حروف لاتین، عدد، - و _)" }
  if (-not $c.Title) { $problems += "نام شرکت $($c.CompanyCode) خالی است" }
  foreach ($g in ($c.ADGroup -split '[;|]')) {
    $g = $g.Trim()
    if ($g -and $g -notmatch '^[^\\]+\\[^\\]+$' -and $g -notmatch '^c:0') {
      $problems += "گروه AD شرکت $($c.CompanyCode) نامعتبر است: '$g' — شکل درست: DOMAIN\GroupName (بک‌اسلش بین دامنه و نام گروه جا افتاده؟)"
    }
  }
}
$dup = $companies | Group-Object CompanyCode | Where-Object Count -gt 1
if ($dup) { $problems += "کد شرکت تکراری: $(($dup | ForEach-Object Name) -join ', ')" }
if (-not $companies.Count) { $problems += 'هیچ شرکتی در companies.csv نیست (ستون‌ها: CompanyCode, Title, Category, Icon, ADGroup)' }
if ($problems) { throw ("اشکال در companies.csv:`n - " + ($problems -join "`n - ")) }

$site = Get-SPSite $config.SiteUrl
$web = $site.RootWeb
$webApp = $site.WebApplication
Write-Host "سایت: $($web.Url)   |   Web Application: $($webApp.Url)   |   شرکت‌ها: $($companies.Count)"
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
if ($WhatIfOnly) { Write-Note 'حالت WhatIfOnly: تغییری اعمال نشد.'; return }

# ---------------------------------------------------------------- ۱. Web Application
Write-Step 'تنظیمات Web Application'
$zone = [Microsoft.SharePoint.Administration.SPUrlZone]$config.Zone
$iis = $webApp.IisSettings[$zone]
if (-not $iis.AllowAnonymous) {
  if ($config.EnableAnonymousOnWebApplication) {
    $iis.AllowAnonymous = $true
    $webApp.Update()
    $webApp.ProvisionGlobally()
    Write-Ok "دسترسی ناشناس روی Zone $($config.Zone) فعال شد"
  } else {
    Write-Note "دسترسی ناشناس روی Zone $($config.Zone) خاموش است؛ کاربران عمومی بدون ورود صفحات را نخواهند دید."
  }
} else { Write-Ok 'دسترسی ناشناس Zone فعال است' }

# REST: اجازه‌ی خواندن آیتم‌های لیست برای کاربر ناشناس (پیش‌فرض SP 2013+ مسدود است)
try {
  [void]$webApp.ClientCallableSettings.AnonymousRestrictedTypes.Remove([Microsoft.SharePoint.SPList], 'GetItems')
  $webApp.Update()
  Write-Ok 'GetItems برای ناشناس مجاز شد'
} catch { Write-Note "حذف محدودیت GetItems ناموفق بود: $($_.Exception.Message)" }

if (-not $webApp.OutboundMailServiceInstance) {
  Write-Note 'Outgoing E-mail برای این Web Application تنظیم نشده؛ ایمیل‌های اطلاع‌رسانی ارسال نمی‌شوند (Central Admin > System Settings > Outgoing e-mail).'
}

# ---------------------------------------------------------------- ۲. Featureها
Write-Step 'Featureها'
if (Get-SPFeature -Web $web.Url -Identity MDSFeature -ErrorAction SilentlyContinue) {
  Disable-SPFeature -Identity MDSFeature -Url $web.Url -Confirm:$false
  Write-Ok 'Minimal Download Strategy خاموش شد'
}
if (-not (Get-SPFeature -Site $site.Url -Identity ViewFormPagesLockDown -ErrorAction SilentlyContinue)) {
  Enable-SPFeature -Identity ViewFormPagesLockDown -Url $site.Url
  Write-Ok 'Limited-access user permission lockdown mode فعال شد'
} else { Write-Ok 'Lockdown mode فعال است' }

# ---------------------------------------------------------------- ۳. سطوح دسترسی و گروه‌ها
Write-Step 'سطوح دسترسی و گروه‌ها'
$basic = 'ViewListItems, OpenItems, ViewVersions, ViewFormPages, Open, ViewPages, BrowseUserInfo, UseRemoteAPIs, UseClientIntegration'
$permContributor = [Microsoft.SharePoint.SPBasePermissions]"$basic, AddListItems, EditListItems"
$permReviewer = [Microsoft.SharePoint.SPBasePermissions]"$basic, AddListItems, EditListItems, DeleteListItems, ApproveItems, CancelCheckout, DeleteVersions, CreateAlerts"
$permAdmin = [Microsoft.SharePoint.SPBasePermissions]"$basic, AddListItems, EditListItems, DeleteListItems, ApproveItems, CancelCheckout, DeleteVersions, CreateAlerts, ManageLists"

function Ensure-RoleDefinition([string]$name, [string]$description, $perms) {
  $rd = $web.RoleDefinitions | Where-Object { $_.Name -eq $name }
  if (-not $rd) {
    $rd = New-Object Microsoft.SharePoint.SPRoleDefinition
    $rd.Name = $name; $rd.Description = $description; $rd.BasePermissions = $perms
    $web.RoleDefinitions.Add($rd)
  } else { $rd.BasePermissions = $perms; $rd.Update() }
  return $web.RoleDefinitions[$name]
}
# CancelCheckout = «Override List Behaviors»: هلدینگ همه‌ی آیتم‌ها را صرف‌نظر از تنظیمات سطح آیتم می‌بیند
$roleContributor = Ensure-RoleDefinition 'Shastan Contributor' 'شرکت تابعه: مشاهده، ثبت و ویرایش (بدون حذف)' $permContributor
$roleReviewer = Ensure-RoleDefinition 'Shastan Reviewer' 'کارشناس هلدینگ: بررسی و تأیید' $permReviewer
$roleAdmin = Ensure-RoleDefinition 'Shastan Admin' 'مدیر سامانه در هلدینگ: تأیید و مدیریت لیست‌ها' $permAdmin
$roleRead = $web.RoleDefinitions.GetByType([Microsoft.SharePoint.SPRoleType]::Reader)
Write-Ok 'Shastan Contributor / Reviewer / Admin'

function Ensure-Group([string]$name, [string]$description) {
  $g = $web.SiteGroups | Where-Object { $_.Name -eq $name }
  if (-not $g) {
    $owner = if ($web.AssociatedOwnerGroup) { $web.AssociatedOwnerGroup } else { $web.Site.Owner }
    $web.SiteGroups.Add($name, $owner, $null, $description)
    $g = $web.SiteGroups[$name]
  }
  return $g
}
# DOMAIN\name: اگر نام کامل دامنه‌ی خود سرور (مثل AD.SHASTANGROUP.IR) آمده باشد، به نام کوتاه (NetBIOS) تبدیل می‌شود
function Resolve-Login([string]$login) {
  $login = $login.Trim()
  if ($login -match '^([^\\]+)\\(.+)$') {
    $domain = $Matches[1]; $name = $Matches[2]
    if ($env:USERDNSDOMAIN -and $env:USERDOMAIN -and $domain -ieq $env:USERDNSDOMAIN) { return "$($env:USERDOMAIN)\$name" }
  }
  return $login
}
function Add-Members($group, $logins) {
  foreach ($raw in @($logins)) {
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }
    $login = Resolve-Login $raw
    try { $group.AddUser($web.EnsureUser($login)); Write-Ok "$login → $($group.Name)" }
    catch { Write-Note "افزودن $login به $($group.Name) ناموفق بود: $($_.Exception.Message)" }
  }
}
function Grant($securable, $principal, $roleDef) {
  $ra = New-Object Microsoft.SharePoint.SPRoleAssignment($principal)
  $ra.RoleDefinitionBindings.Add($roleDef)
  $securable.RoleAssignments.Add($ra)
}
function Revoke($securable, $principal) {
  if ($principal) { try { $securable.RoleAssignments.Remove($principal) } catch { } }
}

$gAdmins = Ensure-Group 'SHN-Holding-Admins' 'مدیران سامانه‌ی نوآوری در هلدینگ شستان'
$gReviewers = Ensure-Group 'SHN-Holding-Reviewers' 'کارشناسان بررسی و تأیید هلدینگ شستان'
$gVisitors = Ensure-Group 'SHN-Visitors' 'همه‌ی کاربران واردشده (شرکت‌ها و هلدینگ)'
Add-Members $gAdmins $config.HoldingAdminsMembers
Add-Members $gReviewers $config.HoldingReviewersMembers
Add-Members $gVisitors $config.VisitorsMembers

$companyGroups = @{}
foreach ($c in $companies) {
  $g = Ensure-Group "SHN-Company-$($c.CompanyCode)" "کاربران شرکت $($c.Title)"
  Add-Members $g ($c.ADGroup -split '[;|]')
  $companyGroups[$c.CompanyCode] = $g
}

# دسترسی سطح سایت: همه‌ی کاربران واردشده و هلدینگ فقط «خواندن»؛ دسترسی واقعی روی لیست/پوشه داده می‌شود
if (-not $web.HasUniqueRoleAssignments) { $web.BreakRoleInheritance($true) }
foreach ($g in @($gVisitors, $gReviewers, $gAdmins) + @($companyGroups.Values)) { Grant $web $g $roleRead }
$web.AnonymousState = [Microsoft.SharePoint.SPWeb+WebAnonymousState]::Enabled   # «Lists and libraries»
$web.Update()
Write-Ok 'مجوزهای سطح سایت و دسترسی ناشناس «فقط لیست‌ها و کتابخانه‌های مشخص»'

# ---------------------------------------------------------------- ۴. لیست‌ها
Write-Step 'لیست‌ها و کتابخانه‌ها'
$anonView = [Microsoft.SharePoint.SPBasePermissions]'ViewListItems, OpenItems, ViewVersions, Open, ViewPages'

function Get-FieldXml($f) {
  $n = $f.name
  $common = "Name='$n' StaticName='$n' DisplayName='$n'"
  switch ($f.type) {
    'Text' { return "<Field Type='Text' $common MaxLength='$($f.max)' />" }
    'Note' { return "<Field Type='Note' $common NumLines='6' RichText='FALSE' UnlimitedLengthInDocumentLibrary='TRUE' />" }
    'Choice' {
      $choices = ($f.choices | ForEach-Object { "<CHOICE>$([Security.SecurityElement]::Escape([string]$_))</CHOICE>" }) -join ''
      $default = if ($f.default) { "<Default>$([Security.SecurityElement]::Escape([string]$f.default))</Default>" } else { '' }
      return "<Field Type='Choice' $common Format='Dropdown' FillInChoice='FALSE'><CHOICES>$choices</CHOICES>$default</Field>"
    }
    'DateOnly' { return "<Field Type='DateTime' $common Format='DateOnly' />" }
    'DateTime' { return "<Field Type='DateTime' $common Format='DateTime' />" }
    'Number' {
      $range = ''
      if ($null -ne $f.min) { $range += " Min='$($f.min)'" }
      if ($null -ne $f.maxValue) { $range += " Max='$($f.maxValue)'" }
      return "<Field Type='Number' $common Decimals='0'$range />"
    }
    'Boolean' { $d = if ($f.default) { '1' } else { '0' }; return "<Field Type='Boolean' $common><Default>$d</Default></Field>" }
    'User' { return "<Field Type='User' $common UserSelectionMode='PeopleOnly' />" }
    'Lookup' {
      $target = $web.Lists.TryGetList($f.lookupList)
      if (-not $target) { throw "لیست مقصد Lookup یافت نشد: $($f.lookupList)" }
      return "<Field Type='Lookup' $common List='{$($target.ID)}' ShowField='Title' />"
    }
  }
  throw "نوع ستون ناشناخته: $($f.type)"
}

function Ensure-Field($list, $f) {
  if ($f.name -eq 'Title') {
    $t = $list.Fields.GetFieldByInternalName('Title'); $t.Title = $f.label; $t.Update(); return
  }
  if (-not $list.Fields.ContainsFieldWithStaticName($f.name)) {
    [void]$list.Fields.AddFieldAsXml((Get-FieldXml $f), $false, [Microsoft.SharePoint.SPAddFieldOptions]::AddFieldInternalNameHint)
  }
  $field = $list.Fields.GetFieldByInternalName($f.name)
  $field.Title = $f.label
  if ($f.indexed -and -not $field.Indexed) { $field.Indexed = $true }
  $field.Update()
  $view = $list.DefaultView
  if ($f.type -ne 'Note' -and -not $view.ViewFields.Exists($f.name)) { $view.ViewFields.Add($field); $view.Update() }
}

function Ensure-List($def) {
  $list = $web.Lists.TryGetList($def.title)
  if (-not $list) {
    $tpl = if ($def.template -eq 'DocumentLibrary') { [Microsoft.SharePoint.SPListTemplateType]::DocumentLibrary } else { [Microsoft.SharePoint.SPListTemplateType]::GenericList }
    [void]$web.Lists.Add($def.title, $def.description, $tpl)
    $list = $web.Lists[$def.title]
    Write-Ok "ایجاد شد: $($def.title)"
  }
  $list.Description = $def.description
  $list.OnQuickLaunch = $false
  $list.EnableVersioning = $true
  $list.MajorVersionLimit = 50
  if ($def.template -eq 'DocumentLibrary') { $list.EnableMinorVersions = $false; $list.ForceCheckout = $false }
  else { $list.EnableAttachments = [bool]$def.attachments }
  $list.EnableFolderCreation = ($def.scope -eq 'folder')
  $list.EnableModeration = [bool]$def.moderated
  if ($def.moderated) { $list.DraftVersionVisibility = [Microsoft.SharePoint.DraftVisibilityType]::Author } # «کاربرانی که حق ویرایش دارند»
  $list.Update()
  foreach ($f in $def.fields) { Ensure-Field $list $f }
  return $web.Lists[$def.title]
}

function Set-ListSecurity($list, $def) {
  if (-not $list.HasUniqueRoleAssignments) { $list.BreakRoleInheritance($true) }
  # گروه Members پیش‌فرض سایت (سطح Edit) نباید روی داده‌ها دسترسی داشته باشد
  Revoke $list $web.AssociatedMemberGroup
  switch ($def.access) {
    'public' { $list.AnonymousPermMask64 = $anonView }
    'authenticated' { $list.AnonymousPermMask64 = [Microsoft.SharePoint.SPBasePermissions]::EmptyMask }
    'holding' {
      $list.AnonymousPermMask64 = [Microsoft.SharePoint.SPBasePermissions]::EmptyMask
      Revoke $list $gVisitors
      Revoke $list $web.AssociatedVisitorGroup
      foreach ($g in $companyGroups.Values) { Revoke $list $g }
    }
  }
  Grant $list $gReviewers $roleReviewer
  Grant $list $gAdmins $roleAdmin
  $list.Update()
}

$lists = @{}
foreach ($def in $defs.lists) {
  $list = Ensure-List $def
  Set-ListSecurity $list $def
  $lists[$def.key] = $list
}

# کتابخانه‌های سیستمی: صفحات عمومی، فایل‌های قالب، مستر پیج
function Get-LibraryByUrl([string]$leaf, [string]$title) {
  $url = ($web.ServerRelativeUrl.TrimEnd('/')) + '/' + $leaf
  try { return $web.GetList($url) } catch {
    [void]$web.Lists.Add($leaf, $title, [Microsoft.SharePoint.SPListTemplateType]::DocumentLibrary)
    $l = $web.Lists[$leaf]; $l.Title = $title; $l.Update(); return $l
  }
}
foreach ($lib in @(@('SitePages', 'Site Pages'), @('SiteAssets', 'Site Assets'))) {
  $l = Get-LibraryByUrl $lib[0] $lib[1]
  if (-not $l.HasUniqueRoleAssignments) { $l.BreakRoleInheritance($true) }
  Revoke $l $web.AssociatedMemberGroup
  $l.AnonymousPermMask64 = $anonView
  Grant $l $gAdmins $roleAdmin
  $l.Update()
  Write-Ok "$($lib[0]): عمومی (فقط مشاهده)"
}
$mpg = $site.GetCatalog([Microsoft.SharePoint.SPListTemplateType]::MasterPageCatalog)
if (-not $mpg.HasUniqueRoleAssignments) { $mpg.BreakRoleInheritance($true) }
$mpg.AnonymousPermMask64 = $anonView
$mpg.Update()
Write-Ok 'Master Page Gallery: قابل خواندن برای ناشناس'

# ---------------------------------------------------------------- ۵. داده‌های پایه
Write-Step 'داده‌های پایه'
function Approve-Item($item) {
  $item.ModerationInformation.Status = [Microsoft.SharePoint.SPModerationStatusType]::Approved
  $item.ModerationInformation.Comment = 'Shastan installer'
  $item.Update()
}
function Find-Item($list, [string]$field, [string]$value) {
  $q = New-Object Microsoft.SharePoint.SPQuery
  $q.Query = "<Where><Eq><FieldRef Name='$field' /><Value Type='Text'>$([Security.SecurityElement]::Escape($value))</Value></Eq></Where>"
  $q.ViewAttributes = "Scope='RecursiveAll'"
  $q.RowLimit = 1
  $r = $list.GetItems($q)
  if ($r.Count) { return $r[0] } else { return $null }
}

$i = 0
foreach ($d in $defs.seed.domains) {
  $i++
  if (-not (Find-Item $lists.domains 'DomainKey' $d.DomainKey)) {
    $it = $lists.domains.AddItem()
    $it['Title'] = $d.Title; $it['DomainKey'] = $d.DomainKey; $it['Icon'] = $d.Icon; $it['Tone'] = $d.Tone
    $it['Description'] = $d.Description; $it['SortOrder'] = $i; $it['IsActive'] = $true
    $it.Update()
  }
}
Write-Ok 'حوزه‌های ۷گانه'

$i = 0
foreach ($cat in $config.Categories) {
  $i++
  if (-not (Find-Item $lists.categories 'Title' $cat)) {
    $it = $lists.categories.AddItem(); $it['Title'] = $cat; $it['SortOrder'] = $i; $it.Update()
  }
}
Write-Ok 'دسته‌بندی شرکت‌ها'

$settings = @{ 'HoldingNotifyEmails' = $config.HoldingNotifyEmails }
foreach ($k in $settings.Keys) {
  $it = Find-Item $lists.settings 'Title' $k
  if (-not $it) { $it = $lists.settings.AddItem(); $it['Title'] = $k }
  $it['Value'] = $settings[$k]; $it.Update()
}
Write-Ok 'تنظیمات (HoldingNotifyEmails)'

# شرکت‌ها
$now = [DateTime]::Now
$sort = 0
foreach ($c in $companies) {
  $sort++
  $it = Find-Item $lists.companies 'CompanyCode' $c.CompanyCode
  if (-not $it) {
    # فقط هنگام ایجاد مقداردهی و تأیید می‌شود؛ در اجرای مجدد، ویرایش‌های در انتظار شرکت دست نمی‌خورد
    $it = $lists.companies.AddItem()
    $it['CompanyCode'] = $c.CompanyCode
    $it['ItemCode'] = $c.CompanyCode
    $it['Title'] = $c.Title
    if ($c.Icon) { $it['Icon'] = $c.Icon }
    $it['SortOrder'] = $sort
    $it['IsActive'] = $true
    $it['WorkflowStatus'] = 'Published'
    $it['PublishedOn'] = $now
    $cat = Find-Item $lists.categories 'Title' $c.Category
    if ($cat) { $it['Category'] = New-Object Microsoft.SharePoint.SPFieldLookupValue($cat.ID, $cat.Title) }
    elseif ($c.Category) { Write-Note "دسته‌بندی «$($c.Category)» برای شرکت $($c.CompanyCode) در Categories تعریف نشده" }
    $it.Update()
    Approve-Item $it
    Write-Ok "شرکت $($c.CompanyCode) - $($c.Title)"
  }
  # فقط گروه همین شرکت روی آیتم پروفایلش حق ویرایش دارد
  if (-not $it.HasUniqueRoleAssignments) { $it.BreakRoleInheritance($true) }
  Grant $it $companyGroups[$c.CompanyCode] $roleContributor
}
Write-Ok "$($companies.Count) شرکت"

# ---------------------------------------------------------------- ۶. پوشه‌ی هر شرکت
Write-Step 'پوشه‌ی اختصاصی شرکت‌ها'
function Ensure-CompanyFolder($list, [string]$code) {
  $rootUrl = $list.RootFolder.ServerRelativeUrl
  $folder = $web.GetFolder("$rootUrl/$code")
  if (-not $folder.Exists) {
    $item = $list.AddItem($rootUrl, [Microsoft.SharePoint.SPFileSystemObjectType]::Folder, $code)
    $item['Title'] = $code
    $item.Update()
    if ($list.EnableModeration) { Approve-Item $item }
    $folder = $web.GetFolder("$rootUrl/$code")
  }
  return $folder.Item
}
foreach ($def in ($defs.lists | Where-Object { $_.scope -eq 'folder' })) {
  $list = $lists[$def.key]
  $role = if ($def.companyRole -eq 'Read') { $roleRead } else { $roleContributor }
  foreach ($c in $companies) {
    $fi = Ensure-CompanyFolder $list $c.CompanyCode
    # نکته: مجوزهای لیست (از جمله دسترسی ناشناس) هنگام شکستن ارث‌بری کپی می‌شوند؛ پس لیست باید قبلاً تنظیم شده باشد
    if (-not $fi.HasUniqueRoleAssignments) { $fi.BreakRoleInheritance($true) }
    Grant $fi $companyGroups[$c.CompanyCode] $role
  }
  Write-Ok "$($def.title): $($companies.Count) پوشه"
}

# ---------------------------------------------------------------- ۷. صفحه‌ی خانه
Write-Step 'صفحه‌ی خانه'
$rootFolder = $web.RootFolder
$rootFolder.WelcomePage = 'SitePages/index.aspx'
$rootFolder.Update()
Write-Ok 'Welcome Page = SitePages/index.aspx'

$web.Dispose(); $site.Dispose()
Write-Host "`nنصب کامل شد. گام بعد: .\Deploy-ShastanFiles.ps1" -ForegroundColor Green
