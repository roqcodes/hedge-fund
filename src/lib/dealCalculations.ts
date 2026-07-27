import type { DealTransactionBuy } from '@/types';

export function generateDealBuyTxnId(): string {
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `DB${seq}`;
}

export type DealBuyAggregates = {
  totalWeight: number;
  totalCost: number;
  totalCurrencyAmount: number;
  avgPurity: number | null;
  avgPurchaseRate: number | null;
  buyCount: number;
};

/** Aggregate buy legs for display and sell settlement. Purity is informational only. */
export function computeDealBuyAggregates(
  buys: DealTransactionBuy[],
  groupType: 'gold' | 'currency' = 'gold',
): DealBuyAggregates {
  if (buys.length === 0) {
    return {
      totalWeight: 0,
      totalCost: 0,
      totalCurrencyAmount: 0,
      avgPurity: null,
      avgPurchaseRate: null,
      buyCount: 0,
    };
  }

  let totalWeight = 0;
  let totalCost = 0;
  let totalCurrencyAmount = 0;
  let weightedPurity = 0;
  let purityWeight = 0;
  let weightedRate = 0;

  for (const buy of buys) {
    totalWeight += buy.weight || 0;
    totalCost += buy.pureCostAed || 0;
    totalCurrencyAmount += buy.currencyAmount || 0;

    if (buy.purity != null && buy.weight > 0) {
      weightedPurity += buy.weight * buy.purity;
      purityWeight += buy.weight;
    }

    if (groupType === 'currency' && buy.currencyAmount && buy.purchaseRate) {
      weightedRate += buy.currencyAmount * buy.purchaseRate;
    }
  }

  const avgPurity = purityWeight > 0 ? weightedPurity / purityWeight : null;
  const avgPurchaseRate =
    groupType === 'currency' && totalCurrencyAmount > 0
      ? weightedRate / totalCurrencyAmount
      : null;

  return {
    totalWeight: Number(totalWeight.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    totalCurrencyAmount: Number(totalCurrencyAmount.toFixed(2)),
    avgPurity: avgPurity != null ? Number(avgPurity.toFixed(7)) : null,
    avgPurchaseRate: avgPurchaseRate != null ? Number(avgPurchaseRate.toFixed(6)) : null,
    buyCount: buys.length,
  };
}
