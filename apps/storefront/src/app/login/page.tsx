"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const getSafeNextPath = () => {
    if (typeof window === 'undefined') return '/';
    const value = new URLSearchParams(window.location.search).get('next') ?? '/';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/';
  };
  useEffect(() => { if (!loading && user) router.replace(getSafeNextPath()); }, [loading, user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await refresh(); router.replace(getSafeNextPath());
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تسجيل الدخول.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">مرحبًا بعودتك</span><h1>تسجيل الدخول</h1><p>سجّل الدخول للوصول إلى المتجر وطلباتك.</p>{error && <div className="form-error" role="alert">{error}</div>}<form onSubmit={submit}><label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} /></label><label className="form-field">كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={72} /></label><button className="button button-dark form-submit" disabled={busy}>{busy?'جارٍ تسجيل الدخول...':'دخول'}</button></form><p className="form-note"><Link className="inline-link" href="/forgot-password">نسيت كلمة المرور؟ استعد حسابك</Link></p><p className="form-note">ليس لديك حساب؟ <Link className="inline-link" href="/register">إنشاء حساب جديد</Link></p></section></main>;
}
