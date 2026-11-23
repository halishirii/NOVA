# GIKWEB (گیک‌وب) — پروژه فرانت‌اند و بک‌اند

این بسته شامل ساختار اولیه و کدهای اجرایی **گیک‌وب** است:
- `frontend/index.html`: رابط کاربری ریسپانسیو راست‌به‌چپ با تم روشن پاستلی و قابلیت سوییچ به تم تیره، دکمه سفارش وسط‌چین، معرفی چهار خدمت، نمونه‌کارهای زیردامنه و پنل مشتری با ورود شماره تلفن + کپچا + کد یک‌بار مصرف (OTP).
- `backend/`: پروژه NestJS + TypeScript شامل:
  - رمزنگاری AES-256-GCM و Blind Index برای داده‌های حساس
  - سپر ضدربات (`BotShieldGuard`) و هدرهای امنیتی (`helmet`) و اعتبارسنجی سخت‌گیرانه (`ValidationPipe`)
  - کپچای یک‌بار مصرف سمت سرور در Redis (`CaptchaService`)
  - ورود بدون رمز عبور با تلفن و OTP هش‌شده در Redis (`AuthService`)
  - الگوی چنددرگاهی پرداخت بانکی (`PaymentGatewayFactory`, `GatewayAAdapter`, `GatewayBAdapter`)
  - ماژول سفارش‌ها (`OrdersController`, `OrdersService`) و پرداخت (`PaymentsController`, `PaymentsService`)

## راه‌اندازی سریع بک‌اند
1. وارد پوشه `backend` شوید و پکیج‌ها را نصب کنید:
   ```bash
   npm install
   ```
2. فایل `.env.example` را به `.env` کپی کنید و مقادیر کلیدهای امنیتی را تنظیم نمایید.
3. سرویس‌های Redis و PostgreSQL را با Docker بالا بیاورید:
   ```bash
   docker-compose up -d
   ```
4. پروژه را اجرا کنید:
   ```bash
   npm run start:dev
   ```
