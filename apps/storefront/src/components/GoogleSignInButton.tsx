"use client";

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type GoogleCredentialResponse = { credential?: string };
type GoogleButtonOptions = {
  theme: 'outline';
  size: 'large';
  shape: 'rectangular';
  text: 'continue_with';
  logo_alignment: 'left';
  width: number;
  locale: string;
};
type GoogleIdentitySdk = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentitySdk;
  }
}

export default function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const container = containerRef.current;
    const sdk = window.google;
    if (!clientId || !scriptReady || !container || !sdk) return;
    container.replaceChildren();
    sdk.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) void callbackRef.current(response.credential);
      },
    });
    const width = Math.min(400, Math.max(240, Math.floor(container.clientWidth || 320)));
    sdk.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'left',
      width,
      locale: 'ar',
    });
    return () => container.replaceChildren();
  }, [clientId, scriptReady]);

  if (!clientId) {
    return <p className="google-auth-note">تسجيل Google يحتاج إعداد Client ID في إعدادات الموقع.</p>;
  }

  return (
    <div className="google-auth">
      <Script
        src="https://accounts.google.com/gsi/client?hl=ar"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      <div className="google-auth-container" ref={containerRef} aria-label="تسجيل الدخول باستخدام Google" />
      {scriptFailed && <p className="google-auth-note">تعذر تحميل تسجيل Google. تحقق من الاتصال بالإنترنت وحاول مرة أخرى.</p>}
    </div>
  );
}
