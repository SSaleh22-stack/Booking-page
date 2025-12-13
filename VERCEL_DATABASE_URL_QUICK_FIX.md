# إصلاح سريع: DATABASE_URL يجب أن يبدأ بـ postgresql://

## المشكلة
```
Error: the URL must start with the protocol `postgresql://` or `postgres://`
```

## الحل السريع

### في Vercel Environment Variables:

1. **احذف** `DATABASE_URL` الموجود (إذا كان موجوداً)

2. **أضف** `DATABASE_URL` جديد:
   - **Name:** `DATABASE_URL`
   - **Value:** `postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require`
   - **مهم:** لا تضيف علامات اقتباس `"` حول القيمة
   - **مهم:** لا تضيف مسافات في البداية أو النهاية
   - **مهم:** يجب أن تبدأ القيمة بـ `postgresql://`

3. **احفظ** وأعد النشر

### مثال صحيح:
```
DATABASE_URL=postgresql://neondb_owner:password@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

### مثال خاطئ ❌:
```
DATABASE_URL="postgresql://..."  (مع علامات اقتباس)
DATABASE_URL= postgresql://...  (مع مسافة في البداية)
```

راجع `VERCEL_DATABASE_URL_FIX.md` للتفاصيل الكاملة.

