'use client';

import { useMemo, useState } from 'react';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import { resolveBranchTimeZone, todayInTimeZone } from '@/lib/businessTime';

export function useICFundsDateFilter(branchTimezone?: string | null) {
  const tz = resolveBranchTimeZone(branchTimezone);
  const today = useMemo(() => todayInTimeZone(tz), [tz]);
  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);

  const range = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate, today),
    [dateFilter, customStartDate, customEndDate, today],
  );

  return {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    startDate: range.startDate ?? undefined,
    endDate: range.endDate ?? undefined,
    todayAnchor: today,
    defaultVoucherDate: today,
  };
}
