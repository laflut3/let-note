import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { verifyEmailRequest } from '@/services/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const token = params.get('token') ?? '';

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        return;
      }

      try {
        const response = await verifyEmailRequest(token);
        setStatus(response.ok ? 'success' : 'error');
      } catch {
        setStatus('error');
      }
    };

    void verify();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-1)] px-4 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-6 text-center shadow-sm">
        {status === 'loading' && <p className="text-sm text-muted-foreground">Validation...</p>}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h1 className="mt-3 text-xl font-semibold">Compte valide</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre email est confirme. Vous pouvez vous connecter.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-3 text-xl font-semibold">Lien invalide</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Le lien de validation est invalide ou expire.
            </p>
          </>
        )}
        <Link
          to="/"
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-[var(--surface-strong)] px-4 text-sm font-semibold text-white hover:bg-[var(--surface-strong-hover)]"
        >
          Retour connexion
        </Link>
      </section>
    </main>
  );
}
