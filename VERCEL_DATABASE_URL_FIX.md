# إصلاح خطأ DATABASE_URL في Vercel

## المشكلة

```
Error: the URL must start with the protocol `postgresql://` or `postgres://`
```

هذا يعني أن `DATABASE_URL` في Vercel إما:
- فارغ
- لا يبدأ بـ `postgresql://` أو `postgres://`
- يحتوي على مسافات إضافية
- غير صحيح

## الحل خطوة بخطوة

### 1. تحقق من Connection String من Neon

1. اذهب إلى [console.neon.tech](https://console.neon.tech)
2. اختر مشروعك
3. اضغط على **Connection Details**
4. انسخ **Connection String** (يجب أن يبدأ بـ `postgresql://`)

**مثال صحيح:**
```
postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
```

### 2. أضف DATABASE_URL في Vercel بشكل صحيح

1. اذهب إلى **Vercel Dashboard**
2. اختر مشروعك
3. اضغط على **Settings**
4. اضغط على **Environment Variables**

5. **تحقق من DATABASE_URL الموجود:**
   - إذا كان موجوداً، **احذفه** وأضفه مرة أخرى
   - تأكد من عدم وجود مسافات قبل أو بعد القيمة

6. **أضف DATABASE_URL جديد:**
   - **Name:** `DATABASE_URL` (بالضبط، بدون مسافات)
   - **Value:** الصق Connection String من Neon (يجب أن يبدأ بـ `postgresql://`)
   - **Environment:** اختر:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

7. **مهم جداً:**
   - لا تضيف علامات اقتباس `"` حول القيمة
   - لا تضيف مسافات في البداية أو النهاية
   - تأكد من أن القيمة تبدأ بـ `postgresql://`

### 3. مثال على القيمة الصحيحة

**في Vercel Environment Variables:**

```
Name: DATABASE_URL
Value: postgresql://neondb_owner:password@ep-wild-grass-agsojd03-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**❌ خطأ - لا تفعل هذا:**
```
Value: "postgresql://..."  (مع علامات اقتباس)
Value:  postgresql://...   (مع مسافات في البداية)
Value: postgresql://...    (مع مسافات في النهاية)
```

**✅ صحيح:**
```
Value: postgresql://neondb_owner:password@ep-wild-grass-agsojd03-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 4. بعد إضافة/تحديث DATABASE_URL

1. **احفظ** التغييرات
2. اذهب إلى **Deployments**
3. اضغط على **Redeploy** على آخر deployment
4. أو ادفع commit جديد إلى GitHub

### 5. التحقق من أن القيمة صحيحة

بعد إعادة النشر، تحقق من Logs في Vercel:
1. اذهب إلى **Deployments**
2. اضغط على آخر deployment
3. اضغط على **Build Logs**
4. ابحث عن `prisma generate` - يجب أن يعمل بدون أخطاء

## استكشاف الأخطاء

### إذا استمر الخطأ:

1. **تحقق من القيمة في Vercel:**
   - اذهب إلى Environment Variables
   - انسخ القيمة وافتحها في محرر نصوص
   - تأكد من أنها تبدأ بـ `postgresql://`
   - تأكد من عدم وجود مسافات أو أحرف غريبة

2. **جرب حذف وإعادة إضافة:**
   - احذف `DATABASE_URL` من Vercel
   - أضفه مرة أخرى من جديد
   - تأكد من نسخه بشكل صحيح من Neon

3. **تحقق من Connection String في Neon:**
   - اذهب إلى Neon Console
   - تأكد من أن Connection String يبدأ بـ `postgresql://`
   - إذا كان يبدأ بشيء آخر، استخدم Connection String آخر من Neon

4. **تحقق من جميع البيئات:**
   - تأكد من إضافة `DATABASE_URL` في:
     - Production
     - Preview
     - Development

## نصيحة

إذا كنت تستخدم Connection String مع `-pooler`، تأكد من أنه يبدأ بـ `postgresql://`:

```
✅ صحيح: postgresql://user:password@ep-xxxxx-pooler.region.aws.neon.tech/dbname?sslmode=require
```

## الدعم

إذا استمرت المشكلة:
1. تحقق من [Vercel Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
2. تحقق من [Neon Documentation](https://neon.tech/docs)
3. تأكد من نسخ Connection String بشكل صحيح من Neon Console

