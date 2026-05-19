import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  adminCreatePromotionRequest,
  adminListUsersRequest,
  logoutRequest,
  type AdminUser,
} from '@/features/auth/api';

export function AdminPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [submitState, setSubmitState] = useState<{
    type: '' | 'success' | 'error';
    message: string;
  }>({
    type: '',
    message: '',
  });
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    adminListUsersRequest()
      .then(async (response) => {
        if (!mounted) {
          return;
        }

        if (!response.ok) {
          setUsers([]);
          setSubmitState({ type: 'error', message: 'Impossible de charger les utilisateurs.' });
          return;
        }

        const data = (await response.json()) as AdminUser[];
        setUsers(data);
      })
      .catch(() => {
        if (mounted) {
          setUsers([]);
          setSubmitState({ type: 'error', message: 'Impossible de charger les utilisateurs.' });
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingUsers(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCount = selectedUserIds.length;
  const canSubmit = useMemo(() => {
    return imageUrl.trim().length > 0 && Number.isInteger(Number(annee)) && selectedCount > 0;
  }, [annee, imageUrl, selectedCount]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreatePromotion = async () => {
    setSubmitState({ type: '', message: '' });
    if (!canSubmit) {
      setSubmitState({
        type: 'error',
        message: 'Image, annee et au moins un utilisateur sont requis.',
      });
      return;
    }

    setIsCreatingPromotion(true);
    try {
      const response = await adminCreatePromotionRequest({
        image_url: imageUrl.trim(),
        annee: Number(annee),
        etudiant_ids: selectedUserIds,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setSubmitState({
          type: 'error',
          message: data?.message ?? 'Creation de promotion impossible.',
        });
        return;
      }

      setSubmitState({ type: 'success', message: 'Promotion creee avec succes.' });
      setSelectedUserIds([]);
      setImageUrl('');
    } catch {
      setSubmitState({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    } finally {
      setIsCreatingPromotion(false);
    }
  };

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

        <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
          <h2 className="text-xl font-semibold text-zinc-900">Creer une promotion</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Definissez l&apos;image, l&apos;annee et les utilisateurs a rattacher.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-800">Image de promotion (URL)</span>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-0 focus:border-zinc-500"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-800">Annee</span>
              <input
                value={annee}
                onChange={(event) => setAnnee(event.target.value)}
                placeholder="2026"
                inputMode="numeric"
                className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-0 focus:border-zinc-500"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-zinc-800">
              Utilisateurs ({selectedCount} selectionne{selectedCount > 1 ? 's' : ''})
            </p>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2">
              {isLoadingUsers ? (
                <p className="px-2 py-1 text-sm text-zinc-500">Chargement...</p>
              ) : users.length === 0 ? (
                <p className="px-2 py-1 text-sm text-zinc-500">Aucun utilisateur disponible.</p>
              ) : (
                users.map((user) => {
                  const checked = selectedUserIds.includes(user.id);
                  return (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(user.id)}
                        className="h-4 w-4 rounded border-zinc-400"
                      />
                      <span className="text-sm text-zinc-800">
                        {user.prenom} {user.nom} - {user.email}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={handleCreatePromotion}
              disabled={isCreatingPromotion}
              className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
            >
              {isCreatingPromotion ? 'Creation...' : 'Creer la promotion'}
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="h-11 rounded-xl"
            >
              Aller au dashboard
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
            >
              {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
            </Button>
          </div>

          {submitState.message && (
            <p
              className={[
                'mt-4 rounded-lg px-3 py-2 text-sm',
                submitState.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800',
              ].join(' ')}
            >
              {submitState.message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
