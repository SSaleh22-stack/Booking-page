# إعداد قاعدة البيانات على Vercel

## ملاحظة مهمة

**Vercel لا يوفر قاعدة بيانات مدمجة.** يجب استخدام قاعدة بيانات خارجية. هذا المشروع يستخدم **Neon PostgreSQL** (serverless database).

## الخطوات

### 1. الحصول على Connection String من Neon

إذا كان لديك حساب Neon بالفعل:

1. اذهب إلى [Neon Console](https://console.neon.tech)
2. اختر مشروعك
3. اذهب إلى **Connection Details**
4. انسخ **Connection String**
5. يجب أن يبدو هكذا:
   ```
   postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
   ```

**مهم:** تأكد من وجود `?sslmode=require` في النهاية.

### 2. إنشاء قاعدة بيانات جديدة (إذا لم يكن لديك)

إذا لم يكن لديك قاعدة بيانات Neon:

1. اذهب إلى [neon.tech](https://neon.tech)
2. سجل حساب جديد (مجاني)
3. أنشئ مشروع جديد
4. اختر المنطقة الأقرب لك
5. انسخ Connection String

### 3. إعداد قاعدة البيانات محلياً أولاً

قبل النشر على Vercel، يجب إعداد قاعدة البيانات محلياً:

```bash
# توليد Prisma Client
npx prisma generate

# تشغيل migrations لإنشاء الجداول
npx prisma migrate deploy

# (اختياري) إضافة بيانات تجريبية
npm run db:seed
```

### 4. إضافة DATABASE_URL في Vercel

بعد النشر الأول على Vercel:

1. اذهب إلى **Project Settings** في Vercel Dashboard
2. اضغط على **Environment Variables**
3. أضف متغير جديد:
   - **Name:** `DATABASE_URL`
   - **Value:** Connection String من Neon (مع `?sslmode=require`)
   - **Environment:** اختر `Production`, `Preview`, و `Development`

4. اضغط **Save**

**مثال:**
```
DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
```

### 5. إعادة النشر

بعد إضافة `DATABASE_URL`:

1. اذهب إلى **Deployments** tab
2. اضغط على **Redeploy** على آخر deployment
3. أو ادفع commit جديد إلى GitHub

### 6. التحقق من أن Migrations تعمل

المشروع معد تلقائياً لتشغيل migrations أثناء البناء:

- في `package.json`، script `build` يحتوي على:
  ```json
  "build": "prisma generate && prisma migrate deploy && next build"
  ```

هذا يعني أن Vercel سيقوم تلقائياً بـ:
1. توليد Prisma Client
2. تشغيل migrations
3. بناء Next.js app

## استخدام نفس قاعدة البيانات للتطوير والإنتاج

**نصيحة:** يمكنك استخدام نفس قاعدة البيانات للتطوير والإنتاج، أو إنشاء قاعدة بيانات منفصلة للإنتاج.

### خيار 1: قاعدة بيانات واحدة (موصى به للبداية)
- استخدم نفس `DATABASE_URL` في `.env` (محلي) و Vercel
- أبسط وأسهل
- مناسب للمشاريع الصغيرة والمتوسطة

### خيار 2: قواعد بيانات منفصلة
- قاعدة بيانات للتطوير (في `.env` محلي)
- قاعدة بيانات للإنتاج (في Vercel Environment Variables)
- أفضل للمشاريع الكبيرة

## Connection Pooling

Neon يوفر Connection Pooling تلقائياً. إذا كان connection string يحتوي على `-pooler` في الاسم، فهو يستخدم pooling.

**مثال:**
```
postgresql://user:password@ep-xxxxx-pooler.region.aws.neon.tech/dbname?sslmode=require
```

Connection Pooling مهم للإنتاج لأنه:
- يقلل عدد الاتصالات
- يحسن الأداء
- يقلل استهلاك الموارد

## استكشاف الأخطاء

### خطأ: "Can't reach database server"
- تحقق من أن `DATABASE_URL` صحيح في Vercel
- تأكد من وجود `?sslmode=require`
- تحقق من أن قاعدة البيانات نشطة في Neon Console

### خطأ: "Migration failed"
- تحقق من logs في Vercel
- تأكد من أن migrations موجودة في `prisma/migrations/`
- تأكد من أن `prisma generate` يعمل

### خطأ: "Prisma Client not generated"
- تأكد من أن `postinstall` script موجود في `package.json`:
  ```json
  "postinstall": "prisma generate"
  ```

### خطأ: "Connection timeout"
- تحقق من أن قاعدة البيانات نشطة في Neon
- جرب استخدام connection string مع `-pooler`
- تحقق من إعدادات Firewall في Neon (إذا كان متاحاً)

## التحقق من أن قاعدة البيانات تعمل

بعد النشر:

1. اذهب إلى لوحة الأدمن: `https://your-project.vercel.app/admin`
2. سجل الدخول
3. حاول إنشاء Exam Slot جديد
4. إذا نجح، فقاعدة البيانات تعمل بشكل صحيح

## نصائح للإنتاج

1. **استخدم Connection Pooling:**
   - استخدم connection string مع `-pooler`

2. **راقب الاستخدام:**
   - تحقق من Neon Console لمراقبة الاستخدام
   - Neon Free tier يوفر 0.5 GB storage و 192 MB compute

3. **Backup:**
   - Neon يوفر backup تلقائي
   - يمكنك إنشاء manual backup من Neon Console

4. **الأمان:**
   - لا تشارك `DATABASE_URL` مع أحد
   - استخدم Environment Variables في Vercel فقط
   - لا ترفع `.env` إلى GitHub

## ملخص سريع

1. ✅ احصل على Connection String من Neon
2. ✅ أضف `DATABASE_URL` في Vercel Environment Variables
3. ✅ أعد النشر
4. ✅ تحقق من أن لوحة الأدمن تعمل

## الدعم

- [Neon Documentation](https://neon.tech/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

