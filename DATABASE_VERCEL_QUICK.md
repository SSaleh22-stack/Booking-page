# قاعدة البيانات على Vercel - ملخص سريع

## المعلومة الأساسية

**Vercel لا يوفر قاعدة بيانات.** يجب استخدام قاعدة بيانات خارجية. هذا المشروع يستخدم **Neon PostgreSQL**.

## الخطوات السريعة

### 1. احصل على Connection String من Neon
- اذهب إلى [console.neon.tech](https://console.neon.tech)
- انسخ Connection String
- يجب أن يحتوي على `?sslmode=require`

### 2. أضف DATABASE_URL في Vercel
1. Vercel Dashboard → Project Settings → Environment Variables
2. أضف:
   ```
   DATABASE_URL=your-neon-connection-string
   ```
3. اختر: Production, Preview, Development
4. Save

### 3. أعد النشر
- اضغط Redeploy في Vercel
- أو ادفع commit جديد

## ✅ تم!

المشروع معد تلقائياً لتشغيل migrations أثناء البناء.

## 📚 للمزيد
راجع `VERCEL_DATABASE_SETUP.md` للتفاصيل الكاملة.

