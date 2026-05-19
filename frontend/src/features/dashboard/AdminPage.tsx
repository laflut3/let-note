import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  adminAssignDelegueRequest,
  adminCreateProfesseurRequest,
  adminCreatePromotionRequest,
  adminDeleteMatiereRequest,
  adminDeleteProfesseurRequest,
  adminDeletePromotionRequest,
  adminListMatieresRequest,
  adminListProfesseursRequest,
  adminListPromotionsRequest,
  adminListUsersRequest,
  adminRemoveDelegueRequest,
  adminUpdateMatiereRequest,
  adminUpdateProfesseurRequest,
  adminUpdatePromotionRequest,
  logoutRequest,
  type AdminMatiere,
  type AdminProfesseur,
  type AdminPromotionSummary,
  type AdminUser,
} from '@/features/auth/api';

type AdminTab = 'promotions' | 'professeurs' | 'matieres';

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

  const [activeTab, setActiveTab] = useState<AdminTab>('promotions');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotionSummary[]>([]);
  const [professeurs, setProfesseurs] = useState<AdminProfesseur[]>([]);
  const [matieres, setMatieres] = useState<AdminMatiere[]>([]);
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

  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [editPromoName, setEditPromoName] = useState('');
  const [editPromoImage, setEditPromoImage] = useState('');
  const [editPromoIcal, setEditPromoIcal] = useState('');
  const [editPromoArrivee, setEditPromoArrivee] = useState('');
  const [editPromoDepart, setEditPromoDepart] = useState('');
  const [editPromoReferentId, setEditPromoReferentId] = useState('');

  const [profPrenom, setProfPrenom] = useState('');
  const [profNom, setProfNom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [profBirthDate, setProfBirthDate] = useState('1980-01-01');
  const [isCreatingProf, setIsCreatingProf] = useState(false);

  const [selectedProfId, setSelectedProfId] = useState('');
  const [editProfPrenom, setEditProfPrenom] = useState('');
  const [editProfNom, setEditProfNom] = useState('');
  const [editProfEmail, setEditProfEmail] = useState('');

  const [selectedMatiereCode, setSelectedMatiereCode] = useState('');
  const [editMatiereNom, setEditMatiereNom] = useState('');

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
      const [usersRes, promosRes, profRes, matieresRes] = await Promise.all([
        adminListUsersRequest(),
        adminListPromotionsRequest(),
        adminListProfesseursRequest(),
        adminListMatieresRequest(),
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
        const nextPromoId = selectedPromoId || promoData[0]?.id || '';
        setSelectedPromoId(nextPromoId);
      }

      if (!profRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les professeurs.');
        setProfesseurs([]);
      } else {
        const profData = (await profRes.json()) as AdminProfesseur[];
        setProfesseurs(profData);
        setReferentProfId((prev) => prev || profData[0]?.id || '');
        const nextProfId = selectedProfId || profData[0]?.id || '';
        setSelectedProfId(nextProfId);
      }

      if (!matieresRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les matieres.');
        setMatieres([]);
      } else {
        const matiereData = (await matieresRes.json()) as AdminMatiere[];
        setMatieres(matiereData);
        setSelectedMatiereCode((prev) => prev || matiereData[0]?.code_matiere || '');
      }
    } catch {
      setLoadingError('Erreur reseau. Reessayez.');
      setUsers([]);
      setPromotions([]);
      setProfesseurs([]);
      setMatieres([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  useEffect(() => {
    const promo = promotions.find((item) => item.id === selectedPromoId);
    if (!promo) {
      return;
    }

    setEditPromoName(promo.nom);
    setEditPromoImage(promo.image_url);
    setEditPromoIcal(promo.ical_url ?? '');
    setEditPromoArrivee(String(promo.annee_arrivee));
    setEditPromoDepart(String(promo.annee_depart));
    setEditPromoReferentId(promo.referent_prof_id ?? '');
  }, [promotions, selectedPromoId]);

  useEffect(() => {
    const prof = professeurs.find((item) => item.id === selectedProfId);
    if (!prof) {
      return;
    }

    setEditProfPrenom(prof.prenom);
    setEditProfNom(prof.nom);
    setEditProfEmail(prof.email);
  }, [professeurs, selectedProfId]);

  useEffect(() => {
    const matiere = matieres.find((item) => item.code_matiere === selectedMatiereCode);
    if (!matiere) {
      return;
    }

    setEditMatiereNom(matiere.nom_matiere);
  }, [matieres, selectedMatiereCode]);

  const runAction = async (
    action: () => Promise<Response>,
    successMessage: string,
    refresh = true
  ) => {
    setFeedback({ type: '', message: '' });
    try {
      const response = await action();
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractErrorMessage(response, 'Operation impossible.'),
        });
        return;
      }

      setFeedback({ type: 'success', message: successMessage });
      if (refresh) {
        await loadAdminData();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateProfessor = async () => {
    if (!profNom.trim() || !profPrenom.trim() || !profEmail.trim() || !profBirthDate.trim()) {
      setFeedback({
        type: 'error',
        message: 'Prenom, nom, email et date de naissance sont requis.',
      });
      return;
    }

    setIsCreatingProf(true);
    await runAction(
      () =>
        adminCreateProfesseurRequest({
          prenom: profPrenom,
          nom: profNom,
          email: profEmail,
          date_naissance: profBirthDate,
        }),
      'Professeur cree avec succes.'
    );
    setIsCreatingProf(false);
  };

  const handleCreatePromotion = async () => {
    if (!canCreatePromotion) {
      setFeedback({
        type: 'error',
        message:
          'Nom, image, annees arrivee/depart, professeur referent et au moins un utilisateur sont requis.',
      });
      return;
    }

    setIsCreatingPromotion(true);
    await runAction(
      () =>
        adminCreatePromotionRequest({
          nom: promoName.trim(),
          image_url: imageUrl.trim(),
          ical_url: icalUrl.trim() || undefined,
          annee_arrivee: Number(anneeArrivee),
          annee_depart: Number(anneeDepart),
          referent_prof_id: referentProfId,
          etudiant_ids: selectedUserIds,
        }),
      'Promotion creee avec succes.'
    );
    setIsCreatingPromotion(false);
  };

  const handleAssignDelegue = async (remove = false) => {
    if (!selectedPromoId || !selectedDelegueId) {
      setFeedback({ type: 'error', message: 'Selectionnez une promotion et un etudiant.' });
      return;
    }

    setIsAssigningDelegue(true);
    await runAction(
      () =>
        remove
          ? adminRemoveDelegueRequest(selectedPromoId, selectedDelegueId)
          : adminAssignDelegueRequest(selectedPromoId, selectedDelegueId),
      remove ? 'Delegue retire de la promotion.' : 'Delegue assigne a la promotion.'
    );
    setIsAssigningDelegue(false);
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
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/90 p-4 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['promotions', 'Promotions'],
                ['professeurs', 'Professeurs'],
                ['matieres', 'Matieres'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={[
                  'rounded-xl border px-3 py-2 text-sm transition',
                  activeTab === value
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="h-10 rounded-xl"
            >
              Dashboard
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/delegue')}
              variant="outline"
              className="h-10 rounded-xl"
            >
              Vue delegue
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-10 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
            >
              {isLoggingOut ? 'Deconnexion...' : 'Logout'}
            </Button>
          </div>
        </nav>

        {activeTab === 'promotions' && (
          <>
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

              <Button
                type="button"
                onClick={handleCreatePromotion}
                disabled={isCreatingPromotion}
                className="mt-5 h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
              >
                {isCreatingPromotion ? 'Creation...' : 'Creer la promotion'}
              </Button>
            </section>

            <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
              <h2 className="text-xl font-semibold text-zinc-900">
                Modifier ou supprimer une promotion
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  value={selectedPromoId}
                  onChange={(e) => setSelectedPromoId(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
                >
                  <option value="">Selectionner la promotion</option>
                  {promotions.map((promotion) => (
                    <option key={promotion.id} value={promotion.id}>
                      {promotion.nom} ({promotion.annee_arrivee}-{promotion.annee_depart})
                    </option>
                  ))}
                </select>
                <input
                  value={editPromoName}
                  onChange={(e) => setEditPromoName(e.target.value)}
                  placeholder="Nom"
                  className="h-11 rounded-xl border border-zinc-300 px-3"
                />
                <input
                  value={editPromoImage}
                  onChange={(e) => setEditPromoImage(e.target.value)}
                  placeholder="Image URL"
                  className="h-11 rounded-xl border border-zinc-300 px-3"
                />
                <input
                  value={editPromoArrivee}
                  onChange={(e) => setEditPromoArrivee(e.target.value)}
                  placeholder="Annee arrivee"
                  className="h-11 rounded-xl border border-zinc-300 px-3"
                />
                <input
                  value={editPromoDepart}
                  onChange={(e) => setEditPromoDepart(e.target.value)}
                  placeholder="Annee depart"
                  className="h-11 rounded-xl border border-zinc-300 px-3"
                />
                <input
                  value={editPromoIcal}
                  onChange={(e) => setEditPromoIcal(e.target.value)}
                  placeholder="URL iCal"
                  className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
                />
                <select
                  value={editPromoReferentId}
                  onChange={(e) => setEditPromoReferentId(e.target.value)}
                  className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
                >
                  <option value="">Selectionner referent</option>
                  {professeurs.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.prenom} {prof.nom} - {prof.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() =>
                    void runAction(
                      () =>
                        adminUpdatePromotionRequest(selectedPromoId, {
                          nom: editPromoName,
                          image_url: editPromoImage,
                          ical_url: editPromoIcal,
                          annee_arrivee: Number(editPromoArrivee),
                          annee_depart: Number(editPromoDepart),
                          referent_prof_id: editPromoReferentId || undefined,
                        }),
                      'Promotion modifiee.'
                    )
                  }
                  disabled={!selectedPromoId}
                  className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
                >
                  Modifier la promotion
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void runAction(
                      () => adminDeletePromotionRequest(selectedPromoId),
                      'Promotion supprimee.'
                    )
                  }
                  disabled={!selectedPromoId}
                  className="h-11 rounded-xl"
                >
                  Supprimer la promotion
                </Button>
              </div>

              <h3 className="mt-6 text-lg font-semibold text-zinc-900">Assigner un delegue</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleAssignDelegue(false)}
                    disabled={isAssigningDelegue || !selectedPromoId}
                    className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
                  >
                    Assigner
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleAssignDelegue(true)}
                    disabled={isAssigningDelegue || !selectedPromoId}
                    variant="outline"
                    className="h-11 rounded-xl"
                  >
                    Retirer
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'professeurs' && (
          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
            <h2 className="text-xl font-semibold text-zinc-900">Gestion des professeurs</h2>
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

            <h3 className="mt-6 text-lg font-semibold text-zinc-900">
              Modifier ou supprimer un professeur
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
              >
                <option value="">Selectionner le professeur</option>
                {professeurs.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.prenom} {prof.nom} - {prof.email}
                  </option>
                ))}
              </select>
              <input
                value={editProfPrenom}
                onChange={(e) => setEditProfPrenom(e.target.value)}
                placeholder="Prenom"
                className="h-11 rounded-xl border border-zinc-300 px-3"
              />
              <input
                value={editProfNom}
                onChange={(e) => setEditProfNom(e.target.value)}
                placeholder="Nom"
                className="h-11 rounded-xl border border-zinc-300 px-3"
              />
              <input
                value={editProfEmail}
                onChange={(e) => setEditProfEmail(e.target.value)}
                placeholder="Email"
                className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() =>
                  void runAction(
                    () =>
                      adminUpdateProfesseurRequest(selectedProfId, {
                        prenom: editProfPrenom,
                        nom: editProfNom,
                        email: editProfEmail,
                      }),
                    'Professeur modifie.'
                  )
                }
                disabled={!selectedProfId}
                className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
              >
                Modifier le professeur
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAction(
                    () => adminDeleteProfesseurRequest(selectedProfId),
                    'Professeur supprime.'
                  )
                }
                disabled={!selectedProfId}
                className="h-11 rounded-xl"
              >
                Supprimer le professeur
              </Button>
            </div>
          </section>
        )}

        {activeTab === 'matieres' && (
          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
            <h2 className="text-xl font-semibold text-zinc-900">Gestion des matieres</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                value={selectedMatiereCode}
                onChange={(e) => setSelectedMatiereCode(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
              >
                <option value="">Selectionner la matiere</option>
                {matieres.map((matiere) => (
                  <option key={matiere.code_matiere} value={matiere.code_matiere}>
                    {matiere.nom_matiere} ({matiere.code_matiere}) - {matiere.promotion_count}{' '}
                    promo(s)
                  </option>
                ))}
              </select>
              <input
                value={editMatiereNom}
                onChange={(e) => setEditMatiereNom(e.target.value)}
                placeholder="Nouveau nom"
                className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() =>
                  void runAction(
                    () =>
                      adminUpdateMatiereRequest(selectedMatiereCode, {
                        nom_matiere: editMatiereNom,
                      }),
                    'Matiere modifiee.'
                  )
                }
                disabled={!selectedMatiereCode}
                className="h-11 rounded-xl bg-zinc-900 px-5 text-white hover:bg-zinc-800"
              >
                Modifier la matiere
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void runAction(
                    () => adminDeleteMatiereRequest(selectedMatiereCode),
                    'Matiere supprimee.'
                  )
                }
                disabled={!selectedMatiereCode}
                className="h-11 rounded-xl"
              >
                Supprimer la matiere
              </Button>
            </div>
          </section>
        )}

        {loadingError && (
          <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{loadingError}</p>
        )}
        {feedback.message && (
          <p
            className={[
              'rounded-lg px-3 py-2 text-sm',
              feedback.type === 'success'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800',
            ].join(' ')}
          >
            {feedback.message}
          </p>
        )}
      </section>
    </main>
  );
}
