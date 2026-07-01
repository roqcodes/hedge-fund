/**
 * Converts a DateFilterBar preset key + optional custom dates into
 * absolute ISO date strings for use in server-side SQL queries.
 * Default = today (so the initial page load never fetches the full history).
 */

import { ALL_TIME_START, todayISO } from '@/lib/dateFilterPresets';

export interface DateRange {
  dateFrom: string; // ISO date string e.g. '2026-06-28'
  dateTo: string;   // ISO date string e.g. '2026-06-28'
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(iso: string): string {
  const d = new Date(iso);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

function endOfMonth(iso: string): string {
  const d = new Date(iso.slice(0, 7) + '-01');
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export function resolveDateRange(
  dateFilter: string,
  customStartDate: string,
  customEndDate: string,
): DateRange {
  const today = todayISO();

  switch (dateFilter) {
    case 'today':
      return { dateFrom: today, dateTo: today };

    case 'yesterday': {
      const y = addDays(today, -1);
      return { dateFrom: y, dateTo: y };
    }

    case 'this-week': {
      const start = startOfWeek(today);
      return { dateFrom: start, dateTo: today };
    }

    case 'last-week': {
      const thisStart = startOfWeek(today);
      const lastStart = addDays(thisStart, -7);
      const lastEnd = addDays(thisStart, -1);
      return { dateFrom: lastStart, dateTo: lastEnd };
    }

    case 'this-month': {
      return { dateFrom: startOfMonth(today), dateTo: today };
    }

    case 'last-month': {
      const firstOfThisMonth = startOfMonth(today);
      const lastMonthEnd = addDays(firstOfThisMonth, -1);
      const lastMonthStart = startOfMonth(lastMonthEnd);
      return { dateFrom: lastMonthStart, dateTo: lastMonthEnd };
    }

    case 'all-time':
      return { dateFrom: ALL_TIME_START, dateTo: addDays(today, 1) };

    case 'custom': {
      const from = customStartDate || today;
      const to = customEndDate || today;
      return { dateFrom: from, dateTo: to };
    }

    default:
      // Fallback to today
      return { dateFrom: today, dateTo: today };
  }
}
