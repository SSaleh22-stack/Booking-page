# إعداد البريد الإلكتروني في Vercel

## المشكلة
بعد النشر على Vercel، توقف إرسال رسائل البريد الإلكتروني.

## السبب
متغيرات البيئة الخاصة بالبريد الإلكتروني (SMTP) غير موجودة في Vercel.

## الحل

### الخطوة 1: إضافة متغيرات البيئة في Vercel

1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **Settings** → **Environment Variables**
4. أضف المتغيرات التالية:

#### المتغيرات المطلوبة:

| Name | Value | Environment |
|------|-------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` (أو مزودك) | Production, Preview, Development |
| `SMTP_PORT` | `587` (أو `465` للـ SSL) | Production, Preview, Development |
| `SMTP_USER` | بريدك الإلكتروني | Production, Preview, Development |
| `SMTP_PASS` | كلمة مرور التطبيق (App Password) | Production, Preview, Development |
| `SMTP_FROM` | البريد المرسل منه | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | رابط موقعك على Vercel | Production, Preview, Development |

### الخطوة 2: مثال لإعداد Gmail

إذا كنت تستخدم Gmail:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### الخطوة 3: مثال لإعداد SendGrid (موصى به للإنتاج)

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### الخطوة 4: مثال لإعداد Mailtrap (للاختبار)

```
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
SMTP_FROM=test@example.com
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### الخطوة 5: إعادة النشر

بعد إضافة جميع المتغيرات:

1. اذهب إلى **Deployments**
2. اضغط على **⋮** (ثلاث نقاط) بجانب آخر deployment
3. اختر **Redeploy**
4. أو ادفع أي تغيير إلى GitHub لإعادة النشر تلقائياً

## التحقق من الإعداد

### 1. تحقق من المتغيرات:
- تأكد أن جميع المتغيرات موجودة في **Production** environment
- تأكد أن القيم صحيحة (بدون مسافات إضافية أو علامات اقتباس)

### 2. اختبر إرسال بريد:
- أنشئ حجز تجريبي
- تحقق من وصول رسالة التأكيد

### 3. تحقق من السجلات (Logs):
- في Vercel Dashboard، اذهب إلى **Deployments** → **Functions** → **View Function Logs**
- ابحث عن أخطاء البريد الإلكتروني

## استكشاف الأخطاء

### المشكلة: "Authentication failed"
- **الحل:** تحقق من `SMTP_USER` و `SMTP_PASS`
- للـ Gmail: تأكد أنك تستخدم **App Password** وليس كلمة المرور العادية

### المشكلة: "Connection timeout"
- **الحل:** تحقق من `SMTP_HOST` و `SMTP_PORT`
- جرب المنفذ `465` بدلاً من `587` (مع `secure: true`)

### المشكلة: "Emails not sending"
- **الحل:**
  1. تحقق من السجلات في Vercel
  2. تأكد أن جميع المتغيرات موجودة
  3. أعد النشر بعد إضافة المتغيرات

## ملاحظات أمنية

⚠️ **مهم:**
- لا تضع كلمات المرور في الكود
- استخدم دائماً Environment Variables
- للـ Gmail: استخدم **App Password** فقط، وليس كلمة المرور الرئيسية
- لا تشارك `SMTP_PASS` مع أي شخص

## روابط مفيدة

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Gmail App Passwords Guide](./GMAIL_SETUP.md)
- [Email Setup Guide](./EMAIL_SETUP.md)




