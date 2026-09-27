/**
 * Tailwind برای اجرا داخل SharePoint:
 *  - prefix «tw-» تا با کلاس‌های هسته‌ی شیرپوینت (مثل .static در AspMenu) تداخل نکند
 *  - important: '#shastan-app' برای غلبه بر corev15.css بدون !important
 *  - preflight خاموش تا CSS پایه‌ی شیرپوینت (ریبون، فرم‌ها، People Picker) خراب نشود؛
 *    ریست لازم فقط داخل #shastan-app در main.css انجام می‌شود.
 * رنگ‌ها از قالب اولیه گرفته شده‌اند: سبز هدر (#008000)، قرمز تأکیدی (#c22c2c)، آبی دکمه‌ها (#0284c7).
 */
export default {
  prefix: 'tw-',
  // utilityها با #shastan-app scope می‌شوند تا بر CSS هسته‌ی شیرپوینت (مثل a:link در corev15.css) غلبه کنند
  important: '#shastan-app',
  corePlugins: { preflight: false },
  content: ['./src/**/*.{html,js}', './sharepoint/**/*.{aspx,master,html}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Dana', 'Tahoma', 'sans-serif'] },
      colors: {
        brand: {
          50: '#ecf8ec', 100: '#d3f0d3', 200: '#a7e0a7', 300: '#6fc96f', 400: '#34a834',
          500: '#0a8f0a', 600: '#008000', 700: '#006a00', 800: '#005400', 900: '#003f00', 950: '#002600'
        },
        accent: {
          50: '#fdf2f2', 100: '#fbe3e3', 200: '#f5c2c2', 300: '#eb9393', 400: '#dc5c5c',
          500: '#cc3b3b', 600: '#c22c2c', 700: '#a12222', 800: '#851f1f', 900: '#6e1e1e'
        },
        ocean: {
          50: '#f0f7ff', 100: '#e0effe', 200: '#bae2fd', 300: '#7ccbfb', 400: '#38b0f5',
          500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e'
        },
        ink: { DEFAULT: '#1f2933', muted: '#6b7280', soft: '#94a3b8' },
        surface: { DEFAULT: '#ffffff', page: '#f4f6f8', line: '#e5e7eb', dark: '#0f172a' }
      },
      borderRadius: { card: '14px' },
      boxShadow: {
        card: '0 6px 20px rgba(0,0,0,.08)',
        soft: '0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)'
      },
      maxWidth: { site: '80rem' }
    }
  },
  plugins: []
};
