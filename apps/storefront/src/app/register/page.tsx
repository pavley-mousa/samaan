"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

type RegisterResponse = { message: string; verificationToken?: string };
export default function RegisterPage() {
  const router = useRouter();
  const [name,setName] = useState(''); const [email,setEmail] = useState(''); const [phone,setPhone] = useState(''); const [password,setPassword] = useState('');
  const [error,setError] = useState(''); const [message,setMessage] = useState(''); const [devToken,setDevToken] = useState(''); const [busy,setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try { const result = await apiRequest<RegisterResponse>('/auth/register',{method:'POST',body:JSON.stringify({name,email,phone:phone || undefined,password})}); setMessage(result.message); if(result.verificationToken) setDevToken(result.verificationToken); }
    catch(e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء الحساب.'); }
    finally { setBusy(false); }
  }
  async function verifyLocal() {
    setBusy(true);setError('');
    try { await apiRequest('/auth/verify-email',{method:'POST',body:JSON.stringify({token:devToken})}); router.replace('/'); router.refresh(); }
    catch(e){setError(e instanceof Error?e.message:'تعذر تأكيد البريد.');}
    finally{setBusy(false);}
  }
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">حسابك في المتجر</span><h1>إنشاء حساب</h1><p>كل الحسابات الجديدة تبدأ كعملاء. لا يمكن اختيار دور المدير من صفحة التسجيل.</p>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}{!message && <form onSubmit={submit}><label className="form-field">الاسم بالكامل<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={120} required /></label><label className="form-field">البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required /></label><label className="form-field">رقم الهاتف (اختياري)<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} /></label><label className="form-field">كلمة المرور<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} maxLength={72} required /><span className="muted small">10 أحرف على الأقل.</span></label><button className="button button-dark form-submit" disabled={busy}>{busy?'جارٍ إنشاء الحساب...':'إنشاء الحساب'}</button></form>}{devToken && <><div className="form-success">رمز تحقق للاختبار المحلي فقط. في الإنتاج يُرسل الرابط إلى البريد الإلكتروني.</div><label className="form-field">رمز التحقق<input value={devToken} onChange={e=>setDevToken(e.target.value)} /></label><button className="button button-dark form-submit" onClick={()=>void verifyLocal()} disabled={busy}>تأكيد البريد والدخول</button></>}<p className="form-note">لديك حساب بالفعل؟ <Link className="inline-link" href="/login">تسجيل الدخول</Link></p></section></main>;
}
