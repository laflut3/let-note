import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Pencil, Trash2, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  adminAddStudentToPromotionRequest,
  adminAssignDelegueRequest,
  adminCreateProfesseurRequest,
  adminCreatePromotionRequest,
  adminDeleteMatiereRequest,
  adminDeleteProfesseurRequest,
  adminDeletePromotionRequest,
  adminListPromotionStudentsRequest,
  adminListMatieresRequest,
  adminListProfesseursRequest,
  adminListPromotionsRequest,
  adminListUsersRequest,
  adminListUsersDetailsRequest,
  adminRemoveDelegueRequest,
  adminRemoveStudentFromPromotionRequest,
  adminUpdateMatiereRequest,
  adminUpdateProfesseurRequest,
  adminUpdatePromotionRequest,
  adminUpdateUserRequest,
  logoutRequest,
  type AdminMatiere,
  type AdminProfesseur,
  type AdminPromotionSummary,
  type AdminStudentDetails,
  type AdminUser,
  type PromotionStudent,
} from '@/features/auth/api';

type AdminTab = 'promotions' | 'etudiants' | 'professeurs' | 'matieres';

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
  const [studentsDetails, setStudentsDetails] = useState<AdminStudentDetails[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState('');
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
  const [editingPromoId, setEditingPromoId] = useState('');
  const [studentsPopupPromoId, setStudentsPopupPromoId] = useState('');
  const [promoStudents, setPromoStudents] = useState<PromotionStudent[]>([]);
  const [selectedStudentForPromo, setSelectedStudentForPromo] = useState('');

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
  const [editStudentNumero, setEditStudentNumero] = useState('');
  const [editStudentPrenom, setEditStudentPrenom] = useState('');
  const [editStudentNom, setEditStudentNom] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentBirthDate, setEditStudentBirthDate] = useState('');

  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const selectedCount = selectedUserIds.length;
  const canCreatePromotion = useMemo(() => {
    return (
      promoName.trim().length > 0 &&
      imageUrl.trim().length > 0 &&
      Number.isInteger(Number(anneeArrivee)) &&
      Number.isInteger(Number(anneeDepart)) &&
      selectedCount > 0
    );
  }, [anneeArrivee, anneeDepart, imageUrl, promoName, selectedCount]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setLoadingError('');

    try {
      const [usersRes, usersDetailsRes, promosRes, profRes, matieresRes] = await Promise.all([
        adminListUsersRequest(),
        adminListUsersDetailsRequest(),
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

      if (!usersDetailsRes.ok) {
        setLoadingError((prev) => prev || 'Impossible de charger les details des etudiants.');
        setStudentsDetails([]);
      } else {
        setStudentsDetails((await usersDetailsRes.json()) as AdminStudentDetails[]);
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
      setStudentsDetails([]);
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

  const openEditPromotionPopup = (promotion: AdminPromotionSummary) => {
    setEditingPromoId(promotion.id);
    setSelectedPromoId(promotion.id);
    setEditPromoName(promotion.nom);
    setEditPromoImage(promotion.image_url);
    setEditPromoIcal(promotion.ical_url ?? '');
    setEditPromoArrivee(String(promotion.annee_arrivee));
    setEditPromoDepart(String(promotion.annee_depart));
    setEditPromoReferentId(promotion.referent_prof_id ?? '');
  };

  const openStudentsPopup = async (promoId: string) => {
    setStudentsPopupPromoId(promoId);
    setPromoStudents([]);
    setSelectedStudentForPromo('');
    const response = await adminListPromotionStudentsRequest(promoId);
    if (response.ok) {
      const students = (await response.json()) as PromotionStudent[];
      setPromoStudents(students);
      setSelectedStudentForPromo(students[0]?.id ?? '');
    }
  };

  const toggleStudentDetails = (student: AdminStudentDetails) => {
    if (expandedStudentId === student.id) {
      setExpandedStudentId('');
      return;
    }
    setExpandedStudentId(student.id);
    setEditStudentNumero(student.numero_etudiant ?? '');
    setEditStudentPrenom(student.prenom);
    setEditStudentNom(student.nom);
    setEditStudentEmail(student.email);
    setEditStudentBirthDate(student.date_naissance);
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
        message: 'Nom, image, annees arrivee/depart et au moins un utilisateur sont requis.',
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
          referent_prof_id: referentProfId || undefined,
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

    await runAction(
      () =>
        remove
          ? adminRemoveDelegueRequest(selectedPromoId, selectedDelegueId)
          : adminAssignDelegueRequest(selectedPromoId, selectedDelegueId),
      remove ? 'Delegue retire de la promotion.' : 'Delegue assigne a la promotion.'
    );
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
                ['promotions', 'Promotions', GraduationCap],
                ['etudiants', 'Etudiants', Users],
                ['professeurs', 'Professeurs', User],
                ['matieres', 'Matieres', BookOpen],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={[
                  'rounded-xl border px-3 py-2 text-sm transition flex items-center gap-2',
                  activeTab === value
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
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
              <h2 className="text-xl font-semibold text-zinc-900">Liste des promotions</h2>
              <div className="mt-4 space-y-3">
                {promotions.map((promotion) => (
                  <div
                    key={promotion.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <p className="text-sm text-zinc-800">
                      <span className="font-semibold">{promotion.nom}</span> (
                      {promotion.annee_arrivee}-{promotion.annee_depart})
                    </p>
                    <p className="text-xs text-zinc-600">
                      Delegue(s):{' '}
                      {promotion.delegues.length > 0 ? promotion.delegues.join(', ') : 'aucun'}
                    </p>
                    <div className="flex gap-2 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                        onClick={() => void openStudentsPopup(promotion.id)}
                      >
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">Eleves</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                        onClick={() => openEditPromotionPopup(promotion)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">Editer</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                        onClick={() => {
                          if (window.confirm('Supprimer cette promotion ?')) {
                            void runAction(
                              () => adminDeletePromotionRequest(promotion.id),
                              'Promotion supprimee.'
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline sm:ml-2">Supprimer</span>
                      </Button>
                    </div>
                  </div>
                ))}
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

            <h3 className="mt-6 text-lg font-semibold text-zinc-900">Liste des professeurs</h3>
            <div className="mt-3 space-y-2">
              {professeurs.map((prof) => (
                <div
                  key={prof.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                >
                  <p className="text-sm text-zinc-800">
                    {prof.prenom} {prof.nom} - {prof.email}
                  </p>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                      onClick={() => {
                        setSelectedProfId(prof.id);
                        setEditProfPrenom(prof.prenom);
                        setEditProfNom(prof.nom);
                        setEditProfEmail(prof.email);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline sm:ml-2">Editer</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-9 rounded-lg p-0 sm:h-9 sm:w-auto sm:px-3"
                      onClick={() => {
                        if (window.confirm('Supprimer ce professeur ?')) {
                          void runAction(
                            () => adminDeleteProfesseurRequest(prof.id),
                            'Professeur supprime.'
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline sm:ml-2">Supprimer</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                Enregistrer l'edition
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

        {activeTab === 'etudiants' && (
          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(26,18,8,0.12)]">
            <h2 className="text-xl font-semibold text-zinc-900">Liste des etudiants</h2>
            <div className="mt-4 space-y-2">
              {studentsDetails.map((student) => (
                <div key={student.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => toggleStudentDetails(student)}
                  >
                    <span className="text-sm text-zinc-800">
                      {student.prenom} {student.nom} - roles: {student.roles.join(', ') || 'eleve'}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {expandedStudentId === student.id ? 'Masquer' : 'Details'}
                    </span>
                  </button>

                  {expandedStudentId === student.id && (
                    <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <input
                          value={editStudentNumero}
                          onChange={(e) => setEditStudentNumero(e.target.value)}
                          placeholder="Numero etudiant"
                          className="h-10 rounded-lg border border-zinc-300 px-3"
                        />
                        <input
                          value={editStudentBirthDate}
                          onChange={(e) => setEditStudentBirthDate(e.target.value)}
                          type="date"
                          className="h-10 rounded-lg border border-zinc-300 px-3"
                        />
                        <input
                          value={editStudentPrenom}
                          onChange={(e) => setEditStudentPrenom(e.target.value)}
                          placeholder="Prenom"
                          className="h-10 rounded-lg border border-zinc-300 px-3"
                        />
                        <input
                          value={editStudentNom}
                          onChange={(e) => setEditStudentNom(e.target.value)}
                          placeholder="Nom"
                          className="h-10 rounded-lg border border-zinc-300 px-3"
                        />
                        <input
                          value={editStudentEmail}
                          onChange={(e) => setEditStudentEmail(e.target.value)}
                          placeholder="Email"
                          className="h-10 rounded-lg border border-zinc-300 px-3 md:col-span-2"
                        />
                      </div>
                      <Button
                        type="button"
                        className="h-10 rounded-lg bg-zinc-900 text-white"
                        onClick={() =>
                          void runAction(
                            () =>
                              adminUpdateUserRequest(student.id, {
                                numero_etudiant: editStudentNumero || undefined,
                                prenom: editStudentPrenom,
                                nom: editStudentNom,
                                email: editStudentEmail,
                                date_naissance: editStudentBirthDate || undefined,
                              }),
                            'Etudiant modifie.'
                          )
                        }
                      >
                        Enregistrer les modifications
                      </Button>
                      <div className="text-sm text-zinc-700">
                        <p>Promotions:</p>
                        <ul className="ml-4 list-disc">
                          {student.promotions.length === 0 && <li>Aucune promotion</li>}
                          {student.promotions.map((promo) => (
                            <li key={promo.promo_id}>
                              {promo.promo_nom} ({promo.annee_arrivee}-{promo.annee_depart}) -{' '}
                              {promo.is_delegue ? 'Delegue' : 'Non delegue'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
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

        {editingPromoId && (
          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900">Editer la promotion</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
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
                <option value="">Aucun referent</option>
                {professeurs.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.prenom} {prof.nom} - {prof.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="h-10 rounded-xl bg-zinc-900 text-white"
                onClick={() =>
                  void runAction(
                    () =>
                      adminUpdatePromotionRequest(editingPromoId, {
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
              >
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setEditingPromoId('')}
              >
                Fermer
              </Button>
            </div>
          </section>
        )}

        {studentsPopupPromoId && (
          <section className="rounded-3xl border border-black/10 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900">
              Gestion des eleves de la promotion
            </h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                value={selectedStudentForPromo}
                onChange={(e) => setSelectedStudentForPromo(e.target.value)}
                className="h-11 rounded-xl border border-zinc-300 px-3"
              >
                <option value="">Selectionner un eleve</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.prenom} {user.nom}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-zinc-900 text-white"
                  onClick={() => {
                    if (
                      selectedStudentForPromo &&
                      window.confirm('Ajouter cet eleve a la promotion ?')
                    ) {
                      void runAction(
                        () =>
                          adminAddStudentToPromotionRequest(
                            studentsPopupPromoId,
                            selectedStudentForPromo
                          ),
                        'Eleve ajoute.'
                      );
                    }
                  }}
                >
                  Ajouter
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => {
                    if (
                      selectedStudentForPromo &&
                      window.confirm('Retirer cet eleve de la promotion ?')
                    ) {
                      void runAction(
                        () =>
                          adminRemoveStudentFromPromotionRequest(
                            studentsPopupPromoId,
                            selectedStudentForPromo
                          ),
                        'Eleve retire.'
                      );
                    }
                  }}
                >
                  Retirer
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-zinc-700">Eleves actuellement dans la promo:</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                {promoStudents.map((student) => (
                  <li key={student.id}>
                    {student.prenom} {student.nom} ({student.numero_etudiant ?? 'sans numero'})
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex gap-2">
              <select
                value={selectedDelegueId}
                onChange={(e) => setSelectedDelegueId(e.target.value)}
                className="h-10 rounded-xl border border-zinc-300 px-3"
              >
                <option value="">Delegue</option>
                {promoStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.prenom} {student.nom}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="h-10 rounded-xl bg-zinc-900 text-white"
                onClick={() => {
                  setSelectedPromoId(studentsPopupPromoId);
                  void handleAssignDelegue(false);
                }}
              >
                Assigner delegue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => {
                  setSelectedPromoId(studentsPopupPromoId);
                  void handleAssignDelegue(true);
                }}
              >
                Retirer delegue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => setStudentsPopupPromoId('')}
              >
                Fermer
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
