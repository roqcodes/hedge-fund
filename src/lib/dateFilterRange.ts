import { addCalendarDays } from '@/lib/businessTime';

export type DateFilterId =
  | 'all-time'
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'this-year'
  | 'custom';

export type DateFilterRange = {
  startDate: string | null;
  endDate: string | null;
};

const DATE_FILTER_LABELS: Record<string, string> = {
  'all-time': 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This Week',
  'last-week': 'Last Week',
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'last-3-months': 'Last 3 Months',
  'this-year': 'This Year',
  custom: 'Custom Range',
};

export function getDateFilterLabel(
  dateFilter: string,
  customStartDate?: string,
  customEndDate?: string,
): string {
  if (dateFilter === 'custom' && (customStartDate || customEndDate)) {
    return `${customStartDate || '…'} to ${customEndDate || '…'}`;
  }
  return DATE_FILTER_LABELS[dateFilter] || dateFilter;
}

/** Resolve the active date filter to inclusive YYYY-MM-DD bounds (null = unbounded). */
export function resolveDateFilterRange(
  dateFilter: string,
  customStartDate = '',
  customEndDate = '',
  /** Anchor "today" as YYYY-MM-DD (pass branch today for ledger filters). */
  todayAnchor?: string,
): DateFilterRange {
  if (dateFilter === 'all-time') {
    return { startDate: null, endDate: null };
  }

  const todayStr = todayAnchor ?? new Date().toISOString().slice(0, 10);
  const [anchorY, anchorM, anchorD] = todayStr.split('-').map(Number);
  const anchor = new Date(Date.UTC(anchorY, anchorM - 1, anchorD));
  let startLimit = '';
  let endLimit = '';

  if (dateFilter === 'this-month') {
    startLimit = `${anchorY}-${String(anchorM).padStart(2, '0')}-01`;
    endLimit = todayStr;
  } else if (dateFilter === 'last-month') {
    const prevM = anchorM === 1 ? 12 : anchorM - 1;
    const prevY = anchorM === 1 ? anchorY - 1 : anchorY;
    const mm = String(prevM).padStart(2, '0');
    const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
    startLimit = `${prevY}-${mm}-01`;
    endLimit = `${prevY}-${mm}-${String(lastDay).padStart(2, '0')}`;
  } else if (dateFilter === 'last-3-months') {
    const start3 = new Date(Date.UTC(anchorY, anchorM - 3, 1));
    startLimit = `${start3.getUTCFullYear()}-${String(start3.getUTCMonth() + 1).padStart(2, '0')}-01`;
    endLimit = todayStr;
  } else if (dateFilter === 'today') {
    startLimit = todayStr;
    endLimit = todayStr;
  } else if (dateFilter === 'yesterday') {
    startLimit = addCalendarDays(todayStr, -1);
    endLimit = startLimit;
  } else if (dateFilter === 'this-week') {
    const dow = anchor.getUTCDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    startLimit = addCalendarDays(todayStr, mondayOffset);
    endLimit = todayStr;
  } else if (dateFilter === 'last-week') {
    const dow = anchor.getUTCDay();
    const thisMonday = addCalendarDays(todayStr, dow === 0 ? -6 : 1 - dow);
    const lastSunday = addCalendarDays(thisMonday, -1);
    startLimit = addCalendarDays(lastSunday, -6);
    endLimit = lastSunday;
  } else if (dateFilter === 'this-year') {
    startLimit = `${anchorY}-01-01`;
    endLimit = `${anchorY}-12-31`;
  } else if (dateFilter === 'custom') {
    startLimit = customStartDate || '1970-01-01';
    endLimit = customEndDate || '9999-12-31';
  }

  return { startDate: startLimit || null, endDate: endLimit || null };
}

export function isDateInRange(calendarDate: string, range: DateFilterRange): boolean {
  if (!range.startDate && !range.endDate) return true;
  const itemDate = calendarDate.slice(0, 10);
  const start = range.startDate || '1970-01-01';
  const end = range.endDate || '9999-12-31';
  return itemDate >= start && itemDate <= end;
}
