export function generateUsdtTxnId(slug: string, type: 'BUY' | 'SELL' = 'BUY'): string {
  const prefix = slug.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'US';
  const seq = Math.floor(Math.random() * 90 + 10);
  return `${type === 'BUY' ? 'B' : 'S'}${prefix}U${seq}`;
}

export function computeUsdtBuy(values: {
  usdtAmount: number;
  aedRate: number;
  serviceCharge?: number;
}) {
  const { usdtAmount, aedRate, serviceCharge = 0 } = values;
  const aedTotal = usdtAmount * aedRate + serviceCharge;
  return { aedTotal };
}

export function computeUsdtSell(values: {
  usdtAmount: number;
  cost: number;
  margin: number;
  serviceCharge?: number;
}) {
  const { usdtAmount, cost, margin, serviceCharge = 0 } = values;
  const aedRate = cost + margin;
  const profit = margin * usdtAmount;
  const aedTotal = usdtAmount * aedRate + serviceCharge;
  return { aedRate, profit, aedTotal };
}

/** Simple average AED rate across branch USDT purchases. */
export function computeAverageUsdtBuyAedRate(
  buys: { aedRate: number }[],
): number | null {
  if (buys.length === 0) return null;
  const sum = buys.reduce((s, b) => s + b.aedRate, 0);
  return sum / buys.length;
}

export function formatUsdtRateInput(rate: number): string {
  const rounded = Math.round(rate * 1e6) / 1e6;
  return String(rounded);
}

export function formatUsdtRateDisplay(rate: number): string {
  return rate.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export function computeUsdtBranchStats(
  buys: { usdtAmount: number; aedRate: number; aedTotal: number }[],
  sells: { usdtAmount: number; profit: number; aedTotal: number; margin?: number }[],
) {
  const totalBuyUsdt = buys.reduce((s, b) => s + b.usdtAmount, 0);
  const totalBuyAed = buys.reduce((s, b) => s + b.aedTotal, 0);
  const totalSellUsdt = sells.reduce((s, b) => s + b.usdtAmount, 0);
  const totalSellAed = sells.reduce((s, b) => s + b.aedTotal, 0);
  const totalProfit = sells.reduce((s, b) => s + b.profit, 0);
  const stockUsdt = totalBuyUsdt - totalSellUsdt;
  const avgCost = computeAverageUsdtBuyAedRate(buys);
  const avgSellMargin =
    sells.length > 0 ? sells.reduce((s, x) => s + (x.margin ?? 0), 0) / sells.length : null;

  return {
    stockUsdt,
    avgCost,
    totalBuyUsdt,
    totalBuyAed,
    totalSellUsdt,
    totalSellAed,
    totalProfit,
    avgSellMargin,
  };
}

export function formatUsdtDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy} ${hh}:${min}`;
}

export function formatUsdtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}
