import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authMeRequest, logoutRequest } from '@/features/auth/api';

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    authMeRequest()
      .then(async (response) => {
        if (!mounted || !response.ok) {
          return;
        }

        const data = (await response.json()) as { roles?: string[] };
        const roles = Array.isArray(data.roles) ? data.roles : [];
        setIsAdmin(roles.includes('admin'));
      })
      .catch(() => {
        if (mounted) {
          setIsAdmin(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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
        <nav className="flex items-center justify-between rounded-2xl border border-[var(--auth-card-border)] bg-[linear-gradient(135deg,#4f1730,#6d2745)] px-4 py-3 text-white shadow-[0_16px_38px_rgba(36,14,30,0.28)]">
          <div className="text-sm font-semibold uppercase tracking-[0.2em]">Let Note</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="h-9 rounded-lg text-white hover:bg-white/12 hover:text-white"
            >
              Dashboard
            </Button>
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/admin')}
                className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                Administration
              </Button>
            )}
          </div>
        </nav>

        <header className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Espace Etudiant</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">Dashboard</h1>
          <p className="mt-2 text-zinc-600">
            Connexion reussie. Bienvenue sur votre espace Let Note.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-zinc-200 bg-white/90">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Consultez vos derniers resultats.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">
              Aucune note chargee pour le moment.
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 bg-white/90">
            <CardHeader>
              <CardTitle>Presence</CardTitle>
              <CardDescription>Suivez votre assiduite.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">Aucune absence enregistree.</CardContent>
          </Card>

          <Card className="rounded-2xl border-zinc-200 bg-white/90">
            <CardHeader>
              <CardTitle>Planning</CardTitle>
              <CardDescription>Votre semaine a venir.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600">Aucun evenement planifie.</CardContent>
          </Card>
        </div>

        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
        >
          {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
        </Button>
      </section>
    </main>
  );
}
