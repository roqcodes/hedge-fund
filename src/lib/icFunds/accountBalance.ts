/**
 * Balance = opening_balance + debits − credits (active vouchers only).
 * Optional as-of date limits voucher activity through that calendar day.
 */

export function accountBalanceSql(asOfParam: string | null): string {
  const dateFilter = asOfParam
    ? `AND v.voucher_date <= ${asOfParam}`
    : '';
  return `ROUND((
    a.opening_balance
    + COALESCE((
        SELECT SUM(v.amount) FROM ic_fund_vouchers v
        WHERE v.debit_account_id = a.id
          AND COALESCE(v.status, 'active') = 'active'
          ${dateFilter}
      ), 0)
    - COALESCE((
        SELECT SUM(v.amount) FROM ic_fund_vouchers v
        WHERE v.credit_account_id = a.id
          AND COALESCE(v.status, 'active') = 'active'
          ${dateFilter}
      ), 0)
  )::numeric, 2)`;
}

export function trialBalanceSplit(balance: number): { debit: number; credit: number } {
  if (balance > 0) return { debit: balance, credit: 0 };
  if (balance < 0) return { debit: 0, credit: Math.abs(balance) };
  return { debit: 0, credit: 0 };
}
