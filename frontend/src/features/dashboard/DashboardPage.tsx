import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  addMatiereRequest,
  addProfesseurRequest,
  authMeRequest,
  createResultatRequest,
  createUeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  listUesRequest,
  logoutRequest,
  setReferentRequest,
  updatePromotionIcalRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
  type UeItem,
} from '@/features/auth/api';

type DashboardTab = 'accueil' | 'edt' | 'notes' | 'gestion';

type Feedback = {
  type: '' | 'success' | 'error';
  message: string;
};

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('accueil');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [roles, setRoles] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [ues, setUes] = useState<UeItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const [icalUrl, setIcalUrl] = useState('');
  const [newUeSemestre, setNewUeSemestre] = useState('1');
  const [matiereCode, setMatiereCode] = useState('');
  const [matiereName, setMatiereName] = useState('');
  const [selectedUeId, setSelectedUeId] = useState('');
  const [matiereCoef, setMatiereCoef] = useState('1');
  const [profNom, setProfNom] = useState('');
  const [profPrenom, setProfPrenom] = useState('');
  const [profEmail, setProfEmail] = useState('');
  const [referentMatiere, setReferentMatiere] = useState('');
  const [referentProf, setReferentProf] = useState('');

  const [resultMatiereId, setResultMatiereId] = useState('');
  const [resultEtudiantId, setResultEtudiantId] = useState('');
  const [resultLibelle, setResultLibelle] = useState('Session 1');
  const [resultSession, setResultSession] = useState('1');
  const [resultValue, setResultValue] = useState('0');
  const [resultCoef, setResultCoef] = useState('1');

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
      const [dashboardRes, uesRes] = await Promise.all([
        getPromotionDashboardRequest(promoId),
        listUesRequest(promoId),
      ]);

      if (!dashboardRes.ok) {
        setErrorMessage(
          await extractError(dashboardRes, 'Impossible de charger ce dashboard de promotion.')
        );
        setDashboard(null);
        return;
      }

      const data = (await dashboardRes.json()) as PromotionDashboardPayload;
      setDashboard(data);
      setIcalUrl(data.promotion.ical_url ?? '');
      setReferentMatiere(data.matieres[0]?.code_matiere ?? '');
      setReferentProf(data.professeurs[0]?.id ?? '');
      setResultMatiereId(data.matieres[0]?.code_matiere ?? '');
      setResultEtudiantId(data.etudiants[0]?.id ?? '');

      if (uesRes.ok) {
        const ueData = (await uesRes.json()) as UeItem[];
        setUes(ueData);
        setSelectedUeId((prev) => prev || ueData[0]?.id || '');
      } else {
        setUes([]);
      }
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

  const promoLabel = useMemo(() => {
    if (!selectedPromotion) {
      return 'Aucune promotion';
    }

    return `${selectedPromotion.nom} (${selectedPromotion.annee_arrivee}-${selectedPromotion.annee_depart})`;
  }, [selectedPromotion]);

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#f6efe1,#f1e7d8)] p-4 md:p-8">
      <section className="mx-auto max-w-[1280px] space-y-4">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--auth-card-border)] bg-[linear-gradient(135deg,#4f1730,#6d2745)] px-4 py-3 text-white shadow-[0_16px_38px_rgba(36,14,30,0.28)]">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['accueil', 'Accueil'],
                ['edt', 'EDT'],
                ['notes', 'Notes'],
                ['gestion', 'Gestion'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm transition',
                  activeTab === key ? 'bg-white/20 font-semibold' : 'hover:bg-white/10',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
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

        <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
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
                      <div className="font-semibold">{promotion.nom}</div>
                      <div className="text-xs opacity-80">
                        {promotion.annee_arrivee} - {promotion.annee_depart}
                      </div>
                      <div className="mt-1 text-[11px] opacity-75">
                        {promotion.can_manage ? 'Edition autorisee' : 'Lecture seule'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="space-y-4">
            <header className="rounded-2xl border border-black/10 bg-white/85 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold text-zinc-900 md:text-3xl">
                {promoLabel}
              </h1>
              <p className="mt-2 text-zinc-600">
                Prof referent promo:{' '}
                {dashboard?.promotion.referent_prof_prenom && dashboard?.promotion.referent_prof_nom
                  ? `${dashboard.promotion.referent_prof_prenom} ${dashboard.promotion.referent_prof_nom}`
                  : 'non defini'}
              </p>
            </header>

            {errorMessage && (
              <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">
                {errorMessage}
              </p>
            )}

            {activeTab === 'accueil' && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-lg font-semibold text-zinc-900">Vue generale</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {dashboard?.matieres.length ?? 0} matiere(s), {dashboard?.etudiants.length ?? 0}{' '}
                  etudiant(s), {dashboard?.professeurs.length ?? 0} professeur(s).
                </p>
              </div>
            )}

            {activeTab === 'edt' && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-lg font-semibold text-zinc-900">Emploi du temps (iCal)</h2>
                <p className="mt-2 text-sm text-zinc-600 break-all">
                  {dashboard?.promotion.ical_url ?? 'Aucune URL iCal configuree.'}
                </p>
                {dashboard?.promotion.ical_url && (
                  <a
                    href={dashboard.promotion.ical_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-zinc-900 underline"
                  >
                    Ouvrir le flux iCal
                  </a>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-lg font-semibold text-zinc-900">Notes et resultats</h2>
                {isLoadingDashboard ? (
                  <p className="mt-3 text-sm text-zinc-500">Chargement...</p>
                ) : !dashboard || dashboard.resultats.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">Aucun resultat.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-100 text-zinc-800">
                        <tr>
                          <th className="px-3 py-2 text-left">Matiere</th>
                          <th className="px-3 py-2 text-left">Etudiant</th>
                          <th className="px-3 py-2 text-left">Libelle</th>
                          <th className="px-3 py-2 text-left">Session</th>
                          <th className="px-3 py-2 text-left">Note</th>
                          <th className="px-3 py-2 text-left">Coef</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.resultats.map((resultat) => (
                          <tr key={resultat.id} className="border-t border-zinc-200 bg-white">
                            <td className="px-3 py-2">{resultat.nom_matiere}</td>
                            <td className="px-3 py-2">
                              {resultat.etu_prenom} {resultat.etu_nom} (
                              {resultat.etu_numero ?? 'n/a'})
                            </td>
                            <td className="px-3 py-2">{resultat.libelle}</td>
                            <td className="px-3 py-2">{resultat.session ?? '-'}</td>
                            <td className="px-3 py-2">{resultat.note.toFixed(2)}</td>
                            <td className="px-3 py-2">{resultat.coef.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gestion' && (
              <div className="space-y-4">
                {!canManageSelectedPromo && (
                  <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-800">
                    Cette promotion est en lecture seule pour votre compte.
                  </p>
                )}

                {canManageSelectedPromo && selectedPromoId && (
                  <>
                    <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                      <h3 className="text-lg font-semibold text-zinc-900">Gestion EDT et UE</h3>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input
                          value={icalUrl}
                          onChange={(e) => setIcalUrl(e.target.value)}
                          placeholder="URL iCal"
                          className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
                        />
                        <Button
                          type="button"
                          onClick={() =>
                            void runManageAction(
                              () => updatePromotionIcalRequest(selectedPromoId, icalUrl),
                              'URL iCal mise a jour.'
                            )
                          }
                          className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 md:col-span-2"
                        >
                          Mettre a jour iCal
                        </Button>
                        <input
                          value={newUeSemestre}
                          onChange={(e) => setNewUeSemestre(e.target.value)}
                          placeholder="Semestre UE"
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        />
                        <Button
                          type="button"
                          onClick={() =>
                            void runManageAction(
                              () =>
                                createUeRequest(selectedPromoId, {
                                  semestre: Number(newUeSemestre),
                                }),
                              'UE creee.'
                            )
                          }
                          className="h-11 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                        >
                          Creer UE
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                      <h3 className="text-lg font-semibold text-zinc-900">
                        Ajouter matiere / professeur / referent
                      </h3>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input
                          value={matiereCode}
                          onChange={(e) => setMatiereCode(e.target.value)}
                          placeholder="Code matiere (ex: XADO501B)"
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        />
                        <input
                          value={matiereName}
                          onChange={(e) => setMatiereName(e.target.value)}
                          placeholder="Nom matiere"
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        />
                        <select
                          value={selectedUeId}
                          onChange={(e) => setSelectedUeId(e.target.value)}
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        >
                          <option value="">Selectionner UE</option>
                          {ues.map((ue) => (
                            <option key={ue.id} value={ue.id}>
                              UE semestre {ue.semestre}
                            </option>
                          ))}
                        </select>
                        <input
                          value={matiereCoef}
                          onChange={(e) => setMatiereCoef(e.target.value)}
                          placeholder="Coef UE"
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        />
                        <Button
                          type="button"
                          className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 md:col-span-2"
                          onClick={() =>
                            void runManageAction(
                              () =>
                                addMatiereRequest(selectedPromoId, {
                                  code_matiere: matiereCode,
                                  nom_matiere: matiereName,
                                  ue_id: selectedUeId,
                                  coef_ue: Number(matiereCoef),
                                }),
                              'Matiere ajoutee a la promotion.'
                            )
                          }
                        >
                          Ajouter matiere
                        </Button>

                        <input
                          value={profPrenom}
                          onChange={(e) => setProfPrenom(e.target.value)}
                          placeholder="Prenom professeur"
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        />
                        <input
                          value={profNom}
                          onChange={(e) => setProfNom(e.target.value)}
                          placeholder="Nom professeur"
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        />
                        <input
                          value={profEmail}
                          onChange={(e) => setProfEmail(e.target.value)}
                          placeholder="Email professeur"
                          className="h-11 rounded-xl border border-zinc-300 px-3 md:col-span-2"
                        />
                        <Button
                          type="button"
                          className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 md:col-span-2"
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

                        <select
                          value={referentMatiere}
                          onChange={(e) => setReferentMatiere(e.target.value)}
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        >
                          <option value="">Selectionner matiere</option>
                          {(dashboard?.matieres ?? []).map((matiere) => (
                            <option key={matiere.code_matiere} value={matiere.code_matiere}>
                              {matiere.nom_matiere}
                            </option>
                          ))}
                        </select>
                        <select
                          value={referentProf}
                          onChange={(e) => setReferentProf(e.target.value)}
                          className="h-11 rounded-xl border border-zinc-300 px-3"
                        >
                          <option value="">Selectionner professeur</option>
                          {(dashboard?.professeurs ?? []).map((professeur) => (
                            <option key={professeur.id} value={professeur.id}>
                              {professeur.prenom} {professeur.nom}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 md:col-span-2"
                          onClick={() =>
                            void runManageAction(
                              () =>
                                setReferentRequest(selectedPromoId, referentMatiere, referentProf),
                              'Referent matiere mis a jour.'
                            )
                          }
                        >
                          Definir referent matiere
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                  <h3 className="text-lg font-semibold text-zinc-900">Renseigner un resultat</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Les etudiants peuvent ajouter/modifier leurs resultats. Admin/delegue peuvent le
                    faire pour tous.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <select
                      value={resultMatiereId}
                      onChange={(e) => setResultMatiereId(e.target.value)}
                      className="h-11 rounded-xl border border-zinc-300 px-3"
                    >
                      <option value="">Selectionner matiere</option>
                      {(dashboard?.matieres ?? []).map((matiere) => (
                        <option key={matiere.code_matiere} value={matiere.code_matiere}>
                          {matiere.nom_matiere}
                        </option>
                      ))}
                    </select>
                    <select
                      value={resultEtudiantId}
                      onChange={(e) => setResultEtudiantId(e.target.value)}
                      className="h-11 rounded-xl border border-zinc-300 px-3"
                      disabled={!canManageSelectedPromo}
                    >
                      <option value="">Selectionner etudiant</option>
                      {(dashboard?.etudiants ?? []).map((etu) => (
                        <option key={etu.id} value={etu.id}>
                          {etu.prenom} {etu.nom} ({etu.numero_etudiant ?? 'n/a'})
                        </option>
                      ))}
                    </select>
                    <input
                      value={resultLibelle}
                      onChange={(e) => setResultLibelle(e.target.value)}
                      placeholder="Libelle (ex: Session 1)"
                      className="h-11 rounded-xl border border-zinc-300 px-3"
                    />
                    <input
                      value={resultSession}
                      onChange={(e) => setResultSession(e.target.value)}
                      placeholder="Session (1/2)"
                      className="h-11 rounded-xl border border-zinc-300 px-3"
                    />
                    <input
                      value={resultValue}
                      onChange={(e) => setResultValue(e.target.value)}
                      placeholder="Note"
                      className="h-11 rounded-xl border border-zinc-300 px-3"
                    />
                    <input
                      value={resultCoef}
                      onChange={(e) => setResultCoef(e.target.value)}
                      placeholder="Coef"
                      className="h-11 rounded-xl border border-zinc-300 px-3"
                    />
                    <Button
                      type="button"
                      className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 md:col-span-2"
                      onClick={() =>
                        void runManageAction(
                          () =>
                            createResultatRequest(selectedPromoId, resultMatiereId, {
                              etudiant_id: canManageSelectedPromo
                                ? resultEtudiantId || undefined
                                : undefined,
                              libelle: resultLibelle,
                              session: resultSession ? Number(resultSession) : undefined,
                              note: Number(resultValue),
                              coef: Number(resultCoef),
                            }),
                          'Resultat enregistre.'
                        )
                      }
                    >
                      Ajouter resultat
                    </Button>
                  </div>
                </div>

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
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
