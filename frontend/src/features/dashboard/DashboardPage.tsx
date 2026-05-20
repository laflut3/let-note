import { Calendar, Home, LogOut, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDashboardController } from '@/features/dashboard/dashboard/useDashboardController';

export function DashboardPage() {
  const navigate = useNavigate();
  const controller = useDashboardController(navigate);

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#f6efe1,#f1e7d8)] p-3 sm:p-4 md:p-8">
      <section className="mx-auto max-w-[1280px] w-full space-y-4">
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
                onClick={() => controller.setActiveTab(key)}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm transition flex items-center gap-2',
                  controller.activeTab === key ? 'bg-white/20 font-semibold' : 'hover:bg-white/10',
                ].join(' ')}
              >
                {key === 'accueil' && <Home className="h-4 w-4" />}
                {key === 'edt' && <Calendar className="h-4 w-4" />}
                {key === 'notes' && <Users className="h-4 w-4" />}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {controller.hasDelegueScope && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/delegue')}
                className="h-9 rounded-lg bg-white/15 text-white hover:bg-white/25 hover:text-white"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline sm:ml-1">Delegue</span>
              </Button>
            )}
            {controller.isAdmin && (
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
              onClick={controller.handleLogout}
              disabled={controller.isLoggingOut}
              variant="ghost"
              className="h-9 rounded-lg text-white hover:bg-white/12 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline sm:ml-1">
                {controller.isLoggingOut ? 'Deconnexion...' : 'Logout'}
              </span>
            </Button>
          </div>
        </nav>

        <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Promotions</p>
            <div className="space-y-2">
              {controller.isLoading ? (
                <p className="text-sm text-zinc-500">Chargement...</p>
              ) : controller.promotions.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune promotion.</p>
              ) : (
                controller.promotions.map((promotion) => {
                  const active = promotion.id === controller.selectedPromoId;
                  return (
                    <button
                      key={promotion.id}
                      type="button"
                      onClick={() => controller.setSelectedPromoId(promotion.id)}
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
                {controller.promoLabel}
              </h1>
              <p className="mt-2 text-zinc-600">
                Prof referent promo:{' '}
                {controller.dashboard?.promotion.referent_prof_prenom &&
                controller.dashboard?.promotion.referent_prof_nom
                  ? `${controller.dashboard.promotion.referent_prof_prenom} ${controller.dashboard.promotion.referent_prof_nom}`
                  : 'non defini'}
              </p>
            </header>

            {controller.errorMessage && (
              <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">
                {controller.errorMessage}
              </p>
            )}

            {controller.activeTab === 'accueil' && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-lg font-semibold text-zinc-900">Vue generale</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  {controller.dashboard?.matieres.length ?? 0} matiere(s),{' '}
                  {controller.dashboard?.etudiants.length ?? 0} etudiant(s),{' '}
                  {controller.dashboard?.professeurs.length ?? 0} professeur(s).
                </p>
              </div>
            )}

            {controller.activeTab === 'edt' && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-lg font-semibold text-zinc-900">Emploi du temps (iCal)</h2>
                <p className="mt-2 break-all text-sm text-zinc-600">
                  {controller.dashboard?.promotion.ical_url ?? 'Aucune URL iCal configuree.'}
                </p>
              </div>
            )}

            {controller.activeTab === 'notes' && (
              <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                <h2 className="text-lg font-semibold text-zinc-900">Notes et resultats</h2>
                {controller.isLoadingDashboard ? (
                  <p className="mt-3 text-sm text-zinc-500">Chargement...</p>
                ) : !controller.dashboard || controller.dashboard.resultats.length === 0 ? (
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
                        {controller.dashboard.resultats.map((resultat) => (
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
