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
): DateFilterRange {
  if (dateFilter === 'all-time') {
    return { startDate: null, endDate: null };
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  let startLimit = '';
  let endLimit = '';

  if (dateFilter === 'this-month') {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    startLimit = `${year}-${month}-01`;
    endLimit = `${year}-${month}-31`;
  } else if (dateFilter === 'last-month') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prevMonthDate.getFullYear();
    const month = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    startLimit = `${year}-${month}-01`;
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endLimit = `${year}-${month}-${String(lastDayPrevMonth.getDate()).padStart(2, '0')}`;
  } else if (dateFilter === 'last-3-months') {
    const start3MonthsDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const year = start3MonthsDate.getFullYear();
    const month = String(start3MonthsDate.getMonth() + 1).padStart(2, '0');
    startLimit = `${year}-${month}-01`;
    endLimit = todayStr;
  } else if (dateFilter === 'today') {
    startLimit = todayStr;
    endLimit = todayStr;
  } else if (dateFilter === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    startLimit = yesterday.toISOString().slice(0, 10);
    endLimit = startLimit;
  } else if (dateFilter === 'this-week') {
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    startLimit = monday.toISOString().slice(0, 10);
    endLimit = todayStr;
  } else if (dateFilter === 'last-week') {
    const monday = new Date();
    monday.setDate(now.getDate() - now.getDay() - 6);
    const sunday = new Date();
    sunday.setDate(now.getDate() - now.getDay());
    startLimit = monday.toISOString().slice(0, 10);
    endLimit = sunday.toISOString().slice(0, 10);
  } else if (dateFilter === 'this-year') {
    startLimit = `${now.getFullYear()}-01-01`;
    endLimit = `${now.getFullYear()}-12-31`;
  } else if (dateFilter === 'custom') {
    startLimit = customStartDate || '1970-01-01';
    endLimit = customEndDate || '9999-12-31';
  }

  return { startDate: startLimit || null, endDate: endLimit || null };
}

export function isDateInRange(dateIso: string, range: DateFilterRange): boolean {
  if (!range.startDate && !range.endDate) return true;
  const itemDate = dateIso.slice(0, 10);
  const start = range.startDate || '1970-01-01';
  const end = range.endDate || '9999-12-31';
  return itemDate >= start && itemDate <= end;
}
