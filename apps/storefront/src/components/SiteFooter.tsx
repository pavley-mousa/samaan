"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type FooterPage = { id: string; slug: string; title: string; sortOrder: number };

export function SiteFooter() {
  const { user } = useAuth();
  const [pages, setPages] = useState<FooterPage[]>([]);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<FooterPage[]>('/site-pages')
      .then((data) => { if (!cancelled) setPages(data); })
      .catch(() => { if (!cancelled) setPages([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <footer className="site-footer site-footer-expanded">
      <div className="footer-main-grid">
        <div className="footer-brand">
          <Link className="brand" href="/" aria-label="Samaan - الصفحة الرئيسية">
            <span className="brand-mark">S</span>
            <span>Samaan<small>الأقمشة والجلاليب</small></span>
          </Link>
          <p>من اختيار الخامة إلى تفصيلة الجلابية، تجربة تسوّق تجمع ذوقك واحتياجك في مكان واحد.</p>
          <Link href="/tailoring" className="footer-brand-cta">ابدأ طلب تفصيل <span aria-hidden="true">←</span></Link>
        </div>

        <nav className="footer-link-column" aria-label="تصفّح المتجر">
          <strong>تصفّح المتجر</strong>
          <Link href="/">الرئيسية</Link>
          <Link href="/#fabrics">الأقسام</Link>
          <Link href="/#products">كل المنتجات</Link>
          <Link href="/tailoring">تفصيل حسب الطلب</Link>
          <Link href="/cart">سلة التسوق</Link>
        </nav>

        <nav className="footer-link-column" aria-label="حساب العميل">
          <strong>حسابك</strong>
          <Link href={user ? "/account" : "/login"}>{user ? "حسابي وطلباتي" : "تسجيل الدخول"}</Link>
          {!user && <Link href="/register">إنشاء حساب جديد</Link>}
          <Link href="/favorites">المفضلة</Link>
          <Link href={user ? "/account" : "/login?next=%2Faccount"}>متابعة الطلبات</Link>
        </nav>

        {pages.length > 0 && (
          <nav className="footer-link-column" aria-label="معلومات وسياسات المتجر">
            <strong>معلومات المتجر</strong>
            {pages.map((page) => (
              <Link key={page.id} href={`/pages/${encodeURIComponent(page.slug)}`}>{page.title}</Link>
            ))}
          </nav>
        )}

        {user?.role === 'ADMIN' && (
          <nav className="footer-link-column footer-admin-links" aria-label="أدوات الإدارة">
            <strong>إدارة المتجر</strong>
            <Link href="/admin">المنتجات والطلبات</Link>
            <Link href="/admin/tailoring">طلبات التفصيل</Link>
            <Link href="/admin/content">المحتوى والفئات والمواعيد</Link>
          </nav>
        )}
      </div>

      <div className="footer-bottom">
        <Link className="footer-bottom-brand" href="/">Samaan<span>®</span></Link>
        <p>© {new Date().getFullYear()} Samaan — جميع الحقوق محفوظة</p>
        <a className="footer-top-link" href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>للأعلى ↑</a>
      </div>
    </footer>
  );
}
