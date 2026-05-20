import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Home, LogOut, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addMatiereRequest,
  addProfesseurRequest,
  authMeRequest,
  createResultatRequest,
  createUeRequest,
  deleteUeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  listUesRequest,
  logoutRequest,
  setReferentRequest,
  updateUeRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
  type UeItem,
} from '@/services/api';

type DelegateTab = 'general' | 'matieres' | 'professeurs' | 'resultats';

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
  const [roles, setRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DelegateTab>('general');
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [ues, setUes] = useState<UeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ type: '', message: '' });

  const [newUeSemestre, setNewUeSemestre] = useState('1');
  const [editingUeId, setEditingUeId] = useState('');
  const [editingUeSemestre, setEditingUeSemestre] = useState('1');
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
      setUes([]);
      return;
    }

    setErrorMessage('');
    try {
      const [dashboardRes, uesRes] = await Promise.all([
        getPromotionDashboardRequest(promoId),
        listUesRequest(promoId),
      ]);

      if (!dashboardRes.ok) {
        setErrorMessage(await extractError(dashboardRes, 'Impossible de charger cette promotion.'));
        setDashboard(null);
        setUes([]);
        return;
      }

      const dashboardData = (await dashboardRes.json()) as PromotionDashboardPayload;
      setDashboard(dashboardData);
      setReferentMatiere(dashboardData.matieres[0]?.code_matiere ?? '');
      setReferentProf(dashboardData.professeurs[0]?.id ?? '');
      setResultMatiereId(dashboardData.matieres[0]?.code_matiere ?? '');
      setResultEtudiantId(dashboardData.etudiants[0]?.id ?? '');

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
      setUes([]);
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f0e5,#f1e7d8)] p-3 sm:p-4 md:p-8">
      <section className="mx-auto max-w-[1280px] w-full space-y-4">
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--auth-card-border)] bg-[linear-gradient(135deg,#4f1730,#6d2745)] px-4 py-3 text-white shadow-[0_16px_38px_rgba(36,14,30,0.28)]">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['general', 'Vue generale'],
                ['matieres', 'Matieres'],
                ['professeurs', 'Professeurs'],
                ['resultats', 'Resultats'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm transition flex items-center gap-2',
                  activeTab === value ? 'bg-white/20 font-semibold' : 'hover:bg-white/10',
                ].join(' ')}
              >
                {value === 'general' && <Home className="h-4 w-4" />}
                {value === 'matieres' && <BookOpen className="h-4 w-4" />}
                {value === 'professeurs' && <Users className="h-4 w-4" />}
                {value === 'resultats' && <Shield className="h-4 w-4" />}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1">Dashboard</span>
            </Button>
            {isAdmin && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/admin')}
                className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-1">Admin</span>
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="h-9 rounded-lg text-white hover:bg-white/12 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1">Logout</span>
            </Button>
          </div>
        </nav>

        <section className="rounded-2xl border border-black/10 bg-white/85 p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Promotions deleguees</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isLoading ? (
              <p className="text-sm text-zinc-500">Chargement...</p>
            ) : promotions.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune promotion geree pour ce compte.</p>
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
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500',
                    ].join(' ')}
                  >
                    {promotion.nom} ({promotion.annee_arrivee}-{promotion.annee_depart})
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Espace delegue</p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900 md:text-3xl">{promoLabel}</h1>
          {errorMessage && (
            <p className="mt-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">
              {errorMessage}
            </p>
          )}

          {activeTab === 'general' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <h2 className="text-base font-semibold text-zinc-900">Resume</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {dashboard?.matieres.length ?? 0} matiere(s), {dashboard?.professeurs.length ?? 0}{' '}
                  professeur(s), {dashboard?.etudiants.length ?? 0} etudiant(s).
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <h2 className="text-base font-semibold text-zinc-900">Prof referent promo</h2>
                <p className="mt-2 text-sm text-zinc-700">
                  {dashboard?.promotion.referent_prof_prenom &&
                  dashboard?.promotion.referent_prof_nom
                    ? `${dashboard.promotion.referent_prof_prenom} ${dashboard.promotion.referent_prof_nom}`
                    : 'Non defini'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'matieres' && selectedPromoId && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  value={newUeSemestre}
                  onChange={(e) => setNewUeSemestre(e.target.value)}
                  placeholder="Semestre UE"
                  className="h-11 rounded-xl border border-zinc-300 px-3"
                />
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() =>
                    void runAction(
                      () => createUeRequest(selectedPromoId, { semestre: Number(newUeSemestre) }),
                      'UE creee.'
                    )
                  }
                >
                  Creer UE
                </Button>
              </div>

              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm font-semibold text-zinc-800">UE de la promotion</p>
                {ues.length === 0 && (
                  <p className="text-xs text-zinc-600">Aucune UE liee a cette promotion.</p>
                )}
                {ues.map((ue) => (
                  <div
                    key={ue.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2"
                  >
                    <div className="text-sm text-zinc-700">
                      UE {ue.id.slice(0, 8)} - semestre {ue.semestre}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={editingUeId === ue.id ? editingUeSemestre : String(ue.semestre)}
                        onChange={(e) => {
                          setEditingUeId(ue.id);
                          setEditingUeSemestre(e.target.value);
                        }}
                        className="h-9 w-28 rounded-lg border border-zinc-300 px-2 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg"
                        onClick={() =>
                          void runAction(
                            () =>
                              updateUeRequest(selectedPromoId, ue.id, {
                                semestre:
                                  Number(editingUeId === ue.id ? editingUeSemestre : ue.semestre) ||
                                  ue.semestre,
                              }),
                            'UE modifiee.'
                          )
                        }
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-lg border-rose-300 text-rose-700 hover:bg-rose-50"
                        onClick={() =>
                          void runAction(
                            () => deleteUeRequest(selectedPromoId, ue.id),
                            'UE supprimee.'
                          )
                        }
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={matiereCode}
                  onChange={(e) => setMatiereCode(e.target.value)}
                  placeholder="Code matiere"
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
                  className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 sm:col-span-2"
                  onClick={() =>
                    void runAction(
                      () =>
                        addMatiereRequest(selectedPromoId, {
                          code_matiere: matiereCode,
                          nom_matiere: matiereName,
                          ue_id: selectedUeId,
                          coef_ue: Number(matiereCoef),
                          referent_prof_id: referentProf,
                        }),
                      'Matiere ajoutee.'
                    )
                  }
                >
                  Ajouter matiere
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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
                  className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 sm:col-span-2"
                  onClick={() =>
                    void runAction(
                      () => setReferentRequest(selectedPromoId, referentMatiere, referentProf),
                      'Referent mis a jour.'
                    )
                  }
                >
                  Definir referent matiere
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'professeurs' && selectedPromoId && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
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
                  className="h-11 rounded-xl border border-zinc-300 px-3 sm:col-span-2"
                />
                <Button
                  type="button"
                  className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 sm:col-span-2"
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

              <div className="overflow-x-auto rounded-xl border border-zinc-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-100 text-zinc-800">
                    <tr>
                      <th className="px-3 py-2 text-left">Professeur</th>
                      <th className="px-3 py-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.professeurs ?? []).map((professeur) => (
                      <tr key={professeur.id} className="border-t border-zinc-200 bg-white">
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
          )}

          {activeTab === 'resultats' && selectedPromoId && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
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
                  placeholder="Libelle"
                  className="h-11 rounded-xl border border-zinc-300 px-3"
                />
                <input
                  value={resultSession}
                  onChange={(e) => setResultSession(e.target.value)}
                  placeholder="Session"
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
                  className="h-10 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 sm:col-span-2"
                  onClick={() =>
                    void runAction(
                      () =>
                        createResultatRequest(selectedPromoId, resultMatiereId, {
                          etudiant_id: resultEtudiantId || undefined,
                          libelle: resultLibelle,
                          session: resultSession ? Number(resultSession) : undefined,
                          note: Number(resultValue),
                          coef: Number(resultCoef),
                        }),
                      'Resultat ajoute.'
                    )
                  }
                >
                  Ajouter resultat
                </Button>
              </div>
            </div>
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
