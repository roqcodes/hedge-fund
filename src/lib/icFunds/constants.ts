export const IC_FUND_ACCOUNT_TYPES = [
  'bank',
  'personal',
  'income',
  'profit',
  'expense',
  'd_expense',
] as const;

export type ICFundAccountType = (typeof IC_FUND_ACCOUNT_TYPES)[number];

export const IC_FUND_VOUCHER_TYPES = ['payment', 'receipt', 'journal', 'contra'] as const;

export type ICFundVoucherType = (typeof IC_FUND_VOUCHER_TYPES)[number];

export const IC_FUND_ACCOUNT_STATUS = ['active', 'inactive'] as const;

export type ICFundAccountStatus = (typeof IC_FUND_ACCOUNT_STATUS)[number];

export const IC_FUND_ACCOUNT_TYPE_OPTIONS: ReadonlyArray<{
  value: ICFundAccountType;
  label: string;
  hint: string;
}> = [
  { value: 'bank', label: 'Bank', hint: 'Cash, collection tills, fund wallets' },
  { value: 'personal', label: 'Personal', hint: 'Customers, cashiers, counterparties' },
  { value: 'income', label: 'Income', hint: 'Revenue credited on receipts' },
  { value: 'profit', label: 'Profit', hint: 'Parked profit / equity, not income' },
  { value: 'expense', label: 'Expense', hint: 'Operating overhead' },
  { value: 'd_expense', label: 'D-Expense', hint: 'Direct deal / collection cost' },
];

export const IC_FUND_VOUCHER_LABELS: Record<ICFundVoucherType, string> = {
  payment: 'Payments',
  receipt: 'Receipts',
  journal: 'Journal',
  contra: 'Contra',
};

export function isICFundAccountType(value: string): value is ICFundAccountType {
  return (IC_FUND_ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function isICFundVoucherType(value: string): value is ICFundVoucherType {
  return (IC_FUND_VOUCHER_TYPES as readonly string[]).includes(value);
}

export function accountTypeLabel(type: ICFundAccountType): string {
  return IC_FUND_ACCOUNT_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}
