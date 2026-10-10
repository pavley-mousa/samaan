"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتين.'); return; }
    if (!token) { setError('رابط الاستعادة غير مكتمل. اطلب رابطًا جديدًا.'); return; }
    setBusy(true);
    try {
      const result = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST', body: JSON.stringify({ token, password }),
      });
      setMessage(result.message); setPassword(''); setConfirmPassword('');
      window.setTimeout(() => router.replace('/login'), 1200);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تغيير كلمة المرور. اطلب رابط استعادة جديدًا.');
    } finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <span className="eyebrow">تأمين حسابك</span>
    <h1>تعيين كلمة مرور جديدة</h1>
    <p>اختار كلمة مرور جديدة من 10 أحرف على الأقل. رابط الاستعادة يُستخدم مرة واحدة فقط.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="form-success" role="status">{message}</div>}
    <form onSubmit={(event) => void submit(event)}>
      <label className="form-field">كلمة المرور الجديدة
        <input type="password" autoComplete="new-password" minLength={10} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      <label className="form-field">تأكيد كلمة المرور
        <input type="password" autoComplete="new-password" minLength={10} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
      </label>
      <button className="button button-dark form-submit" disabled={busy || !token}>{busy ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}</button>
    </form>
    <p className="form-note"><Link href="/login" className="inline-link">العودة لتسجيل الدخول</Link></p>
  </section></main>;
}
