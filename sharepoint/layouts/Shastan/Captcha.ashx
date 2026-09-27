<%@ WebHandler Language="C#" Class="Shastan.Portal.CaptchaHandler" %>
<%@ Assembly Name="System.Drawing, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a" %>
// کپچای عددی برای فرم‌های عمومی سکوی نوآوری شستان.
// پاسخ: {"token":"...","image":"data:image/png;base64,..."}
// توکن با MachineKey (که در همه‌ی سرورهای فارم یکسان است) امضا و رمز می‌شود؛ بنابراین نیازی به Session یا
// Sticky Session نیست. اعتبارسنجی در PublicSubmit.ashx انجام می‌شود.
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.Security;

namespace Shastan.Portal
{
    public class CaptchaHandler : IHttpHandler
    {
        public const string Purpose = "Shastan.Captcha.v1";
        public const int LifetimeMinutes = 15;

        public bool IsReusable { get { return true; } }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.Cache.SetCacheability(HttpCacheability.NoCache);
            context.Response.Cache.SetNoStore();
            context.Response.ContentType = "application/json; charset=utf-8";

            string code = RandomDigits(5);
            string payload = code + "|" + DateTime.UtcNow.AddMinutes(LifetimeMinutes).Ticks + "|" + Guid.NewGuid().ToString("N");
            byte[] protectedBytes = MachineKey.Protect(Encoding.UTF8.GetBytes(payload), Purpose);
            string token = HttpServerUtility.UrlTokenEncode(protectedBytes);

            context.Response.Write("{\"token\":\"" + token + "\",\"image\":\"data:image/png;base64," + Render(code) + "\"}");
        }

        private static string RandomDigits(int length)
        {
            var bytes = new byte[length];
            using (var rng = new RNGCryptoServiceProvider()) { rng.GetBytes(bytes); }
            var sb = new StringBuilder(length);
            foreach (byte b in bytes) sb.Append((char)('0' + (b % 10)));
            return sb.ToString();
        }

        private static string Render(string code)
        {
            var random = new Random();
            using (var bmp = new Bitmap(140, 44))
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.FromArgb(241, 245, 249));
                for (int i = 0; i < 8; i++)
                {
                    using (var pen = new Pen(Color.FromArgb(random.Next(140, 210), random.Next(140, 210), random.Next(140, 210)), 1))
                        g.DrawLine(pen, random.Next(140), random.Next(44), random.Next(140), random.Next(44));
                }
                using (var font = new Font("Tahoma", 20, FontStyle.Bold, GraphicsUnit.Pixel))
                using (var brush = new SolidBrush(Color.FromArgb(31, 41, 51)))
                {
                    for (int i = 0; i < code.Length; i++)
                    {
                        var state = g.Save();
                        g.TranslateTransform(14 + i * 24, 22);
                        g.RotateTransform(random.Next(-18, 18));
                        g.DrawString(code[i].ToString(), font, brush, -8, -12);
                        g.Restore(state);
                    }
                }
                for (int i = 0; i < 120; i++) bmp.SetPixel(random.Next(140), random.Next(44), Color.FromArgb(random.Next(120, 200), random.Next(120, 200), random.Next(120, 200)));
                using (var ms = new MemoryStream())
                {
                    bmp.Save(ms, ImageFormat.Png);
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
        }
        // اعتبارسنجی پاسخ در PublicSubmit.ashx (ValidateCaptcha) با همان Purpose انجام می‌شود.
    }
}
