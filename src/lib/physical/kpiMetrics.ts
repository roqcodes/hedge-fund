import { convertAedToUsdt } from '@/lib/physicalCurrencyDisplay';
import type { PhysicalBuy, PhysicalSell } from '@/types';

export type PhysicalCurrencyTotals = {
  aed: number;
  usdt: number;
  idr: number;
};

export type PhysicalKpiMetrics = {
  totalPurchasedGram: number;
  remainingGram: number;
  soldGram: number;
  soldPct: number;
  totalDeals: number;
  fixCount: number;
  unfixCount: number;
  totalSales: number;
  buyValue: PhysicalCurrencyTotals;
  sellValue: PhysicalCurrencyTotals;
  pl: PhysicalCurrencyTotals;
};

type MonetaryRow = {
  aed: number;
  usdt?: number | null;
  idr?: number | null;
};

function sumMonetary(rows: MonetaryRow[], rates?: Record<string, number>): PhysicalCurrencyTotals {
  let aed = 0;
  let usdt = 0;
  let idr = 0;

  for (const row of rows) {
    aed += row.aed;
    usdt += row.usdt != null && row.usdt > 0 ? row.usdt : convertAedToUsdt(row.aed, rates);
    idr += row.idr ?? 0;
  }

  return { aed, usdt, idr };
}

function idrFromBuy(buy: PhysicalBuy): number {
  return buy.tltIdrValue ?? buy.pureGram * buy.idrGram;
}

function idrFromSell(sell: PhysicalSell): number {
  return sell.tltIdrValue ?? sell.pureGram * sell.idrGram;
}

function plIdrEstimate(plAed: number, buyTotals: PhysicalCurrencyTotals, sellTotals: PhysicalCurrencyTotals): number {
  if (plAed === 0) return 0;
  if (sellTotals.aed > 0 && sellTotals.idr > 0) {
    return plAed * (sellTotals.idr / sellTotals.aed);
  }
  if (buyTotals.aed > 0 && buyTotals.idr > 0) {
    return plAed * (buyTotals.idr / buyTotals.aed);
  }
  return 0;
}

export function computePhysicalKpiMetrics(
  allBuys: PhysicalBuy[],
  filteredBuys: PhysicalBuy[],
  filteredSells: PhysicalSell[],
  isFixedDeal: (buy: PhysicalBuy) => boolean,
  rates?: Record<string, number>,
): PhysicalKpiMetrics {
  const totalPurchasedGram = allBuys.reduce((sum, b) => sum + b.pureGram, 0);
  const remainingGram = allBuys.reduce((sum, b) => sum + b.remainingWeight, 0);
  const soldGram = Math.max(0, totalPurchasedGram - remainingGram);
  const soldPct =
    totalPurchasedGram > 0 ? Math.min(100, Math.round((soldGram / totalPurchasedGram) * 100)) : 0;

  const buyValue = sumMonetary(
    filteredBuys.map(b => ({
      aed: b.buyValue,
      usdt: b.totalUsdt,
      idr: idrFromBuy(b),
    })),
    rates,
  );

  const sellValue = sumMonetary(
    filteredSells.map(s => ({
      aed: s.sellValue,
      usdt: s.totalUsdt,
      idr: idrFromSell(s),
    })),
    rates,
  );

  const plAed = filteredSells.reduce((sum, s) => sum + s.profit, 0);
  const pl: PhysicalCurrencyTotals = {
    aed: plAed,
    usdt: convertAedToUsdt(plAed, rates),
    idr: plIdrEstimate(plAed, buyValue, sellValue),
  };

  return {
    totalPurchasedGram,
    remainingGram,
    soldGram,
    soldPct,
    totalDeals: filteredBuys.length,
    fixCount: filteredBuys.filter(isFixedDeal).length,
    unfixCount: filteredBuys.filter(b => !isFixedDeal(b)).length,
    totalSales: filteredSells.length,
    buyValue,
    sellValue,
    pl,
  };
}
