import { Transaction } from '@/types';

export const SYSTEM_TRANSACTION_TYPES = new Set([
  'transfer',
  'expense',
  'allocation',
  'customer_account',
  'temporary_credit',
  'profit',
  'opex',
  'capex',
]);

/** Tag names for a transaction (DB tags + legacy type-as-tag). */
export function getTransactionTagNames(t: Transaction): string[] {
  if (t.tags && t.tags.length > 0) return t.tags;
  if (!SYSTEM_TRANSACTION_TYPES.has(t.type)) return [t.type];
  return [];
}

export function transactionHasAnyTag(t: Transaction, tagNames: string[]): boolean {
  if (tagNames.length === 0) return true;
  const txnTags = getTransactionTagNames(t);
  return tagNames.some(name => txnTags.includes(name));
}

export function getTransactionTagIds(
  txn: Transaction,
  branchTags: { id: string; name: string }[],
): string[] {
  if (txn.tagIds?.length) return [...txn.tagIds];
  const names = new Set(getTransactionTagNames(txn));
  return branchTags.filter(t => names.has(t.name)).map(t => t.id);
}
