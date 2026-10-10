"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type CustomerOrder = { id: string; orderNumber: string; status: string; total: number | string; createdAt: string; items: { id: string; productName: string; quantity: number | string; unit: string }[] };
const statusLabels: Record<string, string> = { pending: 'بانتظار المراجعة', confirmed: 'تم التأكيد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', returned: 'مرتجع' };

export default function AccountPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => { if (user) void apiRequest<CustomerOrder[]>('/orders/mine', { method: 'GET' }).then(setOrders).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل الطلبات.')); }, [user]);
  if (loading || !user) return <main className="loading-shell">جارٍ تحميل حسابك...</main>;
  return <main className="page-shell"><span className="eyebrow">حساب العميل</span><h1 className="page-title">أهلًا، {user.name}</h1><p className="muted">{user.email}</p>
    <div className="account-summary panel-grid"><article className="panel-card"><h3>طلباتي</h3><p>تقدر تتابع حالة الطلب من هنا.</p><span className="pill">{orders.length} طلب</span></article><article className="panel-card"><h3>طلبات التفصيل</h3><p>قدّم طلبًا بالمقاسات وتابع عرض السعر وحالة التنفيذ.</p><Link className="inline-link" href="/tailoring">فتح طلبات التفصيل ←</Link></article><article className="panel-card"><h3>حالة الحساب</h3><p>البريد الإلكتروني مؤكد.</p><span className="pill">{user.role === 'ADMIN' ? 'مدير المتجر' : 'عميل'}</span></article></div>
    <section className="orders-section"><div className="section-head"><div><span className="eyebrow">سجل الشراء</span><h2>الطلبات السابقة</h2></div><Link className="button button-light button-small" href="/">متابعة التسوق</Link></div>
      {error && <div className="form-error">{error}</div>}
      {!orders.length && !error && <div className="empty-state"><p>لسه مفيش طلبات مسجلة على حسابك.</p><Link className="button button-dark" href="/">ابدأ التسوق</Link></div>}
      <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}><div className="order-card-head"><div><strong>طلب #{order.orderNumber}</strong><p className="muted small">{new Date(order.createdAt).toLocaleDateString('ar-EG')}</p></div><span className={`status-chip status-${order.status}`}>{statusLabels[order.status] || order.status}</span></div><div className="order-card-items">{order.items.map((item) => <span key={item.id}>{item.productName} × {Number(item.quantity)} {item.unit === 'meter' ? 'متر' : 'قطعة'}</span>)}</div><strong>الإجمالي: {Number(order.total).toLocaleString('ar-EG')} ج.م</strong></article>)}</div>
    </section>
  </main>;
}
