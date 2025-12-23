# إصلاح خطأ البناء على Vercel - DATABASE_URL

## المشكلة

عند النشر على Vercel، قد تحصل على الخطأ التالي:

```
Error: Environment variable not found: DATABASE_URL.
```

## الحل

**يجب إضافة `DATABASE_URL` في Vercel Environment Variables قبل البناء.**

### الخطوات:

1. **اذهب إلى Vercel Dashboard:**
   - افتح مشروعك في [vercel.com](https://vercel.com)
   - اضغط على **Settings**
   - اضغط على **Environment Variables**

2. **أضف DATABASE_URL:**
   - **Name:** `DATABASE_URL`
   - **Value:** Connection String من Neon (يجب أن يحتوي على `?sslmode=require`)
   - **Environment:** اختر:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development

3. **احفظ:**
   - اضغط **Save**

4. **أعد النشر:**
   - اذهب إلى **Deployments**
   - اضغط **Redeploy** على آخر deployment
   - أو ادفع commit جديد إلى GitHub

## مثال على DATABASE_URL

```
DATABASE_URL=postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
```

## ملاحظات مهمة

- ⚠️ **يجب إضافة `DATABASE_URL` قبل أول بناء**
- ⚠️ **تأكد من وجود `?sslmode=require` في النهاية**
- ⚠️ **بعد إضافة المتغير، يجب إعادة النشر**

## إذا استمرت المشكلة

1. تحقق من أن `DATABASE_URL` موجود في **جميع البيئات** (Production, Preview, Development)
2. تحقق من أن Connection String صحيح من Neon Console
3. تأكد من إعادة النشر بعد إضافة المتغير
4. تحقق من Logs في Vercel Dashboard لرؤية الخطأ الكامل

## الحصول على Connection String من Neon

1. اذهب إلى [console.neon.tech](https://console.neon.tech)
2. اختر مشروعك
3. اضغط على **Connection Details**
4. انسخ **Connection String**
5. تأكد من وجود `?sslmode=require` في النهاية




