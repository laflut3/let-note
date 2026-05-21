import { useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScheduleEvent } from '@/lib/dashboard/schedule';

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
    'bg-[#d7e7ef] border-[#8bb7c8] dark:bg-[#4a5f75] dark:border-[#7f9eb4]',
    'bg-[#ead7cb] border-[#c39c84] dark:bg-[#695550] dark:border-[#b08f7d]',
    'bg-[#dde0ef] border-[#9ba6cd] dark:bg-[#4f5472] dark:border-[#8f98be]',
    'bg-[#deecd0] border-[#9ec37b] dark:bg-[#52674d] dark:border-[#93b474]',
    'bg-[#efdede] border-[#d8a6a6] dark:bg-[#6a4f60] dark:border-[#b38fa2]',
    'bg-[#e1dbf1] border-[#ae9ed4] dark:bg-[#5b4f77] dark:border-[#a595cc]',
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

type WeeklyScheduleModuleProps = {
  allEvents: ScheduleEvent[];
  weekOffset: number;
  setWeekOffset: Dispatch<SetStateAction<number>>;
};

export function WeeklyScheduleModule({
  allEvents,
  weekOffset,
  setWeekOffset,
}: WeeklyScheduleModuleProps) {
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
    return allEvents.filter(
      (event) => event.start.getTime() <= end.getTime() && event.end.getTime() >= start.getTime()
    );
  }, [allEvents, weekStart, weekEnd]);

  const dayEventsMap = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        events: weekEvents
          .filter((event) => isSameDay(event.start, day))
          .sort((a, b) => a.start.getTime() - b.start.getTime()),
      })),
    [weekDays, weekEvents]
  );

  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_14px_34px_rgba(26,18,8,0.12)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Emploi du temps de la semaine</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Du {weekStart.toLocaleDateString('fr-FR')} au {weekEnd.toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setWeekOffset((prev) => prev - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" onClick={() => setWeekOffset(0)}>
            Aujourd hui
          </Button>
          <Button type="button" variant="outline" onClick={() => setWeekOffset((prev) => prev + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {dayEventsMap.map(({ day, events }) => (
          <section
            key={day.toISOString()}
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3"
          >
            <p className="text-sm font-semibold text-foreground">
              {day.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </p>
            {events.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Aucun cours.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {events.map((event) => (
                  <article
                    key={event.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${eventColorClass(event.title)}`}
                  >
                    <p className="font-semibold text-foreground dark:text-zinc-100">
                      {event.title}
                    </p>
                    <p className="text-xs text-foreground/80 dark:text-zinc-200">
                      {formatHourRange(event.start, event.end)}
                    </p>
                    {event.location ? (
                      <p className="text-xs text-foreground/75 dark:text-zinc-300">
                        {event.location}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-2 sm:p-3 md:block">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[70px_repeat(5,minmax(0,1fr))] gap-2">
            <div />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className="rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] px-2 py-2 text-center text-sm font-semibold text-foreground"
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
                    className="relative border-t border-[var(--surface-soft-border)] text-[11px] text-muted-foreground"
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
              const dayEvents = weekEvents.filter((event) => isSameDay(event.start, day));
              return (
                <div
                  key={day.toISOString()}
                  className="relative grid rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)]"
                  style={{
                    gridTemplateRows: `repeat(${GRID_ROW_COUNT}, minmax(24px, 1fr))`,
                  }}
                >
                  {Array.from({ length: GRID_ROW_COUNT }, (_, index) => (
                    <div
                      key={`line-${day.toISOString()}-${index}`}
                      className="border-t border-[var(--surface-soft-border)]"
                    />
                  ))}
                  {dayEvents.map((event) => {
                    const placement = computeGridPlacement(event);
                    return (
                      <article
                        key={event.id}
                        className={`z-10 mx-1 my-[1px] overflow-hidden rounded-md border px-2 py-1 text-center text-[11px] leading-tight text-foreground dark:text-zinc-100 shadow-sm ${eventColorClass(event.title)}`}
                        style={{
                          gridRow: `${placement.rowStart} / span ${placement.rowSpan}`,
                        }}
                      >
                        <p className="font-semibold">{event.title}</p>
                        <p className="text-[10px]">{formatHourRange(event.start, event.end)}</p>
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
  );
}
