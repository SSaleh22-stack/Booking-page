# متغيرات البيئة المطلوبة لـ Vercel

## جميع المتغيرات المطلوبة

أضف هذه المتغيرات في **Vercel Dashboard** → **Settings** → **Environment Variables**

### 1. قاعدة البيانات (Database)

```
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-wild-grass-agsojd03-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**ملاحظات:**
- استبدل `YOUR_PASSWORD` بكلمة المرور الحقيقية من Neon Console
- تأكد من عدم وجود مسافات أو علامات اقتباس
- يجب أن يبدأ بـ `postgresql://`

### 2. إعدادات المسؤول (Admin)

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

**ملاحظات:**
- `ADMIN_USERNAME` اختياري (القيمة الافتراضية: `admin`)
- `ADMIN_PASSWORD` مطلوب - استخدم كلمة مرور قوية

### 3. إعدادات البريد الإلكتروني (SMTP)

#### خيار 1: Gmail (للاختبار)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
```

**ملاحظات:**
- للـ Gmail: يجب استخدام **App Password** وليس كلمة المرور العادية
- كيفية الحصول على App Password: راجع `GMAIL_SETUP.md`

#### خيار 2: SendGrid (موصى به للإنتاج)

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

#### خيار 3: Mailtrap (للاختبار فقط)

```
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
SMTP_FROM=test@example.com
```

### 4. رابط التطبيق (Application URL)

```
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**ملاحظات:**
- استبدل `your-project.vercel.app` برابط موقعك الفعلي على Vercel
- يجب أن يبدأ بـ `https://`

---

## قائمة كاملة للمتغيرات (نسخ ولصق)

### للنسخ إلى Vercel:

```
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-wild-grass-agsojd03-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

---

## خطوات الإضافة في Vercel

1. اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
2. اختر مشروعك
3. اضغط على **Settings**
4. اضغط على **Environment Variables**
5. لكل متغير:
   - **Name:** اسم المتغير (مثلاً `DATABASE_URL`)
   - **Value:** القيمة (بدون علامات اقتباس)
   - **Environment:** اختر **Production**, **Preview**, و **Development**
6. اضغط **Save**
7. كرر الخطوة 5 لكل متغير

---

## التحقق من الإعداد

بعد إضافة جميع المتغيرات:

1. **أعد النشر (Redeploy):**
   - اذهب إلى **Deployments**
   - اضغط على **⋮** بجانب آخر deployment
   - اختر **Redeploy**

2. **تحقق من السجلات (Logs):**
   - اذهب إلى **Deployments** → **Functions** → **View Function Logs**
   - ابحث عن أخطاء

3. **اختبر التطبيق:**
   - افتح موقعك على Vercel
   - جرب إنشاء حجز تجريبي
   - تحقق من وصول رسالة البريد الإلكتروني

---

## ملاحظات أمنية مهمة

⚠️ **تحذيرات:**
- لا تضع كلمات المرور في الكود
- لا تشارك `DATABASE_URL` أو `SMTP_PASS` مع أي شخص
- استخدم دائماً Environment Variables في Vercel
- للـ Gmail: استخدم **App Password** فقط
- تأكد من أن `.env` موجود في `.gitignore`

---

## استكشاف الأخطاء

### المشكلة: "Environment variable not found"
- **الحل:** تأكد من إضافة المتغير في **جميع البيئات** (Production, Preview, Development)

### المشكلة: "Database connection failed"
- **الحل:** تحقق من `DATABASE_URL` - يجب أن يبدأ بـ `postgresql://` وبدون مسافات

### المشكلة: "Email not sending"
- **الحل:** تحقق من جميع متغيرات `SMTP_*` - تأكد من القيم الصحيحة

### المشكلة: "Admin login fails"
- **الحل:** تحقق من `ADMIN_PASSWORD` في Environment Variables

---

## روابط مفيدة

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Neon Database Setup](./NEON_SETUP.md)
- [Email Setup Guide](./EMAIL_SETUP.md)
- [Gmail Setup Guide](./GMAIL_SETUP.md)

