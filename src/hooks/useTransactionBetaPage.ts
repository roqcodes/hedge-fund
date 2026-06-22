'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Branch, Ledger, Transaction } from '@/types';
import { useDailyCloseBeta } from '@/hooks/useDailyCloseBeta';
import {
  canModifyTransactionsOnDate,
  filterTxnsInViewRange,
  resolveViewRangeKpis,
  txnDay,
} from '@/lib/dailyClose';
import { filterBranchLedgers } from '@/lib/ledgers';
import type { TransactionBetaPermissions, TransactionBetaViewMode } from '@/lib/transaction-beta/types';

type Options = {
  enabled: boolean;
  transactions: Transaction[];
  branches: Branch[];
  ledgers: Ledger[];
  currentSlug: string;
  isBranchView: boolean;
  refetchData: () => void | Promise<void>;
};

function resolveViewMode(isAllTime: boolean, start: string, end: string): TransactionBetaViewMode {
  if (isAllTime) return 'all-time';
  if (start === end) return 'single-day';
  return 'range';
}

export function useTransactionBetaPage({
  enabled,
  transactions,
  branches,
  ledgers,
  currentSlug,
  isBranchView,
  refetchData,
}: Options) {
  const branch = branches.length === 1 ? branches[0] : undefined;
  const branchId = branch?.id;
  const branchSlug = currentSlug === 'superadmin' ? undefined : currentSlug;

  const {
    dayCloses,
    effectiveContext: session,
    timeZone: branchTimezone,
    loading: sessionLoading,
    error: sessionError,
    refresh: refreshSession,
  } = useDailyCloseBeta(enabled ? branchId : undefined, branchSlug, branch?.timezone);

  const [viewStartDate, setViewStartDate] = useState('');
  const [viewEndDate, setViewEndDate] = useState('');
  const [isAllTime, setIsAllTime] = useState(false);

  useEffect(() => {
    if (enabled && session && !isAllTime && !viewStartDate && !viewEndDate) {
      setViewStartDate(session.workingDate);
      setViewEndDate(session.workingDate);
    }
  }, [enabled, session, isAllTime, viewStartDate, viewEndDate]);

  const branchLedgers = useMemo(() => filterBranchLedgers(ledgers, branchId), [ledgers, branchId]);

  const branchTransactions = useMemo(() => {
    if (!branchId) return [];
    return transactions.filter((t: Transaction) => t.branchId === branchId);
  }, [transactions, branchId]);

  const displayTransactions = useMemo(() => {
    if (!enabled) return transactions;
    if (isAllTime) return branchTransactions;
    if (!viewStartDate && !viewEndDate) return branchTransactions;
    return filterTxnsInViewRange(
      branchTransactions,
      { startDate: viewStartDate, endDate: viewEndDate || viewStartDate },
      branchTimezone,
    );
  }, [
    enabled,
    transactions,
    branchTransactions,
    isAllTime,
    viewStartDate,
    viewEndDate,
    branchTimezone,
  ]);

  const periodKpis = useMemo(() => {
    if (!enabled || !branch || !session) return null;
    let kpiStart = viewStartDate;
    let kpiEnd = viewEndDate;
    if (isAllTime || (!kpiStart && !kpiEnd)) {
      const dates = branchTransactions.map(t => txnDay(t, branchTimezone)).filter(Boolean).sort();
      kpiStart = dates[0] || session.workingDate;
      kpiEnd = dates[dates.length - 1] || session.workingDate;
    } else {
      kpiStart = kpiStart || session.workingDate;
      kpiEnd = kpiEnd || kpiStart;
    }
    return resolveViewRangeKpis('custom', kpiStart, kpiEnd, dayCloses, branch, branchLedgers, branchTransactions);
  }, [
    enabled,
    branch,
    session,
    isAllTime,
    viewStartDate,
    viewEndDate,
    dayCloses,
    branchLedgers,
    branchTransactions,
  ]);

  const viewMode = resolveViewMode(isAllTime, viewStartDate, viewEndDate);

  const permissions: TransactionBetaPermissions = useMemo(() => {
    const isViewingActiveDay =
      !!session &&
      viewStartDate === session.workingDate &&
      viewEndDate === session.workingDate;
    const canPostEntries =
      !!session && !session.isWorkingDayClosed && isViewingActiveDay;
    const isPeriodLocked = periodKpis?.endClosed ?? false;

    return {
      canPostEntries,
      isViewingActiveDay,
      isPeriodLocked,
      canEditEntry: (t: Transaction) => {
        if (!isBranchView || !branch) return false;
        if (!session) return true;
        return canModifyTransactionsOnDate(txnDay(t, branchTimezone), dayCloses, session.workingDate);
      },
    };
  }, [session, viewStartDate, viewEndDate, periodKpis, dayCloses, isBranchView, branch, branchTimezone]);

  const setViewDates = useCallback((start: string, end: string) => {
    if (!start && !end) {
      setIsAllTime(true);
      setViewStartDate('');
      setViewEndDate('');
      return;
    }
    setIsAllTime(false);
    setViewStartDate(start);
    setViewEndDate(end);
  }, []);

  const handleDayClosed = useCallback(async () => {
    const data = await refreshSession();
    const nextWorking = data?.context.workingDate ?? session?.workingDate;
    if (nextWorking) {
      setIsAllTime(false);
      setViewStartDate(nextWorking);
      setViewEndDate(nextWorking);
    }
    await refetchData();
  }, [refreshSession, session?.workingDate, refetchData]);

  return {
    branch,
    branchId,
    branchSlug,
    branchTimezone,
    branchLedgers,
    dayCloses,
    session,
    sessionLoading,
    sessionError,
    refreshSession,
    viewStartDate,
    viewEndDate,
    isAllTime,
    viewMode,
    setViewDates,
    displayTransactions,
    periodKpis,
    permissions,
    handleDayClosed,
  };
}
