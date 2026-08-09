import type { DealTransaction } from '@/types';

export function inrToAedMultiplier(conversionRate: number): number {
  if (!conversionRate) return 0;
  return conversionRate > 100 ? conversionRate / 100000 : conversionRate;
}

export interface SaleBreakdown {
  sellingRateInr: number | null;
  inrToAedRate: number | null;
  salesAed: number;
  /** Older sells stored AED in live_sell_rate — INR/rate unavailable. */
  isLegacy: boolean;
}

export function getGoldSaleBreakdown(txn: Pick<
  DealTransaction,
  'salesAed' | 'liveSellRate' | 'conversionRate'
>): SaleBreakdown {
  const salesAed = txn.salesAed || 0;
  if (salesAed <= 0) {
    return { sellingRateInr: null, inrToAedRate: null, salesAed: 0, isLegacy: false };
  }

  const liveSellRate = txn.liveSellRate || 0;
  const conversionRate = txn.conversionRate || 0;

  if (conversionRate > 0 && liveSellRate > 0) {
    const expected = liveSellRate * inrToAedMultiplier(conversionRate);
    if (Math.abs(expected - salesAed) <= Math.max(0.01, salesAed * 0.001)) {
      return {
        sellingRateInr: liveSellRate,
        inrToAedRate: conversionRate,
        salesAed,
        isLegacy: false,
      };
    }
  }

  if (Math.abs(liveSellRate - salesAed) <= Math.max(0.01, salesAed * 0.001)) {
    return { sellingRateInr: null, inrToAedRate: null, salesAed, isLegacy: true };
  }

  return {
    sellingRateInr: liveSellRate > 0 ? liveSellRate : null,
    inrToAedRate: conversionRate > 0 ? conversionRate : null,
    salesAed,
    isLegacy: false,
  };
}

export function getCurrencySaleBreakdown(txn: Pick<
  DealTransaction,
  'salesAed' | 'currencyAmount' | 'conversionRate'
>): SaleBreakdown {
  const salesAed = txn.salesAed || 0;
  const amount = txn.currencyAmount || 0;
  const rate = txn.conversionRate || 0;
  return {
    sellingRateInr: amount > 0 ? amount : null,
    inrToAedRate: rate > 0 ? rate : null,
    salesAed,
    isLegacy: false,
  };
}

export function formatInr(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}
