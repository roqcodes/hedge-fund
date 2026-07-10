export const IC_SALE_TRANSACTION_TYPES = ['transfer', 'cdm', 'by_hand', 'nre'] as const;

export type ICSaleTransactionType = (typeof IC_SALE_TRANSACTION_TYPES)[number];

export const DEFAULT_IC_SALE_TRANSACTION_TYPE: ICSaleTransactionType = 'transfer';

export const IC_SALE_TRANSACTION_TYPE_OPTIONS: ReadonlyArray<{
  value: ICSaleTransactionType;
  label: string;
}> = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'cdm', label: 'CDM' },
  { value: 'by_hand', label: 'By Hand' },
  { value: 'nre', label: 'NRE' },
];

export function isICSaleTransactionType(value: string): value is ICSaleTransactionType {
  return (IC_SALE_TRANSACTION_TYPES as readonly string[]).includes(value);
}

export function formatICSaleTransactionTypeLabel(type?: string | null): string {
  const option = IC_SALE_TRANSACTION_TYPE_OPTIONS.find(o => o.value === type);
  if (option) return option.label;
  if (!type) return 'Transfer';
  return type.replace(/_/g, ' ');
}

/** Bank name is only collected for non–by-hand IC sale transaction types. */
export function transactionTypeRequiresBank(type?: string | null): boolean {
  return type !== 'by_hand';
}
