/**
 * Branch business calendar — all date logic lives here.
 *
 * - Calendar date (`YYYY-MM-DD`): compare as strings; parse with `parseCalendarDate`.
 * - Instant (`Transaction.date`): convert with `toBusinessDate(instant, branchTz)`.
 * - In-app txn filtering: use `txnDay(t, branchTz)` (reads hydrated `businessDate`).
 */

export const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_BRANCH_TIMEZONE = 'Asia/Dubai';

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveBranchTimeZone(timeZone?: string | null): string {
  if (timeZone && isValidIanaTimeZone(timeZone)) return timeZone;
  return DEFAULT_BRANCH_TIMEZONE;
}

/** Calendar date YYYY-MM-DD for an instant in the branch timezone. */
export function toBusinessDate(isoOrDate: string | Date, timeZone: string): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return todayInTimeZone(timeZone);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveBranchTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const y = parts.find(p => p.type === 'year')?.value ?? '1970';
  const m = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${day}`;
}

/** Today's calendar date in the branch timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  return toBusinessDate(now, timeZone);
}

/** Current HH:mm in the branch timezone (for time pickers). */
export function currentTimeHHMM(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: resolveBranchTimeZone(timeZone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hh = parts.find(p => p.type === 'hour')?.value ?? '12';
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

/** ISO instant for a calendar date + wall-clock time in the branch timezone. */
export function composeBranchInstant(
  calendarDate: string,
  timeHHMM: string,
  timeZone: string,
): string {
  const tz = resolveBranchTimeZone(timeZone);
  const [hh, mm] = timeHHMM.split(':').map(part => parseInt(part, 10) || 0);
  const [y, mo, d] = calendarDate.split('-').map(Number);

  let ts = Date.UTC(y, mo - 1, d, hh, mm, 0);
  for (let i = 0; i < 8; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ts));
    const fy = Number(parts.find(p => p.type === 'year')?.value);
    const fm = Number(parts.find(p => p.type === 'month')?.value);
    const fd = Number(parts.find(p => p.type === 'day')?.value);
    const fh = Number(parts.find(p => p.type === 'hour')?.value);
    const fmin = Number(parts.find(p => p.type === 'minute')?.value);
    if (fy === y && fm === mo && fd === d && fh === hh && fmin === mm) {
      return new Date(ts).toISOString();
    }
    ts += ((d - fd) * 1440 + (hh - fh) * 60 + (mm - fmin)) * 60 * 1000;
  }
  return new Date(ts).toISOString();
}

/** Format instant for display in the branch business calendar (date + time). */
export function formatBranchDateTime(isoOrDate: string | Date, timeZone: string): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    timeZone: resolveBranchTimeZone(timeZone),
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse a PG DATE, plain `YYYY-MM-DD` string, or node-pg local-midnight Date → calendar date.
 * Must run before coercing Date to ISO string (UTC prefix would shift the day).
 */
export function parseCalendarDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (CALENDAR_DATE_RE.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  }
  const s = String(val);
  if (CALENDAR_DATE_RE.test(s)) return s;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return parseCalendarDate(parsed);
  }
  return s.slice(0, 10);
}

/** @alias parseCalendarDate — legacy name */
export const formatBusinessDate = parseCalendarDate;

/**
 * Business day for a transaction.
 * Prefer hydrated `businessDate` (set on fetch/write); compute from instant only as fallback.
 */
export function txnDay(
  t: { date: string; businessDate?: string },
  timeZone: string = DEFAULT_BRANCH_TIMEZONE,
): string {
  return t.businessDate ?? toBusinessDate(t.date, timeZone);
}

/** Add calendar days to a YYYY-MM-DD string (timezone-agnostic). */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export type BranchPresetRangeId =
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'last-7-days'
  | 'last-30-days';

const RANGE_PRESET_LABELS: Record<BranchPresetRangeId, string> = {
  'this-week': 'This week',
  'last-week': 'Last week',
  'this-month': 'This month',
  'last-month': 'Last month',
  'last-7-days': 'Last 7 days',
  'last-30-days': 'Last 30 days',
};

export function getBranchPresetRangeLabel(preset: BranchPresetRangeId): string {
  return RANGE_PRESET_LABELS[preset];
}

export const BRANCH_RANGE_PRESETS: BranchPresetRangeId[] = [
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  'last-7-days',
  'last-30-days',
];

/** Inclusive calendar range for a named preset, anchored to branch "today". */
export function resolveBranchPresetRange(
  preset: BranchPresetRangeId,
  today: string,
): { startDate: string; endDate: string } {
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  switch (preset) {
    case 'this-week': {
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      return { startDate: addCalendarDays(today, mondayOffset), endDate: today };
    }
    case 'last-week': {
      const mondayOffset = dow === 0 ? -6 : 1 - dow;
      const thisMonday = addCalendarDays(today, mondayOffset);
      const lastSunday = addCalendarDays(thisMonday, -1);
      return { startDate: addCalendarDays(lastSunday, -6), endDate: lastSunday };
    }
    case 'this-month':
      return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
    case 'last-month': {
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const mm = String(prevM).padStart(2, '0');
      const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
      return {
        startDate: `${prevY}-${mm}-01`,
        endDate: `${prevY}-${mm}-${String(lastDay).padStart(2, '0')}`,
      };
    }
    case 'last-7-days':
      return { startDate: addCalendarDays(today, -6), endDate: today };
    case 'last-30-days':
      return { startDate: addCalendarDays(today, -29), endDate: today };
  }
}

/** e.g. "22 Sun" for quick day chips. */
export function formatDayPresetLabel(dateStr: string, timeZone: string): string {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const instant = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
  const tz = resolveBranchTimeZone(timeZone);
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: tz }).format(instant);
  const wd = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: tz }).format(instant);
  return `${day} ${wd}`;
}

/** Today + yesterday + prior N calendar days (newest first after today/yesterday). */
export function buildSingleDayPresets(today: string, priorDays = 6): string[] {
  const dates: string[] = [today, addCalendarDays(today, -1)];
  for (let i = 2; i <= priorDays + 1; i++) {
    dates.push(addCalendarDays(today, -i));
  }
  return dates;
}
