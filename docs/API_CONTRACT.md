# عقد API أولي

كل المسارات أدناه مقترحة؛ لا تُعتبر منفذة حتى تُكتب وتُختبر.

## Auth
- `POST /auth/register` — إنشاء حساب customer فقط.
- `POST /auth/login` — تسجيل الدخول.
- `POST /auth/logout` — إنهاء الجلسة.
- `POST /auth/verify-email` — التحقق من البريد.
- `POST /auth/forgot-password` — بدء استعادة كلمة المرور.
- `POST /auth/reset-password` — تعيين كلمة مرور جديدة.
- `GET /auth/me` — الهوية والدور الحاليين.

## Catalog
- `GET /products` — بحث وفلاتر ضمن جلسة مستخدم مصادق عليها.
- `GET /products/:slug` — تفاصيل المنتج والمتغيرات والأسعار التي يحق للمستخدم رؤيتها.
- `POST /admin/products` — إنشاء منتج (admin فقط).
- `PATCH /admin/products/:id` — تعديل منتج (admin فقط).
- `DELETE /admin/products/:id` — تعطيل/حذف منطقي وفق سياسة البيانات (admin فقط).

## Inventory
- `GET /admin/inventory` — عرض المخزون (admin فقط).
- `POST /admin/inventory/movements` — إضافة حركة مخزون موثقة (admin فقط).

## Orders
- `POST /cart/checkout` — إعادة تسعير السلة والتحقق من المخزون والشحن من الخادم وإنشاء الطلب.
- `GET /orders` — طلبات المستخدم الحالي فقط.
- `GET /orders/:orderNumber` — طلب يخص المستخدم الحالي، أو وصول إداري مخول.
- `POST /orders/:orderNumber/cancel` — إلغاء وفق حالة الطلب والسياسة.

## Wholesale
- `POST /wholesale/request` — تقديم طلب اعتماد تاجر.
- `GET /admin/wholesale/requests` — قائمة الطلبات للإدارة.
- `PATCH /admin/wholesale/requests/:id` — قبول/رفض بواسطة admin فقط.
- `POST /wholesale/quotations` — طلب عرض سعر أو استكماله وفق حالة الحساب.

## Tailoring
- `POST /tailoring/requests` — إرسال متطلبات التفصيل.
- `GET /tailoring/requests` — طلبات المستخدم الحالي.
- `PATCH /admin/tailoring/requests/:id/quote` — تسجيل عرض سعر وموعد متوقع (admin فقط).
- `POST /tailoring/requests/:id/approve-quote` — موافقة العميل على السعر.

## قواعد عامة

- كل مدخلات API تُتحقق منها على الخادم.
- كل مسارات `/admin/*` تتطلب جلسة صالحة ودور `admin`.
- لا يُقبل `user_id` من العميل لتحديد ملكية الطلب؛ يؤخذ المستخدم الحالي من الجلسة.
- لا يُقبل السعر النهائي أو الخصم أو الدور من المتصفح كقيم موثوقة.
- صيغة الخطأ والاستجابة النهائية تُعتمد أثناء تنفيذ أول وحدة.
