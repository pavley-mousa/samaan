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

  return <footer className="site-footer site-footer-expanded">
    <div className="footer-brand"><Link className="brand" href="/"><span className="brand-mark">S</span><span>Samaan<small>الأقمشة والجلاليب</small></span></Link><p>من اختيار الخامة إلى تفصيلة الجلابية، تجربة واحدة تليق بذوقك.</p></div>
    <nav className="footer-links" aria-label="روابط المتجر">
      <strong>روابط تهمك</strong>
      <Link href="/">الرئيسية</Link>
      <Link href="/tailoring">تفصيل جلابية</Link>
      <Link href="/account">حسابي وطلباتي</Link>
      {pages.map((page) => <Link key={page.id} href={`/pages/${encodeURIComponent(page.slug)}`}>{page.title}</Link>)}
    </nav>
    {user?.role === 'ADMIN' && <nav className="footer-admin-links" aria-label="أدوات الإدارة"><strong>إدارة الموقع</strong><Link href="/admin">إدارة المنتجات والطلبات</Link><Link href="/admin/tailoring">طلبات التفصيل</Link><Link href="/admin/content">صفحات البراند والفئات والمواعيد</Link></nav>}
    <div className="footer-copy">© {new Date().getFullYear()} Samaan <span>•</span> جميع الحقوق محفوظة</div>
  </footer>;
}
