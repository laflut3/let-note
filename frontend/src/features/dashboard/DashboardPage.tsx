import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  authMeRequest,
  getPromotionDashboardRequest,
  listAccessiblePromotionsRequest,
  logoutRequest,
  type AuthMePayload,
  type PromotionDashboardPayload,
  type PromotionScope,
} from '@/features/auth/api';

type DashboardTab = 'accueil' | 'edt' | 'notes';

async function extractError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: string } | null;
  return data?.message ?? fallback;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardTab>('accueil');
  const [promotions, setPromotions] = useState<PromotionScope[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');
  const [dashboard, setDashboard] = useState<PromotionDashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = roles.includes('admin');
  const hasDelegueScope = promotions.some((promotion) => promotion.can_manage);

  const selectedPromotion =
    promotions.find((promotion) => promotion.id === selectedPromoId) ?? null;

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
        setErrorMessage(await extractError(response, 'Impossible de charger cette promotion.'));
        setDashboard(null);
        return;
      }

      const data = (await response.json()) as PromotionDashboardPayload;
      setDashboard(data);
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
            {hasDelegueScope && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/delegue')}
                className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                Delegue
              </Button>
            )}
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
                <p className="mt-2 break-all text-sm text-zinc-600">
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
          </section>
        </div>
      </section>
    </main>
  );
}
