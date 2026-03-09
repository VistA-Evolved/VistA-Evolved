'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-config';

export function PortalSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch(`${API_BASE}/portal/auth/session`, {
          credentials: 'include',
        });

        if (!res.ok) {
          router.replace('/');
          return;
        }

        if (!cancelled) {
          setStatus('ready');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === 'checking') {
    return <main style={{ flex: 1, padding: '1.5rem' }}>Loading portal session...</main>;
  }

  if (status === 'error') {
    return (
      <main style={{ flex: 1, padding: '1.5rem' }}>
        Unable to verify your portal session. Please refresh or sign in again.
      </main>
    );
  }

  return <>{children}</>;
}
