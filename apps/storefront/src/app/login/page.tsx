"use client";

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type Mode = 'password' | 'otp';
type OtpRequestResponse = { message: string; debugCode?: string };

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const getSafeNextPath = () => {
    if (typeof window === 'undefined') return '/';
    const value = new URLSearchParams(window.location.search).get('next') ?? '/';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/';
  };
  useEffect(() => {
    if (!loading && user) router.replace(getSafeNextPath());
  }, [loading, user, router]);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await apiRequest('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
      await refresh();
      router.replace(getSafeNextPath());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الدخول باستخدام Google.');
    } finally {
      setBusy(false);
    }
  }, [refresh, router]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await refresh();
      router.replace(getSafeNextPath());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الدخول.');
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await apiRequest<OtpRequestResponse>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({
          email,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      setOtpSent(true);
      setOtp('');
      setDebugOtp(result.debugCode ?? '');
      setNotice(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال رمز التحقق.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await apiRequest('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code: otp }),
      });
      await refresh();
      router.replace(getSafeNextPath());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'رمز التحقق غير صحيح.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">مرحبًا بعودتك</span>
        <h1>تسجيل الدخول</h1>
        <p>سجّل الدخول للوصول إلى المتجر وطلباتك.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {notice && <div className="form-success" role="status">{notice}</div>}

        <GoogleSignInButton onCredential={handleGoogleCredential} />
        <div className="auth-divider"><span>أو سجّل الدخول بالبريد الإلكتروني</span></div>
        <div className="auth-method-toggle" role="group" aria-label="طريقة تسجيل الدخول">
          <button type="button" className={mode === 'password' ? 'is-selected' : ''} onClick={() => { setMode('password'); setError(''); setNotice(''); }}>كلمة المرور</button>
          <button type="button" className={mode === 'otp' ? 'is-selected' : ''} onClick={() => { setMode('otp'); setError(''); setNotice(''); }}>رمز OTP</button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={submitPassword}>
            <label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} /></label>
            <label className="form-field">كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={72} /></label>
            <button className="button button-dark form-submit" disabled={busy}>{busy ? 'جارٍ تسجيل الدخول...' : 'دخول'}</button>
            <p className="form-note"><Link className="inline-link" href="/forgot-password">نسيت كلمة المرور؟ استعد حسابك</Link></p>
          </form>
        ) : (
          <>
            {!otpSent ? (
              <form onSubmit={requestOtp}>
                <p className="muted small">هنبعتلك رمزًا من 6 أرقام على بريدك. لو دي أول مرة، اكتب اسمك لإنشاء الحساب بعد التحقق.</p>
                <label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} /></label>
                <div className="two-fields">
                  <label className="form-field">الاسم الأول (للتسجيل الجديد)<input autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} maxLength={60} /></label>
                  <label className="form-field">اسم العائلة (للتسجيل الجديد)<input autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} maxLength={60} /></label>
                </div>
                <label className="form-field">رقم الهاتف (اختياري)<input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={30} /></label>
                <button className="button button-dark form-submit" disabled={busy}>{busy ? 'جارٍ إرسال الرمز...' : 'إرسال رمز OTP'}</button>
              </form>
            ) : (
              <form onSubmit={verifyOtp}>
                <p>أدخل الرمز المرسل إلى <strong>{email}</strong>. تنتهي صلاحيته خلال 10 دقائق.</p>
                {debugOtp && <p className="form-success">رمز للاختبار المحلي فقط: <strong>{debugOtp}</strong></p>}
                <label className="form-field">رمز التحقق المكون من 6 أرقام<input className="otp-code-input" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} minLength={6} maxLength={6} pattern="[0-9]{6}" required /></label>
                <button className="button button-dark form-submit" disabled={busy || otp.length !== 6}>{busy ? 'جارٍ التحقق...' : 'تأكيد الرمز والدخول'}</button>
                <button type="button" className="button button-light form-submit" disabled={busy} onClick={() => { setOtpSent(false); setDebugOtp(''); setNotice(''); }}>تغيير البريد أو إعادة الإرسال</button>
              </form>
            )}
          </>
        )}

        <p className="form-note">ليس لديك حساب؟ <Link className="inline-link" href="/register">إنشاء حساب جديد</Link></p>
      </section>
    </main>
  );
}
