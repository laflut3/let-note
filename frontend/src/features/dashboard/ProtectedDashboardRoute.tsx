import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authMeRequest } from '@/features/auth/api';

type ProtectedDashboardRouteProps = {
  children: ReactNode;
};

export function ProtectedDashboardRoute({ children }: ProtectedDashboardRouteProps) {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking');

  useEffect(() => {
    let mounted = true;

    authMeRequest()
      .then((response) => {
        if (!mounted) {
          return;
        }

        setStatus(response.ok ? 'allowed' : 'blocked');
      })
      .catch(() => {
        if (mounted) {
          setStatus('blocked');
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

  if (status === 'blocked') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
