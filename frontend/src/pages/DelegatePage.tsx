import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Home, LogOut, PartyPopper, Search, Shield, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useThemeContext } from '@/context/theme-context';
import { adminUi } from '@/lib/admin-ui';
import { StudentEventsSection } from '@/components/events/StudentEventsSection';
import { Modal } from '@/components/admin/Modal';
import {
  addMatiereRequest,
  addStudentToPromoRequest,
  addProfesseurRequest,
  authMeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  listPromoStudentsManagementRequest,
  logoutRequest,
  removeStudentFromPromoRequest,
  type AuthMePayload,
  type PromoStudentManagementItem,
  type PromotionDashboardPayload,
  type PromotionScope,
} from '@/services/api';

type DelegateTab = 'general' | 'matieres' | 'professeurs' | 'etudiants' | 'events';

type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function DelegatePage() {
  const navigate = useNavigate();
  const { theme, resolvedTheme, toggleTheme } = useThemeContext();
  const [roles, setRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DelegateTab>('general');
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const [profNom, setProfNom] = useState('');
  const [profPrenom, setProfPrenom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectReferentId, setSubjectReferentId] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [managedStudents, setManagedStudents] = useState<PromoStudentManagementItem[]>([]);

  const isAdmin = roles.includes('admin');

  const loadBaseData = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const meResponse = await authMeRequest();
      if (!meResponse.ok) {
        navigate('/', { replace: true });
        return;
      }

      const meData = (await meResponse.json()) as AuthMePayload;
      const userRoles = Array.isArray(meData.roles) ? meData.roles : [];
      setRoles(userRoles);

      const promotionsResponse = await listAccessiblePromotionsRequest();
      if (!promotionsResponse.ok) {
        setErrorMessage(
          await extractError(promotionsResponse, 'Impossible de charger les promotions.')
        );
        setPromotions([]);
        return;
      }

      const accessiblePromotions = (await promotionsResponse.json()) as PromotionScope[];
      const manageablePromotions = accessiblePromotions.filter((promotion) => promotion.can_manage);

      setPromotions(manageablePromotions);
      setSelectedPromoId((prev) => prev || manageablePromotions[0]?.id || '');
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPromotionData = async (promoId: string) => {
    if (!promoId) {
      setDashboard(null);
      return;
    }

    setErrorMessage('');
    try {
      const dashboardRes = await getPromotionDashboardRequest(promoId);

      if (!dashboardRes.ok) {
        setErrorMessage(await extractError(dashboardRes, 'Impossible de charger cette promotion.'));
        setDashboard(null);
        return;
      }

      const dashboardData = (await dashboardRes.json()) as PromotionDashboardPayload;
      setDashboard(dashboardData);
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setDashboard(null);
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedPromoId) {
      void loadPromotionData(selectedPromoId);
    }
  }, [selectedPromoId]);

  const runAction = async (action: () => Promise<Response>, successMessage: string) => {
    setFeedback({ type: '', message: '' });

    try {
      const response = await action();
      if (!response.ok) {
        setFeedback({
          type: 'error',
          message: await extractError(response, 'Operation impossible.'),
        });
        return;
      }

      setFeedback({ type: 'success', message: successMessage });
      if (selectedPromoId) {
        await loadPromotionData(selectedPromoId);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    }
  };

  const refreshManagedStudents = async (promoId: string) => {
    const response = await listPromoStudentsManagementRequest(promoId);
    if (!response.ok) {
      setFeedback({
        type: 'error',
        message: await extractError(response, 'Impossible de charger les etudiants.'),
      });
      setManagedStudents([]);
      return;
    }

    setManagedStudents((await response.json()) as PromoStudentManagementItem[]);
  };

  const openStudentsModal = async () => {
    if (!selectedPromoId) return;
    setIsStudentsModalOpen(true);
    setStudentSearch('');
    await refreshManagedStudents(selectedPromoId);
  };

  const handleLogout = async () => {
    await logoutRequest();
    navigate('/', { replace: true });
  };

  const promoLabel = useMemo(() => {
    const promotion = promotions.find((item) => item.id === selectedPromoId);
    if (!promotion) {
      return 'Aucune promotion deleguee';
    }

    return `${promotion.nom} (${promotion.annee_arrivee}-${promotion.annee_depart})`;
  }, [promotions, selectedPromoId]);

  const filteredManagedStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return managedStudents
      .filter((student) => {
        if (!query && student.is_in_promo) return false;
        if (!query) return true;
        return `${student.prenom} ${student.nom} ${student.email}`.toLowerCase().includes(query);
      })
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'))
      .slice(0, 20);
  }, [managedStudents, studentSearch]);

  const currentPromoStudents = useMemo(() => {
    return managedStudents
      .filter((student) => student.is_in_promo)
      .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
  }, [managedStudents]);

  const filteredDashboardSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();
    return (dashboard?.matieres ?? []).filter((matiere) => {
      if (!query) return true;
      return `${matiere.nom_matiere} ${matiere.code_matiere}`.toLowerCase().includes(query);
    });
  }, [dashboard?.matieres, subjectSearch]);

  return (
    <main className={adminUi.pageBg}>
      <section className={adminUi.shell}>
        <nav className={adminUi.topNav}>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['general', 'Vue generale'],
                ['etudiants', 'Etudiants'],
                ['professeurs', 'Professeurs'],
                ['matieres', 'Matieres'],
                ['events', 'Events'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={[
                  adminUi.topNavTab,
                  activeTab === value ? adminUi.topNavTabActive : adminUi.topNavTabIdle,
                ].join(' ')}
              >
                {value === 'general' && <Home className="h-4 w-4" />}
                {value === 'matieres' && <BookOpen className="h-4 w-4" />}
                {value === 'professeurs' && <User className="h-4 w-4" />}
                {value === 'etudiants' && <Users className="h-4 w-4" />}
                {value === 'events' && <PartyPopper className="h-4 w-4" />}
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className={adminUi.topNavAction}
            >
              <Home className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Dashboard</span>
            </Button>
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/admin')}
                className={adminUi.topNavAction}
              >
                <Shield className="h-4 w-4" />
                <span className="ml-1 hidden lg:inline">Admin</span>
              </Button>
            )}
            <Button onClick={handleLogout} variant="ghost" className={adminUi.topNavActionGhost}>
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden lg:inline">Logout</span>
            </Button>
            <ThemeToggle
              theme={theme}
              resolvedTheme={resolvedTheme}
              onToggle={toggleTheme}
              inline
              compactOnMobile
            />
          </div>
        </nav>

        <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_12px_30px_rgba(79,23,48,0.08)] sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Promotions deleguees
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : promotions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune promotion geree pour ce compte.
              </p>
            ) : (
              promotions.map((promotion) => {
                const active = selectedPromoId === promotion.id;
                return (
                  <button
                    key={promotion.id}
                    type="button"
                    onClick={() => setSelectedPromoId(promotion.id)}
                    className={[
                      'rounded-xl border px-3 py-2 text-sm transition',
                      active
                        ? 'border-[var(--surface-strong)] bg-[var(--surface-strong)] text-white dark:text-zinc-900'
                        : 'border-[var(--surface-border)] bg-[var(--surface-2)] text-foreground hover:border-[var(--surface-strong)]',
                    ].join(' ')}
                  >
                    {promotion.nom} ({promotion.annee_arrivee}-{promotion.annee_depart})
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_12px_30px_rgba(79,23,48,0.08)] sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Espace delegue</p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">{promoLabel}</h1>
          {errorMessage && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200">
              {errorMessage}
            </p>
          )}

          {activeTab === 'general' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
                <h2 className="text-base font-semibold text-foreground">Resume</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {dashboard?.matieres.length ?? 0} matiere(s), {dashboard?.professeurs.length ?? 0}{' '}
                  professeur(s), {dashboard?.etudiants.length ?? 0} etudiant(s).
                </p>
              </div>
              <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4">
                <h2 className="text-base font-semibold text-foreground">Prof referent promo</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {dashboard?.promotion.referent_prof_prenom &&
                  dashboard?.promotion.referent_prof_nom
                    ? `${dashboard.promotion.referent_prof_prenom} ${dashboard.promotion.referent_prof_nom}`
                    : 'Non defini'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'matieres' && selectedPromoId && (
            <section className={`${adminUi.panel} mt-4`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Matieres</h2>
                  <p className="text-sm text-muted-foreground">
                    {dashboard?.matieres.length ?? 0} matiere(s) liee(s) a la promotion.
                  </p>
                </div>
                <Button
                  type="button"
                  className={adminUi.primaryBtn}
                  onClick={() => {
                    setIsSubjectsModalOpen(true);
                    setSubjectSearch('');
                    setSubjectReferentId((prev) => prev || dashboard?.professeurs[0]?.id || '');
                  }}
                >
                  Gerer les matieres
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {(dashboard?.matieres ?? []).map((matiere) => (
                  <div
                    key={matiere.code_matiere}
                    className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      {matiere.nom_matiere} ({matiere.code_matiere})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Referent:{' '}
                      {[matiere.referent_prof_prenom, matiere.referent_prof_nom]
                        .filter(Boolean)
                        .join(' ') || 'Non defini'}
                    </p>
                  </div>
                ))}
                {(dashboard?.matieres ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune matiere liee.</p>
                )}
              </div>
            </section>
          )}

          {activeTab === 'professeurs' && selectedPromoId && (
            <section className={adminUi.panel}>
              <h2 className="text-xl font-semibold text-foreground">Gestion des professeurs</h2>
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={profPrenom}
                    onChange={(e) => setProfPrenom(e.target.value)}
                    placeholder="Prenom professeur"
                    className="h-11"
                  />
                  <Input
                    value={profNom}
                    onChange={(e) => setProfNom(e.target.value)}
                    placeholder="Nom professeur"
                    className="h-11"
                  />
                  <Input
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    placeholder="Email professeur"
                    className="h-11 sm:col-span-2"
                  />
                  <Button
                    type="button"
                    className={`${adminUi.primaryBtn} sm:col-span-2`}
                    onClick={() =>
                      void runAction(
                        () =>
                          addProfesseurRequest(selectedPromoId, {
                            prenom: profPrenom,
                            nom: profNom,
                            email: profEmail,
                          }),
                        'Professeur ajoute.'
                      )
                    }
                  >
                    Ajouter professeur
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[var(--surface-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--surface-muted)] text-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Professeur</th>
                        <th className="px-3 py-2 text-left">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboard?.professeurs ?? []).map((professeur) => (
                        <tr
                          key={professeur.id}
                          className="border-t border-[var(--surface-border)] bg-[var(--surface-2)]"
                        >
                          <td className="px-3 py-2">
                            {professeur.prenom} {professeur.nom}
                          </td>
                          <td className="px-3 py-2">{professeur.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'etudiants' && selectedPromoId && (
            <section className={`${adminUi.panel} mt-4`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Etudiants</h2>
                  <p className="text-sm text-muted-foreground">
                    {dashboard?.etudiants.length ?? 0} etudiant(s) dans la promotion.
                  </p>
                </div>
                <Button
                  type="button"
                  className={adminUi.primaryBtn}
                  onClick={() => void openStudentsModal()}
                >
                  Gerer les eleves
                </Button>
              </div>
              <div className="mt-4 space-y-2">
                {(dashboard?.etudiants ?? []).map((etudiant) => (
                  <div
                    key={etudiant.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {etudiant.prenom} {etudiant.nom}
                    </span>
                    <span className="text-muted-foreground">{etudiant.email}</span>
                  </div>
                ))}
                {(dashboard?.etudiants ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun etudiant dans cette promotion.
                  </p>
                )}
              </div>
            </section>
          )}

          {activeTab === 'events' && selectedPromoId && (
            <StudentEventsSection
              promotions={promotions}
              selectedPromoId={selectedPromoId}
              onPromoChange={setSelectedPromoId}
              onFeedback={setFeedback}
              panelClassName="mt-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_12px_30px_rgba(79,23,48,0.08)] sm:p-6"
            />
          )}

          {feedback.message && (
            <p
              className={[
                'mt-4 rounded-lg px-3 py-2 text-sm',
                feedback.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200',
              ].join(' ')}
            >
              {feedback.message}
            </p>
          )}
        </section>
        <Modal
          open={isSubjectsModalOpen}
          title="Gestion des matieres de la promotion"
          onClose={() => setIsSubjectsModalOpen(false)}
          maxWidthClass="max-w-3xl"
          actions={
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setIsSubjectsModalOpen(false)}
            >
              Fermer
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={subjectCode}
              onChange={(event) => setSubjectCode(event.target.value)}
              placeholder="Code matiere"
              className={adminUi.input}
            />
            <input
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              placeholder="Nom matiere"
              className={adminUi.input}
            />
            <select
              value={subjectReferentId}
              onChange={(event) => setSubjectReferentId(event.target.value)}
              className={`${adminUi.select} sm:col-span-2`}
            >
              <option value="">Selectionner le referent</option>
              {(dashboard?.professeurs ?? []).map((professeur) => (
                <option key={professeur.id} value={professeur.id}>
                  {professeur.prenom} {professeur.nom} - {professeur.email}
                </option>
              ))}
            </select>
            <Button
              type="button"
              className={`${adminUi.primaryBtn} sm:col-span-2`}
              disabled={!subjectCode.trim() || !subjectName.trim() || !subjectReferentId}
              onClick={() =>
                void runAction(
                  () =>
                    addMatiereRequest(selectedPromoId, {
                      code_matiere: subjectCode.trim(),
                      nom_matiere: subjectName.trim(),
                      referent_prof_id: subjectReferentId,
                    }),
                  'Matiere ajoutee.'
                )
              }
            >
              Ajouter la matiere
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder="Rechercher une matiere deja liee"
                className={`${adminUi.input} pl-9`}
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
              {filteredDashboardSubjects.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Aucune matiere dans cette promotion.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredDashboardSubjects.map((matiere) => (
                    <li
                      key={matiere.code_matiere}
                      className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {matiere.nom_matiere} ({matiere.code_matiere})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {matiere.resources.length} fichier(s)
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
        <Modal
          open={isStudentsModalOpen}
          title="Gestion des eleves de la promotion"
          onClose={() => setIsStudentsModalOpen(false)}
          maxWidthClass="max-w-3xl"
          actions={
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
              onClick={() => setIsStudentsModalOpen(false)}
            >
              Fermer
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Rechercher un eleve par nom, prenom ou email"
                className={`${adminUi.input} pl-9`}
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
              {filteredManagedStudents.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">
                  Aucun eleve disponible pour cette recherche.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredManagedStudents.map((student) => (
                    <li
                      key={student.id}
                      className="flex flex-col gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {student.prenom} {student.nom}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{student.email}</p>
                      </div>
                      <Button
                        type="button"
                        className={adminUi.primaryBtn}
                        disabled={student.is_in_promo}
                        onClick={() =>
                          void runAction(
                            () => addStudentToPromoRequest(selectedPromoId, student.id),
                            'Eleve ajoute.'
                          ).then(() => refreshManagedStudents(selectedPromoId))
                        }
                      >
                        {student.is_in_promo ? 'Deja ajoute' : 'Ajouter'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredManagedStudents.length} resultat
              {filteredManagedStudents.length > 1 ? 's' : ''} affiche
              {filteredManagedStudents.length > 1 ? 's' : ''}.
            </p>
          </div>

          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Eleves actuellement dans la promo:</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {currentPromoStudents.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-1)] px-3 py-2"
                >
                  <span>
                    {student.prenom} {student.nom}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() =>
                      void runAction(
                        () => removeStudentFromPromoRequest(selectedPromoId, student.id),
                        'Eleve retire de la promo.'
                      ).then(() => refreshManagedStudents(selectedPromoId))
                    }
                  >
                    Desaffecter
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      </section>
    </main>
  );
}
