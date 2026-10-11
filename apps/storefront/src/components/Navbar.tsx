"use client";

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="العودة للرئيسية">
        <span className="brand-mark">S</span>
        <span>Samaan<small>الأقمشة والجلاليب</small></span>
      </Link>
      <nav className="main-nav" aria-label="القائمة الرئيسية">
        <Link href="/">الرئيسية</Link>
        <a href="/#fabrics">الأقمشة</a>
        <a href="/#products">الجلابيب</a>
        <Link href="/cart">السلة</Link>
        <Link href="/tailoring">تفصيل جلابية</Link>
      </nav>
      <div className="nav-actions">
        {loading ? <span className="muted small">جارٍ التحقق...</span> : user ? <>
          <Link className="nav-user" href="/account">أهلًا، {user.name.split(' ')[0]}</Link>
          <Link className="nav-user" href="/favorites">المفضلة</Link>
          <Link className="button button-light button-small" href="/cart">السلة</Link>
          {user.role === 'ADMIN' && <>
            <Link className="button button-dark button-small" href="/admin">لوحة التحكم</Link>
            <Link className="button button-light button-small" href="/admin/tailoring">طلبات التفصيل</Link>
          </>}
          <button className="text-button" onClick={() => void logout()}>خروج</button>
        </> : <Link className="button button-dark button-small" href="/login">تسجيل الدخول</Link>}
      </div>
      <details className="mobile-menu">
        <summary aria-label="فتح قائمة التنقل"><span aria-hidden="true">☰</span><span>القائمة</span></summary>
        <nav className="mobile-menu-panel" aria-label="قائمة التنقل للهاتف">
          <Link href="/">الرئيسية</Link>
          <a href="/#fabrics">الأقمشة</a>
          <a href="/#products">الجلابيب</a>
          <Link href="/cart">السلة</Link>
          <Link href="/tailoring">تفصيل جلابية</Link>
          {user && <><Link href="/account">حسابي وطلباتي</Link><Link href="/favorites">المفضلة</Link></>}
          {user?.role === 'ADMIN' && <><Link href="/admin">لوحة التحكم</Link><Link href="/admin/tailoring">طلبات التفصيل</Link></>}
        </nav>
      </details>
    </header>
  );
}
