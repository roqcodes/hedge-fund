import type { Deal, DealTransaction, DealTransactionBuy } from '@/types';

/** Investor's share of group capital (0–1). */
export function investorDealShareRatio(
  deal: Pick<Deal, 'amount' | 'myInvestmentAmount'> | undefined,
): number {
  if (!deal?.myInvestmentAmount || !deal.amount || deal.amount <= 0) return 0;
  return deal.myInvestmentAmount / deal.amount;
}

/** This investor's portion of a deal transaction's purchase cost. */
export function investorTxnInvestment(
  pureCostAed: number,
  shareRatio: number,
): number {
  return pureCostAed * shareRatio;
}

/** Sum of investor's buy investment across transactions (uses txn.pureCostAed). */
export function investorTotalBuyInvestment(
  transactions: Pick<DealTransaction, 'pureCostAed'>[],
  shareRatio: number,
): number {
  return transactions.reduce(
    (sum, t) => sum + investorTxnInvestment(t.pureCostAed || 0, shareRatio),
    0,
  );
}

export function scaleTxnVolumeForInvestor(
  weight: number,
  currencyAmount: number | undefined,
  shareRatio: number,
  groupType: 'gold' | 'currency',
): { weight: number; currencyAmount: number | undefined } {
  if (shareRatio <= 0) {
    return { weight: 0, currencyAmount: groupType === 'currency' ? 0 : currencyAmount };
  }
  return {
    weight: groupType === 'gold' ? weight * shareRatio : weight,
    currencyAmount: currencyAmount != null ? currencyAmount * shareRatio : currencyAmount,
  };
}

export function scaleBuysForInvestor(
  buys: DealTransactionBuy[],
  shareRatio: number,
  groupType: 'gold' | 'currency',
): DealTransactionBuy[] {
  if (shareRatio <= 0) return [];
  return buys.map(b => {
    const scaled = scaleTxnVolumeForInvestor(b.weight, b.currencyAmount, shareRatio, groupType);
    return {
      ...b,
      pureCostAed: investorTxnInvestment(b.pureCostAed, shareRatio),
      weight: scaled.weight,
      currencyAmount: scaled.currencyAmount,
    };
  });
}
