'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BranchDayClose, DailyCloseContext } from '@/types';
import { ensureOpenDaySessionAction } from '@/app/actions/dailyCloseActions';
import { resolveDailyCloseContext } from '@/lib/dailyClose';
import { resolveBranchTimeZone, todayInTimeZone } from '@/lib/businessTime';

export function useDailyCloseBeta(
  branchId: string | undefined,
  branchSlug?: string,
  branchTimezone?: string,
) {
  const [dayCloses, setDayCloses] = useState<BranchDayClose[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeZone = resolveBranchTimeZone(branchTimezone);

  const effectiveContext = useMemo<DailyCloseContext | null>(() => {
    if (!branchId) return null;
    return resolveDailyCloseContext(dayCloses, todayInTimeZone(timeZone));
  }, [branchId, dayCloses, timeZone]);

  const refresh = useCallback(async () => {
    if (!branchId) {
      setDayCloses([]);
      setLoading(false);
      setError(null);
      return null;
    }
    setLoading(true);
    const res = await ensureOpenDaySessionAction(branchId, branchSlug);
    setLoading(false);
    if (res.success && res.data) {
      setDayCloses(res.data.dayCloses);
      setError(null);
      return res.data;
    }
    setDayCloses([]);
    setError(res.error || 'Failed to load daily close session');
    return null;
  }, [branchId, branchSlug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dayCloses, effectiveContext, timeZone, loading, error, refresh };
}
