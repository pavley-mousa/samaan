"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type FavoriteRecord = {
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    productType: string;
    description?: string | null;
    fabricType?: string | null;
    basePrice: number | string;
    unit: 'meter' | 'piece';
    isActive: boolean;
    images: { imageUrl: string; altText?: string | null }[];
  };
};

const typeLabel: Record<string, string> = {
  fabric: 'قماش بالمتر',
  ready_galabiya: 'جلابية جاهزة',
  custom_galabiya: 'تفصيل حسب الطلب',
  accessory: 'إكسسوارات',
};

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=%2Ffavorites');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setBusy(true);
    void apiRequest<FavoriteRecord[]>('/favorites')
      .then((data) => { if (!cancelled) setFavorites(data); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'تعذر تحميل المفضلة.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [user]);

  async function remove(productId: string) {
    setRemoving(productId);
    setError('');
    try {
      await apiRequest('/favorites/' + encodeURIComponent(productId), { method: 'DELETE' });
      setFavorites((current) => current.filter((item) => item.productId !== productId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حذف المنتج من المفضلة.');
    } finally {
      setRemoving(null);
    }
  }

  if (loading || !user || busy) return <main className="loading-shell">جارٍ تحميل المفضلة...</main>;

  return <main className="page-shell">
    <span className="eyebrow">منتجات اخترتها</span>
    <h1 className="page-title">المفضلة</h1>
    <p className="muted">احتفظ بالمنتجات اللي حابب ترجع لها بسهولة.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    {favorites.length === 0 ? (
      <div className="empty-state">
        <h2>لسه مفيش منتجات في المفضلة</h2>
        <p>تصفح الأقمشة والجلاليب، واضف المنتجات اللي عجبتك هنا.</p>
        <Link href="/" className="button button-dark">تصفح المنتجات</Link>
      </div>
    ) : (
      <div className="feature-grid">
        {favorites.map(({ product, productId }) => (
          <article className="demo-product product-card" key={productId}>
            <Link href={`/products/${encodeURIComponent(product.slug)}`} className="product-photo">
              {product.images[0]?.imageUrl
                ? <img src={product.images[0].imageUrl} alt={product.images[0].altText || product.name} />
                : <div className="demo-swatch" />}
            </Link>
            <span className="pill">{typeLabel[product.productType] || product.productType}</span>
            <h3><Link href={`/products/${encodeURIComponent(product.slug)}`}>{product.name}</Link></h3>
            <p className="section-desc">{product.fabricType || product.description || 'تفاصيل المنتج داخل صفحة المنتج.'}</p>
            <div className="product-card-bottom">
              <strong>{Number(product.basePrice).toLocaleString('ar-EG')} ج.م / {product.unit === 'meter' ? 'متر' : 'قطعة'}</strong>
              <button className="button button-light button-small" type="button" onClick={() => void remove(productId)} disabled={removing === productId}>
                {removing === productId ? 'جارٍ الحذف...' : 'حذف من المفضلة'}
              </button>
            </div>
            {!product.isActive && <p className="muted small">هذا المنتج لم يعد متاحًا للشراء.</p>}
          </article>
        ))}
      </div>
    )}
  </main>;
}
