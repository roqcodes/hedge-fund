import type { ICSale } from '@/types';

export type ICSaleContentFields = Pick<
  ICSale,
  'units' | 'transactionType' | 'address' | 'imageUrl' | 'serviceCharge' | 'convertedAmount' | 'aedAmount'
>;

function normStr(v?: string | null): string {
  return (v ?? '').trim();
}

function normNum(v?: number | null): number {
  return Number(v ?? 0);
}

/** True when at least one editable order field differs from the original sale. */
export function hasICSaleContentChanged(
  original: ICSaleContentFields,
  updates: ICSaleContentFields,
): boolean {
  if (Math.abs(normNum(updates.units) - normNum(original.units)) > 0.0001) return true;
  if (normStr(updates.transactionType) !== normStr(original.transactionType)) return true;
  if (normStr(updates.address) !== normStr(original.address)) return true;
  if (normStr(updates.imageUrl) !== normStr(original.imageUrl)) return true;
  if (Math.abs(normNum(updates.serviceCharge) - normNum(original.serviceCharge)) > 0.0001) return true;
  if (Math.abs(normNum(updates.convertedAmount) - normNum(original.convertedAmount)) > 0.0001) return true;
  if (Math.abs(normNum(updates.aedAmount) - normNum(original.aedAmount)) > 0.0001) return true;
  return false;
}
