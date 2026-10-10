"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiRequest } from '@/lib/api';

type AdminTailoringRequest = {
  id: string;
  status: string;
  quotedPrice?: number | string | null;
  estimatedDays?: number | null;
  createdAt: string;
  fabricDescription?: string | null;
  colorName?: string | null;
  sizeLabel?: string | null;
  bodyMeasurements: Record<string, number>;
  customerNotes?: string | null;
  product?: { name: string } | null;
  fabricVariant?: { colorName?: string | null; sizeLabel?: string | null; product: { name: string; fabricType?: string | null } } | null;
  user: { id: string; name: string; email: string; phone?: string | null };
};
type Draft = { status: string; price: string; days: string };

const statusLabels: Record<string, string> = {
  submitted: 'تم الاستلام',
  reviewing: 'قيد المراجعة',
  quoted: 'عرض السعر جاهز',
  approved: 'وافق العميل على السعر',
  in_progress: 'قيد التنفيذ',
  ready: 'جاهز للتسليم',
  delivered: 'تم التسليم',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

const nextStatuses: Record<string, string[]> = {
  submitted: ['reviewing', 'quoted', 'rejected', 'cancelled'],
  reviewing: ['quoted', 'rejected', 'cancelled'],
  quoted: ['quoted', 'rejected', 'cancelled'],
  approved: ['in_progress', 'cancelled'],
  in_progress: ['ready'],
  ready: ['delivered'],
  delivered: [],
  rejected: [],
  cancelled: [],
};

const measurementLabels: Record<string, string> = {
  height: 'الطول',
  shoulder: 'الكتف',
  chest: 'الصدر',
  waist: 'الوسط',
  hip: 'الأرداف',
  sleeveLength: 'طول الكم',
  garmentLength: 'طول الجلابية',
  neck: 'الرقبة',
  wrist: 'الرسغ',
  armhole: 'حردة الإبط',
  cuff: 'الأسورة',
};

export default function AdminTailoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<AdminTailoringRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=%2Fadmin%2Ftailoring');
    else if (!loading && user && user.role !== 'ADMIN') router.replace('/');
  }, [loading, user, router]);

  async function loadRequests() {
    const data = await apiRequest<AdminTailoringRequest[]>('/admin/tailoring');
    setRequests(data);
    setDrafts((current) => {
      const next = { ...current };
      for (const item of data) {
        if (!next[item.id]) {
          next[item.id] = {
            status: item.status,
            price: item.quotedPrice == null ? '' : String(Number(item.quotedPrice)),
            days: item.estimatedDays == null ? '' : String(item.estimatedDays),
          };
        }
      }
      return next;
    });
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    setBusy(true);
    void loadRequests()
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحميل طلبات التفصيل.'))
      .finally(() => setBusy(false));
  }, [user]);

  function patchDraft(id: string, changes: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { status: 'reviewing', price: '', days: '' }), ...changes } }));
  }

  async function save(item: AdminTailoringRequest) {
    const draft = drafts[item.id];
    if (!draft) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const payload = {
        status: draft.status,
        ...(draft.status === 'quoted' ? {
          quotedPrice: Number(draft.price),
          ...(draft.days.trim() ? { estimatedDays: Number(draft.days) } : {}),
        } : {}),
      };
      await apiRequest(`/admin/tailoring/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setNotice('تم تحديث طلب التفصيل.');
      await loadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحديث الطلب.');
    } finally { setBusyId(null); }
  }

  if (loading || !user || user.role !== 'ADMIN') return <main className="loading-shell">جارٍ التحقق من صلاحيات الإدارة...</main>;

  return <main className="page-shell admin-page">
    <div className="admin-page-head"><div><span className="eyebrow">إدارة التفصيل</span><h1 className="page-title">طلبات التفصيل</h1><p className="muted">إرسال عرض السعر لا يبدأ التنفيذ؛ يجب أن يوافق العميل أولًا.</p></div><Link href="/admin" className="button button-light">العودة للوحة التحكم ←</Link></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {notice && <div className="form-success" role="status">{notice}</div>}
    <div className="section-head"><h2>الطلبات الواردة</h2><button type="button" className="button button-light button-small" disabled={busy} onClick={() => { setBusy(true); void loadRequests().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'تعذر تحديث القائمة.')).finally(() => setBusy(false)); }}>تحديث ↻</button></div>
    {requests.length === 0 ? <div className="empty-state"><p>لا توجد طلبات تفصيل حتى الآن.</p></div> : <div className="admin-orders-list">
      {requests.map((item) => {
        const draft = drafts[item.id] ?? { status: item.status, price: item.quotedPrice == null ? '' : String(Number(item.quotedPrice)), days: item.estimatedDays == null ? '' : String(item.estimatedDays) };
        const available = nextStatuses[item.status] ?? [];
        const measured = Object.entries(item.bodyMeasurements || {}).filter((entry) => Number.isFinite(Number(entry[1])));
        return <article className="order-card" key={item.id}>
          <div className="order-card-head"><div><strong>{item.product?.name || item.fabricVariant?.product.name || item.fabricDescription || 'طلب تفصيل خاص'}</strong><p className="muted small">تاريخ الطلب: {new Date(item.createdAt).toLocaleString('ar-EG')}</p></div><span className="status-chip">{statusLabels[item.status] || item.status}</span></div>
          <div className="order-customer"><strong>{item.user.name}</strong><span>{item.user.email} · {item.user.phone || 'بدون هاتف'}</span></div>
          <p className="muted small">{[item.fabricVariant?.product.name, item.fabricVariant?.colorName, item.colorName, item.sizeLabel, item.fabricDescription].filter(Boolean).join(' · ')}</p>
          {item.customerNotes && <p>{item.customerNotes}</p>}
          {measured.length > 0 && <div className="order-card-items">{measured.map(([key, value]) => <span key={key}>{measurementLabels[key] || key}: {Number(value)} سم</span>)}</div>}
          {item.quotedPrice != null && <p><strong>آخر سعر معروض: {Number(item.quotedPrice).toLocaleString('ar-EG')} ج.م</strong>{item.estimatedDays ? ` · ${item.estimatedDays} يوم` : ''}</p>}
          {available.length > 0 ? <div className="product-admin-form">
            <label className="form-field">الحالة التالية<select value={draft.status} onChange={(event) => patchDraft(item.id, { status: event.target.value })}>{available.map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}</select></label>
            {draft.status === 'quoted' && <>
              <label className="form-field">سعر التفصيل (ج.م)<input type="number" min="0.01" max="10000000" step="0.01" value={draft.price} onChange={(event) => patchDraft(item.id, { price: event.target.value })} required /></label>
              <label className="form-field">مدة التنفيذ بالأيام<input type="number" min="1" max="365" step="1" value={draft.days} onChange={(event) => patchDraft(item.id, { days: event.target.value })} /></label>
            </>}
            <div className="form-field product-form-submit"><button type="button" className="button button-dark" disabled={busyId === item.id || (draft.status === 'quoted' && !(Number(draft.price) > 0))} onClick={() => void save(item)}>{busyId === item.id ? 'جارٍ الحفظ...' : 'حفظ التغيير'}</button></div>
          </div> : <p className="muted small">هذه حالة نهائية ولا يمكن تغييرها تلقائيًا.</p>}
        </article>;
      })}
    </div>}
  </main>;
}
