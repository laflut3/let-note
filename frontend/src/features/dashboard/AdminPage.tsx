import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  adminAssignDelegueRequest,
  adminCreatePromotionRequest,
  adminListPromotionsRequest,
  adminListUsersRequest,
  adminRemoveDelegueRequest,
  logoutRequest,
  type AdminPromotionSummary,
  type AdminUser,
} from '@/features/auth/api';

type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function AdminPage() {
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);

  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [selectedDelegueId, setSelectedDelegueId] = useState('');
  const [isAssigningDelegue, setIsAssigningDelegue] = useState(false);

  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const selectedCount = selectedUserIds.length;
  const canCreatePromotion = useMemo(
    () => imageUrl.trim().length > 0 && Number.isInteger(Number(annee)) && selectedCount > 0,
    [annee, imageUrl, selectedCount]
  );

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadingError('');

    try {
      const [usersRes, promosRes] = await Promise.all([
        adminListUsersRequest(),
        adminListPromotionsRequest(),
      ]);

      if (!usersRes.ok) {
        setLoadingError(
          await extractErrorMessage(usersRes, 'Impossible de charger les utilisateurs.')
        );
        setUsers([]);
      } else {
        const usersData = (await usersRes.json()) as AdminUser[];
        setUsers(usersData);
      }

      if (!promosRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les promotions.');
        setPromotions([]);
      } else {
        const promoData = (await promosRes.json()) as AdminPromotionSummary[];
        setPromotions(promoData);
        setSelectedPromoId((prev) => prev || promoData[0]?.id || '');
      }
    } catch {
      setLoadingError('Erreur reseau. Reessayez.');
      setUsers([]);
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreatePromotion = async () => {
    setFeedback({ type: '', message: '' });
    if (!canCreatePromotion) {
      setFeedback({
        type: 'error',
        message: 'Image, annee et au moins un utilisateur sont requis.',
      });
      return;
    }

    setIsCreatingPromotion(true);
    try {
      const response = await adminCreatePromotionRequest({
        image_url: imageUrl.trim(),
        ical_url: icalUrl.trim() || undefined,
        annee: Number(annee),
        etudiant_ids: selectedUserIds,
      });

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractErrorMessage(response, 'Creation de promotion impossible.'),
        });
        return;
      }

      setFeedback({ type: 'success', message: 'Promotion creee avec succes.' });
      setSelectedUserIds([]);
      setImageUrl('');
      setIcalUrl('');
      await loadAdminData();
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    } finally {
      setIsCreatingPromotion(false);
    }
  };

  const handleAssignDelegue = async (remove = false) => {
    setFeedback({ type: '', message: '' });

    if (!selectedPromoId || !selectedDelegueId) {
      setFeedback({ type: 'error', message: 'Selectionnez une promotion et un etudiant.' });
      return;
    }

    setIsAssigningDelegue(true);

    try {
      const response = remove
        ? await adminRemoveDelegueRequest(selectedPromoId, selectedDelegueId)
        : await adminAssignDelegueRequest(selectedPromoId, selectedDelegueId);

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractErrorMessage(response, 'Mise a jour du delegue impossible.'),
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: remove ? 'Delegue retire de la promotion.' : 'Delegue assigne a la promotion.',
      });
      await loadAdminData();
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    } finally {
      setIsAssigningDelegue(false);
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
            Definissez l&apos;image, l&apos;annee, l&apos;URL iCal et les utilisateurs a rattacher.
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

          <label className="mt-4 block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800">URL iCal (optionnel)</span>
            <input
              value={icalUrl}
              onChange={(event) => setIcalUrl(event.target.value)}
              placeholder="https://...direct_cal.jsp?..."
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-0 focus:border-zinc-500"
            />
          </label>

          <div className="mt-5">
            <p className="text-sm font-medium text-zinc-800">
              Utilisateurs ({selectedCount} selectionne{selectedCount > 1 ? 's' : ''})
            </p>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2">
              {isLoading ? (
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

          <div className="mt-5">
            <h3 className="text-lg font-semibold text-zinc-900">Delegues par promotion</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-800">Promotion</span>
                <select
                  value={selectedPromoId}
                  onChange={(event) => setSelectedPromoId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 outline-none"
                >
                  <option value="">Selectionner</option>
                  {promotions.map((promotion) => (
                    <option key={promotion.id} value={promotion.id}>
                      {promotion.annee} ({promotion.etudiant_count} etudiants)
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-zinc-800">Etudiant</span>
                <select
                  value={selectedDelegueId}
                  onChange={(event) => setSelectedDelegueId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900 outline-none"
                >
                  <option value="">Selectionner</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.prenom} {user.nom} - {user.email}
                    </option>
                  ))}
                </select>
              </label>
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
              onClick={() => void handleAssignDelegue(false)}
              disabled={isAssigningDelegue}
              variant="outline"
              className="h-11 rounded-xl"
            >
              Assigner delegue
            </Button>
            <Button
              type="button"
              onClick={() => void handleAssignDelegue(true)}
              disabled={isAssigningDelegue}
              variant="outline"
              className="h-11 rounded-xl"
            >
              Retirer delegue
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

          {loadingError && (
            <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">
              {loadingError}
            </p>
          )}

          {feedback.message && (
            <p
              className={[
                'mt-4 rounded-lg px-3 py-2 text-sm',
                feedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800',
              ].join(' ')}
            >
              {feedback.message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
