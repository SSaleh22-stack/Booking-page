# دليل النشر على Vercel

## الخطوات الأساسية

### 1. إعداد المشروع على Vercel

#### الطريقة الأولى: من خلال الموقع
1. اذهب إلى [vercel.com](https://vercel.com) وسجل الدخول
2. اضغط على "Add New Project"
3. اختر مستودع GitHub الخاص بك (`SSaleh22-stack/Booking-page`)
4. Vercel سيكتشف تلقائياً أنه مشروع Next.js

#### الطريقة الثانية: من خلال CLI
```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel

# للنشر في الإنتاج
vercel --prod
```

### 2. إعداد متغيرات البيئة (Environment Variables)

**مهم جداً:** يجب إضافة جميع المتغيرات التالية في إعدادات المشروع على Vercel:

1. اذهب إلى **Project Settings** → **Environment Variables**
2. أضف المتغيرات التالية:

#### قاعدة البيانات (Database) ⚠️ **مطلوب قبل البناء**
```
DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
```
- **مهم جداً:** يجب إضافة `DATABASE_URL` قبل أول بناء، وإلا سيفشل البناء
- استخدم نفس connection string من Neon
- تأكد من إضافة `?sslmode=require` في النهاية
- **للمزيد من التفاصيل:** راجع `VERCEL_DATABASE_SETUP.md`
- **إذا واجهت خطأ:** راجع `VERCEL_BUILD_FIX.md`

#### كلمة مرور الأدمن (Admin Password)
```
ADMIN_PASSWORD=your-secure-password-here
ADMIN_USERNAME=admin
```
- اختر كلمة مرور قوية للأدمن
- `ADMIN_USERNAME` اختياري (افتراضي: `admin`)

#### إعدادات البريد الإلكتروني (Email Configuration)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```
- إذا كنت تستخدم Gmail، استخدم [App Password](https://support.google.com/accounts/answer/185833)
- إذا كنت تستخدم Mailtrap للاختبار، استخدم إعدادات Mailtrap

#### رابط التطبيق (App URL)
```
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app
```
- بعد النشر الأول، Vercel سيعطيك رابط مثل `https://booking-page-xxx.vercel.app`
- استبدل `your-project-name` بالرابط الفعلي

### 3. إعداد Prisma للبناء (Build Settings)

Vercel يحتاج إلى بناء Prisma Client أثناء النشر. تأكد من:

1. في **Project Settings** → **Build & Development Settings**:
   - **Build Command:** `npm run build` (افتراضي)
   - **Install Command:** `npm install` (افتراضي)
   - **Output Directory:** `.next` (افتراضي)

2. تأكد من أن `package.json` يحتوي على:
   ```json
   {
     "scripts": {
       "postinstall": "prisma generate"
     }
   }
   ```

### 4. إعداد قاعدة البيانات

قبل النشر، تأكد من:

1. **قاعدة البيانات جاهزة:**
   ```bash
   # محلياً، قم بتشغيل:
   npx prisma generate
   npx prisma migrate deploy
   ```

2. **في Vercel، أضف Build Command مخصص:**
   - اذهب إلى **Project Settings** → **Build & Development Settings**
   - **Build Command:** `prisma generate && prisma migrate deploy && next build`

   أو أضف script في `package.json`:
   ```json
   {
     "scripts": {
       "build": "prisma generate && prisma migrate deploy && next build"
     }
   }
   ```

### 5. ملفات إضافية مطلوبة

تأكد من وجود ملف الخط العربي في `public/`:
- `NotoSansArabic-Regular.ttf` أو
- `NotoSansArabic-VariableFont_wdth,wght.ttf`

### 6. النشر

بعد إعداد جميع المتغيرات:

1. **من GitHub:**
   - أي commit جديد سيتم نشره تلقائياً
   - أو اذهب إلى Vercel Dashboard واضغط "Redeploy"

2. **من CLI:**
   ```bash
   vercel --prod
   ```

### 7. الوصول إلى لوحة الأدمن

بعد النشر:

1. اذهب إلى: `https://your-project.vercel.app/admin`
2. أدخل:
   - **Username:** `admin` (أو ما قمت بتعيينه في `ADMIN_USERNAME`)
   - **Password:** كلمة المرور التي عينتها في `ADMIN_PASSWORD`

### 8. التحقق من النشر

#### اختبار الصفحات الرئيسية:
- ✅ الصفحة الرئيسية: `https://your-project.vercel.app`
- ✅ صفحة الحجز: `https://your-project.vercel.app/book`
- ✅ صفحة البحث: `https://your-project.vercel.app/search`
- ✅ لوحة الأدمن: `https://your-project.vercel.app/admin`

#### اختبار الوظائف:
1. تسجيل الدخول إلى الأدمن
2. إنشاء slot جديد
3. عمل حجز تجريبي
4. التحقق من إرسال البريد الإلكتروني

## استكشاف الأخطاء (Troubleshooting)

### خطأ في قاعدة البيانات
- تأكد من `DATABASE_URL` صحيح
- تأكد من إضافة `?sslmode=require`
- تحقق من أن قاعدة البيانات نشطة في Neon Console

### خطأ في البناء (Build Error)
- تحقق من logs في Vercel Dashboard
- تأكد من `prisma generate` يعمل
- تأكد من أن جميع dependencies مثبتة

### خطأ في البريد الإلكتروني
- تحقق من `SMTP_*` variables
- إذا كنت تستخدم Gmail، تأكد من استخدام App Password وليس كلمة المرور العادية
- تحقق من logs في Vercel

### خطأ في PDF Generation
- تأكد من وجود ملف الخط في `public/`
- تحقق من logs في Vercel

### الأدمن لا يعمل
- تحقق من `ADMIN_PASSWORD` و `ADMIN_USERNAME` في Environment Variables
- تأكد من إعادة النشر بعد إضافة المتغيرات

## نصائح إضافية

1. **استخدام Custom Domain:**
   - في Project Settings → Domains
   - أضف domain الخاص بك

2. **Environment Variables لكل بيئة:**
   - يمكنك تعيين متغيرات مختلفة لـ Production, Preview, Development

3. **مراقبة الأخطاء:**
   - استخدم Vercel Analytics
   - تحقق من Function Logs في Dashboard

4. **الأمان:**
   - استخدم كلمات مرور قوية للأدمن
   - لا تشارك `ADMIN_PASSWORD` مع أحد
   - استخدم HTTPS دائماً (Vercel يوفره تلقائياً)

## الدعم

إذا واجهت مشاكل:
1. تحقق من [Vercel Documentation](https://vercel.com/docs)
2. تحقق من logs في Vercel Dashboard
3. تأكد من أن جميع Environment Variables مضبوطة بشكل صحيح

