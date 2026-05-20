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
    <section className="rounded-2xl border border-zinc-300 bg-white p-4">
      <h3 className="text-sm font-semibold">Emploi du temps de la promo (journee actuelle)</h3>
      {isLoadingSchedule ? (
        <p className="mt-2 text-sm text-zinc-500">Chargement...</p>
      ) : scheduleError ? (
        <p className="mt-2 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700">
          {scheduleError}
        </p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">Aucun cours aujourd hui.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {events.slice(0, 6).map((event) => (
            <article key={event.id} className="rounded-lg border border-zinc-300 bg-zinc-50 p-2">
              <p className="text-xs font-semibold text-zinc-700">
                {formatHourRange(event.start, event.end)}
              </p>
              <p className="text-sm font-semibold text-zinc-900">{event.title}</p>
              {event.location ? <p className="text-xs text-zinc-600">{event.location}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
