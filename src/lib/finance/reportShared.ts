export type FinanceDateRange = { startDate: string | null; endDate: string | null };

export type ReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  info?: string;
  sortable?: boolean;
  filterable?: boolean;
  totalable?: boolean;
};

export type ReportRow = Record<string, string | number>;

export type ReportBuildResult = { columns: ReportColumn[]; rows: ReportRow[] };

export type ReportDef = {
  id: string;
  title: string;
  subtitle: string;
  info?: string;
  available: boolean;
  unavailableReason?: string;
  currencyColumn?: string;
  build: () => ReportBuildResult;
};

export const REPORT_COLUMN_INFO: Record<string, string> = {
  slNo: 'Sequential row number in this report.',
  accountCode: 'Short entity or account identifier. Hover cell for full ID.',
  accountName: 'Display name of the entity or account.',
  accountCategory: 'Receivable, payable, or settled based on net balance.',
  accountType: 'Account classification in the entity ledger.',
  parentAccount: 'Parent grouping for this account.',
  customerId: 'Customer entity ID. Hover cell for full ID.',
  customerName: 'Customer display name.',
  supplierId: 'Supplier entity ID. Hover cell for full ID.',
  supplierName: 'Supplier display name.',
  partyId: 'Counterparty entity ID. Hover cell for full ID.',
  partyName: 'Counterparty display name.',
  transactionNo: 'Unique transaction reference number.',
  invoiceNo: 'Sales invoice reference.',
  purchaseNo: 'Purchase order reference.',
  journalNo: 'Journal entry reference.',
  voucherNo: 'Voucher or document number.',
  date: 'Transaction or entry date.',
  transactionDate: 'Date the transaction was recorded.',
  invoiceDate: 'Invoice issue date.',
  purchaseDate: 'Purchase transaction date.',
  receiptDate: 'Receipt date.',
  paymentDate: 'Payment date.',
  voucherDate: 'Voucher posting date.',
  dueDate: 'Payment due date.',
  periodEnd: 'Report period end date.',
  voucherType: 'Source module or entry type.',
  debit: 'Debit amount in report currency.',
  credit: 'Credit amount in report currency.',
  currency: 'Amount denomination for this row.',
  amount: 'Monetary amount.',
  totalAmount: 'Total value for the line.',
  estimatedValue: 'Estimated value at current or open rate.',
  outstandingAmount: 'Unpaid balance on this line.',
  runningBalance: 'Cumulative balance after this entry.',
  status: 'Open, paid, overdue, or posted status.',
  paymentStatus: 'Whether payment has been recorded.',
  paymentMethod: 'Cash, bank, USDT, or multi-currency.',
  rateType: 'Fixed rate locked, or unfixed open-market exposure.',
  fixedRate: 'Locked rate applied to this transaction.',
  currentMarketRate: 'Market rate at time of transaction.',
  quantity: 'Metal quantity in grams (pure weight).',
  purity: 'Metal purity or fineness.',
  remarks: 'Notes or narration.',
  narration: 'Entry description or notes.',
  postedBy: 'User who posted this entry.',
  openingDebit: 'Debit balance before the selected period.',
  openingCredit: 'Credit balance before the selected period.',
  periodDebit: 'Total debits posted during the selected period.',
  periodCredit: 'Total credits posted during the selected period.',
  closingDebit: 'Debit balance at end of period.',
  closingCredit: 'Credit balance at end of period.',
  bucket0_30: 'Outstanding 0–30 days.',
  bucket31_60: 'Outstanding 31–60 days.',
  bucket61_90: 'Outstanding 61–90 days.',
  bucketAbove90: 'Outstanding over 90 days.',
  currentPeriod: 'Amount for the selected date range.',
  previousPeriod: 'Amount before the selected date range.',
  variance: 'Difference between current and previous period.',
  variancePct: 'Variance as a percentage of previous period.',
};

export const DEFAULT_TOTALABLE_KEYS = new Set([
  'debit',
  'credit',
  'amount',
  'totalAmount',
  'estimatedValue',
  'outstandingAmount',
  'runningBalance',
  'openingDebit',
  'openingCredit',
  'periodDebit',
  'periodCredit',
  'closingDebit',
  'closingCredit',
  'currentPeriod',
  'previousPeriod',
  'variance',
  'currentYear',
  'previousYear',
  'quantity',
  'quantityReceived',
  'quantityPaid',
]);

const SHORT_DISPLAY_KEYS = new Set([
  'accountCode',
  'customerId',
  'supplierId',
  'partyId',
  'journalNo',
  'voucherNo',
  'transactionNo',
  'invoiceNo',
  'purchaseNo',
  'purchaseInvoiceNo',
  'receiptNo',
  'paymentNo',
  'referenceNo',
]);

export function shortCode(id?: string | number): string {
  if (id == null || id === '' || id === '—') return '—';
  const s = String(id);
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function shouldShortenColumn(key: string): boolean {
  return SHORT_DISPLAY_KEYS.has(key) || /Id$/.test(key);
}

export function enrichColumns(columns: ReportColumn[]): ReportColumn[] {
  return columns.map(col => ({
    ...col,
    sortable: col.sortable ?? col.key !== 'slNo',
    filterable:
      col.filterable ??
      ['currency', 'status', 'paymentStatus', 'rateType', 'voucherType', 'accountCategory', 'accountType'].includes(
        col.key,
      ),
    totalable: col.totalable ?? DEFAULT_TOTALABLE_KEYS.has(col.key),
    info: col.info ?? REPORT_COLUMN_INFO[col.key],
  }));
}

export function formatPeriodEndDate(range: FinanceDateRange): string {
  if (range.endDate) {
    return range.endDate.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function formatPeriodRangeLabel(range: FinanceDateRange): string {
  const start = range.startDate ?? 'Start';
  const end = range.endDate ?? 'Today';
  return `${start} – ${end}`;
}

export function inRange(date: string, range: FinanceDateRange): boolean {
  const d = date.slice(0, 10);
  const start = range.startDate || '1970-01-01';
  const end = range.endDate || '9999-12-31';
  return d >= start && d <= end;
}

export function beforeRange(date: string, range: FinanceDateRange): boolean {
  const d = date.slice(0, 10);
  const start = range.startDate || '1970-01-01';
  return d < start;
}

export function withSlNo(rows: ReportRow[]): ReportRow[] {
  return rows.map((r, i) => ({ slNo: i + 1, ...r }));
}

export function txnNo(id?: string, prefix = ''): string {
  if (!id) return '—';
  return prefix + id.slice(-6).toUpperCase();
}

export function matchesReportSearch(row: ReportRow, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q));
}

export function voucherLabel(referenceType: string): string {
  return referenceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function daysBetween(from: string, to: Date = new Date()): number {
  const start = new Date(from.slice(0, 10));
  const end = new Date(to.toISOString().slice(0, 10));
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

export function agingBucket(days: number): {
  bucket0_30: string;
  bucket31_60: string;
  bucket61_90: string;
  bucketAbove90: string;
} {
  const empty = { bucket0_30: '', bucket31_60: '', bucket61_90: '', bucketAbove90: '' };
  if (days <= 30) return { ...empty, bucket0_30: '●' };
  if (days <= 60) return { ...empty, bucket31_60: '●' };
  if (days <= 90) return { ...empty, bucket61_90: '●' };
  return { ...empty, bucketAbove90: '●' };
}

export function parseReportAmount(val: string | number | undefined): number | null {
  if (val == null || val === '' || val === '—') return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function formatReportAmount(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type CurrencyTotals = Map<string, Partial<Record<string, number>>>;

export function computeCurrencyTotals(
  rows: ReportRow[],
  columns: ReportColumn[],
  currencyColumn = 'currency',
): CurrencyTotals {
  const totalable = columns.filter(c => c.totalable);
  const groups: CurrencyTotals = new Map();

  for (const row of rows) {
    const currency = String(row[currencyColumn] ?? row.currency ?? 'USDT');
    if (!groups.has(currency)) groups.set(currency, {});
    const bucket = groups.get(currency)!;

    for (const col of totalable) {
      const n = parseReportAmount(row[col.key]);
      if (n == null) continue;
      bucket[col.key] = (bucket[col.key] ?? 0) + n;
    }
  }

  return groups;
}
