import type { Branch, BranchDayClose, DayKpiSnapshot, Ledger, Transaction, DailyCloseContext } from '@/types';
import {
  addCalendarDays,
  parseCalendarDate,
  resolveBranchTimeZone,
  todayInTimeZone,
  txnDay,
} from '@/lib/businessTime';
import {
  calculateAvailableBranchFund,
  calculateAvailableBranchGold,
  calculateCashInLocker,
  calculateLedgerBalances,
} from '@/lib/ledgers';
import { isDateInRange, resolveDateFilterRange, type DateFilterRange } from '@/lib/dateFilterRange';

export { parseCalendarDate, addCalendarDays as addDays, todayInTimeZone, txnDay };

function tz(branch: Branch): string {
  return resolveBranchTimeZone(branch.timezone);
}

export function filterTxnsInViewRange(
  txns: Transaction[],
  range: DateFilterRange,
  branchTimeZone: string,
): Transaction[] {
  if (!range.startDate && !range.endDate) return txns;
  return txns.filter(t => isDateInRange(txnDay(t, branchTimeZone), range));
}

export function computeKpiSnapshot(
  branch: Branch,
  branchLedgers: Ledger[],
  allBranchTxns: Transaction[],
  asOfDate: string,
): DayKpiSnapshot {
  const zone = tz(branch);
  const through = allBranchTxns.filter(
    t => t.status === 'completed' && txnDay(t, zone) <= asOfDate,
  );
  const ledgerBalances = calculateLedgerBalances(branchLedgers, through);
  const branchFund = calculateAvailableBranchFund(branch.name, branch.openingBalance || 0, through);
  const gold = calculateAvailableBranchGold(branch.name, branch.openingGoldBalance || 0, through);
  const cashInLocker = calculateCashInLocker(branchFund, branchLedgers, ledgerBalances);
  const dayTxns = allBranchTxns.filter(t => txnDay(t, zone) === asOfDate);

  return {
    branchFund,
    gold,
    cashInLocker,
    ledgerBalances,
    totalVolume: dayTxns.reduce((s, t) => s + t.amount, 0),
    transferCount: dayTxns.filter(t => t.type === 'transfer').length,
    pendingCount: dayTxns.filter(t => t.status === 'pending').length,
  };
}

export function resolveDailyCloseContext(
  dayCloses: BranchDayClose[],
  today: string,
): DailyCloseContext {
  const yesterday = addCalendarDays(today, -1);
  const yesterdayRecord = dayCloses.find(d => d.businessDate === yesterday);
  const yesterdayOpen = !yesterdayRecord || yesterdayRecord.status === 'open';
  const workingDate = yesterdayOpen ? yesterday : today;
  const workingRecord = dayCloses.find(d => d.businessDate === workingDate);
  const todayDue = yesterdayOpen && today !== yesterday;

  return {
    workingDate,
    todayDate: today,
    yesterdayDate: yesterday,
    yesterdayOpen,
    todayDue,
    isWorkingDayClosed: workingRecord?.status === 'closed',
  };
}

export function getOpeningSnapshotForDate(
  businessDate: string,
  dayCloses: BranchDayClose[],
  branch: Branch,
  branchLedgers: Ledger[],
  allBranchTxns: Transaction[],
): DayKpiSnapshot {
  const prevDate = addCalendarDays(businessDate, -1);
  const prevClosed = dayCloses.find(d => d.businessDate === prevDate && d.status === 'closed');
  if (prevClosed?.closing) return prevClosed.closing;

  const zone = tz(branch);
  const beforeDay = allBranchTxns.filter(t => txnDay(t, zone) <= prevDate);
  return computeKpiSnapshot(branch, branchLedgers, beforeDay, prevDate);
}

export function getClosingSnapshotForDate(
  businessDate: string,
  dayCloses: BranchDayClose[],
  branch: Branch,
  branchLedgers: Ledger[],
  allBranchTxns: Transaction[],
): DayKpiSnapshot {
  const record = dayCloses.find(d => d.businessDate === businessDate);
  if (record?.status === 'closed' && record.closing) return record.closing;
  return computeKpiSnapshot(branch, branchLedgers, allBranchTxns, businessDate);
}

export type DayRangeKpiDisplay = {
  opening: DayKpiSnapshot;
  closing: DayKpiSnapshot;
  isSingleDay: boolean;
  startDate: string;
  endDate: string;
  startClosed: boolean;
  endClosed: boolean;
};

export function resolveViewRangeKpis(
  dateFilter: string,
  customStart: string,
  customEnd: string,
  dayCloses: BranchDayClose[],
  branch: Branch,
  branchLedgers: Ledger[],
  allBranchTxns: Transaction[],
): DayRangeKpiDisplay {
  const zone = tz(branch);
  const range = resolveDateFilterRange(dateFilter, customStart, customEnd, todayInTimeZone(zone));
  const startDate = range.startDate || todayInTimeZone(zone);
  const endDate = range.endDate || startDate;
  const isSingleDay = startDate === endDate;

  const opening = getOpeningSnapshotForDate(startDate, dayCloses, branch, branchLedgers, allBranchTxns);
  const closing = getClosingSnapshotForDate(endDate, dayCloses, branch, branchLedgers, allBranchTxns);

  const startRecord = dayCloses.find(d => d.businessDate === startDate);
  const endRecord = dayCloses.find(d => d.businessDate === endDate);

  return {
    opening,
    closing,
    isSingleDay,
    startDate,
    endDate,
    startClosed: startRecord?.status === 'closed',
    endClosed: endRecord?.status === 'closed',
  };
}

export function isDateClosed(businessDate: string, dayCloses: BranchDayClose[]): boolean {
  return dayCloses.some(d => d.businessDate === businessDate && d.status === 'closed');
}

export function canModifyTransactionsOnDate(
  businessDate: string,
  dayCloses: BranchDayClose[],
  workingDate: string,
): boolean {
  if (isDateClosed(businessDate, dayCloses)) return false;
  return businessDate === workingDate;
}

export function parseDayCloseRow(row: Record<string, unknown>): BranchDayClose {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    businessDate: parseCalendarDate(row.business_date),
    status: row.status as 'open' | 'closed',
    openedAt: String(row.opened_at),
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
    closedBy: row.closed_by ? String(row.closed_by) : undefined,
    opening: (row.opening_snapshot || {}) as DayKpiSnapshot,
    closing: row.closing_snapshot ? (row.closing_snapshot as DayKpiSnapshot) : undefined,
  };
}
