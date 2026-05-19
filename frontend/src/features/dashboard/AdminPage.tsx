import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { logoutRequest } from '@/features/auth/api';

export function AdminPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } finally {
      navigate('/', { replace: true });
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f1e7,#f2e7d5)] p-6 md:p-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Espace Administrateur</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">Administration</h1>
          <p className="mt-2 text-zinc-600">Acces reserve aux utilisateurs avec le role admin.</p>
        </header>

        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="h-11 rounded-xl"
          >
            Aller au dashboard
          </Button>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
          >
            {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
          </Button>
        </div>
      </section>
    </main>
  );
}
