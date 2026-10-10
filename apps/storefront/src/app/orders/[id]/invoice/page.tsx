"use client";

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type InvoiceOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number | string;
  shippingFee: number | string;
  discount: number | string;
  total: number | string;
  createdAt: string;
  customerNotes?: string | null;
  user: { name: string; email: string };
  address?: { recipientName: string; phone: string; governorate: string; city: string; addressLine: string; notes?: string | null } | null;
  items: { id: string; productName: string; variantDescription?: string | null; unit: string; quantity: number | string; unitPrice: number | string; lineTotal: number | string }[];
};

const currency = (value: number | string) => `${Number(value).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<InvoiceOrder | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);

  useEffect(() => {
    if (!user || !params.id) return;
    let cancelled = false;
    void apiRequest<InvoiceOrder>(`/orders/${encodeURIComponent(params.id)}`)
      .then((data) => { if (!cancelled) setOrder(data); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'تعذر تحميل الفاتورة.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [user, params.id]);

  if (loading || busy) return <main className="loading-shell">جارٍ تجهيز الفاتورة...</main>;
  if (error || !order) return <main className="page-shell"><div className="empty-state"><h1>تعذر فتح الفاتورة</h1><p>{error}</p><Link href="/account" className="button button-dark">العودة لطلباتي</Link></div></main>;

  const statusLabels: Record<string, string> = { pending: 'بانتظار المراجعة', confirmed: 'تم التأكيد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', returned: 'مرتجع' };
  const paid = order.paymentStatus === 'paid';

  return <main className="page-shell invoice-page">
    <div className="invoice-toolbar no-print"><Link href="/account" className="button button-light">العودة لطلباتي</Link><button type="button" className="button button-dark" onClick={() => window.print()}>طباعة الفاتورة</button></div>
    <article className="invoice-sheet">
      <header className="invoice-header"><div><span className="brand-mark">S</span><h1>Samaan</h1><p>متجر الأقمشة والجلاليب</p></div><div className="invoice-meta"><h2>فاتورة طلب</h2><strong>#{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleString('ar-EG')}</span><span>الحالة: {statusLabels[order.status] || order.status}</span></div></header>
      <section className="invoice-parties"><div><h3>بيانات العميل</h3><p>{order.address?.recipientName || order.user.name}</p><p>{order.user.email}</p><p>{order.address?.phone || ''}</p></div><div><h3>عنوان الاستلام / التوصيل</h3><p>{order.address ? `${order.address.governorate}، ${order.address.city}` : 'غير مسجل'}</p><p>{order.address?.addressLine || ''}</p><p>{order.address?.notes || ''}</p></div></section>
      <table className="invoice-items"><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td>{item.productName}{item.variantDescription ? <small>{item.variantDescription}</small> : null}</td><td>{Number(item.quantity)} {item.unit === 'meter' ? 'متر' : 'قطعة'}</td><td>{currency(item.unitPrice)}</td><td>{currency(item.lineTotal)}</td></tr>)}</tbody></table>
      <section className="invoice-totals"><div><span>الإجمالي الفرعي</span><strong>{currency(order.subtotal)}</strong></div><div><span>الشحن</span><strong>{currency(order.shippingFee)}</strong></div><div><span>الخصم</span><strong>- {currency(order.discount)}</strong></div><div className="invoice-grand-total"><span>الإجمالي النهائي</span><strong>{currency(order.total)}</strong></div></section>
      <section className="invoice-payment"><p><strong>طريقة الدفع:</strong> {order.paymentMethod === 'cash_on_delivery' ? 'الدفع عند الاستلام' : order.paymentMethod}</p><p><strong>حالة الدفع:</strong> {paid ? 'مدفوع' : 'غير مدفوع — يتم التحصيل عند الاستلام'}</p>{order.customerNotes && <p><strong>ملاحظات الطلب:</strong> {order.customerNotes}</p>}</section>
      <footer className="invoice-footnote"><p>هذه فاتورة طلب إلكترونية من Samaan. لا تعني أن الطلب مدفوع ما لم تظهر حالة الدفع «مدفوع».</p><p>شكرًا لثقتك في Samaan.</p></footer>
    </article>
  </main>;
}
