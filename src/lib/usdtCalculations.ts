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
