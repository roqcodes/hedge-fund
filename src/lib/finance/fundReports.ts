import { roundTo14 } from '@/lib/physicalCalculations';
import { formatDate } from '@/data/mockData';
import type { Customer, FundEntityBalance, FundEntityLedgerEntry } from '@/types';
import {
  agingBucket,
  beforeRange,
  daysBetween,
  formatPeriodEndDate,
  formatPeriodRangeLabel,
  inRange,
  txnNo,
  voucherLabel,
  withSlNo,
  type FinanceDateRange,
  type ReportColumn,
  type ReportDef,
  type ReportRow,
} from './reportShared';

type FundReportInput = {
  entries: FundEntityLedgerEntry[];
  balances: FundEntityBalance[];
  customers: Customer[];
  range: FinanceDateRange;
};

function customerName(customers: Customer[], id: string, fallback?: string): string {
  return customers.find(c => c.id === id)?.name ?? fallback ?? id;
}

function customerCurrency(customers: Customer[], id: string): string {
  return customers.find(c => c.id === id)?.currency ?? 'USDT';
}

function accountCategory(net: number): string {
  if (net > 0) return 'Receivable';
  if (net < 0) return 'Payable';
  return 'Settled';
}

function fmtAmount(n: number): string {
  return roundTo14(n).toFixed(2);
}

function periodTotalsByCustomer(
  entries: FundEntityLedgerEntry[],
  range: FinanceDateRange,
): Map<string, { periodDebit: number; periodCredit: number; openingDebit: number; openingCredit: number }> {
  const map = new Map<string, { periodDebit: number; periodCredit: number; openingDebit: number; openingCredit: number }>();

  for (const e of entries) {
    if (!map.has(e.customerId)) {
      map.set(e.customerId, { periodDebit: 0, periodCredit: 0, openingDebit: 0, openingCredit: 0 });
    }
    const row = map.get(e.customerId)!;
    if (inRange(e.entryDate, range)) {
      row.periodDebit += e.debit;
      row.periodCredit += e.credit;
    } else if (beforeRange(e.entryDate, range)) {
      row.openingDebit += e.debit;
      row.openingCredit += e.credit;
    }
  }

  return map;
}

export function buildTrialBalanceReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { entries, balances, customers, range } = input;
  const totals = periodTotalsByCustomer(entries, range);

  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'accountName', label: 'Account Name' },
    { key: 'accountCategory', label: 'Account Category' },
    { key: 'openingDebit', label: 'Opening Debit', align: 'right' },
    { key: 'openingCredit', label: 'Opening Credit', align: 'right' },
    { key: 'periodDebit', label: 'Period Debit', align: 'right' },
    { key: 'periodCredit', label: 'Period Credit', align: 'right' },
    { key: 'closingDebit', label: 'Closing Debit', align: 'right' },
    { key: 'closingCredit', label: 'Closing Credit', align: 'right' },
    { key: 'currency', label: 'Currency' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const rows = balances.map(b => {
    const t = totals.get(b.customerId) ?? { periodDebit: 0, periodCredit: 0, openingDebit: 0, openingCredit: 0 };
    const openingNet = t.openingDebit - t.openingCredit;
    const closingNet = b.net;
    const closingDebit = closingNet > 0 ? closingNet : 0;
    const closingCredit = closingNet < 0 ? Math.abs(closingNet) : 0;
    const openingDebit = openingNet > 0 ? openingNet : 0;
    const openingCredit = openingNet < 0 ? Math.abs(openingNet) : 0;

    return {
      date: formatPeriodEndDate(range),
      accountCode: b.customerId,
      accountName: b.customerName,
      accountCategory: accountCategory(b.net),
      openingDebit: fmtAmount(openingDebit),
      openingCredit: fmtAmount(openingCredit),
      periodDebit: fmtAmount(t.periodDebit),
      periodCredit: fmtAmount(t.periodCredit),
      closingDebit: fmtAmount(closingDebit),
      closingCredit: fmtAmount(closingCredit),
      currency: customerCurrency(customers, b.customerId),
      remarks: '—',
    };
  });

  return { columns, rows: withSlNo(rows) };
}

export function buildGeneralLedgerReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { entries, customers, range } = input;
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'accountName', label: 'Account Name' },
    { key: 'description', label: 'Description' },
    { key: 'debit', label: 'Debit', align: 'right' },
    { key: 'credit', label: 'Credit', align: 'right' },
    { key: 'runningBalance', label: 'Running Balance', align: 'right' },
    { key: 'currency', label: 'Currency' },
  ];

  const sorted = [...entries]
    .filter(e => inRange(e.entryDate, range))
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt.localeCompare(b.createdAt));

  const balanceByCustomer = new Map<string, number>();
  const rows: ReportRow[] = sorted.map(e => {
    const prev = balanceByCustomer.get(e.customerId) ?? 0;
    const next = roundTo14(prev + e.debit - e.credit);
    balanceByCustomer.set(e.customerId, next);
    return {
      date: formatDate(e.entryDate),
      voucherNo: txnNo(e.referenceId ?? e.id, 'V-'),
      accountCode: e.customerId,
      accountName: customerName(customers, e.customerId),
      description: e.description,
      debit: e.debit > 0 ? fmtAmount(e.debit) : '—',
      credit: e.credit > 0 ? fmtAmount(e.credit) : '—',
      runningBalance: fmtAmount(next),
      currency: e.settlementCurrency ?? e.customerCurrency ?? customerCurrency(customers, e.customerId),
    };
  });

  return { columns, rows: withSlNo(rows) };
}

export function buildJournalEntriesReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { entries, customers, range } = input;
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'journalNo', label: 'Journal No.' },
    { key: 'voucherType', label: 'Voucher Type' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'accountName', label: 'Account Name' },
    { key: 'debit', label: 'Debit', align: 'right' },
    { key: 'credit', label: 'Credit', align: 'right' },
    { key: 'narration', label: 'Narration' },
    { key: 'postedBy', label: 'Posted By' },
    { key: 'status', label: 'Status' },
  ];

  const rows = entries
    .filter(e => inRange(e.entryDate, range))
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
    .map(e => ({
      journalNo: txnNo(e.id, 'J-'),
      date: formatDate(e.entryDate),
      voucherType: voucherLabel(e.referenceType),
      accountCode: e.customerId,
      accountName: customerName(customers, e.customerId),
      debit: e.debit > 0 ? fmtAmount(e.debit) : '—',
      credit: e.credit > 0 ? fmtAmount(e.credit) : '—',
      narration: e.description,
      postedBy: e.createdByName ?? e.createdBy ?? '—',
      status: 'Posted',
    }));

  return { columns, rows: withSlNo(rows) };
}

export function buildChartOfAccountsReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { balances, customers, range } = input;
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'accountName', label: 'Account Name' },
    { key: 'parentAccount', label: 'Parent Account' },
    { key: 'accountType', label: 'Account Type' },
    { key: 'accountCategory', label: 'Account Category' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
  ];

  const balanceMap = new Map(balances.map(b => [b.customerId, b]));

  const rows = customers.map(c => {
    const bal = balanceMap.get(c.id);
    const net = bal?.net ?? 0;
    return {
      date: formatPeriodEndDate(range),
      accountCode: c.id,
      accountName: c.name,
      parentAccount: 'Entity Ledger',
      accountType: 'Entity',
      accountCategory: accountCategory(net),
      currency: c.currency ?? 'USDT',
      status: c.status === 'active' ? 'Active' : 'Inactive',
    };
  });

  return { columns, rows: withSlNo(rows) };
}

function buildAgingReport(
  entries: FundEntityLedgerEntry[],
  customers: Customer[],
  range: FinanceDateRange,
  side: 'receivable' | 'payable',
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const isReceivable = side === 'receivable';
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'partyId', label: isReceivable ? 'Customer ID' : 'Supplier ID' },
    { key: 'partyName', label: isReceivable ? 'Customer Name' : 'Supplier Name' },
    { key: 'invoiceNo', label: 'Invoice No.' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'outstandingAmount', label: 'Outstanding Amount', align: 'right' },
    { key: 'currency', label: 'Currency' },
    { key: 'bucket0_30', label: '0–30 Days' },
    { key: 'bucket31_60', label: '31–60 Days' },
    { key: 'bucket61_90', label: '61–90 Days' },
    { key: 'bucketAbove90', label: 'Above 90 Days' },
    { key: 'status', label: 'Status' },
  ];

  const openEntries = entries.filter(e => {
    if (!inRange(e.entryDate, range)) return false;
    return isReceivable ? e.debit > 0 : e.credit > 0;
  });

  const rows = openEntries.map(e => {
    const amount = isReceivable ? e.debit : e.credit;
    const days = daysBetween(e.entryDate);
    const aging = agingBucket(days);
    const due = new Date(e.entryDate);
    due.setDate(due.getDate() + 30);

    return {
      date: formatDate(e.entryDate),
      partyId: e.customerId,
      partyName: customerName(customers, e.customerId),
      invoiceNo: txnNo(e.referenceId ?? e.id, isReceivable ? 'AR-' : 'AP-'),
      dueDate: formatDate(due.toISOString()),
      outstandingAmount: fmtAmount(amount),
      currency: customerCurrency(customers, e.customerId),
      ...aging,
      status: days > 30 ? 'Overdue' : 'Open',
    };
  });

  return { columns, rows: withSlNo(rows) };
}

export function buildAccountsReceivableReport(input: FundReportInput) {
  return buildAgingReport(input.entries, input.customers, input.range, 'receivable');
}

export function buildAccountsPayableReport(input: FundReportInput) {
  return buildAgingReport(input.entries, input.customers, input.range, 'payable');
}

export function buildProfitLossReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { entries, range } = input;
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'currentPeriod', label: 'Current Period', align: 'right' },
    { key: 'previousPeriod', label: 'Previous Period', align: 'right' },
    { key: 'budgetAmount', label: 'Budget Amount', align: 'right' },
    { key: 'variance', label: 'Variance', align: 'right' },
    { key: 'variancePct', label: 'Variance %', align: 'right' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const refs = ['physical_buy', 'physical_sell', 'usdt_buy', 'usdt_sell', 'settlement', 'manual', 'entity_transfer'] as const;
  const current = new Map<string, number>();
  const previous = new Map<string, number>();

  for (const e of entries) {
    const key = e.referenceType;
    const net = e.debit - e.credit;
    if (inRange(e.entryDate, range)) {
      current.set(key, (current.get(key) ?? 0) + net);
    } else if (beforeRange(e.entryDate, range)) {
      previous.set(key, (previous.get(key) ?? 0) + net);
    }
  }

  const rows = refs.map(ref => {
    const cur = current.get(ref) ?? 0;
    const prev = previous.get(ref) ?? 0;
    const variance = roundTo14(cur - prev);
    const variancePct = prev !== 0 ? roundTo14((variance / Math.abs(prev)) * 100) : 0;
    return {
      date: formatPeriodRangeLabel(range),
      accountCode: ref.toUpperCase(),
      particulars: voucherLabel(ref),
      currentPeriod: fmtAmount(cur),
      previousPeriod: fmtAmount(prev),
      budgetAmount: '—',
      variance: fmtAmount(variance),
      variancePct: `${variancePct.toFixed(1)}%`,
      remarks: 'By reference type',
    };
  });

  return { columns, rows: withSlNo(rows) };
}

export function buildBalanceSheetReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { balances, range } = input;
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'currentYear', label: 'Current Year', align: 'right' },
    { key: 'previousYear', label: 'Previous Year', align: 'right' },
    { key: 'variance', label: 'Variance', align: 'right' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const totalReceivable = roundTo14(balances.filter(b => b.net > 0).reduce((s, b) => s + b.net, 0));
  const totalPayable = roundTo14(balances.filter(b => b.net < 0).reduce((s, b) => s + Math.abs(b.net), 0));
  const netPosition = roundTo14(totalReceivable - totalPayable);

  const asOf = formatPeriodEndDate(range);
  const rows: ReportRow[] = [
    {
      date: asOf,
      accountCode: '1100',
      particulars: 'Accounts Receivable (Entities)',
      currentYear: fmtAmount(totalReceivable),
      previousYear: '—',
      variance: '—',
      remarks: `As of ${range.endDate ?? 'today'}`,
    },
    {
      date: asOf,
      accountCode: '2100',
      particulars: 'Accounts Payable (Entities)',
      currentYear: fmtAmount(totalPayable),
      previousYear: '—',
      variance: '—',
      remarks: `As of ${range.endDate ?? 'today'}`,
    },
    {
      date: asOf,
      accountCode: '3000',
      particulars: 'Net Entity Position',
      currentYear: fmtAmount(netPosition),
      previousYear: '—',
      variance: '—',
      remarks: 'Receivable minus payable',
    },
  ];

  return { columns, rows: withSlNo(rows) };
}

export function buildCashFlowReport(input: FundReportInput): { columns: ReportColumn[]; rows: ReportRow[] } {
  const { entries, range } = input;
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'particulars', label: 'Particulars' },
    { key: 'currentYear', label: 'Current Period', align: 'right' },
    { key: 'previousYear', label: 'Previous Period', align: 'right' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const settlementCurrent = entries
    .filter(e => e.referenceType === 'settlement' && inRange(e.entryDate, range))
    .reduce((s, e) => s + (e.credit - e.debit), 0);

  const settlementPrevious = entries
    .filter(e => e.referenceType === 'settlement' && beforeRange(e.entryDate, range))
    .reduce((s, e) => s + (e.credit - e.debit), 0);

  const operatingCurrent = entries
    .filter(e => inRange(e.entryDate, range))
    .reduce((s, e) => s + (e.debit - e.credit), 0);

  const operatingPrevious = entries
    .filter(e => beforeRange(e.entryDate, range))
    .reduce((s, e) => s + (e.debit - e.credit), 0);

  const periodLabel = formatPeriodRangeLabel(range);
  const rows: ReportRow[] = [
    {
      date: periodLabel,
      particulars: 'Operating — Net entity ledger movement',
      currentYear: fmtAmount(operatingCurrent),
      previousYear: fmtAmount(operatingPrevious),
      remarks: 'All ledger activity',
    },
    {
      date: periodLabel,
      particulars: 'Financing — Settlements received / paid',
      currentYear: fmtAmount(settlementCurrent),
      previousYear: fmtAmount(settlementPrevious),
      remarks: 'Settlement entries only',
    },
    {
      date: periodLabel,
      particulars: 'Net cash effect (approx.)',
      currentYear: fmtAmount(operatingCurrent + settlementCurrent),
      previousYear: fmtAmount(operatingPrevious + settlementPrevious),
      remarks: 'Derived from entity ledger',
    },
  ];

  return { columns, rows: withSlNo(rows) };
}

export function getFundReportDefs(input: FundReportInput): ReportDef[] {
  return [
    {
      id: 'trial-balance',
      title: 'Trial Balance',
      subtitle: 'Entity account debits and credits',
      info: 'Opening balances are computed from entries before the selected period. Period and closing columns reflect the date filter.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildTrialBalanceReport(input),
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss Statement',
      subtitle: 'Movement by transaction reference type',
      info: 'Derived from entity ledger reference types. Not a full GAAP P&L — shows net movement per module.',
      available: true,
      build: () => buildProfitLossReport(input),
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      subtitle: 'Receivables, payables, and net position',
      info: 'Simplified balance sheet from entity receivable/payable totals.',
      available: true,
      build: () => buildBalanceSheetReport(input),
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Statement',
      subtitle: 'Operating and settlement cash movement',
      info: 'Approximate cash effect from ledger activity and settlement entries.',
      available: true,
      build: () => buildCashFlowReport(input),
    },
    {
      id: 'general-ledger',
      title: 'General Ledger Report',
      subtitle: 'All entries with running balance',
      info: 'Chronological ledger with per-entity running balance. Amounts in USDT unless noted.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildGeneralLedgerReport(input),
    },
    {
      id: 'journal-entries',
      title: 'Journal Entries Report',
      subtitle: 'Full journal with voucher type and status',
      info: 'All posted journal lines for the selected period.',
      available: true,
      build: () => buildJournalEntriesReport(input),
    },
    {
      id: 'chart-of-accounts',
      title: 'Chart of Accounts Report',
      subtitle: 'Entity accounts (customers)',
      info: 'Customers mapped as entity ledger accounts. No hierarchical GL chart.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildChartOfAccountsReport(input),
    },
    {
      id: 'accounts-receivable',
      title: 'Accounts Receivable Report',
      subtitle: 'Outstanding receivables with aging',
      info: 'Debit entries in period. Due date = entry date + 30 days. Aging from entry date.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildAccountsReceivableReport(input),
    },
    {
      id: 'accounts-payable',
      title: 'Accounts Payable Report',
      subtitle: 'Outstanding payables with aging',
      info: 'Credit entries in period. Due date = entry date + 30 days. Aging from entry date.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildAccountsPayableReport(input),
    },
    {
      id: 'equity-changes',
      title: 'Statement of Changes in Equity',
      subtitle: 'Equity components and movements',
      info: 'Requires dedicated equity account tracking.',
      available: false,
      unavailableReason: 'Equity accounts not tracked in entity ledger schema',
      build: () => ({ columns: [], rows: [] }),
    },
  ];
}
