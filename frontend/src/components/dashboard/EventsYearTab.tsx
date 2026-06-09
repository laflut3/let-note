import type { PromotionDashboardPayload, PromotionEventItem } from '@/services/api';

type EventsYearTabProps = {
  dashboard: PromotionDashboardPayload | null;
};

function formatEventDate(event: PromotionEventItem): string {
  return new Date(event.occurrence_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function eventLabel(event: PromotionEventItem): string {
  if (event.event_type === 'birthday') return 'Anniversaire';
  return event.title || 'Croissantage';
}

export function EventsYearTab({ dashboard }: EventsYearTabProps) {
  const events = dashboard?.events ?? [];

  return (
    <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-4">
      <header className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
        <h2 className="text-xl font-semibold text-foreground">Events a venir</h2>
      </header>

      <div className="mt-4 space-y-2">
        {events.map((event) => (
          <article
            key={`${event.event_type}-${event.id_etu}-${event.id ?? event.occurrence_date}`}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-2)] p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{eventLabel(event)}</p>
              <span className="rounded-md border border-[var(--surface-border)] px-2 py-0.5 text-xs text-muted-foreground">
                {formatEventDate(event)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {event.student_prenom} {event.student_nom}
            </p>
          </article>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun event a venir pour l&apos;annee en cours.
          </p>
        )}
      </div>
    </section>
  );
}
