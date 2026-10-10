"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type PageRecord = { id: string; title: string; slug: string; content: string; isPublished: boolean; showInFooter: boolean; sortOrder: number; updatedAt: string };
type CategoryRecord = { id: string; name: string; slug: string; productType: string | null; parentId: string | null; parent?: { id: string; name: string; productType: string | null } | null; isActive: boolean; _count?: { products: number; children: number } };
type PickupSlot = { id: string; label: string; startsAt: string; endsAt: string; capacity: number; reservedCount: number; isActive: boolean };
type VideoUpload = { uploadUrl: string; publicUrl: string; objectPath: string; contentType: string };

const families = [
  ['fabric', 'أقمشة'],
  ['ready_galabiya', 'جلابيب جاهزة'],
  ['custom_galabiya', 'أنواع الجلابيات التفصيل'],
  ['accessory', 'إكسسوارات'],
] as const;

export default function AdminContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [savedVideoUrl, setSavedVideoUrl] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageDraft, setPageDraft] = useState({ title: '', slug: '', content: '', isPublished: false, showInFooter: true, sortOrder: '0' });
  const [categoryId, setCategoryId] = useState('');
  const [categoryDraft, setCategoryDraft] = useState({ name: '', slug: '', description: '', productType: 'fabric', parentId: '' });
  const [slotDraft, setSlotDraft] = useState({ label: '', startsAt: '', endsAt: '', capacity: '1' });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=%2Fadmin%2Fcontent');
    else if (!loading && user && user.role !== 'ADMIN') router.replace('/');
  }, [loading, user, router]);

  async function reload() {
    const [nextPages, nextCategories, nextSlots, video] = await Promise.all([
      apiRequest<PageRecord[]>('/admin/site-pages'),
      apiRequest<CategoryRecord[]>('/admin/categories'),
      apiRequest<PickupSlot[]>('/admin/pickup-slots'),
      apiRequest<{ videoUrl: string | null }>('/site-settings/measurement-video').catch(() => ({ videoUrl: null })),
    ]);
    setPages(nextPages);
    setCategories(nextCategories);
    setSlots(nextSlots);
    setVideoUrl(video.videoUrl || '');
    setSavedVideoUrl(video.videoUrl || '');
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    void reload().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل إعدادات الموقع.'))
      .finally(() => setLoadingData(false));
  }, [user]);

  function editPage(page: PageRecord) {
    setPageId(page.id);
    setPageDraft({ title: page.title, slug: page.slug, content: page.content, isPublished: page.isPublished, showInFooter: page.showInFooter, sortOrder: String(page.sortOrder) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetPageForm() {
    setPageId('');
    setPageDraft({ title: '', slug: '', content: '', isPublished: false, showInFooter: true, sortOrder: '0' });
  }

  async function savePage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const slug = pageDraft.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError('الرابط المختصر لازم يكون بالإنجليزي أو أرقام مع شرطات، مثل about-samaan.');
      setBusy(false); return;
    }
    try {
      const payload = { ...pageDraft, slug, sortOrder: Number(pageDraft.sortOrder) || 0 };
      if (pageId) await apiRequest(`/admin/site-pages/${encodeURIComponent(pageId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await apiRequest('/admin/site-pages', { method: 'POST', body: JSON.stringify(payload) });
      setNotice(pageId ? 'تم تحديث الصفحة.' : 'تم إنشاء الصفحة.');
      resetPageForm();
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الصفحة.'); }
    finally { setBusy(false); }
  }

  async function archivePage(page: PageRecord) {
    if (!window.confirm(`إخفاء صفحة «${page.title}» من الموقع والفوتر؟`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/admin/site-pages/${encodeURIComponent(page.id)}`, { method: 'DELETE' });
      setNotice('تم إخفاء الصفحة.');
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إخفاء الصفحة.'); }
    finally { setBusy(false); }
  }

  async function saveVideoLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest<{ videoUrl: string | null }>('/admin/site-settings/measurement-video', {
        method: 'PATCH', body: JSON.stringify({ videoUrl: videoUrl.trim() || null }),
      });
      setVideoUrl(result.videoUrl || ''); setSavedVideoUrl(result.videoUrl || '');
      setNotice('تم تحديث فيديو طريقة أخذ المقاسات.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ رابط الفيديو.'); }
    finally { setBusy(false); }
  }

  async function uploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!videoFile) { setError('اختار ملف فيديو أولًا.'); return; }
    if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(videoFile.type)) { setError('الصيغ المسموحة: MP4 أو WEBM أو MOV.'); return; }
    if (videoFile.size > 100 * 1024 * 1024) { setError('أقصى حجم للفيديو 100 ميجابايت.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const upload = await apiRequest<VideoUpload>('/admin/site-settings/measurement-video/upload-url', {
        method: 'POST',
        body: JSON.stringify({ filename: videoFile.name, contentType: videoFile.type, fileSize: videoFile.size }),
      });
      const uploaded = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': videoFile.type }, body: videoFile });
      if (!uploaded.ok) throw new Error('فشل رفع الفيديو إلى التخزين. راجع نوع الملف وحاول مرة أخرى.');
      const saved = await apiRequest<{ videoUrl: string | null }>('/admin/site-settings/measurement-video', {
        method: 'PATCH', body: JSON.stringify({ videoUrl: upload.publicUrl }),
      });
      setVideoUrl(saved.videoUrl || ''); setSavedVideoUrl(saved.videoUrl || ''); setVideoFile(null);
      setNotice('تم رفع الفيديو وحفظه. هيظهر في صفحة التفصيل للعملاء.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر رفع الفيديو. لو ظهر خطأ إعداد، استخدم رابط فيديو مؤقتًا أو أكمل متغيرات التخزين.'); }
    finally { setBusy(false); }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const slug = categoryDraft.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setError('اكتب رابطًا مختصرًا بالإنجليزية أو أرقام، مثل cotton-light.'); setBusy(false); return; }
    try {
      const payload = { ...categoryDraft, slug, sortOrder: 0, ...(categoryDraft.parentId ? {} : { parentId: undefined }) };
      if (categoryId) await apiRequest(`/admin/categories/${encodeURIComponent(categoryId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await apiRequest('/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
      setNotice(categoryId ? 'تم تحديث الفئة.' : 'تمت إضافة الفئة أو النوع.');
      setCategoryId('');
      setCategoryDraft({ name: '', slug: '', description: '', productType: 'fabric', parentId: '' });
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ الفئة.'); }
    finally { setBusy(false); }
  }

  function editCategory(category: CategoryRecord) {
    setCategoryId(category.id);
    setCategoryDraft({ name: category.name, slug: category.slug, description: '', productType: category.productType || category.parent?.productType || 'fabric', parentId: category.parentId || '' });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  async function archiveCategory(category: CategoryRecord) {
    if (!window.confirm(`تعطيل الفئة «${category.name}»؟ لو مرتبطة بمنتجات أو أنواع فرعية، هتتخفى بدل ما تتحذف.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/admin/categories/${encodeURIComponent(category.id)}`, { method: 'DELETE' });
      setNotice('تم حذف الفئة أو إخفاؤها بحسب ارتباطاتها.');
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر تعطيل الفئة.'); }
    finally { setBusy(false); }
  }

  async function createSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    if (!slotDraft.startsAt || !slotDraft.endsAt) { setError('حدد بداية الموعد ونهايته.'); setBusy(false); return; }
    try {
      await apiRequest('/admin/pickup-slots', {
        method: 'POST',
        body: JSON.stringify({ label: slotDraft.label, startsAt: new Date(slotDraft.startsAt).toISOString(), endsAt: new Date(slotDraft.endsAt).toISOString(), capacity: Number(slotDraft.capacity) }),
      });
      setSlotDraft({ label: '', startsAt: '', endsAt: '', capacity: '1' });
      setNotice('تم إضافة موعد استلام للجلابيات التفصيل.');
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إضافة موعد الاستلام.'); }
    finally { setBusy(false); }
  }

  async function deactivateSlot(slot: PickupSlot) {
    if (!window.confirm(`إيقاف الموعد «${slot.label}» للحجوزات الجديدة؟`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/admin/pickup-slots/${encodeURIComponent(slot.id)}`, { method: 'DELETE' });
      setNotice('تم إيقاف الموعد.');
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر إيقاف الموعد.'); }
    finally { setBusy(false); }
  }

  if (loading || !user || user.role !== 'ADMIN' || loadingData) return <main className="loading-shell">جارٍ تحميل إدارة محتوى الموقع...</main>;

  const videoIsYoutube = /youtube\.com|youtu\.be/i.test(videoUrl);
  const youtubeId = videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/)?.[1];
  const childOptions = categories.filter((category) => !category.parentId && (!categoryId || category.id !== categoryId) && category.productType === categoryDraft.productType);
  return <main className="page-shell admin-page">
    <div className="admin-page-head"><div><span className="eyebrow">تخصيص البراند</span><h1 className="page-title">محتوى وروابط الموقع</h1><p className="muted">عدّل صفحات الفوتر، وفئات الأقمشة وأنواع الجلابيات، ومواعيد الاستلام، وفيديو المقاسات من مكان واحد.</p></div><Link href="/admin" className="button button-light">لوحة المتجر ←</Link></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {notice && <div className="form-success" role="status">{notice}</div>}

    <section className="admin-section content-admin-section">
      <div className="section-head"><div><span className="eyebrow">الصفحات والروابط</span><h2>صفحات البراند في الفوتر</h2><p className="section-desc">الصفحة المنشورة تظهر لعملاء المتجر. رابط الفوتر لا يظهر إلا إذا فعّلت اختياره.</p></div><span className="pill">{pages.length} صفحة</span></div>
      <form className="product-admin-form" onSubmit={(event) => void savePage(event)}>
        <label className="form-field">عنوان الصفحة<input value={pageDraft.title} onChange={(event) => setPageDraft({ ...pageDraft, title: event.target.value })} minLength={2} maxLength={160} required placeholder="من نحن"/></label>
        <label className="form-field">الرابط المختصر<input value={pageDraft.slug} onChange={(event) => setPageDraft({ ...pageDraft, slug: event.target.value })} minLength={2} maxLength={100} required placeholder="about-samaan"/></label>
        <label className="form-field">ترتيب الفوتر<input type="number" min="0" max="10000" value={pageDraft.sortOrder} onChange={(event) => setPageDraft({ ...pageDraft, sortOrder: event.target.value })}/></label>
        <label className="form-field form-field-wide">محتوى الصفحة<textarea rows={6} maxLength={30000} value={pageDraft.content} onChange={(event) => setPageDraft({ ...pageDraft, content: event.target.value })} placeholder="اكتب النص الذي سيظهر في صفحة البراند."></textarea></label>
        <label className="content-check"><input type="checkbox" checked={pageDraft.isPublished} onChange={(event) => setPageDraft({ ...pageDraft, isPublished: event.target.checked })}/> منشورة على الموقع</label>
        <label className="content-check"><input type="checkbox" checked={pageDraft.showInFooter} onChange={(event) => setPageDraft({ ...pageDraft, showInFooter: event.target.checked })}/> أظهر رابطها في الفوتر</label>
        <div className="form-field form-field-wide button-row"><button type="submit" className="button button-dark" disabled={busy}>{busy ? 'جارٍ الحفظ...' : pageId ? 'حفظ الصفحة' : 'إضافة صفحة'}</button>{pageId && <button type="button" className="button button-light" onClick={resetPageForm}>إلغاء التعديل</button>}</div>
      </form>
      <div className="content-record-list">{pages.map((page) => <article className="content-record" key={page.id}><div><strong>{page.title}</strong><p className="muted small">/pages/{page.slug} · {page.isPublished ? 'منشورة' : 'مسودة'} · {page.showInFooter ? 'تظهر في الفوتر' : 'بدون رابط فوتر'}</p></div><div className="button-row"><Link className="button button-light button-small" href={`/pages/${encodeURIComponent(page.slug)}`} target="_blank">معاينة</Link><button className="button button-light button-small" type="button" onClick={() => editPage(page)}>تعديل</button><button className="button button-light button-small" type="button" onClick={() => void archivePage(page)} disabled={busy}>إخفاء</button></div></article>)}</div>
    </section>

    <section className="admin-section content-admin-section">
      <div className="section-head"><div><span className="eyebrow">دليل المقاسات</span><h2>فيديو طريقة أخذ المقاسات</h2><p className="section-desc">يمكن رفع فيديو MP4 / WEBM / MOV حتى 100 ميجابايت أو حفظ رابط HTTPS لفيديو خارجي.</p></div></div>
      {savedVideoUrl && <div className="measurement-video-preview">{videoIsYoutube && youtubeId ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title="معاينة فيديو المقاسات" allowFullScreen/> : <video src={savedVideoUrl} controls/>}</div>}
      <form className="product-admin-form" onSubmit={(event) => void saveVideoLink(event)}>
        <label className="form-field form-field-wide">رابط الفيديو الحالي أو رابط فيديو خارجي<input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} maxLength={2048} placeholder="https://..."/></label>
        <div className="form-field form-field-wide button-row"><button className="button button-dark" type="submit" disabled={busy}>حفظ رابط الفيديو</button><button type="button" className="button button-light" onClick={() => { setVideoUrl(savedVideoUrl); setVideoFile(null); }}>إلغاء</button></div>
      </form>
      <form className="product-admin-form video-upload-form" onSubmit={(event) => void uploadVideo(event)}>
        <label className="form-field form-field-wide">رفع ملف فيديو<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => setVideoFile(event.target.files?.[0] || null)}/>{videoFile && <small>{videoFile.name} · {(videoFile.size / (1024 * 1024)).toFixed(1)} ميجابايت</small>}</label>
        <div className="form-field form-field-wide"><button className="button button-dark" type="submit" disabled={busy || !videoFile}>{busy ? 'جارٍ رفع الفيديو...' : 'رفع الفيديو وتفعيله'}</button></div>
      </form>
    </section>

    <section className="admin-section content-admin-section">
      <div className="section-head"><div><span className="eyebrow">الكتالوج</span><h2>فئات الأقمشة وأنواعها والجلابيات التفصيل</h2><p className="section-desc">اختر نوع المنتج، وأنشئ فئة رئيسية ثم أضف تحتها أنواعًا فرعية. تُستخدم التصنيفات عند تسجيل المنتجات.</p></div></div>
      <form className="product-admin-form" onSubmit={(event) => void saveCategory(event)}>
        <label className="form-field">اسم الفئة أو النوع<input value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} minLength={2} maxLength={120} required/></label>
        <label className="form-field">Slug / رابط مختصر<input value={categoryDraft.slug} onChange={(event) => setCategoryDraft({ ...categoryDraft, slug: event.target.value })} minLength={2} maxLength={100} required placeholder="cotton-light"/></label>
        <label className="form-field">ينتمي إلى نوع المنتج<select value={categoryDraft.productType} onChange={(event) => setCategoryDraft({ ...categoryDraft, productType: event.target.value, parentId: '' })}>{families.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field form-field-wide">الفئة الرئيسية (اختياري)<select value={categoryDraft.parentId} onChange={(event) => setCategoryDraft({ ...categoryDraft, parentId: event.target.value })}><option value="">فئة رئيسية</option>{childOptions.map((category) => <option key={category.id} value={category.id}>{category.parent?.name ? `${category.parent.name} / ` : ''}{category.name}</option>)}</select></label>
        <label className="form-field form-field-wide">وصف مختصر (اختياري)<textarea rows={2} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} maxLength={1000}/></label>
        <div className="form-field form-field-wide button-row"><button className="button button-dark" type="submit" disabled={busy}>{categoryId ? 'حفظ الفئة' : 'إضافة فئة / نوع'}</button>{categoryId && <button className="button button-light" type="button" onClick={() => { setCategoryId(''); setCategoryDraft({ name: '', slug: '', description: '', productType: 'fabric', parentId: '' }); }}>إلغاء التعديل</button>}</div>
      </form>
      <div className="content-record-list">{categories.map((category) => <article className="content-record" key={category.id}><div><strong>{category.parent?.name ? `${category.parent.name} / ` : ''}{category.name}</strong><p className="muted small">{families.find(([value]) => value === category.productType)?.[1] || 'لم يحدد النوع'} · {category._count?.products ?? 0} منتج · {category.isActive ? 'نشطة' : 'مخفية'}</p></div><div className="button-row"><button className="button button-light button-small" type="button" onClick={() => editCategory(category)}>تعديل</button><button className="button button-light button-small" type="button" onClick={() => void archiveCategory(category)} disabled={busy}>تعطيل</button></div></article>)}</div>
    </section>

    <section className="admin-section content-admin-section">
      <div className="section-head"><div><span className="eyebrow">الاستلام من المتجر</span><h2>مواعيد استلام الجلابيات التفصيل</h2><p className="section-desc">هذه المواعيد تظهر لطلبات التفصيل فقط، وليس طلبات الأقمشة أو الجلابيات الجاهزة.</p></div></div>
      <form className="product-admin-form" onSubmit={(event) => void createSlot(event)}>
        <label className="form-field form-field-wide">اسم الموعد<input value={slotDraft.label} onChange={(event) => setSlotDraft({ ...slotDraft, label: event.target.value })} required maxLength={160} placeholder="مثال: استلام مسائي — السبت"/></label>
        <label className="form-field">بداية الموعد<input type="datetime-local" value={slotDraft.startsAt} onChange={(event) => setSlotDraft({ ...slotDraft, startsAt: event.target.value })} required/></label>
        <label className="form-field">نهاية الموعد<input type="datetime-local" value={slotDraft.endsAt} onChange={(event) => setSlotDraft({ ...slotDraft, endsAt: event.target.value })} required/></label>
        <label className="form-field">عدد الحجوزات المتاحة<input type="number" value={slotDraft.capacity} onChange={(event) => setSlotDraft({ ...slotDraft, capacity: event.target.value })} min="1" max="100" required/></label>
        <div className="form-field form-field-wide"><button className="button button-dark" type="submit" disabled={busy}>إضافة موعد استلام</button></div>
      </form>
      <div className="content-record-list">{slots.map((slot) => <article className="content-record" key={slot.id}><div><strong>{slot.label}</strong><p className="muted small">{new Date(slot.startsAt).toLocaleString('ar-EG')} — {new Date(slot.endsAt).toLocaleTimeString('ar-EG')} · الحجوزات {slot.reservedCount}/{slot.capacity} · {slot.isActive ? 'متاح للحجز' : 'متوقف'}</p></div>{slot.isActive && <button className="button button-light button-small" type="button" onClick={() => void deactivateSlot(slot)} disabled={busy}>إيقاف الموعد</button>}</article>)}</div>
    </section>
  </main>;
}
