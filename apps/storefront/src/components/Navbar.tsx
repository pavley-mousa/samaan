"use client";

import Link from 'next/link';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useAuth } from './AuthProvider';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  function closeMobileMenu(event: ReactMouseEvent<HTMLElement>) {
    const menu = event.currentTarget.closest('details.mobile-menu') as HTMLDetailsElement | null;
    if (menu) menu.open = false;
  }
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
          <Link onClick={closeMobileMenu} href="/">الرئيسية</Link>
          <a onClick={closeMobileMenu} href="/#fabrics">الأقمشة</a>
          <a onClick={closeMobileMenu} href="/#products">الجلابيب</a>
          <Link onClick={closeMobileMenu} href="/cart">السلة</Link>
          <Link onClick={closeMobileMenu} href="/tailoring">تفصيل جلابية</Link>
          {user && <><Link onClick={closeMobileMenu} href="/account">حسابي وطلباتي</Link><Link onClick={closeMobileMenu} href="/favorites">المفضلة</Link></>}
          {user?.role === 'ADMIN' && <><Link onClick={closeMobileMenu} href="/admin">لوحة التحكم</Link><Link onClick={closeMobileMenu} href="/admin/tailoring">طلبات التفصيل</Link></>}
          {user && <button type="button" className="mobile-menu-logout" onClick={(event) => { closeMobileMenu(event); void logout(); }}>تسجيل الخروج</button>}
        </nav>
      </details>
    </header>
  );
}
