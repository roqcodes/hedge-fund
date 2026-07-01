'use client';

import { useState } from 'react';
import { todayISO } from '@/lib/dateFilterPresets';

/** Date filter state for IC Transfer list pages (no data source yet) */
export function useICTransferFilters() {
  const today = todayISO();
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  return {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  };
}
