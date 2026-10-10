"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { SitePageQuickActions } from '@/components/SitePageQuickActions';

type SitePage = { id: string; slug: string; title: string; content: string; isPublished: boolean; showInFooter: boolean; sortOrder: number; updatedAt: string };

export default function BrandPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true); setError('');
    void apiRequest<SitePage>(`/site-pages/${encodeURIComponent(slug)}`)
      .then((data) => { if (!cancelled) setPage(data); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'تعذر تحميل الصفحة.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <main className="loading-shell">جارٍ تحميل الصفحة...</main>;
  if (error || !page) return <main className="page-shell"><div className="empty-state"><h1>الصفحة غير متاحة</h1><p>{error || 'الصفحة غير منشورة أو غير موجودة.'}</p><Link href="/" className="button button-dark">العودة للمتجر</Link></div></main>;

  return <main className="page-shell brand-page">
    <div className="breadcrumbs"><Link href="/">الرئيسية</Link><span>←</span><span>{page.title}</span></div>
    <article className="brand-page-content"><SitePageQuickActions page={page} onChanged={() => window.location.reload()} /><span className="eyebrow">Samaan</span><h1 className="page-title">{page.title}</h1><div className="brand-page-copy">{page.content}</div></article>
  </main>;
}
