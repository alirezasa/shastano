// صفحه‌ی ورود در حالت نمایشی. در شیرپوینت، صفحه‌ی login.aspx (کنترل asp:Login) همین ظاهر را دارد
// و احراز هویت را FBA با LdapMembershipProvider روی Active Directory انجام می‌دهد.
import { shn, qs, $ } from '../core/util.js';
import { setDemoRole } from '../data/repository.js';
import { url } from '../ui/urls.js';

export function init() {
  const form = shn('login-form');
  const err = shn('login-error');
  $('[data-toggle-password]').addEventListener('click', (e) => {
    const p = form.elements.Password;
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-label', show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور');
    e.currentTarget.innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = form.elements.UserName.value.trim().toLowerCase();
    const pass = form.elements.Password.value;
    if (!user || !pass) { err.textContent = 'نام کاربری و رمز عبور را وارد کنید.'; err.hidden = false; return; }
    if (!['company', 'holding'].includes(user)) { err.textContent = 'نام کاربری یا رمز عبور نادرست است.'; err.hidden = false; return; }
    setDemoRole(user, 1);
    const ret = qs('ReturnUrl');
    const safe = ret && new URL(ret, location.href).origin === location.origin ? ret : null;
    location.href = safe && !/login\.html/.test(safe) ? safe : url(user === 'holding' ? 'adminPanel' : 'companyPanel');
  });
}
