import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authMeRequest } from '@/features/auth/api';

type ProtectedAdminRouteProps = {
  children: ReactNode;
};

type AccessStatus = 'checking' | 'allowed' | 'blocked';

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const [status, setStatus] = useState<AccessStatus>('checking');

  useEffect(() => {
    let mounted = true;

    authMeRequest()
      .then(async (response) => {
        if (!mounted) {
          return;
        }

        if (!response.ok) {
          setStatus('blocked');
          return;
        }

        const data = (await response.json()) as { roles?: string[] };
        const roles = Array.isArray(data.roles) ? data.roles : [];
        setStatus(roles.includes('admin') ? 'allowed' : 'blocked');
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
        Verification des permissions admin...
      </main>
    );
  }

  if (status === 'blocked') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
