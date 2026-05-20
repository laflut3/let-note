import { type ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  authMeRequest,
  listAccessiblePromotionsRequest,
  type PromotionScope,
} from '@/services/api';

type ProtectedDelegueRouteProps = {
  children: ReactNode;
};

type AccessStatus = 'checking' | 'allowed' | 'blocked';

export function ProtectedDelegueRoute({ children }: ProtectedDelegueRouteProps) {
  const [status, setStatus] = useState<AccessStatus>('checking');

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        const meResponse = await authMeRequest();
        if (!meResponse.ok) {
          if (mounted) {
            setStatus('blocked');
          }
          return;
        }

        const promotionsResponse = await listAccessiblePromotionsRequest();
        if (!promotionsResponse.ok) {
          if (mounted) {
            setStatus('blocked');
          }
          return;
        }

        const promotions = (await promotionsResponse.json()) as PromotionScope[];
        const hasDelegateScope = promotions.some((promotion) => promotion.can_manage);
        if (mounted) {
          setStatus(hasDelegateScope ? 'allowed' : 'blocked');
        }
      } catch {
        if (mounted) {
          setStatus('blocked');
        }
      }
    };

    void verify();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'checking') {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-200">
        Verification des permissions delegue...
      </main>
    );
  }

  if (status === 'blocked') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
