import { PhysicalBuy, PhysicalSell, UsdtBuy, UsdtSell } from '@/types';

export function filterByCustomerId<T extends { customerId?: string }>(
  items: T[],
  customerId: string,
): T[] {
  return items.filter(i => i.customerId === customerId);
}

export function computePhysicalSalesStats(buys: PhysicalBuy[], sells: PhysicalSell[]) {
  return {
    soldToBranchCount: buys.length,
    boughtFromBranchCount: sells.length,
    totalReceivedFromBranch: buys.reduce((s, b) => s + b.buyValue, 0),
    totalPaidToBranch: sells.reduce((s, b) => s + b.sellValue, 0),
    totalSoldVolume: buys.reduce((s, b) => s + b.pureGram, 0),
    totalBoughtVolume: sells.reduce((s, b) => s + b.pureGram, 0),
  };
}

export function computeUsdtStats(buys: UsdtBuy[], sells: UsdtSell[]) {
  return {
    soldToBranchCount: buys.length,
    boughtFromBranchCount: sells.length,
    totalUsdtSoldToBranch: buys.reduce((s, b) => s + b.usdtAmount, 0),
    totalUsdtBoughtFromBranch: sells.reduce((s, b) => s + b.usdtAmount, 0),
    totalAedReceived: buys.reduce((s, b) => s + b.aedTotal, 0),
    totalAedPaid: sells.reduce((s, b) => s + b.aedTotal, 0),
  };
}

export function computeMarketplaceStats(
  invoices: { trade_type?: string; order_type?: string; net_amt_dc?: string | number; gross_wt?: string | number }[],
) {
  const soldToBranch = invoices.filter(inv => (inv.trade_type ?? 'sell') === 'buy');
  const boughtFromBranch = invoices.filter(inv => (inv.trade_type ?? 'sell') !== 'buy');
  const sumAmount = (list: typeof invoices) =>
    list.reduce((s, inv) => s + (parseFloat(String(inv.net_amt_dc ?? 0)) || 0), 0);
  const sumWeight = (list: typeof invoices) =>
    list.reduce((s, inv) => s + (parseFloat(String(inv.gross_wt ?? 0)) || 0), 0);

  return {
    soldToBranchCount: soldToBranch.length,
    boughtFromBranchCount: boughtFromBranch.length,
    soldToBranchAmountUsd: sumAmount(soldToBranch),
    boughtFromBranchAmountUsd: sumAmount(boughtFromBranch),
    invoiceCount: invoices.length,
    totalAmountUsd: sumAmount(invoices),
    totalWeightG: sumWeight(invoices),
    fixedCount: invoices.filter(inv => inv.order_type === 'Fixed').length,
    unfixedCount: invoices.filter(inv => inv.order_type === 'Unfixed').length,
  };
}

export function invoiceMatchesCustomerName(
  customerDetails: string | null | undefined,
  customerName: string,
): boolean {
  if (!customerDetails?.trim() || !customerName.trim()) return false;
  const name = customerName.trim().toLowerCase();
  const firstLine = customerDetails.split('\n')[0]?.trim().toLowerCase() ?? '';
  return firstLine === name || customerDetails.toLowerCase().includes(name);
}

export function invoiceMatchesCustomer(
  invoice: { customer_id?: string | null; customer_details?: string | null },
  customerId: string,
  customerName: string,
): boolean {
  if (invoice.customer_id && String(invoice.customer_id) === customerId) return true;
  return invoiceMatchesCustomerName(invoice.customer_details, customerName);
}
