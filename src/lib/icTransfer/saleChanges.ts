import type { ICSale } from '@/types';
import { DEFAULT_IC_SALE_TRANSACTION_TYPE, transactionTypeRequiresBank } from '@/lib/icTransfer/transactionTypes';

export type ICSaleContentFields = Pick<
  ICSale,
  'units' | 'transactionType' | 'address' | 'location' | 'district' | 'imageUrl' | 'serviceCharge' | 'convertedAmount' | 'aedAmount' | 'bank' | 'conversionRate' | 'currency'
>;

function normStr(v?: string | null): string {
  return (v ?? '').trim();
}

function normNum(v?: number | null): number {
  return Number(v ?? 0);
}

type ICSaleEditableFields = Pick<
  ICSaleContentFields,
  'units' | 'transactionType' | 'address' | 'location' | 'district' | 'imageUrl' | 'serviceCharge' | 'bank'
>;

function normTransactionType(v?: string | null): string {
  const t = normStr(v).toLowerCase();
  return t || DEFAULT_IC_SALE_TRANSACTION_TYPE;
}

/** True when a user-editable field differs (ignores derived amounts). */
export function hasICSaleEditableFieldsChanged(
  original: ICSaleEditableFields,
  updates: ICSaleEditableFields,
): boolean {
  if (Math.abs(normNum(updates.units) - normNum(original.units)) > 0.0001) return true;
  if (normTransactionType(updates.transactionType) !== normTransactionType(original.transactionType)) return true;
  if (normStr(updates.address) !== normStr(original.address)) return true;
  if (normStr(updates.location) !== normStr(original.location)) return true;
  if (normStr(updates.district) !== normStr(original.district)) return true;
  if (normStr(updates.imageUrl) !== normStr(original.imageUrl)) return true;
  if (Math.abs(normNum(updates.serviceCharge) - normNum(original.serviceCharge)) > 0.0001) return true;
  if (
    transactionTypeRequiresBank(updates.transactionType ?? original.transactionType) &&
    normStr(updates.bank) !== normStr(original.bank)
  ) {
    return true;
  }
  return false;
}

/** True when at least one editable or derived order field differs from the original sale. */
export function hasICSaleContentChanged(
  original: ICSaleContentFields,
  updates: ICSaleContentFields,
): boolean {
  if (hasICSaleEditableFieldsChanged(original, updates)) return true;
  if (Math.abs(normNum(updates.convertedAmount) - normNum(original.convertedAmount)) > 0.0001) return true;
  if (Math.abs(normNum(updates.aedAmount) - normNum(original.aedAmount)) > 0.0001) return true;
  return false;
}
