"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';
import { ProductQuickActions } from '@/components/ProductQuickActions';

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  productType: string;
  description?: string | null;
  fabricType?: string | null;
  basePrice: number | string;
  unit: 'meter' | 'piece';
  stockQuantity?: number;
  isFeatured: boolean;
  images: { imageUrl: string; altText?: string | null }[];
  categoryId?: string | null;
  category?: { id: string; name: string; parentId?: string | null } | null;
};
type StoreCategory = { id: string; name: string; slug: string; parentId?: string | null; productType?: string | null; parent?: { id: string; name: string; productType?: string | null } | null };

const typeLabel: Record<string, string> = {
  fabric: 'قماش بالمتر', ready_galabiya: 'جلابية جاهزة', custom_galabiya: 'تفصيل حسب الطلب', accessory: 'إكسسوارات',
};

export default function HomePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<StoreCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<StoreCategory[]>('/categories')
      .then((data) => { if (!cancelled) setCategories(data); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true); setProductsError('');
    const query = new URLSearchParams({ limit: '100' });
    if (search.trim()) query.set('search', search.trim());
    if (productType) query.set('productType', productType);
    if (categoryId) query.set('categoryId', categoryId);
    void apiRequest<StoreProduct[]>(`/products?${query.toString()}`, { method: 'GET' })
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch((error: unknown) => { if (!cancelled) setProductsError(error instanceof Error ? error.message : 'تعذر تحميل المنتجات.'); })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [search, productType, categoryId]);

  return <main>
    <section className="hero">
      <div><span className="eyebrow">من الخامة للتفصيلة الأخيرة</span><h1>قماش يليق بذوقك،<br/><span>وجلّابية على مقاسك.</span></h1><p>اكتشف تشكيلة الأقمشة بالمتر والجلاليب الجاهزة، أو اطلب جلابية بتفاصيلك ومقاساتك. خيارات للأفراد وتجار الجملة في مكان واحد.</p><div className="button-row"><a className="button button-dark" href="#products">تصفح المنتجات <span aria-hidden="true"> ←</span></a><Link className="button button-light" href="/tailoring">اطلب تفصيل جلابية</Link></div></div>
      <div className="hero-art" aria-label="تصميم توضيحي لأقمشة بألوان طبيعية"><div className="fabric-stack"><div className="fabric"/><div className="fabric"/><div className="fabric"/><div className="fabric"/></div><div className="thread-card">اختيارات بخامة مميزة<strong>جودة تبدأ من النسيج</strong></div></div>
    </section>
    <section className="section" id="fabrics"><div className="section-head"><div><span className="eyebrow">تسوّق حسب احتياجك</span><h2>اختار منين تبدأ</h2><p className="section-desc">كل احتياجات القماش والجلابية في تجربة واحدة.</p></div>{user?.role === 'ADMIN' && <Link className="button button-light" href="/admin">إدارة المتجر ←</Link>}</div>
      <div className="category-grid"><a className="category-card" href="#products"><div className="category-icon">▤</div><div><h3>أقمشة بالمتر</h3><p>خامات وألوان تناسب كل موسم.</p></div><span className="arrow">←</span></a><a className="category-card" href="#products"><div className="category-icon">♧</div><div><h3>جلابيب جاهزة</h3><p>اختار الموديل والمقاس واللون.</p></div><span className="arrow">←</span></a><Link className="category-card" href="/tailoring"><div className="category-icon">✂</div><div><h3>تفصيل حسب الطلب</h3><p>تفاصيلك ومقاساتك في طلب واحد.</p></div><span className="arrow">←</span></Link></div>
    </section>
    <section className="section" id="products"><div className="section-head"><div><span className="eyebrow">اكتشف التشكيلة</span><h2>منتجات المتجر</h2><p className="section-desc">المنتجات المعروضة تُحمّل مباشرة من قاعدة البيانات.</p></div>{user?.role === 'ADMIN' && <Link className="button button-light" href="/admin">إضافة منتج جديد</Link>}</div>
      <form className="catalog-filters" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput); }}><label className="form-field"><span>ابحث عن منتج</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="اسم المنتج أو نوع الخامة" /></label><label className="form-field"><span>التصنيف</span><select value={productType} onChange={(event) => { setProductType(event.target.value); setCategoryId(""); }}><option value="">كل الأنواع</option><option value="fabric">أقمشة بالمتر</option><option value="ready_galabiya">جلابيب جاهزة</option><option value="custom_galabiya">تفصيل حسب الطلب</option><option value="accessory">إكسسوارات</option></select></label><label className="form-field"><span>الفئة / النوع</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">كل الفئات</option>{categories.filter((category) => !productType || !category.productType || category.productType === productType).map((category) => <option key={category.id} value={category.id}>{category.parentId ? "— " : ""}{category.name}</option>)}</select></label><button className="button button-dark" type="submit">بحث</button><button className="button button-light" type="button" onClick={() => { setSearchInput(''); setSearch(''); setProductType(''); setCategoryId(''); }}>مسح الفلاتر</button></form>
      {productsLoading && <div className="loading-inline">جارٍ تحميل المنتجات...</div>}
      {productsError && <div className="form-error">{productsError}</div>}
      {!productsLoading && !productsError && products.length === 0 && <div className="empty-state"><h3>لسه مفيش منتجات معروضة</h3><p>بعد ما المدير يضيف أول منتج ويحدد السعر والمخزون، هيظهر هنا.</p>{user?.role === 'ADMIN' && <Link className="button button-dark" href="/admin">إضافة أول منتج</Link>}</div>}
      {products.length > 0 && <div className="feature-grid">{products.map((product) => <article className="demo-product product-card" key={product.id}><ProductQuickActions product={product} onChanged={() => window.location.reload()} /><Link href={`/products/${encodeURIComponent(product.slug)}`} className="product-photo">{product.images[0]?.imageUrl ? <img src={product.images[0].imageUrl} alt={product.images[0].altText || product.name}/> : <div className={`demo-swatch ${product.productType === 'ready_galabiya' ? 'dark' : ''}`}/>}</Link><span className="pill">{typeLabel[product.productType] ?? product.productType}</span><h3><Link href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link></h3><p className="section-desc">{product.fabricType || product.description || 'تفاصيل المنتج متاحة داخل صفحة المنتج.'}</p><div className="product-card-bottom"><strong>{Number(product.basePrice).toLocaleString('ar-EG')} ج.م / {product.unit === 'meter' ? 'متر' : 'قطعة'}</strong><Link className="button button-light button-small" href={`/products/${encodeURIComponent(product.slug)}`}>التفاصيل ←</Link></div></article>)}</div>}
    </section>
    <section className="band"><div><h2>بتشتري بالجملة؟</h2><p>طلب أسعار الجملة حسب الكمية هيتاح ضمن خطوات إتمام الطلب.</p></div><Link className="button" href="/account">عرض حسابي ←</Link></section>
  </main>;
}
