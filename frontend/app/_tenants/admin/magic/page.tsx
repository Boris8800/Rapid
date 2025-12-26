'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiPost } from '../../../../lib/api';
import { saveSession, type SessionTokens } from '../../../../lib/session';

export default function AdminMagicLoginPage() {
  const tenant = 'admin' as const;
  const router = useRouter();
  const params = useSearchParams();

  const [status, setStatus] = useState<string>('Signing in…');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('Missing token.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const tokens = await apiPost<SessionTokens>('/v1/auth/magic-link/consume', { token });
        if (cancelled) return;
        saveSession(tenant, tokens);
        setStatus('Signed in. Redirecting…');
        router.replace('/');
      } catch (e) {
        if (cancelled) return;
        setStatus(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Admin Panel</h1>
      <p className="mt-2 text-sm text-gray-600">Magic link sign-in</p>
      <p className="mt-6 text-sm">{status}</p>
    </main>
  );
}
