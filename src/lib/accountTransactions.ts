import { Transaction } from '@/types';

export const ACCOUNT_NAME_LOCKED_ERROR =
  'Name cannot be changed because this account has at least one transaction.';

/** True if any transaction references this account name as from, to, or type. */
export function accountNameUsedInTransactions(name: string, transactions: Transaction[]): boolean {
  const key = name.trim();
  if (!key) return false;
  return transactions.some(
    t => t.from === key || t.to === key || t.type === key,
  );
}

export function isAccountNameChangeBlocked(
  currentName: string,
  nextName: string,
  transactions: Transaction[],
): boolean {
  if (currentName.trim() === nextName.trim()) return false;
  return accountNameUsedInTransactions(currentName, transactions);
}
