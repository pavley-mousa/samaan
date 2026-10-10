"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type QuickCategory = { id: string; name: string; slug: string; parentId?: string | null; productType?: string | null };
type EditableProduct = {
  id: string;
  name: string;
  productType: string;
  categoryId?: string | null;
  description?: string | null;
  fabricType?: string | null;
  basePrice: number | string;
  images?: { imageUrl: string; altText?: string | null }[];
  category?: { id?: string; name: string; parentId?: string | null } | null;
};

export function ProductQuickActions({ product, onChanged }: { product: EditableProduct; onChanged?: () => void }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [categories, setCategories] = useState<QuickCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({
    name: product.name,
    description: product.description ?? '',
    fabricType: product.fabricType ?? '',
    basePrice: String(Number(product.basePrice)),
    imageUrl: product.images?.[0]?.imageUrl ?? '',
    categoryId: product.categoryId ?? product.category?.id ?? '',
  });

  useEffect(() => {
    let cancelled = false;
    void apiRequest<QuickCategory[]>('/categories').then((data) => { if (!cancelled) setCategories(data); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setDraft({
      name: product.name,
      description: product.description ?? '',
      fabricType: product.fabricType ?? '',
      basePrice: String(Number(product.basePrice)),
      imageUrl: product.images?.[0]?.imageUrl ?? '',
      categoryId: product.categoryId ?? product.category?.id ?? '',
    });
  }, [product.id, product.name, product.description, product.fabricType, product.basePrice, product.images, product.categoryId, product.category?.id]);

  if (user?.role !== 'ADMIN') return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const originalImageUrl = product.images?.[0]?.imageUrl ?? '';
      const imageChanged = draft.imageUrl.trim() !== originalImageUrl;
      await apiRequest(`/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          fabricType: draft.fabricType.trim(),
          basePrice: Number(draft.basePrice),
          categoryId: draft.categoryId || null,
          ...(imageChanged ? (draft.imageUrl.trim() ? { imageUrls: [draft.imageUrl.trim()] } : { imageUrls: [] }) : {}),
        }),
      });
      setEditOpen(false);
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ التعديل.');
    } finally { setBusy(false); }
  }

  async function hideProduct() {
    if (!window.confirm(`إخفاء «${product.name}» من المتجر؟`)) return;
    setBusy(true); setError('');
    try {
      await apiRequest(`/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
      setMenuOpen(false);
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إخفاء المنتج.');
    } finally { setBusy(false); }
  }

  return <div className="product-quick-actions">
    <button type="button" className="quick-menu-trigger" aria-label={`خيارات ${product.name}`} aria-expanded={menuOpen} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen((value) => !value); }}>⋮</button>
    {menuOpen && <div className="quick-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => { setDraft({ name: product.name, description: product.description ?? '', fabricType: product.fabricType ?? '', basePrice: String(Number(product.basePrice)), imageUrl: product.images?.[0]?.imageUrl ?? '', categoryId: product.categoryId ?? product.category?.id ?? '' }); setEditOpen(true); setMenuOpen(false); }}>تعديل سريع</button>
      <button type="button" role="menuitem" className="quick-menu-danger" onClick={() => void hideProduct()} disabled={busy}>إخفاء المنتج</button>
    </div>}
    {error && !editOpen && <div className="quick-action-error" role="alert">{error}</div>}
    {editOpen && <div className="quick-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditOpen(false); }}>
      <section className="quick-edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`quick-edit-title-${product.id}`}>
        <div className="quick-edit-head"><div><span className="eyebrow">تعديل مباشر</span><h2 id={`quick-edit-title-${product.id}`}>{product.name}</h2></div><button className="text-button" type="button" onClick={() => setEditOpen(false)} aria-label="إغلاق">×</button></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form className="quick-edit-form" onSubmit={(event) => void save(event)}>
          <label className="form-field">اسم المنتج<input value={draft.name} maxLength={160} minLength={2} required onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
          <label className="form-field">السعر الأساسي (ج.م)<input type="number" value={draft.basePrice} min="0" step="0.01" required onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })}/></label>
          <label className="form-field">التصنيف<select value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}><option value="">بدون تصنيف</option>{categories.filter((category) => !category.productType || category.productType === product.productType).map((category) => <option key={category.id} value={category.id}>{category.parentId ? '— ' : ''}{category.name}</option>)}</select></label>
          <label className="form-field">نوع الخامة<input value={draft.fabricType} maxLength={120} onChange={(event) => setDraft({ ...draft, fabricType: event.target.value })}/></label>
          <label className="form-field form-field-wide">وصف المنتج<textarea rows={3} maxLength={5000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
          <label className="form-field form-field-wide">رابط الصورة الرئيسية<input type="url" value={draft.imageUrl} placeholder="https://..." onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}/><small>يمكن تغيير الرابط الآن؛ رفع الصور من الجهاز يحتاج تفعيل مفتاح التخزين السري.</small></label>
          <div className="button-row form-field-wide"><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button><button type="button" className="button button-light" onClick={() => setEditOpen(false)}>إلغاء</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
