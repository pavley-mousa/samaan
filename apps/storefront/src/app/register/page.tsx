"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

type RegisterResponse = { message: string; verificationToken?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const result = await apiRequest<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email, phone: phone || undefined, password }),
      });
      setMessage(result.message);
      if (result.verificationToken) setDevToken(result.verificationToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إنشاء الحساب.');
    } finally { setBusy(false); }
  }

  async function verifyLocal() {
    setBusy(true); setError('');
    try {
      await apiRequest('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: devToken }) });
      router.replace('/'); router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تأكيد البريد.');
    } finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card">
    <span className="eyebrow">حسابك في المتجر</span><h1>إنشاء حساب</h1>
    <p>اكتب اسمك الأول واسم العائلة عشان يظهر اسمك بشكل صحيح في الطلبات والفواتير.</p>
    {error && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="form-success" role="status">{message}</div>}
    {!message && <form onSubmit={(event) => void submit(event)}>
      <div className="two-fields">
        <label className="form-field">الاسم الأول<input autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} minLength={1} maxLength={60} required /></label>
        <label className="form-field">اسم العائلة<input autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} minLength={1} maxLength={60} required /></label>
      </div>
      <label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></label>
      <label className="form-field">رقم الهاتف (اختياري)<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} /></label>
      <label className="form-field">كلمة المرور<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={10} maxLength={72} required /><span className="muted small">10 أحرف على الأقل.</span></label>
      <button className="button button-dark form-submit" disabled={busy}>{busy ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}</button>
    </form>}
    {devToken && <><div className="form-success">رمز تحقق للاختبار المحلي فقط. في الإنتاج يُرسل الرابط إلى البريد الإلكتروني.</div><label className="form-field">رمز التحقق<input value={devToken} onChange={(event) => setDevToken(event.target.value)} /></label><button className="button button-dark form-submit" onClick={() => void verifyLocal()} disabled={busy}>تأكيد البريد والدخول</button></>}
    <p className="form-note">لديك حساب بالفعل؟ <Link className="inline-link" href="/login">تسجيل الدخول</Link></p>
  </section></main>;
}
