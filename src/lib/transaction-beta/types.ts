/**
 * Transaction Beta (Daily Ledger) — domain types.
 * Stable contracts for UI, server actions, and future 3rd-party integrations (webhooks, ERP sync).
 */

import type { BranchDayClose, DailyCloseContext, DayKpiSnapshot, Transaction } from '@/types';
import type { DayRangeKpiDisplay } from '@/lib/dailyClose';

/** View mode for the journal workspace. */
export type TransactionBetaViewMode = 'single-day' | 'range' | 'all-time';

/** Permissions derived from day-close state + view selection. */
export type TransactionBetaPermissions = {
  canPostEntries: boolean;
  canEditEntry: (txn: Transaction) => boolean;
  isViewingActiveDay: boolean;
  isPeriodLocked: boolean;
};

/** Session + view state exposed to the page shell. */
export type TransactionBetaPageState = {
  branchId?: string;
  branchSlug?: string;
  branchTimezone: string;
  branchName?: string;
  dayCloses: BranchDayClose[];
  session: DailyCloseContext | null;
  sessionLoading: boolean;
  sessionError: string | null;
  viewStartDate: string;
  viewEndDate: string;
  viewMode: TransactionBetaViewMode;
  displayTransactions: Transaction[];
  periodKpis: DayRangeKpiDisplay | null;
  permissions: TransactionBetaPermissions;
};

/** Integration events (emit to webhook bus / message queue later). */
export type TransactionBetaIntegrationEvent =
  | { type: 'day.opened'; branchId: string; businessDate: string; opening: DayKpiSnapshot }
  | { type: 'day.closed'; branchId: string; businessDate: string; closing: DayKpiSnapshot; closedBy: string }
  | { type: 'entry.posted'; branchId: string; businessDate: string; transactionId: string }
  | { type: 'entry.updated'; branchId: string; businessDate: string; transactionId: string }
  | { type: 'entry.deleted'; branchId: string; businessDate: string; transactionId: string };

export type TransactionBetaIntegrationPublisher = (
  event: TransactionBetaIntegrationEvent,
) => void | Promise<void>;
