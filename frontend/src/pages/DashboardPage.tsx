import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Home, LogOut, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { ScheduleEvent } from '@/lib/dashboard/schedule';
import { useDashboardController } from '@/hooks/useDashboardController';

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 18 * 60;
const SLOT_MINUTES = 30;
const GRID_ROW_COUNT = (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES;

function formatHourRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function getWeekStart(baseDate: Date, offset: number): Date {
  const now = new Date(baseDate);
  const day = now.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + offsetToMonday + offset * 7);
  now.setHours(0, 0, 0, 0);
  return now;
}

function getWeekDaysFromStart(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function eventColorClass(title: string): string {
  const palette = [
    'bg-[#b8dce6] border-[#5ea7bc]',
    'bg-[#d9c0b0] border-[#b48367]',
    'bg-[#cfd2e8] border-[#7d88bd]',
    'bg-[#d4e8bf] border-[#7eaf4d]',
    'bg-[#ead3d3] border-[#ca9090]',
    'bg-[#d8d2ea] border-[#9f8cc8]',
  ];

  let hash = 0;
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length];
}

function computeGridPlacement(event: ScheduleEvent): { rowStart: number; rowSpan: number } {
  const startMinutes = event.start.getHours() * 60 + event.start.getMinutes();
  const endMinutes = event.end.getHours() * 60 + event.end.getMinutes();

  const clampedStart = Math.max(DAY_START_MINUTES, Math.min(DAY_END_MINUTES, startMinutes));
  const clampedEnd = Math.max(DAY_START_MINUTES, Math.min(DAY_END_MINUTES, endMinutes));

  const rowStart = Math.floor((clampedStart - DAY_START_MINUTES) / SLOT_MINUTES) + 1;
  const rawSpan = Math.ceil((clampedEnd - clampedStart) / SLOT_MINUTES);
  const rowSpan = Math.max(1, rawSpan);

  return { rowStart, rowSpan };
}

function formatHour(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}h${mins}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const controller = useDashboardController(navigate);
  const [weekOffset, setWeekOffset] = useState(0);
  const safeAllEvents = Array.isArray(controller.allEvents) ? controller.allEvents : [];
  const safeTodayEvents = Array.isArray(controller.todayEvents) ? controller.todayEvents : [];

  const weekStart = useMemo(() => getWeekStart(new Date(), weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + 4);
    return date;
  }, [weekStart]);
  const weekDays = useMemo(() => getWeekDaysFromStart(weekStart), [weekStart]);

  const weekEvents = useMemo(() => {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd);
    end.setHours(23, 59, 59, 999);
    return safeAllEvents.filter(
      (event) => event.start.getTime() <= end.getTime() && event.end.getTime() >= start.getTime()
    );
  }, [safeAllEvents, weekStart, weekEnd]);

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#f6efe1,#f1e7d8)] px-2 py-3 sm:px-3 sm:py-4 md:px-4 md:py-6">
      <section className="mx-auto max-w-[1780px] space-y-4">
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

        {controller.activeTab === 'accueil' && (
          <section className="rounded-3xl border border-zinc-300 bg-white/85 p-4">
            <header className="mb-4 rounded-2xl border border-zinc-300 bg-white p-4">
              <h1 className="text-2xl font-semibold text-zinc-900">{controller.promoLabel}</h1>
              <p className="mt-1 text-sm text-zinc-600">
                Prof referent promo:{' '}
                {controller.dashboard?.promotion.referent_prof_prenom &&
                controller.dashboard?.promotion.referent_prof_nom
                  ? `${controller.dashboard.promotion.referent_prof_prenom} ${controller.dashboard.promotion.referent_prof_nom}`
                  : 'non defini'}
              </p>
            </header>

            <div className="grid gap-4 xl:grid-cols-[72px_1fr_1.4fr]">
              <aside className="rounded-2xl border border-zinc-300 bg-white p-2">
                <div className="space-y-2">
                  {controller.promotions.map((promotion) => {
                    const active = promotion.id === controller.selectedPromoId;
                    return (
                      <button
                        key={promotion.id}
                        type="button"
                        onClick={() => controller.setSelectedPromoId(promotion.id)}
                        className={[
                          'w-full rounded-xl border p-2 text-center text-[11px] transition',
                          active
                            ? 'border-zinc-800 bg-[#f6e7a1] text-zinc-900'
                            : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-500',
                        ].join(' ')}
                      >
                        {promotion.image_url ? (
                          <img
                            src={promotion.image_url}
                            alt={promotion.nom}
                            className="mx-auto mb-1 h-9 w-9 rounded-md border border-zinc-400 object-cover"
                          />
                        ) : (
                          <div className="mx-auto mb-1 h-9 w-9 rounded-md border border-zinc-400 bg-zinc-100" />
                        )}
                        {promotion.nom}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-4">
                <section className="rounded-2xl border border-zinc-300 bg-white p-4">
                  <h3 className="text-sm font-semibold">
                    Emploi du temps de la promo (journee actuelle)
                  </h3>
                  {controller.isLoadingSchedule ? (
                    <p className="mt-2 text-sm text-zinc-500">Chargement...</p>
                  ) : controller.scheduleError ? (
                    <p className="mt-2 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">
                      {controller.scheduleError}
                    </p>
                  ) : safeTodayEvents.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">Aucun cours aujourd hui.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {safeTodayEvents.slice(0, 6).map((event) => (
                        <article
                          key={event.id}
                          className="rounded-lg border border-zinc-300 bg-zinc-50 p-2"
                        >
                          <p className="text-xs font-semibold text-zinc-700">
                            {formatHourRange(event.start, event.end)}
                          </p>
                          <p className="text-sm font-semibold text-zinc-900">{event.title}</p>
                          {event.location ? (
                            <p className="text-xs text-zinc-600">{event.location}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-zinc-300 bg-white p-4">
                  <h3 className="text-sm font-semibold">Homework</h3>
                  <div className="mt-2 space-y-2">
                    {(controller.dashboard?.matieres ?? []).slice(0, 3).map((matiere) => (
                      <article
                        key={matiere.code_matiere}
                        className="rounded-lg border border-zinc-300 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{matiere.nom_matiere}</p>
                          <span className="rounded-md border border-zinc-400 px-2 py-0.5 text-xs">
                            date rendu
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">description</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <button className="rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                            fichier lier au devoir
                          </button>
                          <button className="rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                            fichier lier au devoir
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-300 bg-white p-4">
                  <h3 className="text-sm font-semibold">5 dernieres notes</h3>
                  {controller.dashboard?.resultats?.length ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {controller.dashboard.resultats.slice(0, 5).map((r) => (
                        <li key={r.id}>
                          {r.nom_matiere} - {r.note.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">Aucune note.</p>
                  )}
                </section>
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-zinc-300 bg-white p-4">
                  <h3 className="text-sm font-semibold">Liste des matieres</h3>
                  <div className="mt-2 space-y-2">
                    {(controller.dashboard?.matieres ?? []).map((matiere) => (
                      <details
                        key={matiere.code_matiere}
                        className="rounded-lg border border-zinc-300 p-2"
                        open
                      >
                        <summary className="cursor-pointer text-sm font-semibold">
                          {matiere.nom_matiere}
                        </summary>
                        <div className="mt-2 grid gap-3 lg:grid-cols-2">
                          <div className="space-y-2">
                            {(['cours', 'td', 'tp'] as const).map((type) => {
                              const resources = (matiere.resources ?? []).filter(
                                (item) => item.type_metier === type
                              );
                              return (
                                <div key={`${matiere.code_matiere}-${type}`}>
                                  <p className="text-xs font-semibold uppercase text-zinc-600">
                                    {type}
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    {resources.length === 0 ? (
                                      <button className="w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                                        fichier lier au {type}
                                      </button>
                                    ) : (
                                      resources.map((resource) => (
                                        <a
                                          key={resource.id}
                                          href={resource.url ?? '#'}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-center text-xs"
                                        >
                                          {resource.title}
                                        </a>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase text-zinc-600">exam</p>
                            <div className="space-y-1">
                              {(matiere.resources ?? [])
                                .filter((item) => item.type_metier === 'exam')
                                .map((resource) => (
                                  <a
                                    key={resource.id}
                                    href={resource.url ?? '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-center text-xs"
                                  >
                                    {resource.title}
                                  </a>
                                ))}
                              {(matiere.resources ?? []).filter(
                                (item) => item.type_metier === 'exam'
                              ).length === 0 ? (
                                <>
                                  <button className="w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                                    fichier lier au l'exam
                                  </button>
                                  <button className="w-full rounded-md border border-zinc-700 bg-[#f3e29a] px-2 py-1 text-xs">
                                    fichier lier au anal
                                  </button>
                                </>
                              ) : null}
                            </div>
                            <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 p-2 text-xs">
                              info sur le prof referent au cour
                              <br />
                              {matiere.referent_prof_prenom ?? '-'}{' '}
                              {matiere.referent_prof_nom ?? ''}
                              <br />
                              {matiere.referent_prof_email ?? '-'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 rounded-md border border-zinc-300 bg-zinc-50 p-2 text-xs">
                          referent: {matiere.referent_prof_prenom ?? '-'}{' '}
                          {matiere.referent_prof_nom ?? ''}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-300 bg-white p-4">
                  <h3 className="text-sm font-semibold">Profils etudiant</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      value={controller.profileForm.numero_etudiant}
                      onChange={(event) =>
                        controller.setProfileForm((prev) => ({
                          ...prev,
                          numero_etudiant: event.target.value,
                        }))
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      placeholder="Numero etudiant"
                    />
                    <input
                      type="date"
                      value={controller.profileForm.date_naissance}
                      onChange={(event) =>
                        controller.setProfileForm((prev) => ({
                          ...prev,
                          date_naissance: event.target.value,
                        }))
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <input
                      value={controller.profileForm.prenom}
                      onChange={(event) =>
                        controller.setProfileForm((prev) => ({
                          ...prev,
                          prenom: event.target.value,
                        }))
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      placeholder="Prenom"
                    />
                    <input
                      value={controller.profileForm.nom}
                      onChange={(event) =>
                        controller.setProfileForm((prev) => ({ ...prev, nom: event.target.value }))
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      placeholder="Nom"
                    />
                    <input
                      value={controller.profileForm.email}
                      onChange={(event) =>
                        controller.setProfileForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      className="sm:col-span-2 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      placeholder="Email"
                    />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={controller.saveProfile}
                      disabled={controller.isSavingProfile}
                      className="h-8 rounded-md bg-zinc-900 px-3 text-xs text-white hover:bg-zinc-700"
                    >
                      {controller.isSavingProfile ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    {controller.profileMessage ? (
                      <p className="text-xs text-zinc-600">{controller.profileMessage}</p>
                    ) : null}
                  </div>
                </section>
              </div>
            </div>
          </section>
        )}

        {controller.activeTab !== 'accueil' && (
          <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
            <aside className="space-y-4 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Promotions</p>
              <div className="space-y-2">
                {controller.promotions.map((promotion) => {
                  const active = promotion.id === controller.selectedPromoId;
                  return (
                    <button
                      key={promotion.id}
                      type="button"
                      onClick={() => controller.setSelectedPromoId(promotion.id)}
                      className={[
                        'w-full rounded-xl border px-3 py-2 text-left text-sm transition flex items-center gap-3',
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500',
                      ].join(' ')}
                    >
                      {promotion.image_url ? (
                        <img
                          src={promotion.image_url}
                          alt={promotion.nom}
                          className="h-10 w-10 rounded-md border border-zinc-300 object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md border border-zinc-300 bg-zinc-100" />
                      )}
                      <div>
                        <div className="font-semibold">{promotion.nom}</div>
                        <div className="text-xs opacity-80">
                          {promotion.annee_arrivee} - {promotion.annee_depart}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="space-y-4">
              {controller.activeTab === 'edt' && (
                <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900">
                        Emploi du temps de la semaine
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        Du {weekStart.toLocaleDateString('fr-FR')} au{' '}
                        {weekEnd.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setWeekOffset(0)}>
                        Aujourd hui
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-300 bg-white p-3">
                    <div className="min-w-[980px]">
                      <div className="grid grid-cols-[70px_repeat(5,minmax(0,1fr))] gap-2">
                        <div />
                        {weekDays.map((day) => (
                          <div
                            key={day.toISOString()}
                            className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-2 text-center text-sm font-semibold text-zinc-800"
                          >
                            {day.toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 grid grid-cols-[70px_repeat(5,minmax(0,1fr))] gap-2">
                        <div
                          className="grid"
                          style={{
                            gridTemplateRows: `repeat(${GRID_ROW_COUNT}, minmax(24px, 1fr))`,
                          }}
                        >
                          {Array.from({ length: GRID_ROW_COUNT }, (_, index) => {
                            const minutes = DAY_START_MINUTES + index * SLOT_MINUTES;
                            const isHour = minutes % 60 === 0;
                            return (
                              <div
                                key={`time-${minutes}`}
                                className="relative border-t border-zinc-200 text-[11px] text-zinc-600"
                              >
                                {isHour ? (
                                  <span className="absolute left-1 -translate-y-1/2">
                                    {formatHour(minutes)}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>

                        {weekDays.map((day) => {
                          const dayEvents = weekEvents.filter((event) =>
                            isSameDay(event.start, day)
                          );
                          return (
                            <div
                              key={day.toISOString()}
                              className="relative grid rounded-md border border-zinc-300 bg-[#fafafa]"
                              style={{
                                gridTemplateRows: `repeat(${GRID_ROW_COUNT}, minmax(24px, 1fr))`,
                              }}
                            >
                              {Array.from({ length: GRID_ROW_COUNT }, (_, index) => (
                                <div
                                  key={`line-${day.toISOString()}-${index}`}
                                  className="border-t border-zinc-200/80"
                                />
                              ))}
                              {dayEvents.map((event) => {
                                const placement = computeGridPlacement(event);
                                return (
                                  <article
                                    key={event.id}
                                    className={`z-10 mx-1 my-[1px] rounded-md border px-2 py-1 text-center text-[11px] leading-tight text-zinc-900 shadow-sm ${eventColorClass(event.title)}`}
                                    style={{
                                      gridRow: `${placement.rowStart} / span ${placement.rowSpan}`,
                                    }}
                                  >
                                    <p className="font-semibold">{event.title}</p>
                                    <p className="text-[10px]">
                                      {formatHourRange(event.start, event.end)}
                                    </p>
                                  </article>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {controller.activeTab === 'notes' && (
                <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
                  <h2 className="text-lg font-semibold text-zinc-900">Notes et resultats</h2>
                  {!controller.dashboard || controller.dashboard.resultats.length === 0 ? (
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
                                {resultat.etu_prenom} {resultat.etu_nom}
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
        )}
      </section>
    </main>
  );
}
