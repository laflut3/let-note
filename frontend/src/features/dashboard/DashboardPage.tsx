import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  addMatiereRequest,
  addProfesseurRequest,
  authMeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  logoutRequest,
  setReferentRequest,
  updatePromotionIcalRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
} from '@/features/auth/api';

type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

function formatYear(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return String(date.getFullYear());
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [roles, setRoles] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const [icalUrl, setIcalUrl] = useState('');
  const [matiereCode, setMatiereCode] = useState('');
  const [matiereName, setMatiereName] = useState('');
  const [profNom, setProfNom] = useState('');
  const [profPrenom, setProfPrenom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [referentMatiere, setReferentMatiere] = useState('');
  const [referentProf, setReferentProf] = useState('');

  const isAdmin = roles.includes('admin');
  const selectedPromotion =
    promotions.find((promotion) => promotion.id === selectedPromoId) ?? null;
  const canManageSelectedPromo = Boolean(isAdmin || selectedPromotion?.can_manage);

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
      setRoles(Array.isArray(meData.roles) ? meData.roles : []);

      const promotionsResponse = await listAccessiblePromotionsRequest();
      if (!promotionsResponse.ok) {
        setErrorMessage(
          await extractError(promotionsResponse, 'Impossible de charger les promotions.')
        );
        setPromotions([]);
        return;
      }

      const promotionsData = (await promotionsResponse.json()) as PromotionScope[];
      setPromotions(promotionsData);
      setSelectedPromoId((prev) => prev || promotionsData[0]?.id || '');
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboard = async (promoId: string) => {
    if (!promoId) {
      setDashboard(null);
      return;
    }

    setIsLoadingDashboard(true);
    setErrorMessage('');

    try {
      const response = await getPromotionDashboardRequest(promoId);
      if (!response.ok) {
        setErrorMessage(
          await extractError(response, 'Impossible de charger ce dashboard de promotion.')
        );
        setDashboard(null);
        return;
      }

      const data = (await response.json()) as PromotionDashboardPayload;
      setDashboard(data);
      setIcalUrl(data.promotion.ical_url ?? '');
      setReferentMatiere(data.matieres[0]?.code_matiere ?? '');
      setReferentProf(data.professeurs[0]?.id ?? '');
    } catch {
      setErrorMessage('Erreur reseau. Reessayez.');
      setDashboard(null);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    if (selectedPromoId) {
      void loadDashboard(selectedPromoId);
    }
  }, [selectedPromoId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } finally {
      navigate('/', { replace: true });
      setIsLoggingOut(false);
    }
  };

  const runManageAction = async (action: () => Promise<Response>, okMessage: string) => {
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

      setFeedback({ type: 'success', message: okMessage });
      if (selectedPromoId) {
        await loadDashboard(selectedPromoId);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erreur reseau. Reessayez.' });
    }
  };

  const promoBadge = useMemo(() => {
    if (!selectedPromotion) {
      return 'Aucune promotion';
    }

    const year = formatYear(selectedPromotion.annee_debut);
    return `Promo ${year}`;
  }, [selectedPromotion]);

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#f6efe1,#f1e7d8)] p-4 md:p-8">
      <section className="mx-auto max-w-[1200px] space-y-4">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--auth-card-border)] bg-[linear-gradient(135deg,#4f1730,#6d2745)] px-4 py-3 text-white shadow-[0_16px_38px_rgba(36,14,30,0.28)]">
          <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
            <span className="font-semibold uppercase tracking-[0.18em]">Accueil</span>
            <span>EDT</span>
            <span>Notes</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/admin')}
                className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                Admin
              </Button>
            )}
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="ghost"
              className="h-9 rounded-lg text-white hover:bg-white/12 hover:text-white"
            >
              {isLoggingOut ? 'Deconnexion...' : 'Logout'}
            </Button>
          </div>
        </nav>

        <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Promotions</p>
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-sm text-zinc-500">Chargement...</p>
              ) : promotions.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune promotion.</p>
              ) : (
                promotions.map((promotion) => {
                  const active = promotion.id === selectedPromoId;
                  return (
                    <button
                      key={promotion.id}
                      type="button"
                      onClick={() => setSelectedPromoId(promotion.id)}
                      className={[
                        'w-full rounded-xl border px-3 py-2 text-left text-sm transition',
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500',
                      ].join(' ')}
                    >
                      <div className="font-semibold">Promo {formatYear(promotion.annee_debut)}</div>
                      <div className="text-xs opacity-80">
                        {promotion.can_manage ? 'Gestion autorisee' : 'Lecture'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-semibold">Emploi du temps</p>
              <p className="mt-1 text-xs text-zinc-500">
                Source iCal de la promotion selectionnee.
              </p>
              {dashboard?.promotion.ical_url ? (
                <a
                  href={dashboard.promotion.ical_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-zinc-900 underline"
                >
                  Ouvrir le flux iCal
                </a>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Aucune URL iCal configuree.</p>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-semibold">Dernieres notes</p>
              <p className="mt-2 text-xs text-zinc-500">Integration a venir.</p>
            </div>
          </aside>

          <section className="space-y-4">
            <header className="rounded-2xl border border-black/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-zinc-900">{promoBadge}</h1>
              <p className="mt-2 text-zinc-600">
                Vue matieres, referents et ressources de la promotion.
              </p>
            </header>

            {errorMessage && (
              <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">
                {errorMessage}
              </p>
            )}

            <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
              <h2 className="text-xl font-semibold text-zinc-900">Matieres</h2>
              {isLoadingDashboard ? (
                <p className="mt-3 text-sm text-zinc-500">Chargement...</p>
              ) : !dashboard ? (
                <p className="mt-3 text-sm text-zinc-500">Selectionnez une promotion.</p>
              ) : dashboard.matieres.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Aucune matiere pour cette promotion.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {dashboard.matieres.map((matiere) => (
                    <details
                      key={matiere.code_matiere}
                      open
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                    >
                      <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                        {matiere.nom_matiere} ({matiere.code_matiere})
                      </summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                          <p className="font-medium">Cours / TD / TP</p>
                          <p className="mt-2 text-xs text-zinc-500">
                            Liens de ressources a brancher (cours, TD, TP, exam, annales).
                          </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                          <p className="font-medium">Prof referent</p>
                          {matiere.referent_prof_id ? (
                            <p className="mt-2 text-xs text-zinc-600">
                              {matiere.referent_prof_prenom} {matiere.referent_prof_nom} -{' '}
                              {matiere.referent_prof_email}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs text-zinc-500">Aucun referent defini.</p>
                          )}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            {canManageSelectedPromo && selectedPromoId && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-xl font-semibold text-zinc-900">Gestion de la promotion</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Admin global ou delegue affecte a cette promotion.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium text-zinc-800">URL iCal</span>
                    <input
                      value={icalUrl}
                      onChange={(event) => setIcalUrl(event.target.value)}
                      placeholder="https://proseconsult..."
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    />
                    <Button
                      type="button"
                      className="mt-2 h-10 rounded-xl bg-zinc-900 px-4 text-white hover:bg-zinc-800"
                      onClick={() =>
                        void runManageAction(
                          () => updatePromotionIcalRequest(selectedPromoId, icalUrl),
                          'URL iCal mise a jour.'
                        )
                      }
                    >
                      Enregistrer iCal
                    </Button>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-zinc-800">Code matiere</span>
                    <input
                      value={matiereCode}
                      onChange={(event) => setMatiereCode(event.target.value)}
                      placeholder="maths"
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-zinc-800">Nom matiere</span>
                    <input
                      value={matiereName}
                      onChange={(event) => setMatiereName(event.target.value)}
                      placeholder="Mathematiques"
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    />
                  </label>

                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-zinc-900 px-4 text-white hover:bg-zinc-800 md:col-span-2"
                    onClick={() =>
                      void runManageAction(
                        () =>
                          addMatiereRequest(selectedPromoId, {
                            code_matiere: matiereCode,
                            nom_matiere: matiereName,
                          }),
                        'Matiere ajoutee.'
                      )
                    }
                  >
                    Ajouter matiere
                  </Button>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-zinc-800">Prenom professeur</span>
                    <input
                      value={profPrenom}
                      onChange={(event) => setProfPrenom(event.target.value)}
                      placeholder="Marie"
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-zinc-800">Nom professeur</span>
                    <input
                      value={profNom}
                      onChange={(event) => setProfNom(event.target.value)}
                      placeholder="Dupont"
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    />
                  </label>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-sm font-medium text-zinc-800">Email professeur</span>
                    <input
                      value={profEmail}
                      onChange={(event) => setProfEmail(event.target.value)}
                      placeholder="prof@umontpellier.fr"
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    />
                  </label>

                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-zinc-900 px-4 text-white hover:bg-zinc-800 md:col-span-2"
                    onClick={() =>
                      void runManageAction(
                        () =>
                          addProfesseurRequest(selectedPromoId, {
                            prenom: profPrenom,
                            nom: profNom,
                            email: profEmail,
                          }),
                        'Professeur ajoute a la promotion.'
                      )
                    }
                  >
                    Ajouter professeur
                  </Button>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-zinc-800">Matiere</span>
                    <select
                      value={referentMatiere}
                      onChange={(event) => setReferentMatiere(event.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    >
                      <option value="">Selectionner</option>
                      {(dashboard?.matieres ?? []).map((matiere) => (
                        <option key={matiere.code_matiere} value={matiere.code_matiere}>
                          {matiere.nom_matiere}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-zinc-800">Referent professeur</span>
                    <select
                      value={referentProf}
                      onChange={(event) => setReferentProf(event.target.value)}
                      className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-900"
                    >
                      <option value="">Selectionner</option>
                      {(dashboard?.professeurs ?? []).map((professeur) => (
                        <option key={professeur.id} value={professeur.id}>
                          {professeur.prenom} {professeur.nom}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-zinc-900 px-4 text-white hover:bg-zinc-800 md:col-span-2"
                    onClick={() =>
                      void runManageAction(
                        () => setReferentRequest(selectedPromoId, referentMatiere, referentProf),
                        'Referent mis a jour.'
                      )
                    }
                  >
                    Definir le referent
                  </Button>
                </div>

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
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
