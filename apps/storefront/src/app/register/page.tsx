"use client";

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import GoogleSignInButton from '@/components/GoogleSignInButton';

type RegisterResponse = { message: string; verificationToken?: string };
type OtpRequestResponse = { message: string; debugCode?: string };
type Mode = 'password' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await apiRequest('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
      await refresh();
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إنشاء الحساب باستخدام Google.');
    } finally {
      setBusy(false);
    }
  }, [refresh, router]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await apiRequest<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email,
          phone: phone || undefined,
          password,
        }),
      });
      setMessage(result.message);
      if (result.verificationToken) setDevToken(result.verificationToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إنشاء الحساب.');
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await apiRequest<OtpRequestResponse>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email, phone: phone || undefined }),
      });
      setOtpSent(true);
      setOtp('');
      setDebugOtp(result.debugCode ?? '');
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر إرسال رمز التحقق.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await apiRequest('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code: otp }) });
      await refresh();
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'رمز التحقق غير صحيح.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyLocal() {
    setBusy(true);
    setError('');
    try {
      await apiRequest('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: devToken }) });
      await refresh();
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تأكيد البريد.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page auth-page-premium">
      <div className="auth-layout">
      <section className="auth-card auth-card-premium">
        <span className="eyebrow">حسابك في المتجر</span>
        <h1>إنشاء حساب</h1>
        <p>اختار الطريقة الأنسب لك: Google أو البريد الإلكتروني بكلمة مرور أو رمز OTP.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {message && <div className="form-success" role="status">{message}</div>}

        <GoogleSignInButton onCredential={handleGoogleCredential} />
        <div className="auth-divider"><span>أو أنشئ حسابًا بالبريد الإلكتروني</span></div>
        <div className="auth-method-toggle" role="group" aria-label="طريقة إنشاء الحساب">
          <button type="button" className={mode === 'password' ? 'is-selected' : ''} onClick={() => { setMode('password'); setError(''); setMessage(''); }}>بكلمة مرور</button>
          <button type="button" className={mode === 'otp' ? 'is-selected' : ''} onClick={() => { setMode('otp'); setError(''); setMessage(''); }}>برمز OTP</button>
        </div>

        {mode === 'password' ? (
          <>
            {!message && (
              <form onSubmit={submitPassword}>
                <div className="two-fields">
                  <label className="form-field">الاسم الأول<input autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} minLength={1} maxLength={60} required /></label>
                  <label className="form-field">اسم العائلة<input autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} minLength={1} maxLength={60} required /></label>
                </div>
                <label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required /></label>
                <label className="form-field">رقم الهاتف (اختياري)<input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={30} /></label>
                <label className="form-field">كلمة المرور<input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={10} maxLength={72} required /><span className="muted small">10 أحرف على الأقل.</span></label>
                <button className="button button-dark form-submit" disabled={busy}>{busy ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}</button>
              </form>
            )}
            {devToken && (
              <>
                <div className="form-success">رمز تحقق للاختبار المحلي فقط. في الإنتاج يُرسل رابط التأكيد إلى البريد الإلكتروني.</div>
                <label className="form-field">رمز التحقق<input value={devToken} onChange={event => setDevToken(event.target.value)} /></label>
                <button className="button button-dark form-submit" onClick={() => void verifyLocal()} disabled={busy}>تأكيد البريد والدخول</button>
              </>
            )}
          </>
        ) : (
          <>
            {!otpSent ? (
              <form onSubmit={requestOtp}>
                <div className="two-fields">
                  <label className="form-field">الاسم الأول<input autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} minLength={1} maxLength={60} required /></label>
                  <label className="form-field">اسم العائلة<input autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} minLength={1} maxLength={60} required /></label>
                </div>
                <label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required /></label>
                <label className="form-field">رقم الهاتف (اختياري)<input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={30} /></label>
                <p className="muted small">هنبعت رمز تحقق من 6 أرقام صالحًا لمدة 10 دقائق. مش هتحتاج كلمة مرور.</p>
                <button className="button button-dark form-submit" disabled={busy}>{busy ? 'جارٍ إرسال الرمز...' : 'إرسال رمز OTP'}</button>
              </form>
            ) : (
              <form onSubmit={verifyOtp}>
                <p>أدخل الرمز المرسل إلى <strong>{email}</strong>.</p>
                {debugOtp && <p className="form-success">رمز للاختبار المحلي فقط: <strong>{debugOtp}</strong></p>}
                <label className="form-field">رمز OTP<input className="otp-code-input" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} minLength={6} maxLength={6} pattern="[0-9]{6}" required /></label>
                <button className="button button-dark form-submit" disabled={busy || otp.length !== 6}>{busy ? 'جارٍ التحقق...' : 'تأكيد الرمز وإنشاء الحساب'}</button>
                <button type="button" className="button button-light form-submit" disabled={busy} onClick={() => { setOtpSent(false); setDebugOtp(''); setMessage(''); }}>تغيير البريد أو إعادة الإرسال</button>
              </form>
            )}
          </>
        )}

        <p className="form-note">لديك حساب بالفعل؟ <Link className="inline-link" href="/login">تسجيل الدخول</Link></p>
      </section>
      <aside className="auth-aside register-aside">
        <div className="auth-aside-brand"><span className="brand-mark">S</span><span>Samaan<small>الأقمشة والجلاليب</small></span></div>
        <div className="auth-aside-copy">
          <span className="eyebrow">حسابك الجديد</span>
          <h2>اختيارات تشبهك،<br /><span>وتفاصيل على مقاسك.</span></h2>
          <p>أنشئ حسابك بسهولة واحفظ بياناتك، تابع مشترياتك، وخلي تجربة اختيار الخامة والتفصيل أبسط.</p>
        </div>
        <div className="auth-aside-fabric-art" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="auth-aside-note"><span className="auth-aside-note-mark">✳</span><span><strong>ابدأ رحلتك مع Samaan</strong><small>كل ما تحتاجه في مكان واحد</small></span></div>
        <div className="auth-aside-number">SAMAAN / 02</div>
      </aside>
      </div>
    </main>
  );
}
