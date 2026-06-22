'use client';

import { useState } from 'react';

/** Date filter state for IC Transfer list pages (no data source yet) */
export function useICTransferFilters() {
  const [dateFilter, setDateFilter] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  return {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  };
}
