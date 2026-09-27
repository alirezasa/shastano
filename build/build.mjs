// ساخت نسخه‌ی قابل‌پیش‌نمایش (dist/) و بسته‌ی استقرار شیرپوینت (dist/sharepoint/)
//   node build/build.mjs          ساخت کامل
//   node build/build.mjs --watch  ساخت مجدد با هر تغییر
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync, watch } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');
const ASSETS = join(DIST, 'assets');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function partial(name) {
  return readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8');
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
    let page = partial(`layout-${layout}`).replace('<!--@body-->', () => src);
    for (let i = 0; i < 5 && page.includes('<!--@include'); i++) {
      page = page.replace(/<!--@include\s+([\w-]+)\s*-->/g, (_, n) => partial(n));
    }
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

async function buildJs() {
  await esbuild.build({
    entryPoints: [join(SRC, 'js/main.js')],
    bundle: true,
    format: 'iife',
    target: ['es2019'],
    minify: true,
    sourcemap: true,
    charset: 'utf8',
    legalComments: 'none',
    outfile: join(ASSETS, 'js/shastan.js')
  });
}

// بسته‌ی شیرپوینت: فایل‌های LAYOUTS (صفحه‌ی ورود) + assets مشترک
function buildSharePointPackage() {
  const spSrc = join(ROOT, 'sharepoint');
  const spOut = join(DIST, 'sharepoint');
  if (!existsSync(spSrc)) return;
  cpSync(spSrc, spOut, { recursive: true });
  const layoutsAssets = join(spOut, 'layouts/Shastan/assets');
  cpSync(ASSETS, layoutsAssets, { recursive: true });
}

function checkOutput() {
  const missing = ['assets/css/shastan.css', 'assets/js/shastan.js', 'index.html'].filter((f) => !existsSync(join(DIST, f)));
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
  buildSharePointPackage();
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
