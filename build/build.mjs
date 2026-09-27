// ساخت نسخه‌ی قابل‌پیش‌نمایش (dist/) و بسته‌ی استقرار شیرپوینت (dist/sharepoint/)
//   node build/build.mjs          ساخت کامل
//   node build/build.mjs --watch  ساخت مجدد با هر تغییر
//
// مسیر سایت در شیرپوینت (server-relative). اگر سکو در ریشه‌ی Web Application است (http://srv-shp-web:8080/)
// خالی بماند؛ اگر مثلاً در http://srv-shp-web:8080/sites/innovation است:  SHN_SP_SITE=/sites/innovation npm run build
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync, watch } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';
import { listDefinitions, SEED } from './sp-lists.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const ASSETS = join(DIST, 'assets');
const SP_OUT = join(DIST, 'sharepoint');
const SP_SITE = (process.env.SHN_SP_SITE || '').replace(/\/$/, '');
const VERSION = new Date().toISOString().replace(/\D/g, '').slice(0, 12);

// نگاشت صفحات نمایشی به صفحات شیرپوینت
const SP_PAGES = {
  index: 'SitePages/index.aspx', challenges: 'SitePages/challenges.aspx', challenge: 'SitePages/challenge.aspx',
  companies: 'SitePages/companies.aspx', company: 'SitePages/company.aspx', catalog: 'SitePages/catalog.aspx',
  contact: 'SitePages/contact.aspx', 'panel/company': 'PanelPages/company.aspx', 'panel/admin': 'PanelPages/admin.aspx'
};

/** تبدیل لینک‌های {{root}}x.html و {{root}}assets/ به آدرس‌های شیرپوینت */
function spLinks(text) {
  return text
    .replace(/\{\{root\}\}assets\//g, `${SP_SITE}/SiteAssets/shastan/`)
    .replace(/\{\{root\}\}([\w/-]+)\.html/g, (m, name) => {
      if (!SP_PAGES[name]) throw new Error(`no SharePoint page mapped for ${name}.html`);
      return `${SP_SITE}/${SP_PAGES[name]}`;
    })
    .replaceAll('{{root}}', `${SP_SITE}/`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function partial(name) {
  return readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8');
}

function includePartials(text) {
  for (let i = 0; i < 5 && text.includes('<!--@include'); i++) {
    text = text.replace(/<!--@include\s+([\w-]+)\s*-->/g, (_, n) => partial(n));
  }
  return text;
}

// صفحات: خط اول هر فایل <!--@meta {...}--> است؛ <!--@include name--> با partial جایگزین می‌شود.
function buildPages() {
  const pagesDir = join(SRC, 'pages');
  for (const file of walk(pagesDir).filter((f) => extname(f) === '.html')) {
    const rel = relative(pagesDir, file);
    const depth = rel.split(/[\\/]/).length - 1;
    const root = depth ? '../'.repeat(depth) : './';
    let src = readFileSync(file, 'utf8');
    const metaMatch = src.match(/^<!--@meta\s+(\{[\s\S]*?\})\s*-->\s*/);
    if (!metaMatch) throw new Error(`@meta missing in ${rel}`);
    const meta = JSON.parse(metaMatch[1]);
    src = src.slice(metaMatch[0].length);

    const layout = meta.layout || 'site';
    let page = includePartials(partial(`layout-${layout}`).replace('<!--@body-->', () => src)).replace('<!--@admin-link-->', '');
    page = page
      .replaceAll('{{root}}', root)
      .replaceAll('{{title}}', meta.title)
      .replaceAll('{{description}}', meta.description || 'سکوی نوآوری و فناوری شستان')
      .replaceAll('{{page}}', meta.page);

    const out = join(DIST, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, page);
  }
}

function copyAssets() {
  cpSync(join(SRC, 'assets'), ASSETS, { recursive: true });
  const fa = join(ROOT, 'node_modules/@fortawesome/fontawesome-free');
  mkdirSync(join(ASSETS, 'vendor/fontawesome/css'), { recursive: true });
  cpSync(join(fa, 'css/all.min.css'), join(ASSETS, 'vendor/fontawesome/css/all.min.css'));
  cpSync(join(fa, 'webfonts'), join(ASSETS, 'vendor/fontawesome/webfonts'), { recursive: true });
}

const require = createRequire(import.meta.url);

// اجرای Tailwind از طریق خود node (نه node_modules/.bin) تا روی Windows هم کار کند
function buildCss() {
  execFileSync(process.execPath, [
    require.resolve('tailwindcss/lib/cli.js'),
    '-c', join(ROOT, 'tailwind.config.js'),
    '-i', join(SRC, 'styles/main.css'),
    '-o', join(ASSETS, 'css/shastan.css'),
    '--minify'
  ], { stdio: 'inherit', cwd: ROOT });
}

// sp=true: بسته‌ی شیرپوینت بدون پیاده‌سازی نمایشی و داده‌های ساختگی
async function buildJs({ sp = false, outfile = join(ASSETS, 'js/shastan.js') } = {}) {
  const stubMock = {
    name: 'stub-mock',
    setup(b) { b.onResolve({ filter: /mock-provider\.js$/ }, () => ({ path: join(SRC, 'js/data/mock-stub.js') })); }
  };
  await esbuild.build({
    entryPoints: [join(SRC, 'js/main.js')],
    plugins: sp ? [stubMock] : [],
    bundle: true,
    format: 'iife',
    target: ['es2019'],
    minify: true,
    sourcemap: true,
    charset: 'utf8',
    legalComments: 'none',
    outfile
  });
}

// ---------- بسته‌ی شیرپوینت (dist/sharepoint) ----------
//   masterpage/shastan.master   → _catalogs/masterpage
//   SitePages/*.aspx            → کتابخانه‌ی Site Pages (عمومی)
//   PanelPages/*.aspx           → کتابخانه‌ی PanelPages (بدون دسترسی ناشناس)
//   SiteAssets/shastan/**       → کتابخانه‌ی Site Assets
//   layouts/Shastan/**          → 16\TEMPLATE\LAYOUTS\Shastan روی همه‌ی سرورهای وب
//   provisioning/**             → اسکریپت‌های PowerShell نصب و استقرار
// ASP.NET فایل .aspx/.master بدون BOM را با کدگذاری ANSI ویندوز می‌خواند و متن فارسی خراب می‌شود
const BOM = '\uFEFF';
const withBom = (text) => (text.startsWith(BOM) ? text : BOM + text);

const PAGE_DIRECTIVE = '<%@ Page Language="C#" MasterPageFile="~sitecollection/_catalogs/masterpage/shastan.master" Inherits="Microsoft.SharePoint.WebPartPages.WebPartPage, Microsoft.SharePoint, Version=16.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>';

function assertSafeMode(name, text) {
  // صفحات آپلودشده در Safe Mode اجرا می‌شوند؛ هیچ کد سرور inline مجاز نیست
  if (/<%(?![@-])/.test(text.replace(/<%@[^%]*%>/g, '').replace(/<%--[\s\S]*?--%>/g, ''))) throw new Error(`${name}: inline server code is not allowed`);
}

async function buildSharePointPackage() {
  const adminLink = `        <SharePoint:SPSecurityTrimmedControl runat="server" PermissionsString="ManageWeb"><a href="${SP_SITE}/_layouts/15/settings.aspx" class="hover:tw-text-white"><i class="fa-solid fa-gear tw-ms-1" aria-hidden="true"></i>تنظیمات سایت</a></SharePoint:SPSecurityTrimmedControl>`;

  // مستر پیج
  let master = readFileSync(join(ROOT, 'sharepoint/masterpage/shastan.master'), 'utf8');
  master = spLinks(includePartials(master).replace('<!--@admin-link-->', adminLink)).replaceAll('{{version}}', VERSION);
  assertSafeMode('shastan.master', master);
  mkdirSync(join(SP_OUT, 'masterpage'), { recursive: true });
  writeFileSync(join(SP_OUT, 'masterpage/shastan.master'), withBom(master));

  // صفحات
  const pagesDir = join(SRC, 'pages');
  for (const file of walk(pagesDir).filter((f) => extname(f) === '.html')) {
    const name = relative(pagesDir, file).replace(/\\/g, '/').replace(/\.html$/, '');
    if (!SP_PAGES[name]) continue; // login.html فقط نسخه‌ی نمایشی است؛ ورود در شیرپوینت با login.aspx
    let src = readFileSync(file, 'utf8');
    const metaMatch = src.match(/^<!--@meta\s+(\{[\s\S]*?\})\s*-->\s*/);
    const meta = JSON.parse(metaMatch[1]);
    src = spLinks(includePartials(src.slice(metaMatch[0].length)));
    const aspx = `${PAGE_DIRECTIVE}
<asp:Content ContentPlaceHolderID="PlaceHolderPageTitle" runat="server">${meta.title} | سکوی نوآوری و فناوری شستان</asp:Content>
<asp:Content ContentPlaceHolderID="PlaceHolderAdditionalPageHead" runat="server"><meta name="description" content="${meta.description || ''}"></asp:Content>
<asp:Content ContentPlaceHolderID="PlaceHolderMain" runat="server">
<div data-shn-page="${meta.page}" hidden></div>
${src}
</asp:Content>
`;
    assertSafeMode(name, aspx);
    const out = join(SP_OUT, SP_PAGES[name]);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, withBom(aspx));
  }

  // assets + بسته‌ی جاوااسکریپت مخصوص شیرپوینت (بدون داده‌ی نمایشی)
  const spAssets = join(SP_OUT, 'SiteAssets/shastan');
  cpSync(ASSETS, spAssets, { recursive: true });
  rmSync(join(spAssets, 'js'), { recursive: true, force: true });
  await buildJs({ sp: true, outfile: join(spAssets, 'js/shastan.js') });

  // LAYOUTS (صفحه‌ی ورود FBA، هندلرهای فرم عمومی) و اسکریپت‌های PowerShell
  cpSync(join(ROOT, 'sharepoint/layouts'), join(SP_OUT, 'layouts'), { recursive: true });
  for (const f of walk(join(SP_OUT, 'layouts')).filter((x) => /\.(aspx|ashx|master)$/i.test(x))) {
    writeFileSync(f, withBom(readFileSync(f, 'utf8')));
  }
  cpSync(ASSETS, join(SP_OUT, 'layouts/Shastan/assets'), { recursive: true });
  rmSync(join(SP_OUT, 'layouts/Shastan/assets/js'), { recursive: true, force: true }); // صفحه‌ی ورود JS ندارد
  cpSync(join(ROOT, 'sharepoint/provisioning'), join(SP_OUT, 'provisioning'), { recursive: true });
  writeFileSync(join(SP_OUT, 'provisioning/lists.json'), JSON.stringify({ lists: listDefinitions(), seed: SEED }, null, 2));

  for (const f of walk(SP_OUT).filter((x) => /\.(aspx|ashx|master)$/i.test(x))) {
    if (readFileSync(f)[0] !== 0xef) throw new Error(`missing UTF-8 BOM: ${relative(SP_OUT, f)}`);
  }

  // بسته‌ی شیرپوینت نباید داده‌ی نمایشی داشته باشد
  const js = readFileSync(join(spAssets, 'js/shastan.js'), 'utf8');
  if (js.includes('پتروشیمی فن‌آوران') || js.includes('shn.mock.db')) throw new Error('SharePoint bundle still contains mock data');
}

function checkOutput() {
  const missing = ['assets/css/shastan.css', 'assets/js/shastan.js', 'index.html', 'sharepoint/masterpage/shastan.master', 'sharepoint/SitePages/index.aspx', 'sharepoint/SiteAssets/shastan/js/shastan.js']
    .filter((f) => !existsSync(join(DIST, f)));
  if (missing.length) throw new Error(`build output missing: ${missing.join(', ')}`);
}

async function buildAll() {
  const t = Date.now();
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(ASSETS, { recursive: true });
  copyAssets();
  buildPages();
  buildCss();
  await buildJs();
  await buildSharePointPackage();
  checkOutput();
  console.log(`✔ build finished in ${Date.now() - t}ms`);
}

try {
  await buildAll();
} catch (e) {
  console.error('\n✖ build failed:', e.message);
  if (!process.argv.includes('--watch')) process.exit(1);
}

if (process.argv.includes('--watch')) {
  let timer;
  const rebuild = () => { clearTimeout(timer); timer = setTimeout(() => buildAll().catch(console.error), 150); };
  watch(SRC, { recursive: true }, rebuild);
  watch(join(ROOT, 'sharepoint'), { recursive: true }, rebuild);
  console.log('watching src/ ...');
}
