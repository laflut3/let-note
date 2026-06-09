import type { PromotionDashboardPayload, PromotionEventItem } from '@/services/api';

type EventsModuleProps = {
  dashboard: PromotionDashboardPayload | null;
};

function formatEventDate(event: PromotionEventItem): string {
  return new Date(event.occurrence_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
  });
}

function eventLabel(event: PromotionEventItem): string {
  if (event.event_type === 'birthday') return 'Anniversaire';
  return event.title || 'Croissantage';
}

export function EventsModule({ dashboard }: EventsModuleProps) {
  const todayEvents = (dashboard?.events ?? []).filter((event) => event.is_today);

  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-foreground">Events</h3>
      <div className="mt-2 space-y-2">
        {todayEvents.map((event) => (
          <article
            key={`${event.event_type}-${event.id_etu}-${event.id ?? event.occurrence_date}`}
            className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
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
        {todayEvents.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun event aujourd hui.</p>
        )}
      </div>
    </section>
  );
}
