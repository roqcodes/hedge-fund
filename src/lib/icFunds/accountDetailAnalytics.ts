import type { ICFundAccountType, ICFundVoucher, ICFundVoucherType } from '@/types';

export type ICFundAccountDetailStats = {
  totalDebit: number;
  totalCredit: number;
  voucherCount: number;
  receiptTotal: number;
  paymentTotal: number;
  journalTotal: number;
  contraTotal: number;
  monthlyTrend: Array<{ label: string; debit: number; credit: number }>;
  voucherTypeBreakdown: Array<{ type: ICFundVoucherType; count: number; amount: number }>;
  topCounterparties: Array<{ name: string; amount: number; percentage: number }>;
};

export type ICFundAccountRelatedPurchase = {
  id: string;
  date: string;
  units: number;
  aedAmount: number;
  paymentMethod?: string;
  warehouseName?: string;
};

export type ICFundAccountRelatedSale = {
  id: string;
  date: string;
  units: number;
  aedAmount: number;
  orderStatus?: string;
  paymentStatus?: string;
  customerName?: string;
};

export type ICFundAccountDetail = {
  account: import('@/types').ICFundAccount;
  statement: {
    opening: number;
    lines: import('@/types').ICFundStatementLine[];
    closing: number;
  };
  vouchers: ICFundVoucher[];
  stats: ICFundAccountDetailStats;
  relatedPurchases?: ICFundAccountRelatedPurchase[];
  relatedSales?: ICFundAccountRelatedSale[];
  relatedMeta?: {
    stock?: number;
    commission?: number;
  };
};

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-GB', { month: 'short', year: '2-digit' });
}

export function buildAccountDetailStats(
  vouchers: ICFundVoucher[],
  accountId: string,
): ICFundAccountDetailStats {
  let totalDebit = 0;
  let totalCredit = 0;
  let voucherCount = 0;
  let receiptTotal = 0;
  let paymentTotal = 0;
  let journalTotal = 0;
  let contraTotal = 0;

  const typeMap = new Map<ICFundVoucherType, { count: number; amount: number }>();
  const counterpartyMap = new Map<string, number>();
  const monthMap = new Map<string, { debit: number; credit: number }>();

  for (const v of vouchers) {
    if (v.status === 'void') continue;
    const isDebit = v.debitAccountId === accountId;
    const isCredit = v.creditAccountId === accountId;
    if (!isDebit && !isCredit) continue;

    voucherCount += 1;
    const debit = isDebit ? v.amount : 0;
    const credit = isCredit ? v.amount : 0;
    totalDebit += debit;
    totalCredit += credit;

    if (v.voucherType === 'receipt') receiptTotal += v.amount;
    if (v.voucherType === 'payment') paymentTotal += v.amount;
    if (v.voucherType === 'journal') journalTotal += v.amount;
    if (v.voucherType === 'contra') contraTotal += v.amount;

    const typeEntry = typeMap.get(v.voucherType) ?? { count: 0, amount: 0 };
    typeEntry.count += 1;
    typeEntry.amount += v.amount;
    typeMap.set(v.voucherType, typeEntry);

    const counterparty = isDebit ? v.creditAccountName : v.debitAccountName;
    counterpartyMap.set(counterparty, (counterpartyMap.get(counterparty) ?? 0) + v.amount);

    const monthKey = v.voucherDate.slice(0, 7);
    const monthEntry = monthMap.get(monthKey) ?? { debit: 0, credit: 0 };
    monthEntry.debit += debit;
    monthEntry.credit += credit;
    monthMap.set(monthKey, monthEntry);
  }

  const monthlyTrend = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, val]) => ({
      label: monthLabel(key),
      debit: Number(val.debit.toFixed(2)),
      credit: Number(val.credit.toFixed(2)),
    }));

  const voucherTypeBreakdown = (['payment', 'receipt', 'journal', 'contra'] as ICFundVoucherType[]).map(type => ({
    type,
    count: typeMap.get(type)?.count ?? 0,
    amount: Number((typeMap.get(type)?.amount ?? 0).toFixed(2)),
  }));

  const totalVolume = [...counterpartyMap.values()].reduce((s, n) => s + n, 0);
  const topCounterparties = [...counterpartyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({
      name,
      amount: Number(amount.toFixed(2)),
      percentage: totalVolume > 0 ? Number(((amount / totalVolume) * 100).toFixed(1)) : 0,
    }));

  return {
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    voucherCount,
    receiptTotal: Number(receiptTotal.toFixed(2)),
    paymentTotal: Number(paymentTotal.toFixed(2)),
    journalTotal: Number(journalTotal.toFixed(2)),
    contraTotal: Number(contraTotal.toFixed(2)),
    monthlyTrend,
    voucherTypeBreakdown,
    topCounterparties,
  };
}

export function accountDetailKpis(
  accountType: ICFundAccountType,
  stats: ICFundAccountDetailStats,
  balance: number,
  openingBalance: number,
): Array<{ label: string; value: string; hint?: string }> {
  const netFlow = stats.totalDebit - stats.totalCredit;

  switch (accountType) {
    case 'bank':
      return [
        { label: 'Balance', value: fmt(balance), hint: 'Current cash position' },
        { label: 'Total in', value: fmt(stats.totalDebit), hint: 'Debits to this till' },
        { label: 'Total out', value: fmt(stats.totalCredit), hint: 'Credits from this till' },
        { label: 'Net movement', value: fmt(netFlow), hint: 'In minus out (excl. opening)' },
      ];
    case 'personal':
      return [
        {
          label: 'Balance',
          value: fmt(balance),
          hint: balance > 0 ? 'Receivable' : balance < 0 ? 'Payable' : 'Settled',
        },
        { label: 'Opening', value: fmt(openingBalance) },
        { label: 'Total debits', value: fmt(stats.totalDebit) },
        { label: 'Total credits', value: fmt(stats.totalCredit) },
      ];
    case 'income':
      return [
        { label: 'Income balance', value: fmt(balance) },
        { label: 'Credited', value: fmt(stats.totalCredit) },
        { label: 'Reversed', value: fmt(stats.totalDebit) },
        { label: 'Entries', value: String(stats.voucherCount) },
      ];
    case 'profit':
      return [
        { label: 'Profit parked', value: fmt(balance) },
        { label: 'Added', value: fmt(stats.totalCredit) },
        { label: 'Moved out', value: fmt(stats.totalDebit) },
        { label: 'Entries', value: String(stats.voucherCount) },
      ];
    case 'expense':
    case 'd_expense':
      return [
        { label: 'Expense balance', value: fmt(balance) },
        { label: 'Charged', value: fmt(stats.totalDebit) },
        { label: 'Reversed', value: fmt(stats.totalCredit) },
        { label: 'Entries', value: String(stats.voucherCount) },
      ];
    default:
      return [
        { label: 'Balance', value: fmt(balance) },
        { label: 'Debits', value: fmt(stats.totalDebit) },
        { label: 'Credits', value: fmt(stats.totalCredit) },
        { label: 'Entries', value: String(stats.voucherCount) },
      ];
  }
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function accountSourceLabel(sourceType?: string): string | null {
  if (!sourceType) return null;
  if (sourceType === 'ic_supplier') return 'IC Transfer supplier';
  if (sourceType === 'ic_warehouse') return 'IC Transfer warehouse';
  if (sourceType === 'ic_customer') return 'Branch customer';
  if (sourceType === 'ic_system') return 'System account';
  return sourceType.replace(/_/g, ' ');
}
