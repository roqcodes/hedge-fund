import { addCalendarDays } from '@/lib/businessTime';

export const ALL_TIME_START = '2000-01-01';

export type DateStepUnit = 'D' | 'M' | 'Y';

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Shift a calendar date by day, month, or year. */
export function shiftCalendarDate(dateStr: string, unit: DateStepUnit, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (unit === 'D') return addCalendarDays(dateStr, delta);
  if (unit === 'M') {
    const dt = new Date(Date.UTC(y, m - 1 + delta, d));
    return dt.toISOString().slice(0, 10);
  }
  const dt = new Date(Date.UTC(y + delta, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function resolveDisplayDates(
  dateFilter: string,
  customStartDate: string,
  customEndDate: string,
  today = todayISO(),
): { from: string; to: string } {
  if (customStartDate && customEndDate) {
    return { from: customStartDate, to: customEndDate };
  }
  if (dateFilter === 'all-time') {
    return { from: ALL_TIME_START, to: today };
  }
  if (dateFilter === 'today') {
    return { from: today, to: today };
  }
  if (customStartDate || customEndDate) {
    return {
      from: customStartDate || customEndDate || today,
      to: customEndDate || customStartDate || today,
    };
  }
  return { from: today, to: today };
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format YYYY-MM-DD as DD-MM-YY for display. */
export function formatDateDDMMYY(iso: string): string {
  const match = iso.match(ISO_DATE_RE);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}-${month}-${year.slice(-2)}`;
}

/** Parse DD-MM-YY or DD-MM-YYYY into YYYY-MM-DD. */
export function parseDateDDMMYY(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== mo || dt.getUTCDate() !== d) {
    return null;
  }
  return iso;
}
