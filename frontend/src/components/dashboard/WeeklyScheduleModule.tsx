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

  return (
    <div className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-[0_14px_34px_rgba(26,18,8,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Emploi du temps de la semaine</h2>
          <p className="mt-1 text-sm text-zinc-600">
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
              const dayEvents = weekEvents.filter((event) => isSameDay(event.start, day));
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
