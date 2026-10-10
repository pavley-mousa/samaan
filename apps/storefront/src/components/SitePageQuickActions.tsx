"use client";

import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type EditableSitePage = { id: string; title: string; slug: string; content: string; isPublished: boolean; showInFooter: boolean; sortOrder: number };

export function SitePageQuickActions({ page, onChanged }: { page: EditableSitePage; onChanged?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ title: page.title, slug: page.slug, content: page.content, isPublished: page.isPublished, showInFooter: page.showInFooter, sortOrder: String(page.sortOrder) });
  if (user?.role !== 'ADMIN') return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim().toLowerCase())) {
      setError('الرابط المختصر لازم يكون بالإنجليزية أو أرقام مع شرطات.');
      setBusy(false); return;
    }
    try {
      await apiRequest(`/admin/site-pages/${encodeURIComponent(page.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...draft, slug: draft.slug.trim().toLowerCase(), sortOrder: Number(draft.sortOrder) || 0 }),
      });
      setOpen(false);
      onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ الصفحة.');
    } finally { setBusy(false); }
  }

  return <div className="product-quick-actions site-page-quick-actions">
    <button type="button" className="quick-menu-trigger" aria-label="خيارات الصفحة" aria-expanded={open} onClick={() => setOpen((value) => !value)}>⋮</button>
    {open && <div className="quick-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="quick-edit-dialog" role="dialog" aria-modal="true" aria-labelledby={`page-quick-title-${page.id}`}>
        <div className="quick-edit-head"><div><span className="eyebrow">تعديل مباشر</span><h2 id={`page-quick-title-${page.id}`}>{page.title}</h2></div><button type="button" className="text-button" onClick={() => setOpen(false)} aria-label="إغلاق">×</button></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <form className="quick-edit-form" onSubmit={(event) => void save(event)}>
          <label className="form-field">عنوان الصفحة<input value={draft.title} maxLength={160} minLength={2} required onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label>
          <label className="form-field">الرابط المختصر<input value={draft.slug} maxLength={100} required onChange={(event) => setDraft({ ...draft, slug: event.target.value })}/></label>
          <label className="form-field form-field-wide">محتوى الصفحة<textarea rows={8} maxLength={30000} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })}/></label>
          <label className="content-check"><input type="checkbox" checked={draft.isPublished} onChange={(event) => setDraft({ ...draft, isPublished: event.target.checked })}/> منشورة</label>
          <label className="content-check"><input type="checkbox" checked={draft.showInFooter} onChange={(event) => setDraft({ ...draft, showInFooter: event.target.checked })}/> رابط في الفوتر</label>
          <label className="form-field">ترتيب الفوتر<input type="number" min="0" max="10000" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })}/></label>
          <div className="button-row form-field-wide"><button className="button button-dark" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button><button className="button button-light" type="button" onClick={() => setOpen(false)}>إلغاء</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
