# NOVA (نووآ) - پروژه آماده گیت‌هاب

این مخزن شامل:
- `index.html` در ریشه مخزن (آماده انتشار روی **GitHub Pages** بدون هیچ نام کاربری یا رمز عبور هاردکدشده و بدون راهنمای رمز در صفحه ورود)
- `backend/` (سرویس امن Node.js + Express + JWT + bcrypt متصل به Firebase Firestore با `firebase-admin`)
- `.github/workflows/deploy-pages.yml` (انتشار خودکار فرانت‌اند روی GitHub Pages پس از هر `push` به شاخه `main`)

## مراحل انتشار در گیت‌هاب و اجرای بکند
1. تمام فایل‌ها و پوشه‌ها را به مخزن گیت‌هاب خود منتقل کنید.
2. در گیت‌هاب، از تب **Settings > Pages** گزینه **GitHub Actions** را انتخاب کنید تا `index.html` به‌صورت خودکار منتشر شود.
3. بکند (`backend/`) را روی سرور یا هاست Node.js (مانند Render، Railway یا VPS) اجرا کنید و متغیرهای محیطی `.env` (شامل `JWT_SECRET`، `ALLOWED_ORIGINS` با آدرس گیت‌هاب شما و اطلاعات `serviceAccountKey.json`) را تنظیم کنید.
4. در صفحه ورود فرانت‌اند، آدرس بکند خود را وارد و ثبت کنید.
