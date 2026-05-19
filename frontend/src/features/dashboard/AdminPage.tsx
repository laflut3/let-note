import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  adminAssignDelegueRequest,
  adminCreateProfesseurRequest,
  adminCreatePromotionRequest,
  adminListProfesseursRequest,
  adminListPromotionsRequest,
  adminListUsersRequest,
  adminRemoveDelegueRequest,
  logoutRequest,
  type AdminProfesseur,
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
  const [professeurs, setProfesseurs] = useState<AdminProfesseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');

  const [promoName, setPromoName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [anneeArrivee, setAnneeArrivee] = useState(String(new Date().getFullYear()));
  const [anneeDepart, setAnneeDepart] = useState(String(new Date().getFullYear() + 3));
  const [referentProfId, setReferentProfId] = useState('');
  const [isCreatingPromotion, setIsCreatingPromotion] = useState(false);

  const [profPrenom, setProfPrenom] = useState('');
  const [profNom, setProfNom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profBirthDate, setProfBirthDate] = useState('1980-01-01');
  const [isCreatingProf, setIsCreatingProf] = useState(false);

  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [selectedDelegueId, setSelectedDelegueId] = useState('');
  const [isAssigningDelegue, setIsAssigningDelegue] = useState(false);

  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const selectedCount = selectedUserIds.length;
  const canCreatePromotion = useMemo(() => {
    return (
      promoName.trim().length > 0 &&
      imageUrl.trim().length > 0 &&
      Number.isInteger(Number(anneeArrivee)) &&
      Number.isInteger(Number(anneeDepart)) &&
      selectedCount > 0 &&
      referentProfId.trim().length > 0
    );
  }, [anneeArrivee, anneeDepart, imageUrl, promoName, referentProfId, selectedCount]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadingError('');

    try {
      const [usersRes, promosRes, profRes] = await Promise.all([
        adminListUsersRequest(),
        adminListPromotionsRequest(),
        adminListProfesseursRequest(),
      ]);

      if (!usersRes.ok) {
        setLoadingError(
          await extractErrorMessage(usersRes, 'Impossible de charger les utilisateurs.')
        );
        setUsers([]);
      } else {
        setUsers((await usersRes.json()) as AdminUser[]);
      }

      if (!promosRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les promotions.');
        setPromotions([]);
      } else {
        const promoData = (await promosRes.json()) as AdminPromotionSummary[];
        setPromotions(promoData);
        setSelectedPromoId((prev) => prev || promoData[0]?.id || '');
      }

      if (!profRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les professeurs.');
        setProfesseurs([]);
      } else {
        const profData = (await profRes.json()) as AdminProfesseur[];
        setProfesseurs(profData);
        setReferentProfId((prev) => prev || profData[0]?.id || '');
      }
    } catch {
      setLoadingError('Erreur reseau. Reessayez.');
      setUsers([]);
      setPromotions([]);
      setProfesseurs([]);
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

  const handleCreateProfessor = async () => {
    setFeedback({ type: '', message: '' });
    if (!profNom.trim() || !profPrenom.trim() || !profEmail.trim() || !profBirthDate.trim()) {
      setFeedback({
        type: 'error',
        message: 'Prenom, nom, email et date de naissance sont requis.',
      });
      return;
    }

    setIsCreatingProf(true);
    try {
      const response = await adminCreateProfesseurRequest({
        prenom: profPrenom,
        nom: profNom,
        email: profEmail,
        date_naissance: profBirthDate,
      });

      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractErrorMessage(response, 'Creation du professeur impossible.'),
        });
        return;
      }

      setFeedback({ type: 'success', message: 'Professeur cree avec succes.' });
      setProfPrenom('');
      setProfNom('');
      setProfEmail('');
      await loadAdminData();
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    } finally {
      setIsCreatingProf(false);
    }
  };

  const handleCreatePromotion = async () => {
    setFeedback({ type: '', message: '' });
    if (!canCreatePromotion) {
      setFeedback({
        type: 'error',
        message:
          'Nom, image, annees arrivee/depart, professeur referent et au moins un utilisateur sont requis.',
      });
      return;
    }

    setIsCreatingPromotion(true);
    try {
      const response = await adminCreatePromotionRequest({
        nom: promoName.trim(),
        image_url: imageUrl.trim(),
        ical_url: icalUrl.trim() || undefined,
        annee_arrivee: Number(anneeArrivee),
        annee_depart: Number(anneeDepart),
        referent_prof_id: referentProfId,
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
      setPromoName('');
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f1e7,#f2e7d5)] p-5 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Espace Administrateur</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900 md:text-4xl">
            Gestion des promotions
          </h1>
          <p className="mt-2 text-zinc-600">
            Promotions, delegues, professeurs referents et utilisateurs.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
            <h2 className="text-xl font-semibold text-zinc-900">Nouveau professeur</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                value={profPrenom}
                onChange={(e) => setProfPrenom(e.target.value)}
                placeholder="Prenom"
                className="h-11 rounded-xl border border-zinc-300 px-3"
              />
              <input
                value={profNom}
                onChange={(e) => setProfNom(e.target.value)}
                placeholder="Nom"
                className="h-11 rounded-xl border border-zinc-300 px-3"
              />
              <input
                value={profEmail}
                onChange={(e) => setProfEmail(e.target.value)}
                placeholder="Email"
                className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
              />
              <input
                type="date"
                value={profBirthDate}
                onChange={(e) => setProfBirthDate(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateProfessor}
              disabled={isCreatingProf}
              className="mt-4 h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
            >
              {isCreatingProf ? 'Creation...' : 'Creer professeur'}
            </Button>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
            <h2 className="text-xl font-semibold text-zinc-900">Assigner un delegue</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                value={selectedPromoId}
                onChange={(e) => setSelectedPromoId(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3"
              >
                <option value="">Selectionner la promotion</option>
                {promotions.map((promotion) => (
                  <option key={promotion.id} value={promotion.id}>
                    {promotion.nom} ({promotion.annee_arrivee}-{promotion.annee_depart})
                  </option>
                ))}
              </select>
              <select
                value={selectedDelegueId}
                onChange={(e) => setSelectedDelegueId(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3"
              >
                <option value="">Selectionner l'etudiant</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.prenom} {user.nom} ({user.numero_etudiant ?? 'sans numero'})
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleAssignDelegue(false)}
                disabled={isAssigningDelegue}
                className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
              >
                Assigner
              </Button>
              <Button
                type="button"
                onClick={() => void handleAssignDelegue(true)}
                disabled={isAssigningDelegue}
                variant="outline"
                className="h-11 rounded-xl"
              >
                Retirer
              </Button>
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
          <h2 className="text-xl font-semibold text-zinc-900">Creer une promotion</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Nom, image, annees, prof referent et etudiants.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={promoName}
              onChange={(e) => setPromoName(e.target.value)}
              placeholder="Nom de la promotion"
              className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
            />
            <input
              value={anneeArrivee}
              onChange={(e) => setAnneeArrivee(e.target.value)}
              placeholder="Annee d'arrivee"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={anneeDepart}
              onChange={(e) => setAnneeDepart(e.target.value)}
              placeholder="Annee de depart"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <input
              value={icalUrl}
              onChange={(e) => setIcalUrl(e.target.value)}
              placeholder="URL iCal (optionnel)"
              className="h-11 rounded-xl border border-zinc-300 px-3"
            />
            <select
              value={referentProfId}
              onChange={(e) => setReferentProfId(e.target.value)}
              className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
            >
              <option value="">Selectionner le professeur referent</option>
              {professeurs.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.prenom} {prof.nom} - {prof.email}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-800">
              Etudiants ({selectedCount} selectionne{selectedCount > 1 ? 's' : ''})
            </p>
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2">
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
                        {user.prenom} {user.nom} - {user.numero_etudiant ?? 'sans numero'} -{' '}
                        {user.email}
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
        </section>
      </section>
    </main>
  );
}
