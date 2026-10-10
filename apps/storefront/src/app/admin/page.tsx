"use client";

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Category = { id: string; name: string; slug: string };
type ProductVariant = { id: string; sku?: string | null; colorName?: string | null; colorHex?: string | null; sizeLabel?: string | null; price: number | string | null; stockQuantity: number | string; isActive: boolean };
type AdminProduct = { id: string; name: string; slug: string; productType: string; description?: string | null; fabricType?: string | null; basePrice: number | string; unit: string; isActive: boolean; stockQuantity: number; variants: ProductVariant[]; category?: Category | null };
type AdminOrder = { id: string; orderNumber: string; status: string; total: number | string; createdAt: string; user: { name: string; email: string; phone?: string | null }; address?: { governorate: string; city: string; addressLine: string; phone: string; recipientName: string } | null; items: { id: string; productName: string; quantity: number | string; unit: string }[] };
type ProductDraft = { name: string; slug: string; productType: string; unit: string; basePrice: string; categoryId: string; fabricType: string; description: string; imageUrl: string };
type VariantDraft = { sku: string; colorName: string; colorHex: string; sizeLabel: string; price: string; stockQuantity: string };

const labels: Record<string, string> = { fabric: 'قماش بالمتر', ready_galabiya: 'جلابية جاهزة', custom_galabiya: 'جلابية تفصيل', accessory: 'إكسسوار' };
const statusLabels: Record<string, string> = { pending: 'بانتظار المراجعة', confirmed: 'تم التأكيد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', returned: 'مرتجع' };
const defaultProduct: ProductDraft = { name: '', slug: '', productType: 'fabric', unit: 'meter', basePrice: '', categoryId: '', fabricType: '', description: '', imageUrl: '' };
const defaultVariant: VariantDraft = { sku: '', colorName: '', colorHex: '#6b705c', sizeLabel: '', price: '', stockQuantity: '1' };

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(defaultProduct);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { if (!loading && !user) router.replace('/login'); else if (!loading && user && user.role !== 'ADMIN') router.replace('/'); }, [loading, user, router]);
  const loadProducts = useCallback(async () => {
    const data = await apiRequest<AdminProduct[]>('/admin/products', { method: 'GET' });
    setProducts(data);
    setStockDrafts((old) => ({ ...old, ...Object.fromEntries(data.flatMap((product) => product.variants.map((variant) => [variant.id, String(Number(variant.stockQuantity))]))) }));
  }, []);
  const loadOrders = useCallback(async () => { setOrders(await apiRequest<AdminOrder[]>('/admin/orders', { method: 'GET' })); }, []);
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    void Promise.all([
      loadProducts().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل المنتجات.')),
      loadOrders().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل الطلبات.')),
      apiRequest<Category[]>('/categories', { method: 'GET' }).then(setCategories).catch(() => setCategories([])),
    ]);
  }, [user, loadProducts, loadOrders]);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const slug = draft.slug.trim() || `product-${Date.now().toString(36)}`;
    try {
      await apiRequest<AdminProduct>('/admin/products', { method: 'POST', body: JSON.stringify({
        name: draft.name.trim(), slug, productType: draft.productType, unit: draft.unit, basePrice: Number(draft.basePrice),
        ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
        ...(draft.fabricType.trim() ? { fabricType: draft.fabricType.trim() } : {}),
        ...(draft.description.trim() ? { description: draft.description.trim() } : {}), ...(draft.imageUrl.trim() ? { imageUrls: [draft.imageUrl.trim()] } : {}), minimumQuantity: 1,
      }) });
      setDraft(defaultProduct); setNotice('تمت إضافة المنتج. أضف اللون أو المقاس والكمية لتحديد المخزون.'); await loadProducts();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إضافة المنتج.'); }
    finally { setBusy(false); }
  }

  async function createVariant(event: FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const value = variantDrafts[productId] ?? defaultVariant;
    try {
      await apiRequest<ProductVariant>(`/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify({
        ...(value.sku.trim() ? { sku: value.sku.trim() } : {}), ...(value.colorName.trim() ? { colorName: value.colorName.trim() } : {}),
        ...(value.colorHex.trim() ? { colorHex: value.colorHex.trim() } : {}), ...(value.sizeLabel.trim() ? { sizeLabel: value.sizeLabel.trim() } : {}),
        ...(value.price.trim() ? { price: Number(value.price) } : {}), stockQuantity: Number(value.stockQuantity),
      }) });
      setVariantDrafts((old) => ({ ...old, [productId]: defaultVariant })); setNotice('تمت إضافة الاختيار وتسجيل المخزون.'); await loadProducts();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إضافة اللون أو المقاس.'); }
    finally { setBusy(false); }
  }

  async function saveStock(productId: string, variantId: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest<ProductVariant>(`/admin/products/${productId}/variants/${variantId}`, { method: 'PATCH', body: JSON.stringify({ stockQuantity: Number(stockDrafts[variantId]) }) });
      setNotice('تم تحديث المخزون.'); await loadProducts();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث المخزون.'); }
    finally { setBusy(false); }
  }

  async function archiveProduct(product: AdminProduct) {
    if (!window.confirm(`إخفاء المنتج «${product.name}» من المتجر؟`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await apiRequest(`/admin/products/${product.id}`, { method: 'DELETE' }); setNotice('تم إخفاء المنتج من المتجر.'); await loadProducts(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إخفاء المنتج.'); }
    finally { setBusy(false); }
  }

  async function changeOrderStatus(orderId: string, status: string) {
    setBusy(true); setError(''); setNotice('');
    try { await apiRequest(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); setNotice('تم تحديث حالة الطلب.'); await loadOrders(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تحديث حالة الطلب.'); }
    finally { setBusy(false); }
  }

  if (loading || !user || user.role !== 'ADMIN') return <main className="loading-shell">جارٍ التحقق من صلاحيات الإدارة...</main>;
  return <main className="page-shell admin-page">
    <div className="admin-page-head"><div><span className="eyebrow">إدارة المتجر</span><h1 className="page-title">لوحة التحكم</h1><p className="muted">أهلًا {user.name}، المنتجات والمخزون والطلبات تتدار من هنا.</p></div><div className="button-row"><Link className="button button-light" href="/">معاينة المتجر ←</Link><Link className="button button-dark" href="/admin/tailoring">طلبات التفصيل</Link></div></div>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="form-success" role="status">{notice}</div>}
    <section className="admin-section"><div className="section-head"><div><span className="eyebrow">كتالوج المتجر</span><h2>إضافة منتج</h2><p className="section-desc">بعد إضافة المنتج، أضف الألوان والمقاسات والكميات المتاحة له.</p></div><span className="pill">{products.length} منتج</span></div>
      <form className="product-admin-form" onSubmit={createProduct}>
        <label className="form-field">اسم المنتج<input required minLength={2} maxLength={160} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
        <label className="form-field">الرابط المختصر (Slug)<input placeholder="مثال: cotton-fabric-blue" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })}/><small>لو سيبته فاضي، هيتولد تلقائيًا.</small></label>
        <label className="form-field">نوع المنتج<select value={draft.productType} onChange={(event) => setDraft({ ...draft, productType: event.target.value, unit: event.target.value === 'fabric' ? 'meter' : 'piece' })}><option value="fabric">قماش بالمتر</option><option value="ready_galabiya">جلابية جاهزة</option><option value="custom_galabiya">جلابية تفصيل</option><option value="accessory">إكسسوار</option></select></label>
        <label className="form-field">السعر الأساسي (ج.م)<input type="number" required min="0" step="0.01" value={draft.basePrice} onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })}/></label>
        <label className="form-field">وحدة البيع<select value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })}><option value="meter">متر</option><option value="piece">قطعة</option></select></label>
        <label className="form-field">التصنيف<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">بدون تصنيف</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="form-field">نوع الخامة (اختياري)<input value={draft.fabricType} onChange={(event) => setDraft({ ...draft, fabricType: event.target.value })}/></label>
        <label className="form-field form-field-wide">وصف المنتج (اختياري)<textarea rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
        <label className="form-field form-field-wide">رابط صورة المنتج (اختياري)<input type="url" placeholder="https://..." value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}/><small>رفع الصور مباشرة إلى التخزين السحابي سيتم تفعيله في مرحلة لاحقة.</small></label>
        <div className="form-field product-form-submit"><span>بعد الإضافة، حدّد المخزون الفعلي لكل لون أو مقاس.</span><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ المنتج'}</button></div>
      </form>
    </section>

    <section className="admin-section"><div className="section-head"><div><span className="eyebrow">تعديل المخزون</span><h2>منتجاتك</h2></div><button className="button button-light button-small" type="button" onClick={() => void loadProducts()} disabled={busy}>تحديث القائمة ↻</button></div>
      {!products.length && <div className="empty-state"><p>لسه مفيش منتجات. ابدأ بإضافة أول منتج من النموذج اللي فوق.</p></div>}
      <div className="admin-product-list">{products.map((product) => <article className="admin-product-card" key={product.id}>
        <div className="admin-product-head"><div><span className="pill">{labels[product.productType] || product.productType}</span><h3>{product.name}</h3><p className="muted small">{product.category?.name || 'بدون تصنيف'} · {Number(product.basePrice).toLocaleString('ar-EG')} ج.م / {product.unit === 'meter' ? 'متر' : 'قطعة'}</p><p className="muted small">الرابط: <code>{product.slug}</code> · {product.isActive ? 'ظاهر في المتجر' : 'مخفي من المتجر'}</p></div><div className="admin-product-head-actions"><strong>المخزون: {Number(product.stockQuantity)}</strong>{product.isActive && <button className="text-button" type="button" onClick={() => void archiveProduct(product)} disabled={busy}>إخفاء المنتج</button>}</div></div>
        <div className="variant-list">{product.variants.map((variant) => <div className="variant-row" key={variant.id}><div className="variant-identity">{variant.colorHex && <span className="color-dot" style={{ backgroundColor: variant.colorHex }} />}{variant.colorName || 'لون غير محدد'}{variant.sizeLabel ? ` · ${variant.sizeLabel}` : ''}<small>{variant.sku || 'بدون كود'}</small></div><label className="stock-edit-label">الكمية<input type="number" min="0" step={product.unit === 'meter' ? '0.5' : '1'} value={stockDrafts[variant.id] ?? String(Number(variant.stockQuantity))} onChange={(event) => setStockDrafts({ ...stockDrafts, [variant.id]: event.target.value })}/></label><button className="button button-light button-small" type="button" onClick={() => void saveStock(product.id, variant.id)} disabled={busy}>حفظ</button></div>)}{!product.variants.length && <p className="muted small">لا توجد اختيارات مخزون لهذا المنتج بعد.</p>}</div>
        {product.isActive && <form className="variant-form" onSubmit={(event) => void createVariant(event, product.id)}><h4>إضافة لون / مقاس ومخزون</h4><div className="variant-form-grid">
          <label className="form-field">اللون<input value={(variantDrafts[product.id] ?? defaultVariant).colorName} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? defaultVariant), colorName: event.target.value } })}/></label>
          <label className="form-field">كود اللون<input type="color" value={(variantDrafts[product.id] ?? defaultVariant).colorHex} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? defaultVariant), colorHex: event.target.value } })}/></label>
          <label className="form-field">المقاس<input placeholder="مثال: XL" value={(variantDrafts[product.id] ?? defaultVariant).sizeLabel} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? defaultVariant), sizeLabel: event.target.value } })}/></label>
          <label className="form-field">SKU اختياري<input value={(variantDrafts[product.id] ?? defaultVariant).sku} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? defaultVariant), sku: event.target.value } })}/></label>
          <label className="form-field">سعر خاص (اختياري)<input type="number" min="0" step="0.01" placeholder="السعر الأساسي" value={(variantDrafts[product.id] ?? defaultVariant).price} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? defaultVariant), price: event.target.value } })}/></label>
          <label className="form-field">الكمية المتاحة<input required type="number" min="0" step={product.unit === 'meter' ? '0.5' : '1'} value={(variantDrafts[product.id] ?? defaultVariant).stockQuantity} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? defaultVariant), stockQuantity: event.target.value } })}/></label>
        </div><button className="button button-dark button-small" type="submit" disabled={busy}>إضافة الاختيار</button></form>}
      </article>)}</div>
    </section>

    <section className="admin-section"><div className="section-head"><div><span className="eyebrow">خدمة العملاء</span><h2>إدارة الطلبات</h2><p className="section-desc">تغيير الحالة إلى «ملغي» يعيد الكميات المحجوزة للمخزون تلقائيًا.</p></div><button className="button button-light button-small" type="button" onClick={() => void loadOrders()} disabled={busy}>تحديث الطلبات ↻</button></div>
      {!orders.length && <div className="empty-state"><p>لا توجد طلبات حتى الآن.</p></div>}
      <div className="admin-orders-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-head"><div><strong>طلب #{order.orderNumber}</strong><p className="muted small">{new Date(order.createdAt).toLocaleString('ar-EG')}</p></div><strong>{Number(order.total).toLocaleString('ar-EG')} ج.م</strong></div><div className="order-customer"><strong>{order.address?.recipientName || order.user.name}</strong><span>{order.user.email} · {order.address?.phone || order.user.phone || 'بدون هاتف'}</span><span>{order.address ? `${order.address.governorate}، ${order.address.city}، ${order.address.addressLine}` : 'بدون عنوان'}</span></div><div className="order-card-items">{order.items.map((item) => <span key={item.id}>{item.productName} × {Number(item.quantity)} {item.unit === 'meter' ? 'متر' : 'قطعة'}</span>)}</div><label className="order-status-control">حالة الطلب<select value={order.status} onChange={(event) => void changeOrderStatus(order.id, event.target.value)} disabled={busy}>{Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label></article>)}</div>
    </section>
    <div className="notice">الحسابات والصلاحيات يتم التحقق منها في الخادم. باقي المراحل مثل رفع الصور، أسعار الجملة، الكوبونات، واختيار شركات الشحن ستضاف بعد اختبار الكتالوج والطلبات.</div>
  </main>;
}
