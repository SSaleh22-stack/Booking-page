# إصلاح خطأ مصادقة Gmail: "Username and Password not accepted"

## المشكلة
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

## الأسباب المحتملة والحلول

### 1. استخدام كلمة المرور العادية بدلاً من App Password ❌

**المشكلة:** Gmail لا يقبل كلمة المرور العادية للتطبيقات.

**الحل:**
1. اذهب إلى [Google Account Security](https://myaccount.google.com/security)
2. تأكد من تفعيل **2-Step Verification**
3. أنشئ **App Password** جديد:
   - اذهب إلى **App passwords** (تحت 2-Step Verification)
   - اختر **Mail** و **Other (Custom name)**
   - اكتب اسم مثل "Booking System"
   - انسخ كلمة المرور المكونة من 16 حرفاً (بدون مسافات)
4. استخدم هذا App Password في `SMTP_PASS` في Vercel

### 2. App Password غير صحيح

**الحل:**
- تأكد من نسخ App Password بالكامل (16 حرفاً)
- تأكد من عدم وجود مسافات
- إذا نسيت App Password، أنشئ واحداً جديداً

### 3. لم يتم تفعيل 2-Step Verification

**الحل:**
1. اذهب إلى [Google Account Security](https://myaccount.google.com/security)
2. فعّل **2-Step Verification**
3. بعد التفعيل، ستظهر خيار **App passwords**

### 4. بيانات SMTP غير صحيحة في Vercel

**الحل:**
تحقق من متغيرات البيئة في Vercel:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-email@gmail.com
```

**ملاحظات مهمة:**
- `SMTP_USER` يجب أن يكون عنوان Gmail الكامل (مثل `example@gmail.com`)
- `SMTP_PASS` يجب أن يكون App Password (16 حرفاً بدون مسافات)
- لا تضيف علامات اقتباس حول القيم
- لا تضيف مسافات في البداية أو النهاية

### 5. حساب Gmail محظور أو مقيد

**الحل:**
- تحقق من أن حساب Gmail نشط
- تأكد من عدم وجود قيود أمنية على الحساب
- جرب إنشاء App Password جديد

## خطوات التحقق السريعة

### الخطوة 1: التحقق من 2-Step Verification
```
1. اذهب إلى: https://myaccount.google.com/security
2. تحقق من أن "2-Step Verification" مفعل
3. إذا لم يكن مفعل، فعّله أولاً
```

### الخطوة 2: إنشاء App Password جديد
```
1. في نفس الصفحة، ابحث عن "App passwords"
2. اضغط على "App passwords"
3. اختر:
   - App: Mail
   - Device: Other (Custom name)
   - Name: Booking System
4. اضغط "Generate"
5. انسخ كلمة المرور (16 حرفاً)
```

### الخطوة 3: تحديث Vercel Environment Variables
```
1. اذهب إلى Vercel Dashboard
2. اختر مشروعك → Settings → Environment Variables
3. تأكد من:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop (App Password بدون مسافات)
   SMTP_FROM=your-email@gmail.com
4. احفظ وأعد النشر
```

### الخطوة 4: اختبار الإرسال
```
1. اذهب إلى لوحة الإدارة → إعدادات البريد
2. أدخل بريدك الإلكتروني
3. اضغط على "إرسال تجريبي" لأي نوع من الرسائل
4. تحقق من وصول الرسالة
```

## مثال صحيح لـ App Password

**خطأ ❌:**
```
SMTP_PASS=abcd efgh ijkl mnop  (مع مسافات)
SMTP_PASS=my-regular-password  (كلمة المرور العادية)
```

**صحيح ✅:**
```
SMTP_PASS=abcdefghijklmnop  (16 حرفاً بدون مسافات)
```

## إذا استمرت المشكلة

### 1. جرب منفذ 465 مع SSL
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
```

### 2. تحقق من سجلات Vercel
- اذهب إلى Vercel Dashboard → Deployments → Functions → View Function Logs
- ابحث عن أخطاء مفصلة

### 3. استخدم Mailtrap للاختبار
إذا استمرت المشكلة، استخدم Mailtrap للاختبار:
```
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

## روابط مفيدة

- [Google Account Security](https://myaccount.google.com/security)
- [App Passwords Help](https://support.google.com/accounts/answer/185833)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)

