import type { DealTransaction } from '@/types';

type DealTransactionRow = Record<string, unknown>;

function mapBuy(b: Record<string, unknown>) {
  return {
    id: b.id as string,
    dealTransactionId: b.dealTransactionId as string,
    txnId: b.txnId as string,
    date: b.date ? new Date(b.date as string).toISOString().slice(0, 10) : '',
    time: b.time ? String(b.time) : undefined,
    weight: parseFloat(String(b.weight || '0')),
    purity: b.purity != null ? parseFloat(String(b.purity)) : undefined,
    pureCostAed: parseFloat(String(b.pureCostAed || '0')),
    currencyAmount: b.currencyAmount != null ? parseFloat(String(b.currencyAmount)) : undefined,
    purchaseRate: b.purchaseRate != null ? parseFloat(String(b.purchaseRate)) : undefined,
    createdAt: b.createdAt as string | undefined,
  };
}

function mapPayout(p: Record<string, unknown>) {
  return {
    id: p.id as string,
    dealTransactionId: p.dealTransactionId as string,
    investorId: p.investorId as string,
    investorName: p.investorName as string,
    payoutAmount: parseFloat(String(p.payoutAmount)),
    createdAt: p.createdAt as string | undefined,
  };
}

function mapExpenseDetail(e: Record<string, unknown>) {
  return {
    id: e.id as string,
    dealTransactionId: e.dealTransactionId as string,
    key: e.key as string,
    value: parseFloat(String(e.value)),
    timestamp: e.timestamp as string | undefined,
    createdAt: e.createdAt as string | undefined,
  };
}

/** Map a deal_transactions row to DealTransaction (summary fields only). */
export function mapDealTransactionListRow(r: DealTransactionRow): DealTransaction {
  return {
    id: String(r.id),
    date: r.date ? new Date(r.date as string).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    time: r.time ? String(r.time) : undefined,
    dealId: r.deal_id ? String(r.deal_id) : undefined,
    deal:
      (r.deal_number as string)
      || (String(r.id).startsWith('txn-') ? String(r.id).substring(4) : String(r.id).split('-').pop() || '1'),
    weight: parseFloat(String(r.weight)),
    rate: parseFloat(String(r.rate)),
    pureCostAed: parseFloat(String(r.pure_cost_aed)),
    currencyAmount: r.currency_amount != null ? parseFloat(String(r.currency_amount)) : undefined,
    purchaseRate: r.purchase_rate != null ? parseFloat(String(r.purchase_rate)) : undefined,
    conversionRate: r.conversion_rate != null ? parseFloat(String(r.conversion_rate)) : undefined,
    avgPurity: r.avg_purity != null ? parseFloat(String(r.avg_purity)) : undefined,
    liveSellRate: parseFloat(String(r.live_sell_rate || '0')),
    sellPremiumDiscount: parseFloat(String(r.sell_premium_discount || '0')),
    salesAed: parseFloat(String(r.sales_aed || '0')),
    expenses: parseFloat(String(r.expenses || '0')),
    grossProfit: parseFloat(String(r.gross_profit || '0')),
    netProfitPerGram: parseFloat(String(r.net_profit_per_gram || '0')),
    managementProfit: parseFloat(String(r.management_profit || '0')),
    fixOrUnfix: String(r.fix_or_unfix),
    marginDeposit: parseFloat(String(r.margin_deposit || '0')),
    premiumDiscount: parseFloat(String(r.premium_discount || '0')),
    buyCount: r.buy_count != null ? Number(r.buy_count) : undefined,
  };
}

/** Map a deal_transactions row including nested buys/payouts/expenses JSON. */
export function mapDealTransactionDetailRow(r: DealTransactionRow): DealTransaction {
  const base = mapDealTransactionListRow(r);
  const buys = ((r.buys as Array<Record<string, unknown>>) || []).map(mapBuy);
  return {
    ...base,
    buyCount: buys.length || base.buyCount,
    buys,
    payouts: ((r.payouts as Array<Record<string, unknown>>) || []).map(mapPayout),
    expensesDetails: ((r.expenses_details as Array<Record<string, unknown>>) || []).map(mapExpenseDetail),
  };
}

/** Investor-safe merge — preserves buy legs only, never co-investor payouts/expenses. */
export function mergeInvestorDealTransactionLists(
  incoming: DealTransaction[],
  existing: DealTransaction[],
): DealTransaction[] {
  const byId = new Map(existing.map(t => [t.id, t]));
  return incoming.map(row => {
    const prev = byId.get(row.id);
    if (!prev?.buys?.length) return row;
    return {
      ...row,
      buys: prev.buys,
      buyCount: prev.buys.length,
      payouts: undefined,
      expensesDetails: undefined,
    };
  });
}

/** Preserve loaded nested data when merging a lightweight poll refresh. */
export function mergeDealTransactionLists(
  incoming: DealTransaction[],
  existing: DealTransaction[],
): DealTransaction[] {
  const byId = new Map(existing.map(t => [t.id, t]));
  return incoming.map(row => {
    const prev = byId.get(row.id);
    if (!prev) return row;
    const hasDetails =
      (prev.buys && prev.buys.length > 0)
      || (prev.payouts && prev.payouts.length > 0)
      || (prev.expensesDetails && prev.expensesDetails.length > 0);
    if (!hasDetails) return row;
    return {
      ...row,
      buys: prev.buys,
      payouts: prev.payouts,
      expensesDetails: prev.expensesDetails,
      buyCount: prev.buys?.length ?? prev.buyCount ?? row.buyCount,
    };
  });
}

export function dealTransactionNeedsDetailLoad(txn: DealTransaction | undefined): boolean {
  if (!txn) return false;
  return txn.buys === undefined && txn.payouts === undefined && txn.expensesDetails === undefined;
}

export function dealTransactionHasDetails(txn: DealTransaction | undefined): boolean {
  if (!txn) return false;
  return !dealTransactionNeedsDetailLoad(txn);
}
