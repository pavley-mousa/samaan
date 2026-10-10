"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type ProductVariant = { id: string; colorName?: string | null; sizeLabel?: string | null; isActive: boolean; stockQuantity: number | string };
type CatalogProduct = { id: string; name: string; slug: string; productType: string; categoryId?: string | null; category?: { id: string; name: string; parentId?: string | null } | null; fabricType?: string | null; variants: ProductVariant[] };
type StoreCategory = { id: string; name: string; slug: string; parentId?: string | null; productType?: string | null; parent?: { id: string; name: string } | null };
type PickupSlot = { id: string; label: string; startsAt: string; endsAt: string; capacity: number; reservedCount: number };
type TailoringRequest = {
  id: string;
  status: string;
  fabricDescription?: string | null;
  colorName?: string | null;
  sizeLabel?: string | null;
  bodyMeasurements: Record<string, number>;
  customerNotes?: string | null;
  quotedPrice?: number | string | null;
  estimatedDays?: number | null;
  createdAt: string;
  pickupSlotId?: string | null;
  pickupSlot?: { id: string; label: string; startsAt: string; endsAt: string } | null;
  product?: { id: string; name: string; slug: string; productType: string } | null;
  fabricVariant?: { id: string; colorName?: string | null; sizeLabel?: string | null; product: { id: string; name: string; fabricType?: string | null } } | null;
};

const measurementFields = [
  ['height', 'الطول الكلي'],
  ['shoulder', 'عرض الكتف'],
  ['chest', 'محيط الصدر'],
  ['waist', 'محيط الوسط'],
  ['hip', 'محيط الأرداف'],
  ['sleeveLength', 'طول الكم'],
  ['garmentLength', 'طول الجلابية'],
  ['neck', 'محيط الرقبة'],
  ['wrist', 'محيط الرسغ'],
] as const;

const statusLabels: Record<string, string> = {
  submitted: 'تم استلام الطلب',
  reviewing: 'قيد المراجعة',
  quoted: 'عرض السعر جاهز',
  approved: 'وافق العميل على السعر',
  in_production: 'قيد التنفيذ',
  ready: 'جاهز للتسليم',
  delivered: 'تم التسليم',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

const blankMeasurements = Object.fromEntries(measurementFields.map(([key]) => [key, ''])) as Record<string, string>;

export default function TailoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [requests, setRequests] = useState<TailoringRequest[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [tailoringCategoryId, setTailoringCategoryId] = useState('');
  const [fabricCategoryId, setFabricCategoryId] = useState('');
  const [pickupSelections, setPickupSelections] = useState<Record<string, string>>({});
  const [productId, setProductId] = useState('');
  const [fabricVariantId, setFabricVariantId] = useState('');
  const [fabricDescription, setFabricDescription] = useState('');
  const [colorName, setColorName] = useState('');
  const [sizeLabel, setSizeLabel] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>(blankMeasurements);
  const [customerNotes, setCustomerNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=%2Ftailoring');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setDataLoading(true);
    const query = new URLSearchParams({ limit: '100' });
    void Promise.all([
      apiRequest<CatalogProduct[]>(`/products?${query.toString()}`),
      apiRequest<TailoringRequest[]>('/tailoring/mine'),
      apiRequest<StoreCategory[]>('/categories').catch(() => [] as StoreCategory[]),
      apiRequest<PickupSlot[]>('/pickup-slots').catch(() => [] as PickupSlot[]),
      apiRequest<{ videoUrl: string | null }>('/site-settings/measurement-video').catch(() => ({ videoUrl: null })),
    ]).then(([catalog, mine, categoryData, slotData, guide]) => {
      if (cancelled) return;
      setProducts(catalog);
      setRequests(mine);
      setCategories(categoryData);
      setPickupSlots(slotData);
      setVideoUrl(guide.videoUrl || '');
      const selected = new URLSearchParams(window.location.search).get('productId');
      if (selected && catalog.some((item) => item.id === selected && item.productType === 'custom_galabiya')) setProductId(selected);
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'تعذر تحميل بيانات طلبات التفصيل.');
    }).finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  async function reloadRequests() {
    const [mine, slots] = await Promise.all([
      apiRequest<TailoringRequest[]>('/tailoring/mine'),
      apiRequest<PickupSlot[]>('/pickup-slots').catch(() => [] as PickupSlot[]),
    ]);
    setRequests(mine);
    setPickupSlots(slots);
  }

  async function choosePickupSlot(requestId: string) {
    const pickupSlotId = pickupSelections[requestId] || requests.find((request) => request.id === requestId)?.pickupSlotId || '';
    if (!pickupSlotId) { setError('اختار موعد الاستلام الأول.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/tailoring/${encodeURIComponent(requestId)}/pickup-slot`, { method: 'POST', body: JSON.stringify({ pickupSlotId }) });
      setNotice('تم حجز موعد الاستلام للجلابية التفصيل.');
      await reloadRequests();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حجز الموعد.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const bodyMeasurements = Object.fromEntries(
      Object.entries(measurements)
        .filter(([, value]) => value.trim() !== '')
        .map(([key, value]) => [key, Number(value)]),
    );
    try {
      const payload = {
        ...(productId ? { productId } : {}),
        ...(fabricVariantId ? { fabricVariantId } : {}),
        ...(fabricDescription.trim() ? { fabricDescription: fabricDescription.trim() } : {}),
        ...(colorName.trim() ? { colorName: colorName.trim() } : {}),
        ...(sizeLabel.trim() ? { sizeLabel: sizeLabel.trim() } : {}),
        ...(Object.keys(bodyMeasurements).length ? { bodyMeasurements } : {}),
        ...(customerNotes.trim() ? { customerNotes: customerNotes.trim() } : {}),
      };
      await apiRequest('/tailoring', { method: 'POST', body: JSON.stringify(payload) });
      setProductId(''); setFabricVariantId(''); setFabricDescription(''); setColorName(''); setSizeLabel('');
      setMeasurements(blankMeasurements); setCustomerNotes('');
      setNotice('تم إرسال طلب التفصيل. هنراجع التفاصيل ونضيف عرض السعر هنا.');
      await reloadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال طلب التفصيل.');
    } finally {
      setBusy(false);
    }
  }

  async function approveQuote(id: string) {
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/tailoring/${encodeURIComponent(id)}/approve-quote`, { method: 'POST', body: '{}' });
      setNotice('تمت الموافقة على عرض السعر. سيبدأ التنفيذ بعد تحديث حالة الطلب من الإدارة.');
      await reloadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذرت الموافقة على عرض السعر.');
    } finally { setBusy(false); }
  }

  async function cancelRequest(id: string) {
    if (!window.confirm('تأكيد إلغاء طلب التفصيل؟')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/tailoring/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: '{}' });
      setNotice('تم إلغاء الطلب.');
      await reloadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إلغاء طلب التفصيل.');
    } finally { setBusy(false); }
  }

  if (loading || !user || dataLoading) return <main className="loading-shell">جارٍ تحميل طلبات التفصيل...</main>;

  const customCategories = categories.filter((category) => category.productType === 'custom_galabiya');
  const fabricCategories = categories.filter((category) => category.productType === 'fabric');
  const customProducts = products.filter((item) => item.productType === 'custom_galabiya' && (!tailoringCategoryId || item.categoryId === tailoringCategoryId));
  const fabrics = products.filter((item) => item.productType === 'fabric' && (!fabricCategoryId || item.categoryId === fabricCategoryId));
  const youtubeId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1];

  return <main className="page-shell">
    <div className="section-head">
      <div><span className="eyebrow">تفصيل حسب الطلب</span><h1 className="page-title">اطلب جلابيتك على مقاسك</h1><p className="section-desc">اختار الموديل أو الخامة، وسجّل المقاسات بالسنتيمتر. عرض السعر لا يتحول لأمر تنفيذ إلا بعد موافقتك.</p></div>
      <Link href="/account" className="button button-light button-small">حسابي</Link>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {notice && <div className="form-success" role="status">{notice}</div>}
    <section className="measurement-guide">
      <div className="section-head"><div><span className="eyebrow">دليل المقاسات</span><h2>شاهد طريقة أخذ المقاسات</h2><p className="section-desc">قِس بالسنتيمتر باستخدام شريط قياس مرن، وخلي الشريط مريح من غير شد زائد. لو مش متأكد من قياس، سيبه فاضي وفريق التفصيل هيراجعه معاك.</p></div></div>
      {videoUrl ? youtubeId
        ? <div className="measurement-video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title="فيديو طريقة أخذ المقاسات" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div>
        : <div className="measurement-video-frame"><video src={videoUrl} controls preload="metadata">المتصفح لا يدعم تشغيل الفيديو.</video></div>
        : <div className="measurement-video-placeholder"><strong>فيديو طريقة أخذ المقاسات لم يتم رفعه بعد.</strong><span>سيظهر هنا بمجرد أن يضيفه مدير المتجر.</span>{user.role === 'ADMIN' && <Link className="inline-link" href="/admin/content">رفع فيديو المقاسات ←</Link>}</div>}
    </section>
    <section className="admin-section">
      <form className="product-admin-form" onSubmit={(event) => void submit(event)}>
        <label className="form-field form-field-wide">نوع الجلابية / الفئة (اختياري)
          <select value={tailoringCategoryId} onChange={(event) => { setTailoringCategoryId(event.target.value); setProductId(""); }}><option value="">كل أنواع التفصيل</option>{customCategories.filter((category) => !category.parentId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}{customCategories.filter((category) => Boolean(category.parentId)).map((category) => <option key={category.id} value={category.id}>— {category.name}</option>)}</select>
        </label>
        <label className="form-field form-field-wide">الموديل (اختياري)
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">تفصيل بتصميم خاص بي</option>
            {customProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="form-field form-field-wide">فئة القماش (اختياري)
          <select value={fabricCategoryId} onChange={(event) => { setFabricCategoryId(event.target.value); setFabricVariantId(""); }}><option value="">كل فئات الأقمشة</option>{fabricCategories.filter((category) => !category.parentId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}{fabricCategories.filter((category) => Boolean(category.parentId)).map((category) => <option key={category.id} value={category.id}>— {category.name}</option>)}</select>
        </label>
        <label className="form-field form-field-wide">الخامة من المتجر (اختياري)
          <select value={fabricVariantId} onChange={(event) => setFabricVariantId(event.target.value)}>
            <option value="">هحدد الخامة لاحقًا أو من وصف الطلب</option>
            {fabrics.flatMap((fabric) => fabric.variants.filter((variant) => variant.isActive && Number(variant.stockQuantity) > 0).map((variant) => (
              <option key={variant.id} value={variant.id}>{fabric.name} — {[variant.colorName, variant.sizeLabel].filter(Boolean).join(' / ') || 'اختيار متاح'}</option>
            )))}
          </select>
        </label>
        <label className="form-field">وصف الخامة (اختياري)<input value={fabricDescription} onChange={(event) => setFabricDescription(event.target.value)} maxLength={200} placeholder="مثال: قطن خفيف للصيف"/></label>
        <label className="form-field">اللون المفضل<input value={colorName} onChange={(event) => setColorName(event.target.value)} maxLength={80} /></label>
        <label className="form-field">المقاس المعتاد أو الفئة<input value={sizeLabel} onChange={(event) => setSizeLabel(event.target.value)} maxLength={80} placeholder="مثال: XL"/></label>
        <div className="form-field form-field-wide"><strong>المقاسات بالسنتيمتر (اختياري)</strong><p className="muted small">اكتب الأرقام اللي تعرفها واترك الباقي فاضي. هنراجع المقاسات قبل التنفيذ.</p></div>
        {measurementFields.map(([key, label]) => <label className="form-field" key={key}>{label} (سم)
          <input type="number" min="1" max="300" step="0.5" value={measurements[key]} onChange={(event) => setMeasurements((old) => ({ ...old, [key]: event.target.value }))} />
        </label>)}
        <label className="form-field form-field-wide">ملاحظات وتفاصيل التصميم<textarea rows={4} value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} maxLength={2000} placeholder="اكتب تفاصيل القَصّة أو أي طلب خاص. رفع الصور المرجعية سيتاح بعد تفعيل الرفع الآمن."/></label>
        <div className="form-field form-field-wide"><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'إرسال طلب التفصيل'}</button></div>
      </form>
    </section>

    <section className="orders-section">
      <div className="section-head"><div><span className="eyebrow">متابعة الطلبات</span><h2>طلبات التفصيل السابقة</h2></div><button type="button" className="button button-light button-small" onClick={() => void reloadRequests()} disabled={busy}>تحديث ↻</button></div>
      {requests.length === 0 ? <div className="empty-state"><p>لا توجد طلبات تفصيل حتى الآن.</p></div> : <div className="order-list">
        {requests.map((request) => <article className="order-card" key={request.id}>
          <div className="order-card-head"><div><strong>{request.product?.name || request.fabricVariant?.product.name || request.fabricDescription || 'طلب تفصيل خاص'}</strong><p className="muted small">{new Date(request.createdAt).toLocaleDateString('ar-EG')}</p></div><span className="status-chip">{statusLabels[request.status] || request.status}</span></div>
          <p className="muted small">{[request.fabricVariant?.colorName, request.colorName, request.sizeLabel].filter(Boolean).join(' · ')}</p>
          {request.customerNotes && <p>{request.customerNotes}</p>}
          {request.quotedPrice !== null && request.quotedPrice !== undefined && <div className="form-success"><strong>عرض السعر: {Number(request.quotedPrice).toLocaleString('ar-EG')} ج.م</strong>{request.estimatedDays ? <span> · مدة متوقعة: {request.estimatedDays} يوم</span> : null}</div>}
          {request.pickupSlot && <p className="pickup-selected-note"><strong>موعد الاستلام المحجوز:</strong> {request.pickupSlot.label} — {new Date(request.pickupSlot.startsAt).toLocaleString('ar-EG')}</p>}
          {['approved', 'in_production', 'ready'].includes(request.status) && <div className="pickup-slot-picker"><label className="form-field">اختيار / تغيير موعد استلام الجلابية التفصيل
            <select value={pickupSelections[request.id] ?? request.pickupSlotId ?? ''} onChange={(event) => setPickupSelections((old) => ({ ...old, [request.id]: event.target.value }))}>
              <option value="">اختار موعدًا متاحًا</option>
              {request.pickupSlot && !pickupSlots.some((slot) => slot.id === request.pickupSlotId) && <option value={request.pickupSlot.id}>{request.pickupSlot.label} — {new Date(request.pickupSlot.startsAt).toLocaleString('ar-EG')} (الموعد الحالي)</option>}
              {pickupSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label} — {new Date(slot.startsAt).toLocaleString('ar-EG')} (متاح {Math.max(slot.capacity - slot.reservedCount, 0)})</option>)}
            </select>
          </label><button type="button" className="button button-dark button-small" onClick={() => void choosePickupSlot(request.id)} disabled={busy || !(pickupSelections[request.id] || request.pickupSlotId)}>حفظ موعد الاستلام</button></div>}
          {request.status === 'quoted' && <div className="button-row"><button type="button" className="button button-dark" onClick={() => void approveQuote(request.id)} disabled={busy}>أوافق على السعر</button><button type="button" className="button button-light" onClick={() => void cancelRequest(request.id)} disabled={busy}>إلغاء الطلب</button></div>}
          {['submitted', 'reviewing'].includes(request.status) && <button type="button" className="button button-light button-small" onClick={() => void cancelRequest(request.id)} disabled={busy}>إلغاء الطلب</button>}
        </article>)}
      </div>}
    </section>
  </main>;
}
