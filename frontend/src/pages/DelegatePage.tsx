import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Home, Layers, LogOut, Shield, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/auth/ThemeToggle';
import { useThemeContext } from '@/context/theme-context';
import { adminUi } from '@/lib/admin-ui';
import { DevoirsSection } from '@/components/devoirs/DevoirsSection';
import { ResultsModule } from '@/components/dashboard/ResultsModule';
import { SubjectsTab } from '@/components/admin/SubjectsSection';
import { UesSection } from '@/components/admin/UesSection';
import { AdminOverlays } from '@/components/admin/AdminOverlays';
import { useAdminController } from '@/hooks/useAdminController';
import {
  addProfesseurRequest,
  authMeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  logoutRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
} from '@/services/api';

type DelegateTab =
  | 'general'
  | 'ues'
  | 'matieres'
  | 'professeurs'
  | 'etudiants'
  | 'devoirs'
  | 'resultats';

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
  const adminController = useAdminController(navigate);
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
                ['ues', 'UE'],
                ['devoirs', 'Devoirs'],
                ['resultats', 'Resultats'],
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
                {value === 'ues' && <Layers className="h-4 w-4" />}
                {value === 'matieres' && <BookOpen className="h-4 w-4" />}
                {value === 'professeurs' && <User className="h-4 w-4" />}
                {value === 'etudiants' && <Users className="h-4 w-4" />}
                {value === 'devoirs' && <BookOpen className="h-4 w-4" />}
                {value === 'resultats' && <Shield className="h-4 w-4" />}
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

          {activeTab === 'ues' && <UesSection controller={adminController} />}

          {activeTab === 'matieres' && <SubjectsTab controller={adminController} />}

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
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--surface-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-muted)] text-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Etudiant</th>
                    <th className="px-3 py-2 text-left">Numero</th>
                    <th className="px-3 py-2 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.etudiants ?? []).map((etudiant) => (
                    <tr
                      key={etudiant.id}
                      className="border-t border-[var(--surface-border)] bg-[var(--surface-2)]"
                    >
                      <td className="px-3 py-2">
                        {etudiant.prenom} {etudiant.nom}
                      </td>
                      <td className="px-3 py-2">{etudiant.numero_etudiant ?? '-'}</td>
                      <td className="px-3 py-2">{etudiant.email}</td>
                    </tr>
                  ))}
                  {(dashboard?.etudiants ?? []).length === 0 && (
                    <tr className="border-t border-[var(--surface-border)] bg-[var(--surface-2)]">
                      <td className="px-3 py-2 text-muted-foreground" colSpan={3}>
                        Aucun etudiant dans cette promotion.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'devoirs' && selectedPromoId && (
            <DevoirsSection
              promotions={promotions}
              matieres={dashboard?.matieres ?? []}
              selectedPromoId={selectedPromoId}
              onPromoChange={setSelectedPromoId}
              onFeedback={setFeedback}
              theme={{
                panel:
                  'mt-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_12px_30px_rgba(79,23,48,0.08)] sm:p-6',
                title: 'text-xl font-semibold text-foreground',
                input:
                  'h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3',
                select:
                  'h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3',
                primaryButton:
                  'h-10 rounded-xl bg-[var(--surface-strong)] text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900',
                row: 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4',
              }}
            />
          )}

          {activeTab === 'resultats' && selectedPromoId && (
            <div className="mt-4">
              <ResultsModule
                dashboard={dashboard}
                promoId={selectedPromoId}
                canManagePromotion
                currentUserId=""
                onSaved={async () => {
                  if (selectedPromoId) {
                    await loadPromotionData(selectedPromoId);
                  }
                }}
              />
            </div>
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

          {(activeTab === 'ues' || activeTab === 'matieres') &&
            adminController.feedback.message && (
              <p
                className={[
                  'mt-4 rounded-lg px-3 py-2 text-sm',
                  adminController.feedback.type === 'success'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200',
                ].join(' ')}
              >
                {adminController.feedback.message}
              </p>
            )}
        </section>
        {(activeTab === 'ues' || activeTab === 'matieres') && (
          <AdminOverlays controller={adminController} />
        )}
      </section>
    </main>
  );
}
