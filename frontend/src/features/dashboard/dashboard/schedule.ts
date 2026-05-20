export type ScheduleEvent = {
  id: string;
  title: string;
  location: string;
  description: string;
  start: Date;
  end: Date;
};

function unfoldIcs(raw: string): string {
  return raw.replace(/\r?\n[ \t]/g, '');
}

function parseIcsDate(value: string): Date | null {
  const clean = value.trim();

  if (/^\d{8}$/.test(clean)) {
    const year = Number(clean.slice(0, 4));
    const month = Number(clean.slice(4, 6)) - 1;
    const day = Number(clean.slice(6, 8));
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  if (/^\d{8}T\d{6}Z$/.test(clean)) {
    const year = Number(clean.slice(0, 4));
    const month = Number(clean.slice(4, 6)) - 1;
    const day = Number(clean.slice(6, 8));
    const hours = Number(clean.slice(9, 11));
    const minutes = Number(clean.slice(11, 13));
    const seconds = Number(clean.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  }

  if (/^\d{8}T\d{6}$/.test(clean)) {
    const year = Number(clean.slice(0, 4));
    const month = Number(clean.slice(4, 6)) - 1;
    const day = Number(clean.slice(6, 8));
    const hours = Number(clean.slice(9, 11));
    const minutes = Number(clean.slice(11, 13));
    const seconds = Number(clean.slice(13, 15));
    return new Date(year, month, day, hours, minutes, seconds);
  }

  return null;
}

export function parseIcsEvents(rawIcs: string): ScheduleEvent[] {
  const content = unfoldIcs(rawIcs);
  const lines = content.split(/\r?\n/);
  const events: ScheduleEvent[] = [];

  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (current) {
        const dtStartRaw = current.DTSTART;
        const dtEndRaw = current.DTEND;
        const start = dtStartRaw ? parseIcsDate(dtStartRaw) : null;
        const end = dtEndRaw ? parseIcsDate(dtEndRaw) : null;

        if (start && end) {
          events.push({
            id: current.UID ?? `${start.toISOString()}-${current.SUMMARY ?? ''}`,
            title: current.SUMMARY ?? 'Cours',
            location: current.LOCATION ?? '',
            description: current.DESCRIPTION ?? '',
            start,
            end,
          });
        }
      }

      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const sepIndex = line.indexOf(':');
    if (sepIndex <= 0) {
      continue;
    }

    const keyWithParams = line.slice(0, sepIndex);
    const value = line.slice(sepIndex + 1);
    const key = keyWithParams.split(';')[0];
    current[key] = value;
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function getTodayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function getCurrentWeekBounds(now: Date): { start: Date; end: Date } {
  const day = now.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + offsetToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isInRange(event: ScheduleEvent, start: Date, end: Date): boolean {
  return event.start.getTime() <= end.getTime() && event.end.getTime() >= start.getTime();
}
