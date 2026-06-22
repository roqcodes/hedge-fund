'use client';

import React from 'react';
import type { DailyCloseContext } from '@/types';
import DayDateFilterBar from '@/components/funds/DayDateFilterBar';
import TransactionBetaKpiSection from './TransactionBetaKpiSection';
import TransactionBetaSessionPanel from './TransactionBetaSessionPanel';
import type { DayRangeKpiDisplay } from '@/lib/dailyClose';
import type { Ledger } from '@/types';

type Props = {
  branchId: string;
  branchSlug?: string;
  branchTimezone: string;
  session: DailyCloseContext;
  sessionLoading: boolean;
  sessionError: string | null;
  viewStartDate: string;
  viewEndDate: string;
  isAllTime?: boolean;
  periodKpis: DayRangeKpiDisplay | null;
  branchLedgers: Ledger[];
  onViewApply: (start: string, end: string) => void;
  onDayClosed: () => void | Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
};

export default function TransactionBetaShell({
  branchId,
  branchSlug,
  branchTimezone,
  session,
  sessionLoading,
  sessionError,
  viewStartDate,
  viewEndDate,
  isAllTime = false,
  periodKpis,
  branchLedgers,
  onViewApply,
  onDayClosed,
  showToast,
}: Props) {
  return (
    <>
      <TransactionBetaSessionPanel
        branchId={branchId}
        branchSlug={branchSlug}
        branchTimezone={branchTimezone}
        context={session}
        syncError={sessionError}
        loading={sessionLoading}
        onClosed={onDayClosed}
        showToast={showToast}
      />

      <DayDateFilterBar
        viewStartDate={viewStartDate}
        viewEndDate={viewEndDate}
        isAllTime={isAllTime}
        workingDate={session.workingDate}
        branchTimezone={branchTimezone}
        onApply={onViewApply}
      />

      {periodKpis ? (
        <TransactionBetaKpiSection periodKpis={periodKpis} branchLedgers={branchLedgers} />
      ) : null}
    </>
  );
}
