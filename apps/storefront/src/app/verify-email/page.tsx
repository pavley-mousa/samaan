"use client";

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

function VerifyForm() {
  const params = useSearchParams(); const router = useRouter();
  const [token,setToken] = useState(''); const [error,setError] = useState(''); const [busy,setBusy] = useState(false);
  useEffect(()=>{setToken(params.get('token') ?? '');},[params]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError('');setBusy(true);try{await apiRequest('/auth/verify-email',{method:'POST',body:JSON.stringify({token})});router.replace('/');router.refresh();}catch(e){setError(e instanceof Error?e.message:'تعذر التحقق من البريد.');}finally{setBusy(false);}}
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">خطوة أخيرة</span><h1>تأكيد البريد الإلكتروني</h1><p>افتح رابط التحقق الذي وصلك، أو الصق الرمز في الحقل التالي.</p>{error&&<div className="form-error" role="alert">{error}</div>}<form onSubmit={submit}><label className="form-field">رمز التحقق<input value={token} onChange={e=>setToken(e.target.value)} required minLength={32} maxLength={200}/></label><button className="button button-dark form-submit" disabled={busy}>{busy?'جارٍ التحقق...':'تأكيد البريد والدخول'}</button></form></section></main>;
}
export default function VerifyEmailPage(){return <Suspense fallback={<main className="loading-shell">جارٍ تحميل التحقق...</main>}><VerifyForm/></Suspense>;}
