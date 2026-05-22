import type { ScheduleEvent } from '@/lib/dashboard/schedule';

function formatHourRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

type TodayScheduleModuleProps = {
  isLoadingSchedule: boolean;
  scheduleError: string;
  events: ScheduleEvent[];
};

export function TodayScheduleModule({
  isLoadingSchedule,
  scheduleError,
  events,
}: TodayScheduleModuleProps) {
  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Emploi du temps de la promo (journee actuelle)
      </h3>
      {isLoadingSchedule ? (
        <p className="mt-2 text-sm text-muted-foreground">Chargement...</p>
      ) : scheduleError ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/40 dark:bg-rose-950/30 dark:text-rose-200">
          {scheduleError}
        </p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucun cours aujourd hui.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {events.slice(0, 6).map((event) => (
            <article
              key={event.id}
              className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {formatHourRange(event.start, event.end)}
              </p>
              <p className="text-sm font-semibold text-foreground">{event.title}</p>
              {event.room ? (
                <p className="text-xs font-medium text-foreground/85">Salle: {event.room}</p>
              ) : null}
              {event.location ? (
                <p className="text-xs text-muted-foreground">{event.location}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
