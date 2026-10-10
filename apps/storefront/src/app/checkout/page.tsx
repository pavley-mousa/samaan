"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';
import { CartItem, readCart, writeCart } from '@/lib/cart';

type PlacedOrder = { id: string; orderNumber: string; total: number | string; status: string };
export default function CheckoutPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState({ recipientName: '', phone: '', governorate: '', city: '', addressLine: '', notes: '', customerNotes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  useEffect(() => { if (!loading && !user) router.replace('/login?next=%2Fcheckout'); }, [loading, user, router]);
  useEffect(() => { setItems(readCart()); if (user) setForm((old) => ({ ...old, recipientName: user.name, phone: user.phone || '' })); }, [user]);
  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) { setError('السلة فاضية. أضف منتجًا قبل تأكيد الطلب.'); return; }
    setBusy(true); setError('');
    try {
      const result = await apiRequest<PlacedOrder>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          address: { recipientName: form.recipientName, phone: form.phone, governorate: form.governorate, city: form.city, addressLine: form.addressLine, notes: form.notes || undefined },
          items: items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
          customerNotes: form.customerNotes || undefined,
        }),
      });
      writeCart([]); setItems([]); setOrder(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الطلب. راجع بياناتك وحاول مرة أخرى.');
    } finally { setBusy(false); }
  }

  if (loading || !user) return <main className="loading-shell">جارٍ تجهيز الطلب...</main>;
  if (order) return <main className="page-shell"><div className="checkout-success"><div className="success-icon">✓</div><span className="eyebrow">تم استلام الطلب</span><h1>شكرًا لطلبك من Samaan</h1><p>رقم الطلب: <strong>#{order.orderNumber}</strong></p><p>الإجمالي المسجل: <strong>{Number(order.total).toLocaleString('ar-EG')} ج.م</strong></p><p className="muted">طريقة الدفع: الدفع عند الاستلام. الإدارة ستراجع الطلب وتتواصل معك لتأكيد تفاصيل الشحن.</p><div className="button-row center-row"><Link className="button button-dark" href={`/orders/${encodeURIComponent(order.id)}/invoice`}>عرض وطباعة الفاتورة</Link><Link className="button button-light" href="/account">متابعة طلباتي</Link><Link className="button button-light" href="/">العودة للمتجر</Link></div></div></main>;
  return <main className="page-shell checkout-page"><span className="eyebrow">الخطوة الأخيرة</span><h1 className="page-title">تأكيد الطلب</h1><p className="muted">الدفع عند الاستلام متاح حاليًا. الأسعار والمخزون يتم التحقق منهما على الخادم وقت الإرسال.</p>
    {!items.length ? <div className="empty-state"><h2>مفيش منتجات في السلة</h2><Link href="/" className="button button-dark">العودة للمتجر</Link></div> : <div className="checkout-layout"><form className="auth-card checkout-form" onSubmit={submit}>
      <h2>بيانات التوصيل</h2>{error && <div className="form-error">{error}</div>}
      <label className="form-field">اسم المستلم<input required minLength={2} maxLength={120} value={form.recipientName} onChange={(event) => setForm({...form, recipientName:event.target.value})}/></label>
      <label className="form-field">رقم الهاتف<input required minLength={7} maxLength={30} inputMode="tel" value={form.phone} onChange={(event) => setForm({...form, phone:event.target.value})}/></label>
      <div className="two-fields"><label className="form-field">المحافظة<input required value={form.governorate} onChange={(event) => setForm({...form, governorate:event.target.value})}/></label><label className="form-field">المدينة / المركز<input required value={form.city} onChange={(event) => setForm({...form, city:event.target.value})}/></label></div>
      <label className="form-field">العنوان بالتفصيل<input required minLength={5} value={form.addressLine} onChange={(event) => setForm({...form, addressLine:event.target.value})}/></label>
      <label className="form-field">علامة مميزة أو تعليمات للمندوب (اختياري)<input value={form.notes} onChange={(event) => setForm({...form, notes:event.target.value})}/></label>
      <label className="form-field">ملاحظات على الطلب (اختياري)<textarea rows={3} value={form.customerNotes} onChange={(event) => setForm({...form, customerNotes:event.target.value})}/></label>
      <button className="button button-dark form-submit" type="submit" disabled={busy}>{busy ? 'جارٍ تسجيل الطلب...' : 'تأكيد الطلب — الدفع عند الاستلام'}</button>
    </form><aside className="cart-summary"><h2>ملخص مشترياتك</h2>{items.map((item) => <div key={`${item.productId}:${item.variantId || ''}`} className="checkout-summary-line"><span>{item.name}{item.variantLabel ? ` (${item.variantLabel})` : ''} × {item.quantity}</span><strong>{(item.unitPrice * item.quantity).toLocaleString('ar-EG')} ج.م</strong></div>)}<div className="checkout-total"><span>الإجمالي المبدئي</span><strong>{total.toLocaleString('ar-EG')} ج.م</strong></div><p className="muted small">رسوم الشحن غير مضافة حاليًا وسيتم تأكيدها مع الإدارة.</p><Link href="/cart" className="inline-link">الرجوع لتعديل السلة</Link></aside></div>}
  </main>;
}
