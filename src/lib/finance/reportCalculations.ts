import { computePhysicalKpiMetrics } from '@/lib/physical/kpiMetrics';
import { computeUsdtBranchStats } from '@/lib/usdtCalculations';
import { getKpiTotals } from '@/lib/funds/calculations';
import { roundTo14 } from '@/lib/physicalCalculations';
import type {
  PhysicalBuy,
  PhysicalSell,
  PhysicalBalance,
  UsdtBuy,
  UsdtSell,
  UsdtIdrConversion,
  FundEntityLedgerEntry,
  FundEntityBalance,
} from '@/types';

export type FinanceDateRange = { startDate: string | null; endDate: string | null };

function inRange(date: string, range: FinanceDateRange): boolean {
  const d = date.slice(0, 10);
  const start = range.startDate || '1970-01-01';
  const end = range.endDate || '9999-12-31';
  return d >= start && d <= end;
}

function isFixedDeal(buy: PhysicalBuy): boolean {
  if (buy.fixOrUnfix) return buy.fixOrUnfix === 'fixed';
  return buy.deal != null && buy.deal > 0;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

export type PhysicalReportData = ReturnType<typeof buildPhysicalReport>;

export function buildPhysicalReport(
  buys: PhysicalBuy[],
  sells: PhysicalSell[],
  balance: PhysicalBalance | null,
  range: FinanceDateRange,
  rates?: Record<string, number>,
) {
  const buyIds = new Set(buys.map(b => b.id));
  const branchSells = sells.filter(s => buyIds.has(s.buyId));
  const filteredBuys = buys.filter(b => inRange(b.date, range));
  const filteredSells = branchSells.filter(s => inRange(s.date, range));

  const kpi = computePhysicalKpiMetrics(buys, filteredBuys, filteredSells, isFixedDeal, rates);

  const totalPurityLoss = roundTo14(
    filteredBuys.reduce((s, b) => s + (b.touchLoss ?? 0), 0) +
      filteredSells.reduce((s, s2) => s + (s2.touchLoss ?? 0), 0),
  );

  const avgBuyMargin =
    filteredBuys.length > 0
      ? roundTo14(filteredBuys.reduce((s, b) => s + (b.deal ?? 0), 0) / filteredBuys.length)
      : 0;

  const avgSellMargin =
    filteredSells.length > 0
      ? roundTo14(filteredSells.reduce((s, s2) => s + (s2.margin ?? 0), 0) / filteredSells.length)
      : 0;

  const reverseLoss = roundTo14(
    filteredSells.filter(s => s.profit < 0).reduce((s, s2) => s + Math.abs(s2.profit), 0),
  );

  const unfixPositions = filteredBuys.filter(b => !isFixedDeal(b) && b.remainingWeight > 0.001);
  const fixPositions = filteredBuys.filter(b => isFixedDeal(b) && b.remainingWeight > 0.001);

  const plByDeal = filteredBuys.map(buy => {
    const dealSells = filteredSells.filter(s => s.buyId === buy.id);
    const profit = roundTo14(dealSells.reduce((s, s2) => s + s2.profit, 0));
    const soldGram = roundTo14(dealSells.reduce((s, s2) => s + s2.pureGram, 0));
    return {
      id: buy.id,
      txnId: buy.txnId,
      date: buy.date,
      particulars: buy.particulars,
      customerName: buy.customerName,
      buyValue: buy.buyValue,
      sellValue: roundTo14(dealSells.reduce((s, s2) => s + s2.sellValue, 0)),
      profit,
      remainingWeight: buy.remainingWeight,
      fixOrUnfix: isFixedDeal(buy) ? 'fixed' : 'unfixed',
      deal: buy.deal,
      idrRate: buy.idrRate,
      soldGram,
    };
  });

  const paymentBreakdown = ['CASH', 'BANK_TRANSFER', 'USDT', 'MULTI_CURRENCY'].map(mode => {
    const modeBuys = filteredBuys.filter(b => b.paymentMode === mode);
    const modeSells = filteredSells.filter(s => s.paymentMode === mode);
    return {
      mode,
      buyCount: modeBuys.length,
      sellCount: modeSells.length,
      buyValue: roundTo14(modeBuys.reduce((s, b) => s + b.buyValue, 0)),
      sellValue: roundTo14(modeSells.reduce((s, s2) => s + s2.sellValue, 0)),
    };
  });

  const monthlyTrend = buildMonthlyTrend(
    filteredBuys.map(b => ({ date: b.date, buy: b.buyValue, sell: 0, profit: 0 })),
    filteredSells.map(s => ({ date: s.date, buy: 0, sell: s.sellValue, profit: s.profit })),
  );

  return {
    kpi,
    totalPurityLoss,
    avgBuyMargin,
    avgSellMargin,
    reverseLoss,
    unfixPositions,
    fixPositions,
    plByDeal,
    paymentBreakdown,
    monthlyTrend,
    holdings: {
      remainingGram: kpi.remainingGram,
      initialVolume: balance?.initialVolume ?? 0,
      availableFund: balance?.availableFund ?? 0,
      initialCapital: balance?.initialCapital ?? 0,
    },
    filteredBuys,
    filteredSells,
  };
}

export type CurrencyReportData = ReturnType<typeof buildCurrencyReport>;

export function buildCurrencyReport(
  buys: UsdtBuy[],
  sells: UsdtSell[],
  conversions: UsdtIdrConversion[],
  range: FinanceDateRange,
  cashBalances?: { usdt: number; aed: number; idr: number } | null,
) {
  const filteredBuys = buys.filter(b => inRange(b.date, range));
  const filteredSells = sells.filter(s => inRange(s.date, range));
  const filteredConversions = conversions.filter(c => inRange(c.date, range));

  const stats = computeUsdtBranchStats(filteredBuys, filteredSells);

  const reverseLoss = roundTo14(
    filteredSells.filter(s => s.profit < 0).reduce((s, s2) => s + Math.abs(s2.profit), 0),
  );

  const totalServiceCharge = roundTo14(
    filteredBuys.reduce((s, b) => s + b.serviceCharge, 0) +
      filteredSells.reduce((s, s2) => s + s2.serviceCharge, 0),
  );

  const premiumDiscount = roundTo14(
    filteredSells.reduce((s, s2) => s + s2.margin * s2.usdtAmount, 0),
  );

  const monthlyTrend = buildMonthlyTrend(
    filteredBuys.map(b => ({ date: b.date, buy: b.aedTotal, sell: 0, profit: 0 })),
    filteredSells.map(s => ({ date: s.date, buy: 0, sell: s.aedTotal, profit: s.profit })),
  );

  const marginTrend = buildMonthlySingle(
    filteredSells.map(s => ({ date: s.date, value: s.margin })),
    'avg',
  );

  const buySellRows = [
    ...filteredBuys.map(b => ({
      type: 'BUY' as const,
      date: b.date,
      txnId: b.txnId,
      customerName: b.customerName,
      usdtAmount: b.usdtAmount,
      rate: b.aedRate,
      serviceCharge: b.serviceCharge,
      total: b.aedTotal,
      margin: 0,
      profit: 0,
    })),
    ...filteredSells.map(s => ({
      type: 'SELL' as const,
      date: s.date,
      txnId: s.txnId,
      customerName: s.customerName,
      usdtAmount: s.usdtAmount,
      rate: s.aedRate,
      serviceCharge: s.serviceCharge,
      total: s.aedTotal,
      margin: s.margin,
      profit: s.profit,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    stats,
    reverseLoss,
    totalServiceCharge,
    premiumDiscount,
    monthlyTrend,
    marginTrend,
    buySellRows,
    filteredConversions,
    cashBalances: cashBalances ?? { usdt: 0, aed: 0, idr: 0 },
    filteredBuys,
    filteredSells,
  };
}

export type FundsReportData = ReturnType<typeof buildFundsReport>;

export function buildFundsReport(
  entries: FundEntityLedgerEntry[],
  balances: FundEntityBalance[],
  range: FinanceDateRange,
) {
  const filteredEntries = entries.filter(e => inRange(e.entryDate, range));
  const kpi = getKpiTotals(balances);

  const totalDebits = roundTo14(filteredEntries.reduce((s, e) => s + e.debit, 0));
  const totalCredits = roundTo14(filteredEntries.reduce((s, e) => s + e.credit, 0));

  const receivables = balances.filter(b => b.net > 0).sort((a, b) => b.net - a.net);
  const liabilities = balances.filter(b => b.net < 0).sort((a, b) => a.net - b.net);

  const marginCallEntities = liabilities.filter(b => Math.abs(b.net) > 10000);

  const byReference = ['manual', 'settlement', 'physical_buy', 'physical_sell', 'usdt_buy', 'usdt_sell'].map(ref => {
    const refEntries = filteredEntries.filter(e => e.referenceType === ref);
    return {
      referenceType: ref,
      count: refEntries.length,
      debits: roundTo14(refEntries.reduce((s, e) => s + e.debit, 0)),
      credits: roundTo14(refEntries.reduce((s, e) => s + e.credit, 0)),
    };
  });

  const monthlyTrend = buildMonthlySingle(
    filteredEntries.map(e => ({
      date: e.entryDate,
      value: e.debit - e.credit,
    })),
    'sum',
  );

  const trialBalance = balances.map(b => ({
    customerId: b.customerId,
    customerName: b.customerName,
    debit: b.totalDebit,
    credit: b.totalCredit,
    net: b.net,
  }));

  return {
    kpi,
    totalDebits,
    totalCredits,
    trialBalance,
    receivables,
    liabilities,
    marginCallEntities,
    byReference,
    monthlyTrend,
    filteredEntries,
  };
}

function buildMonthlyTrend(
  buyRows: { date: string; buy: number; sell: number; profit: number }[],
  sellRows: { date: string; buy: number; sell: number; profit: number }[],
) {
  const map = new Map<string, { buy: number; sell: number; profit: number }>();

  for (const row of [...buyRows, ...sellRows]) {
    const key = monthKey(row.date);
    const cur = map.get(key) ?? { buy: 0, sell: 0, profit: 0 };
    cur.buy = roundTo14(cur.buy + row.buy);
    cur.sell = roundTo14(cur.sell + row.sell);
    cur.profit = roundTo14(cur.profit + row.profit);
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({
      label: formatMonthLabel(key),
      buy: val.buy,
      sell: val.sell,
      profit: val.profit,
    }));
}

function buildMonthlySingle(
  rows: { date: string; value: number }[],
  mode: 'sum' | 'avg',
) {
  const map = new Map<string, { sum: number; count: number }>();

  for (const row of rows) {
    const key = monthKey(row.date);
    const cur = map.get(key) ?? { sum: 0, count: 0 };
    cur.sum = roundTo14(cur.sum + row.value);
    cur.count += 1;
    map.set(key, cur);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, val]) => ({
      label: formatMonthLabel(key),
      value: mode === 'avg' && val.count > 0 ? roundTo14(val.sum / val.count) : val.sum,
    }));
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export function matchesSearch(text: string | undefined | null, query: string): boolean {
  if (!query.trim()) return true;
  return (text ?? '').toLowerCase().includes(query.toLowerCase().trim());
}
