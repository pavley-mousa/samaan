"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiRequest } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST', body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال طلب الاستعادة. حاول مرة أخرى.');
    } finally { setBusy(false); }
  }

  return <main className="auth-page auth-page-premium"><div className="auth-layout"><section className="auth-card auth-card-premium">
    <span className="eyebrow">استعادة الحساب</span>
    <h1>نسيت كلمة المرور؟</h1>
    <p>اكتب البريد الإلكتروني المرتبط بحسابك. لو الحساب نشط، سنرسل رابطًا صالحًا لمدة 30 دقيقة.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="form-success" role="status">{message}</div>}
    <form onSubmit={(event) => void submit(event)}>
      <label className="form-field">البريد الإلكتروني
        <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
      </label>
      <button className="button button-dark form-submit" disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'إرسال رابط الاستعادة'}</button>
    </form>
    <p className="form-note"><Link href="/login" className="inline-link">العودة لتسجيل الدخول</Link></p>
  </section>
    <aside className="auth-aside">
      <div className="auth-aside-brand"><span className="brand-mark">S</span><span>Samaan<small>الأقمشة والجلاليب</small></span></div>
      <div className="auth-aside-copy">
        <span className="eyebrow">نرجّعك لحسابك</span>
        <h2>خطوة بسيطة،<br /><span>وترجع تكمل تسوّقك.</span></h2>
        <p>هنساعدك تستعيد الوصول لحسابك من خلال البريد الإلكتروني المرتبط بيه.</p>
      </div>
      <div className="auth-aside-fabric-art" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="auth-aside-note"><span className="auth-aside-note-mark">✳</span><span><strong>حسابك في أمان</strong><small>لا تشارك رابط الاستعادة مع أي شخص</small></span></div>
      <div className="auth-aside-number">SAMAAN / 03</div>
    </aside>
    </div></main>;
}
