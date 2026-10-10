"use client";

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export function Navbar() {
  const { user, loading, logout } = useAuth();
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="العودة للرئيسية"><span className="brand-mark">S</span><span>Samaan<small>الأقمشة والجلاليب</small></span></Link>
      <nav className="main-nav" aria-label="القائمة الرئيسية">
        <Link href="/">الرئيسية</Link><a href="/#fabrics">الأقمشة</a><a href="/#products">الجلاليب</a><Link href="/cart">السلة</Link>
      </nav>
      <div className="nav-actions">
        {loading ? <span className="muted small">جارٍ التحقق...</span> : user ? <>
          <Link className="nav-user" href="/account">أهلًا، {user.name.split(' ')[0]}</Link><Link className="nav-user" href="/favorites">المفضلة</Link>
          <Link className="button button-light button-small" href="/cart">السلة</Link>
          {user.role === 'ADMIN' && <Link className="button button-dark button-small" href="/admin">لوحة التحكم</Link>}
          <button className="text-button" onClick={() => void logout()}>خروج</button>
        </> : <Link className="button button-dark button-small" href="/login">تسجيل الدخول</Link>}
      </div>
    </header>
  );
}
