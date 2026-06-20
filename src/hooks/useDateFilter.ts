import { useState, useMemo } from 'react';
import { resolveDateFilterRange, isDateInRange } from '@/lib/dateFilterRange';

export function useDateFilter<T extends { date: string }>(dataSource: T[]) {
  const [dateFilter, setDateFilter] = useState<string>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const filteredData = useMemo(() => {
    const range = resolveDateFilterRange(dateFilter, customStartDate, customEndDate);
    if (!range.startDate && !range.endDate) return dataSource;
    return dataSource.filter(item => isDateInRange(item.date, range));
  }, [dataSource, dateFilter, customStartDate, customEndDate]);

  return {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    filteredData,
  };
}
