import { useMemo } from 'react';
import type { DealTransaction } from '@/types';

/** Index deal transactions by dealId — O(n) once instead of O(deals × txns). */
export function useTransactionsByDealId(transactions: DealTransaction[]) {
  return useMemo(() => {
    const map = new Map<string, DealTransaction[]>();
    for (const txn of transactions) {
      const dealId = txn.dealId;
      if (!dealId) continue;
      const list = map.get(dealId);
      if (list) list.push(txn);
      else map.set(dealId, [txn]);
    }
    return map;
  }, [transactions]);
}
