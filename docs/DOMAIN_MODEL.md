# نموذج المجال وقاعدة البيانات

هذا نموذج أولي منطقي، وليس migrations نهائية. تُحدد الحقول الدقيقة والقيود والفهارس أثناء تنفيذ كل وحدة.

## الهوية والصلاحيات

### `users`
- `id` UUID PK
- `name`
- `email` unique, normalized
- `phone`
- `password_hash`
- `role` enum: `customer`, `admin`
- `email_verified_at` nullable
- `status` enum: `pending_verification`, `active`, `suspended`
- `created_at`, `updated_at`

### `password_reset_tokens` / `email_verification_tokens`
تخزن بصمات الرموز وتاريخ انتهاء الاستخدام، لا الرموز الخام طويلة العمر.

### `wholesale_profiles`
- `id`, `user_id` FK unique
- `business_name`, `business_type`, `tax_or_business_reference` nullable وفق الحاجة القانونية
- `status`: `not_requested`, `pending`, `approved`, `rejected`, `suspended`
- `reviewed_by`, `reviewed_at`, `admin_notes`

## الكتالوج والأسعار

### `categories`
- `id`, `name`, `slug`, `parent_id` nullable, `sort_order`, `is_active`

### `products`
- `id`, `category_id`, `product_type`: `fabric`, `ready_galabiya`, `custom_galabiya`
- `name`, `slug`, `description`, `is_active`, `created_at`, `updated_at`

### `product_variants`
- `id`, `product_id`, `sku` unique, `color`, `size` nullable, `attributes_json`
- `unit`: `meter` أو `piece` أو وحدة معلنة أخرى
- `min_order_quantity`, `quantity_step`, `is_active`

### `product_images`
- `id`, `product_id`, `variant_id` nullable, `storage_key`, `alt_text`, `sort_order`

### `price_lists` / `price_rules`
تمثل أسعار البيع حسب نوع قائمة السعر (retail/wholesale)، والكمية الدنيا والقصوى عند الحاجة، وتاريخ السريان وحالة التفعيل. يجب أن تكون القواعد غير متعارضة أو تُحدد أولوية واضحة لها.

## المخزون

### `warehouses`
- `id`, `name`, `location_text`, `is_active`

### `inventory`
- `id`, `warehouse_id`, `variant_id`, `on_hand`, `reserved`
- قيد فريد على `(warehouse_id, variant_id)` مع منع القيم السالبة.

### `stock_movements`
- `id`, `warehouse_id`, `variant_id`, `movement_type`, `quantity`, `reference_type`, `reference_id`, `created_by`, `created_at`, `note`

## السلة والطلبات

### `carts`, `cart_items`
السلة مرتبطة بالمستخدم، وكل بند يخزن المتغير والكمية. تُراجع الأسعار من الخادم عند القراءة وإتمام الطلب.

### `orders`
- `id`, `order_number` unique, `user_id`, `status`
- `subtotal`, `discount_total`, `shipping_total`, `grand_total`, `currency`
- `shipping_address_snapshot`, `customer_note`, timestamps

### `order_items`
- `id`, `order_id`, `product_id` nullable للمحافظة على السجل
- `variant_id` nullable، `product_name_snapshot`, `sku_snapshot`, `unit_snapshot`
- `quantity`, `unit_price`, `discount_amount`, `line_total`, `attributes_snapshot`

### `order_status_history`
يسجل الحالات السابقة والجديدة، من غيّرها، التوقيت والملاحظة.

## التفصيل

### `tailoring_orders`
- `id`, `order_id` nullable حتى تأكيد الطلب حسب التدفق
- `user_id`, `design_product_id` nullable, `fabric_variant_id` nullable
- `reference_image_key` nullable, `notes`, `status`, `quoted_price`, `quoted_delivery_date`, `customer_approved_at`

### `measurements`
- `id`, `tailoring_order_id`, `measurement_name`, `measurement_value`, `unit`, `version`, `recorded_at`

### `tailoring_events`
- `id`, `tailoring_order_id`, `status`, `note`, `created_by`, `created_at`

## الدفع والشحن والتسويق

- `payments`: `id`, `order_id`, `provider`, `provider_reference`, `amount`, `currency`, `status`, `idempotency_key`, timestamps.
- `shipments`: `id`, `order_id`, `carrier`, `tracking_number`, `status`, `shipping_fee`, timestamps.
- `refunds`: `id`, `payment_id`, `amount`, `reason`, `status`, timestamps.
- `addresses`: عناوين محفوظة للمستخدم؛ يؤخذ snapshot إلى الطلب عند إتمامه.
- `coupons`, `coupon_redemptions`: شروط الصلاحية والاستخدام.
- `reviews`: مقيدة بمنتجات اشتراها المستخدم وفق سياسة المتجر.
- `notifications`: حالة إرسال الإشعارات.
- `audit_logs`: المستخدم الإداري والفعل ونوع المورد ومعرفه والوقت والبيانات اللازمة للتدقيق دون أسرار.

## العلاقات الرئيسية

- مستخدم واحد يمكنه امتلاك طلبات كثيرة.
- المنتج يمتلك متغيرات متعددة، ولكل متغير رصيد لكل مخزن.
- الطلب يحتوي بنودًا متعددة، وله سجلات مستقلة للدفع والشحن والحالة.
- ملف الجملة واحد لكل مستخدم، وحالته هي التي تسمح بتطبيق أسعار الجملة.
- طلب التفصيل يحفظ نسخة المقاسات والسعر والتصميم المعتمد بدل الاعتماد على بيانات قابلة للتغيير في المنتج الحالي.
