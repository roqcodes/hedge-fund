import { useState, useMemo } from 'react';

export function useDateFilter<T extends { date: string }>(dataSource: T[]) {
  const [dateFilter, setDateFilter] = useState<string>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const filteredData = useMemo(() => {
    if (dateFilter === 'all-time') return dataSource;

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
      endLimit = yesterday.toISOString().slice(0, 10);
    } else if (dateFilter === 'this-week') {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
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

    return dataSource.filter(item => {
      const itemDate = item.date;
      return itemDate >= startLimit && itemDate <= endLimit;
    });
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
