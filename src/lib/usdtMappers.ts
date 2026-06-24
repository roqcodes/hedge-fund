import { UsdtBranchSettings, UsdtBuy, UsdtSell } from '@/types';

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string | undefined {
  return v != null && v !== '' ? String(v) : undefined;
}

function mapEnteredBy(r: Record<string, unknown>) {
  return {
    enteredByUsername: str(r.entered_by),
    enteredByName: str(r.entered_by_name),
    enteredByUserId: str(r.entered_by_user_id),
  };
}

export function mapUsdtBuyRow(r: Record<string, unknown>): UsdtBuy {
  return {
    id: String(r.id),
    branchId: String(r.branch_id),
    date: new Date(String(r.date)).toISOString(),
    txnId: str(r.txn_id),
    customerId: str(r.customer_id),
    customerName: str(r.customer_name),
    walletId: str(r.wallet_id),
    openingBalance: r.opening_balance != null ? num(r.opening_balance) : undefined,
    usdtAmount: num(r.usdt_amount),
    aedRate: num(r.aed_rate),
    serviceCharge: num(r.service_charge),
    aedTotal: num(r.aed_total),
    notes: str(r.notes),
    ...mapEnteredBy(r),
    createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
  };
}

export function mapUsdtSellRow(r: Record<string, unknown>): UsdtSell {
  return {
    id: String(r.id),
    branchId: String(r.branch_id),
    date: new Date(String(r.date)).toISOString(),
    txnId: str(r.txn_id),
    customerId: str(r.customer_id),
    customerName: str(r.customer_name),
    walletId: str(r.wallet_id),
    openingBalance: r.opening_balance != null ? num(r.opening_balance) : undefined,
    usdtAmount: num(r.usdt_amount),
    cost: num(r.cost),
    margin: num(r.margin),
    aedRate: num(r.aed_rate),
    serviceCharge: num(r.service_charge),
    aedTotal: num(r.aed_total),
    profit: num(r.profit),
    notes: str(r.notes),
    ...mapEnteredBy(r),
    createdAt: r.created_at ? new Date(String(r.created_at)).toISOString() : undefined,
  };
}

export function mapUsdtSettingsRow(r: Record<string, unknown>): UsdtBranchSettings {
  return {
    branchId: String(r.branch_id),
    presetMargin: num(r.preset_margin, 0.002),
    updatedAt: r.updated_at ? new Date(String(r.updated_at)).toISOString() : undefined,
  };
}
