# Samaan API

NestJS API للمصادقة، المنتجات، المخزون، والطلبات. جميع المسارات الخاصة تتطلب Cookie جلسة صادرة من الخادم؛ ومسارات إدارة المنتجات والطلبات تتحقق من دور `ADMIN` في الـ API.

## تشغيل محلي

من جذر المشروع، بعد ضبط `.env` بقيم اتصال Supabase الفعلية:

```powershell
npm install
npm run db:generate
npm run db:validate
npm run admin:create
npm run dev:api
```

المخطط الموجود على Supabase مُجهز مسبقًا. لا تستخدم `prisma migrate dev` على قاعدة البيانات الحالية؛ تغييرات قاعدة البيانات تُحفظ كترحيلات SQL داخل `supabase/migrations`.

## المسارات الأساسية

- `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/products`, `GET /api/products/:slug`
- `GET /api/categories`
- `GET/POST /api/admin/products`, `PATCH/DELETE /api/admin/products/:id`
- `POST /api/admin/products/:productId/variants`, `PATCH /api/admin/products/:productId/variants/:variantId`
- `POST /api/orders`, `GET /api/orders/mine`
- `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status`

السعر النهائي وتوفر المخزون يعاد التحقق منهما في الخادم عند إنشاء الطلب؛ ولا يعتمد الخادم على السعر المرسل من المتصفح.
