"use client";

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';
import { addCartItem } from '@/lib/cart';

type ProductVariant = { id: string; sku?: string | null; colorName?: string | null; colorHex?: string | null; sizeLabel?: string | null; price: number | string | null; stockQuantity: number | string; isActive: boolean };
type StoreProduct = { id: string; name: string; slug: string; productType: string; description?: string | null; fabricType?: string | null; season?: string | null; basePrice: number | string; unit: 'meter' | 'piece'; minimumQuantity: number | string; stockQuantity: number; images: { imageUrl: string; altText?: string | null }[]; variants: ProductVariant[]; category?: { name: string } | null };

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void apiRequest<StoreProduct>(`/products/${encodeURIComponent(slug)}`, { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setQuantity(Number(data.minimumQuantity) || 1);
        const firstAvailable = data.variants.find((variant) => Number(variant.stockQuantity) > 0);
        setSelectedVariantId(firstAvailable?.id ?? '');
      })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'تعذر تحميل المنتج.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!user || !product?.id) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    const productId = product.id;
    void apiRequest<{ productId: string }[]>('/favorites')
      .then((items) => { if (!cancelled) setIsFavorite(items.some((item) => item.productId === productId)); })
      .catch(() => { if (!cancelled) setIsFavorite(false); });
    return () => { cancelled = true; };
  }, [user, product?.id]);

  const selectedVariant = useMemo(() => product?.variants.find((variant) => variant.id === selectedVariantId) ?? null, [product, selectedVariantId]);
  const price = product ? Number(selectedVariant?.price ?? product.basePrice) : 0;
  const stock = selectedVariant ? Number(selectedVariant.stockQuantity) : 0;
  const needsVariant = Boolean(product && product.productType !== 'custom_galabiya');
  const canAdd = Boolean(product && (!needsVariant || (selectedVariant && stock >= quantity)) && quantity >= Number(product.minimumQuantity));

  if (busy) return <main className="loading-shell">جارٍ تحميل تفاصيل المنتج...</main>;
  if (!product) return <main className="page-shell"><div className="empty-state"><h1>المنتج غير متاح</h1><p>{error || 'المنتج الذي تبحث عنه غير موجود حاليًا.'}</p><Link className="button button-dark" href="/">العودة للمتجر</Link></div></main>;

  async function toggleFavorite() {
    if (!product) return;
    if (!user) {
      const next = typeof window === 'undefined' ? '/' : window.location.pathname;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setFavoriteBusy(true);
    setError('');
    try {
      if (isFavorite) {
        await apiRequest('/favorites/' + encodeURIComponent(product.id), { method: 'DELETE' });
        setIsFavorite(false);
      } else {
        await apiRequest('/favorites/' + encodeURIComponent(product.id), { method: 'POST', body: '{}' });
        setIsFavorite(true);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحديث المفضلة.');
    } finally {
      setFavoriteBusy(false);
    }
  }

  function handleAddToCart() {
    if (!product || !canAdd) return;
    addCartItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      unit: product.unit,
      unitPrice: price,
      quantity,
      ...(selectedVariant ? { variantId: selectedVariant.id, variantLabel: [selectedVariant.colorName, selectedVariant.sizeLabel].filter(Boolean).join(' - ') || undefined } : {}),
      ...(product.images[0]?.imageUrl ? { imageUrl: product.images[0].imageUrl } : {}),
    });
    setAdded(true);
    router.push('/cart');
  }

  return <main className="page-shell product-detail-page">
    <div className="breadcrumbs"><Link href="/">الرئيسية</Link><span>←</span><span>{product.name}</span></div>
    <div className="product-detail-grid">
      <div className="product-detail-photo">{product.images[0]?.imageUrl ? <img src={product.images[0].imageUrl} alt={product.images[0].altText || product.name}/> : <div className={`detail-swatch ${product.productType === 'ready_galabiya' ? 'dark' : ''}`}/>}</div>
      <section className="product-detail-info">
        <span className="eyebrow">{product.category?.name || ({fabric:'أقمشة بالمتر',ready_galabiya:'جلابيب جاهزة',custom_galabiya:'تفصيل حسب الطلب'} as Record<string,string>)[product.productType] || 'منتج من Samaan'}</span>
        <h1>{product.name}</h1>
        <p className="muted">{product.description || product.fabricType || 'اختار اللون أو المقاس المناسب قبل الإضافة للسلة.'}</p>
        {product.fabricType && <p className="detail-meta"><strong>الخامة:</strong> {product.fabricType}</p>}
        {product.season && <p className="detail-meta"><strong>الموسم:</strong> {({summer:'صيفي',winter:'شتوي',all_season:'طوال السنة'} as Record<string,string>)[product.season] || product.season}</p>}
        <div className="detail-price">{price.toLocaleString('ar-EG')} ج.م <small>/ {product.unit === 'meter' ? 'متر' : 'قطعة'}</small></div>
        {needsVariant && <div className="form-field"><label htmlFor="variant">اختار اللون / المقاس</label><select id="variant" value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)}><option value="">اختار المتاح</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id} disabled={Number(variant.stockQuantity) <= 0}>{[variant.colorName, variant.sizeLabel].filter(Boolean).join(' - ') || 'اختيار بدون وصف'}{Number(variant.stockQuantity) <= 0 ? ' — نفد المخزون' : ` — متاح ${Number(variant.stockQuantity)}`}</option>)}</select></div>}
        <div className="form-field quantity-field"><label htmlFor="quantity">الكمية ({product.unit === 'meter' ? 'بالمتر' : 'بالقطعة'})</label><input id="quantity" type="number" min={Number(product.minimumQuantity)} step={product.unit === 'meter' ? '0.5' : '1'} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/><small>أقل كمية للشراء: {Number(product.minimumQuantity)} {product.unit === 'meter' ? 'متر' : 'قطعة'}</small></div>
        {needsVariant && selectedVariant && <p className={stock > 0 ? 'stock-note' : 'form-error'}>{stock > 0 ? `المتاح حاليًا: ${stock} ${product.unit === 'meter' ? 'متر' : 'قطعة'}` : 'الاختيار ده نفد من المخزون.'}</p>}
        {needsVariant && !selectedVariant && <p className="stock-note">حدد لونًا أو مقاسًا متاحًا لإكمال الشراء.</p>}
        {error && <div className="form-error">{error}</div>}
        {added && <div className="form-success">تمت الإضافة إلى السلة.</div>}
        <div className="button-row">
          <button type="button" className="button button-dark detail-add-button" onClick={handleAddToCart} disabled={!canAdd}>أضف إلى السلة</button>
          <button type="button" className="button button-light detail-add-button" onClick={() => void toggleFavorite()} disabled={favoriteBusy}>{favoriteBusy ? 'جارٍ الحفظ...' : isFavorite ? 'إزالة من المفضلة' : 'أضف إلى المفضلة ♡'}</button>
        </div>
        {product.productType === 'custom_galabiya' && <Link className="inline-link detail-back-link" href={`/tailoring?productId=${encodeURIComponent(product.id)}`}>اطلب تفصيل هذا الموديل ←</Link>}
        <Link className="inline-link detail-back-link" href="/">العودة لمتابعة التسوق</Link>
      </section>
    </div>
  </main>;
}
