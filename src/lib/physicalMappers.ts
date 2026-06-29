import { PhysicalBuy, PhysicalSell } from '@/types';

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string | undefined {
  return v != null && v !== '' ? String(v) : undefined;
}

export function mapPhysicalBuyRow(r: Record<string, unknown>): PhysicalBuy {
  return {
    id: String(r.id),
    branchId: String(r.branch_id),
    date: new Date(String(r.date)).toISOString(),
    particulars: String(r.particulars ?? r.item ?? ''),
    grossWeight: num(r.gross_weight),
    pureConversion: num(r.pure_conversion, 1),
    pureGram: num(r.pure_gram),
    idrGram: num(r.idr_gram),
    idrToUsdt: num(r.idr_to_usdt),
    idrRate: num(r.idr_rate),
    total: num(r.total),
    buyValue: num(r.buy_value),
    remainingWeight: num(r.remaining_weight),
    status: (r.status as PhysicalBuy['status']) ?? 'active',
    createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
    txnId: str(r.txn_id),
    customerId: str(r.customer_id),
    customerName: str(r.customer_name),
    openingBalance: r.opening_balance != null ? num(r.opening_balance) : undefined,
    productId: str(r.product_id),
    item: str(r.item) ?? String(r.particulars ?? ''),
    notes: str(r.notes),
    purity: r.purity != null ? num(r.purity) : undefined,
    touchLoss: r.touch_loss != null ? num(r.touch_loss) : undefined,
    actualPurity: r.actual_purity != null ? num(r.actual_purity) : undefined,
    marketUsd: r.market_usd != null ? num(r.market_usd) : undefined,
    deal: r.deal != null ? num(r.deal) : undefined,
    paymentMode: str(r.payment_mode) as PhysicalBuy['paymentMode'],
    idrAmount: r.idr_amount != null ? num(r.idr_amount) : undefined,
    usdAmount: r.usd_amount != null ? num(r.usd_amount) : undefined,
    aedAmount: r.aed_amount != null ? num(r.aed_amount) : undefined,
    totalWeight: r.total_weight != null ? num(r.total_weight) : undefined,
    tltIdrValue: r.tlt_idr_value != null ? num(r.tlt_idr_value) : undefined,
    tltAedValue: r.tlt_aed_value != null ? num(r.tlt_aed_value) : undefined,
    totalUsdt: r.total_usdt != null ? num(r.total_usdt) : undefined,
    fixOrUnfix: str(r.fix_or_unfix) as PhysicalBuy['fixOrUnfix'],
  };
}

export function mapPhysicalSellRow(r: Record<string, unknown>): PhysicalSell {
  return {
    id: String(r.id),
    buyId: String(r.buy_id),
    date: new Date(String(r.date)).toISOString(),
    particulars: str(r.particulars) ?? str(r.narration),
    grossWeight: num(r.gross_weight),
    pureConversion: num(r.pure_conversion, 1),
    pureGram: num(r.pure_gram),
    idrGram: num(r.idr_gram),
    idrToUsdt: num(r.idr_to_usdt),
    idrRate: num(r.idr_rate),
    total: num(r.total),
    sellValue: num(r.sell_value),
    profit: num(r.profit),
    createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
    txnId: str(r.txn_id),
    customerId: str(r.customer_id),
    customerName: str(r.customer_name),
    openingBalance: r.opening_balance != null ? num(r.opening_balance) : undefined,
    narration: str(r.narration) ?? str(r.particulars),
    notes: str(r.notes),
    purity: r.purity != null ? num(r.purity) : undefined,
    touchLoss: r.touch_loss != null ? num(r.touch_loss) : undefined,
    actualPurity: r.actual_purity != null ? num(r.actual_purity) : undefined,
    marketUsd: r.market_usd != null ? num(r.market_usd) : undefined,
    deal: r.deal != null ? num(r.deal) : undefined,
    paymentMode: str(r.payment_mode) as PhysicalSell['paymentMode'],
    idrAmount: r.idr_amount != null ? num(r.idr_amount) : undefined,
    usdAmount: r.usd_amount != null ? num(r.usd_amount) : undefined,
    aedAmount: r.aed_amount != null ? num(r.aed_amount) : undefined,
    totalWeight: r.total_weight != null ? num(r.total_weight) : undefined,
    tltIdrValue: r.tlt_idr_value != null ? num(r.tlt_idr_value) : undefined,
    tltAedValue: r.tlt_aed_value != null ? num(r.tlt_aed_value) : undefined,
    totalUsdt: r.total_usdt != null ? num(r.total_usdt) : undefined,
    costValue: r.cost_value != null ? num(r.cost_value) : undefined,
    margin: r.margin != null ? num(r.margin) : undefined,
  };
}
