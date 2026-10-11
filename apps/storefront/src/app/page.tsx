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
  fabric: 'أقمشة بالمتر',
  ready_galabiya: 'جلابيب جاهزة',
  custom_galabiya: 'تفصيل حسب الطلب',
  accessory: 'إكسسوارات',
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
    setProductsLoading(true);
    setProductsError('');
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

  function chooseType(type: string) {
    setProductType(type);
    setCategoryId('');
  }

  return (
    <main className="store-home">
      <section className="hero hero-premium">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="hero-kicker-dot" /> أناقة تبدأ من الخامة</div>
          <h1>اختار خامتك،<br /><span>وخلي ذوقك يتكلم.</span></h1>
          <p>أقمشة مختارة، جلاليب جاهزة، وتفصيل حسب المقاس. تجربة تسوّق بسيطة تجمع التفاصيل اللي تهمك في مكان واحد.</p>
          <div className="button-row hero-buttons">
            <a className="button button-dark" href="#products">اكتشف التشكيلة <span aria-hidden="true"> ←</span></a>
            <Link className="button button-light" href="/tailoring">صمّم جلابيتك</Link>
          </div>
          <div className="hero-proof-row" aria-label="مميزات المتجر">
            <span><b>01</b> أقمشة بالمتر</span>
            <span><b>02</b> موديلات جاهزة</span>
            <span><b>03</b> تفصيل حسب الطلب</span>
          </div>
        </div>
        <div className="hero-art" role="img" aria-label="تصميم تجريدي لطبقات أقمشة بألوان راقية">
          <div className="hero-art-ring" />
          <div className="fabric-stack">
            <div className="fabric fabric-ivory" />
            <div className="fabric fabric-forest" />
            <div className="fabric fabric-copper" />
            <div className="fabric fabric-sand" />
          </div>
          <div className="hero-edition"><span>THE SAMAAN EDIT</span><strong>تفاصيل تصنع الفرق</strong><small>اختيارات منسّقة لذوقك</small></div>
          <div className="hero-seal"><span>خامة</span><strong>تليق بك</strong></div>
        </div>
      </section>

      <section className="trust-strip" aria-label="تجربة Samaan">
        <div><span className="trust-icon">✳</span><span><strong>اختيارات متنوّعة</strong><small>خامات وموديلات مختلفة</small></span></div>
        <div><span className="trust-icon">◇</span><span><strong>تفاصيل على ذوقك</strong><small>خيارات للتفصيل حسب الطلب</small></span></div>
        <div><span className="trust-icon">⌁</span><span><strong>تجربة واضحة</strong><small>تفاصيل وسعر لكل منتج</small></span></div>
      </section>

      <section className="section section-premium" id="fabrics">
        <div className="section-head">
          <div><span className="eyebrow">تسوّق بالطريقة اللي تناسبك</span><h2>اختار منين تبدأ</h2><p className="section-desc">من الخامة المناسبة للموديل اللي في بالك — ابدأ بخطوة.</p></div>
          {user?.role === 'ADMIN' && <Link className="button button-light" href="/admin">إدارة المتجر <span aria-hidden="true">←</span></Link>}
        </div>
        <div className="category-grid category-grid-premium">
          <a className={`category-card category-card-fabric ${productType === 'fabric' ? 'category-card-active' : ''}`} href="#products" onClick={() => chooseType('fabric')}>
            <div className="category-card-top"><span className="category-icon">▤</span><span className="category-card-number">01</span></div>
            <div><h3>أقمشة بالمتر</h3><p>خامات وألوان لمساحتك الخاصة.</p></div><span className="category-link">تصفّح الأقمشة <b>←</b></span>
          </a>
          <a className={`category-card category-card-galabiya ${productType === 'ready_galabiya' ? 'category-card-active' : ''}`} href="#products" onClick={() => chooseType('ready_galabiya')}>
            <div className="category-card-top"><span className="category-icon">♧</span><span className="category-card-number">02</span></div>
            <div><h3>جلابيب جاهزة</h3><p>اختار الموديل والمقاس واللون.</p></div><span className="category-link">اكتشف الموديلات <b>←</b></span>
          </a>
          <Link className="category-card category-card-tailoring" href="/tailoring">
            <div className="category-card-top"><span className="category-icon">✂</span><span className="category-card-number">03</span></div>
            <div><h3>تفصيل حسب الطلب</h3><p>تفاصيلك ومقاساتك في طلب واحد.</p></div><span className="category-link">ابدأ طلب التفصيل <b>←</b></span>
          </Link>
        </div>
      </section>

      <section className="section section-premium products-section" id="products">
        <div className="section-head">
          <div><span className="eyebrow">اختياراتنا لك</span><h2>تصفّح منتجات المتجر</h2><p className="section-desc">استكشف المنتجات المتاحة، وافتح صفحة المنتج لمعرفة التفاصيل.</p></div>
          {user?.role === 'ADMIN' && <Link className="button button-light" href="/admin">إضافة منتج جديد <span aria-hidden="true">←</span></Link>}
        </div>
        <form className="catalog-filters catalog-filters-premium" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput); }}>
          <label className="form-field catalog-search-field"><span>ابحث عن منتج</span><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="اسم المنتج أو نوع الخامة" /></label>
          <label className="form-field"><span>نوع المنتج</span><select value={productType} onChange={(event) => { setProductType(event.target.value); setCategoryId(''); }}><option value="">كل الأنواع</option><option value="fabric">أقمشة بالمتر</option><option value="ready_galabiya">جلابيب جاهزة</option><option value="custom_galabiya">تفصيل حسب الطلب</option><option value="accessory">إكسسوارات</option></select></label>
          <label className="form-field"><span>الفئة</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">كل الفئات</option>{categories.filter((category) => !productType || !category.productType || category.productType === productType).map((category) => <option key={category.id} value={category.id}>{category.parentId ? '— ' : ''}{category.name}</option>)}</select></label>
          <div className="catalog-filter-actions"><button className="button button-dark" type="submit">بحث <span aria-hidden="true">⌕</span></button><button className="button button-light" type="button" onClick={() => { setSearchInput(''); setSearch(''); setProductType(''); setCategoryId(''); }}>إعادة ضبط</button></div>
        </form>

        {productsLoading && <div className="loading-inline"><span className="loading-spinner" />جارٍ تجهيز التشكيلة...</div>}
        {productsError && <div className="form-error" role="alert">{productsError}</div>}
        {!productsLoading && !productsError && products.length === 0 && <div className="empty-state"><span className="empty-state-mark">S</span><h3>التشكيلة بتتجهّز</h3><p>لسه مفيش منتجات مطابقة للبحث. جرّب تغيير الفئة أو ارجع لكل المنتجات.</p><button className="button button-dark" onClick={() => { setSearchInput(''); setSearch(''); setProductType(''); setCategoryId(''); }}>عرض كل المنتجات</button>{user?.role === 'ADMIN' && <Link className="button button-light" href="/admin">إضافة أول منتج</Link>}</div>}

        {products.length > 0 && <div className="feature-grid feature-grid-premium">{products.map((product, index) => (
          <article className="demo-product product-card product-card-premium" key={product.id}>
            <ProductQuickActions product={product} onChanged={() => window.location.reload()} />
            <Link href={`/products/${encodeURIComponent(product.slug)}`} className="product-photo product-photo-premium">
              {product.images[0]?.imageUrl ? <img src={product.images[0].imageUrl} alt={product.images[0].altText || product.name} loading={index < 4 ? 'eager' : 'lazy'} /> : <div className={`demo-swatch ${product.productType === 'ready_galabiya' ? 'dark' : ''}`} />}
              <span className="product-photo-arrow" aria-hidden="true">↖</span>
            </Link>
            <div className="product-type-row"><span className="pill">{typeLabel[product.productType] ?? product.productType}</span>{product.stockQuantity !== undefined && <span className="product-stock-note">{product.stockQuantity > 0 ? 'متاح' : 'غير متاح'}</span>}</div>
            <h3><Link href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link></h3>
            <p className="product-short-desc">{product.fabricType || product.description || 'تفاصيل المنتج متاحة داخل صفحة المنتج.'}</p>
            <div className="product-card-bottom"><div><strong>{Number(product.basePrice).toLocaleString('ar-EG')} ج.م</strong><small> / {product.unit === 'meter' ? 'متر' : 'قطعة'}</small></div><Link className="product-details-link" href={`/products/${encodeURIComponent(product.slug)}`} aria-label={`تفاصيل ${product.name}`}>التفاصيل <span aria-hidden="true">←</span></Link></div>
          </article>
        ))}</div>}
      </section>

      <section className="band band-premium">
        <div className="band-mark">S.</div>
        <div className="band-copy"><span className="eyebrow">للأفراد وتجار الجملة</span><h2>عندك طلب أكبر أو فكرة مخصوصة؟</h2><p>تواصل مع تجربة Samaan وابدأ بخيارات تناسب احتياجك.</p></div>
        <Link className="button band-cta" href={user ? '/account' : '/login'}>{user ? 'افتح حسابك' : 'ابدأ الآن'} <span aria-hidden="true">←</span></Link>
      </section>
    </main>
  );
}
