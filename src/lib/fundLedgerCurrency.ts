import type { FundEntityLedgerEntry } from '@/types';

const FIAT_PROFILE_CURRENCIES = ['AED', 'IDR'] as const;

/** Ledger denomination for a single entry (debit/credit columns). */
export function resolveEntryLedgerCurrency(entry: FundEntityLedgerEntry): string {
  return entry.customerCurrency || entry.settlementCurrency || 'USDT';
}

/** USDT-denominated entry for fiat-profile customer — excluded from AR/AP tally until converted. */
export function isPendingLedgerEntry(
  entry: FundEntityLedgerEntry,
  profileCurrency?: string,
): boolean {
  if (!profileCurrency || !FIAT_PROFILE_CURRENCIES.includes(profileCurrency as typeof FIAT_PROFILE_CURRENCIES[number])) {
    return false;
  }
  return resolveEntryLedgerCurrency(entry) === 'USDT';
}

export function canConvertLedgerEntry(
  entry: FundEntityLedgerEntry,
  profileCurrency?: string,
): boolean {
  return isPendingLedgerEntry(entry, profileCurrency);
}

/** SQL filter: exclude pending USDT entries for fiat-profile customers from balance sums. */
export const EXCLUDE_PENDING_LEDGER_SQL = `
  AND NOT (
    COALESCE(l.customer_currency, l.settlement_currency, 'USDT') = 'USDT'
    AND c.currency IN ('AED', 'IDR')
  )
`;

/** Infer open-balance currency for an entity from active (non-pending) ledger history. */
export function resolveEntityLedgerCurrency(
  entries: FundEntityLedgerEntry[],
  customerId: string,
  profileCurrency?: string,
): string {
  const sorted = entries
    .filter(e => e.customerId === customerId)
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

  for (const entry of sorted) {
    if (isPendingLedgerEntry(entry, profileCurrency)) continue;
    const currency = resolveEntryLedgerCurrency(entry);
    if (currency) return currency;
  }

  return profileCurrency || 'USDT';
}

/** Sum pending USDT exposure for fiat-profile customers. */
export function sumPendingUsdt(
  entries: FundEntityLedgerEntry[],
  customers: { id: string; currency?: string }[],
): number {
  let total = 0;
  for (const entry of entries) {
    const profile = customers.find(c => c.id === entry.customerId)?.currency;
    if (!isPendingLedgerEntry(entry, profile)) continue;
    total += entry.debit > 0 ? entry.debit : entry.credit;
  }
  return total;
}
/** Whether settlement uses a USDT-anchored rate prompt (1 USDT = ? fiat). */
export function usesUsdtAnchoredRate(ledgerCurrency: string, settlementCurrency: string): boolean {
  return ledgerCurrency === 'USDT' && settlementCurrency !== 'USDT';
}

/** Convert UI rate to server rate: 1 settlementCurrency = ? ledgerCurrency. */
export function toServerRate(
  ledgerCurrency: string,
  settlementCurrency: string,
  displayRate: number,
): number {
  if (displayRate <= 0) return 0;
  if (usesUsdtAnchoredRate(ledgerCurrency, settlementCurrency)) {
    return 1 / displayRate;
  }
  return displayRate;
}

/** Ledger amount cleared by a settlement (settlement amount × server rate). */
export function ledgerAmountFromSettlement(
  settlementAmount: number,
  ledgerCurrency: string,
  settlementCurrency: string,
  displayRate: number,
): number {
  if (settlementCurrency === ledgerCurrency) return settlementAmount;
  const serverRate = toServerRate(ledgerCurrency, settlementCurrency, displayRate);
  return settlementAmount * serverRate;
}
