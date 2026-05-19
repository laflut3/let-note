import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authMeRequest } from '@/features/auth/api';

type PublicOnlyRouteProps = {
  children: ReactNode;
};

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const [status, setStatus] = useState<'checking' | 'public' | 'authenticated'>('checking');

  useEffect(() => {
    let mounted = true;

    authMeRequest()
      .then((response) => {
        if (!mounted) {
          return;
        }

        setStatus(response.ok ? 'authenticated' : 'public');
      })
      .catch(() => {
        if (mounted) {
          setStatus('public');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-200">
        Verification de session...
      </main>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
