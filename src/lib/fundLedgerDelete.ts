import type { FundEntityLedgerEntry, FundReferenceType } from '@/types';

const LINKED_SOURCE_RULES: Partial<Record<FundReferenceType, { label: string; hint: string }>> = {
  physical_buy: {
    label: 'physical buy',
    hint: 'Delete the buy from Physical Deals first.',
  },
  physical_sell: {
    label: 'physical sell / bulk sell',
    hint: 'Delete the sell from Physical Deals first.',
  },
  usdt_buy: {
    label: 'USDT purchase',
    hint: 'Delete the purchase from the USDT page first.',
  },
  usdt_sell: {
    label: 'USDT sale',
    hint: 'Delete the sale from the USDT page first.',
  },
};

export function getLinkedSourceDeleteMessage(referenceType: FundReferenceType): string | null {
  const rule = LINKED_SOURCE_RULES[referenceType];
  if (!rule) return null;
  return `This ledger entry is linked to a ${rule.label}. ${rule.hint}\n\nThe ledger line will be removed automatically when you delete the source deal.`;
}

export function isAutoLinkedLedgerEntry(
  entry: Pick<FundEntityLedgerEntry, 'referenceType'>,
): boolean {
  return Boolean(LINKED_SOURCE_RULES[entry.referenceType]);
}
