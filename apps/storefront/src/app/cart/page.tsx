"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { CartItem, readCart, writeCart } from '@/lib/cart';

export default function CartPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { setItems(readCart()); }, []);
  function save(next: CartItem[]) { setItems(next); writeCart(next); }
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return <main className="page-shell">
    <span className="eyebrow">مراجعة مشترياتك</span><h1 className="page-title">سلة التسوق</h1><p className="muted">الأسعار النهائية وتوفر المخزون يتم التحقق منهما مرة أخرى عند تأكيد الطلب.</p>
    {items.length === 0 ? <div className="empty-state"><h2>السلة فاضية</h2><p>اختار منتجات من المتجر وهتظهر هنا.</p><Link href="/" className="button button-dark">تصفح المنتجات</Link></div> : <div className="cart-layout">
      <div className="cart-lines">{items.map((item) => <article className="cart-line" key={`${item.productId}:${item.variantId || ''}`}>
        <div className="cart-line-photo">{item.imageUrl ? <img src={item.imageUrl} alt={item.name}/> : <div className="demo-swatch"/>}</div>
        <div className="cart-line-main"><Link href={`/products/${encodeURIComponent(item.slug)}`}><h3>{item.name}</h3></Link><p className="muted small">{item.variantLabel || (item.unit === 'meter' ? 'قماش بالمتر' : 'قطعة')}</p><strong>{item.unitPrice.toLocaleString('ar-EG')} ج.م / {item.unit === 'meter' ? 'متر' : 'قطعة'}</strong>
          <div className="cart-line-actions"><label>الكمية <input aria-label={`كمية ${item.name}`} type="number" min={item.unit === 'meter' ? '0.5' : '1'} step={item.unit === 'meter' ? '0.5' : '1'} value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); if (quantity > 0) save(items.map((line) => line === item ? { ...line, quantity } : line)); }}/></label><button type="button" className="text-button remove-button" onClick={() => save(items.filter((line) => line !== item))}>حذف</button></div>
        </div>
        <strong className="cart-line-total">{(item.unitPrice * item.quantity).toLocaleString('ar-EG')} ج.م</strong>
      </article>)}</div>
      <aside className="cart-summary"><h2>ملخص الطلب</h2><div><span>عدد المنتجات</span><strong>{items.length}</strong></div><div><span>الإجمالي الفرعي</span><strong>{subtotal.toLocaleString('ar-EG')} ج.م</strong></div><p className="muted small">الشحن يتم تحديده مع تأكيد الطلب، وحاليًا لا تُضاف رسوم شحن تلقائية.</p><Link className="button button-dark checkout-button" href={user ? "/checkout" : "/login?next=%2Fcheckout"}>{user ? "استكمال بيانات الطلب" : "سجّل الدخول لإتمام الطلب"}</Link><Link className="inline-link" href="/">متابعة التسوق</Link></aside>
    </div>}
  </main>;
}
