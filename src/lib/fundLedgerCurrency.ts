import type { FundEntityLedgerEntry, FundEntityBalance, Customer } from '@/types';
import { convertCustomerToUsdt } from '@/lib/fundLedgerAmounts';
import { roundTo14 } from '@/lib/physicalCalculations';

const FIAT_PROFILE_CURRENCIES = ['AED', 'IDR'] as const;

/** Rate semantics everywhere: 1 USDT = rate × customerCurrency */
export type UsdtRate = number;

export function fmtFundAmount(n: number, currency = 'USDT'): string {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** USDT amount stored in debit/credit (handles legacy rows written in customer currency). */
export function getEntryUsdtAmount(entry: FundEntityLedgerEntry): number {
  const raw = entry.debit > 0 ? entry.debit : entry.credit;
  const cc = entry.customerCurrency;
  const rate = entry.customerCurrencyRate;

  if (!cc || cc === 'USDT' || !rate || rate <= 0) return raw;

  const isPhysical = entry.referenceType === 'physical_buy' || entry.referenceType === 'physical_sell';
  // Legacy physical rows (pre USDT-first) stored customer-currency amount in debit/credit
  if (isPhysical && !entry.settlementCurrency) {
    return raw / rate;
  }

  return raw;
}

/** Customer-currency equivalent for an entry. */
export function getEntryCustomerAmount(entry: FundEntityLedgerEntry): number | null {
  const usdt = getEntryUsdtAmount(entry);
  const cc = entry.customerCurrency;
  const rate = entry.customerCurrencyRate;
  if (!cc || cc === 'USDT') return usdt;
  if (!rate || rate <= 0) return null;
  return usdt * rate;
}

export type EntryWalletDisplay = {
  walletCurrency: string;
  walletAmount: number;
  usdtAmount: number;
  bookCurrency: string;
  bookAmount: number | null;
};

/** Cash wallet shown in UI: settlement fields when set, else profile currency amount. */
export function getEntryWalletDisplay(entry: FundEntityLedgerEntry): EntryWalletDisplay {
  const usdtAmount = getEntryUsdtAmount(entry);
  const bookCurrency = entry.customerCurrency ?? 'USDT';
  const bookAmount = getEntryCustomerAmount(entry);
  const walletCurrency = entry.settlementCurrency ?? bookCurrency;

  if (walletCurrency === 'USDT') {
    return {
      walletCurrency: 'USDT',
      walletAmount: usdtAmount,
      usdtAmount,
      bookCurrency,
      bookAmount: bookCurrency !== 'USDT' ? bookAmount : null,
    };
  }

  const walletAmount = entry.settlementAmount != null && entry.settlementAmount > 0
    ? entry.settlementAmount
    : (bookAmount ?? usdtAmount);

  return {
    walletCurrency,
    walletAmount,
    usdtAmount,
    bookCurrency,
    bookAmount,
  };
}

export function isPendingLedgerEntry(
  entry: FundEntityLedgerEntry,
  profileCurrency?: string,
): boolean {
  if (!profileCurrency || !FIAT_PROFILE_CURRENCIES.includes(profileCurrency as typeof FIAT_PROFILE_CURRENCIES[number])) {
    return false;
  }
  return (entry.customerCurrency ?? 'USDT') === 'USDT' && !entry.description?.includes('Converted');
}

export function canConvertLedgerEntry(
  entry: FundEntityLedgerEntry,
  profileCurrency?: string,
): boolean {
  return isPendingLedgerEntry(entry, profileCurrency);
}

export const EXCLUDE_PENDING_LEDGER_SQL = `
  AND NOT (
    COALESCE(l.customer_currency, 'USDT') = 'USDT'
    AND c.currency IN ('AED', 'IDR')
    AND COALESCE(l.description, '') NOT LIKE '%Converted%'
  )
`;

export function resolveEntryDisplayCurrency(entry: FundEntityLedgerEntry, profileCurrency?: string): string {
  if (isPendingLedgerEntry(entry, profileCurrency)) return 'USDT';
  return entry.customerCurrency && entry.customerCurrency !== 'USDT'
    ? entry.customerCurrency
    : (profileCurrency ?? 'USDT');
}

/** @deprecated use resolveEntryDisplayCurrency */
export function resolveEntryLedgerCurrency(entry: FundEntityLedgerEntry): string {
  return entry.customerCurrency || entry.settlementCurrency || 'USDT';
}

export function resolveEntityLedgerCurrency(
  entries: FundEntityLedgerEntry[],
  customerId: string,
  profileCurrency?: string,
): string {
  return profileCurrency && profileCurrency !== 'USDT' ? profileCurrency : 'USDT';
}

/** USDT cleared from open balance for a settlement payment. */
export function settlementToUsdtAmount(
  settlementAmount: number,
  settlementCurrency: string,
  usdtToCustomerRate: number,
  customerCurrency: string,
  _legacySettlementRate?: number,
): number {
  if (settlementAmount <= 0) return 0;
  if (settlementCurrency === 'USDT') return roundTo14(settlementAmount);
  if (settlementCurrency === customerCurrency) {
    return convertCustomerToUsdt(settlementAmount, usdtToCustomerRate);
  }
  // Legacy rows: settlement currency differed from customer currency
  const legacyRate = _legacySettlementRate ?? usdtToCustomerRate;
  if (!legacyRate || legacyRate <= 0) return 0;
  return convertCustomerToUsdt(settlementAmount, legacyRate);
}

/** Settlement cash amount from stored USDT ledger + rates (delete reversal). */
export function usdtToSettlementAmount(
  usdtAmount: number,
  settlementCurrency: string,
  usdtToCustomerRate: number,
  customerCurrency: string,
  settlementAmountStored?: number,
): number {
  if (settlementAmountStored != null && settlementAmountStored > 0) return settlementAmountStored;
  if (settlementCurrency === 'USDT') return usdtAmount;
  const rate = usdtToCustomerRate;
  if (!rate || rate <= 0) return usdtAmount;
  if (settlementCurrency === customerCurrency) return usdtAmount * rate;
  return usdtAmount * rate;
}

export function sumPendingUsdt(
  entries: FundEntityLedgerEntry[],
  customers: { id: string; currency?: string }[],
): number {
  let total = 0;
  for (const entry of entries) {
    const profile = customers.find(c => c.id === entry.customerId)?.currency;
    if (!isPendingLedgerEntry(entry, profile)) continue;
    total += getEntryUsdtAmount(entry);
  }
  return total;
}

export type EntityTally = {
  netUsdt: number;
  netCustomer: number | null;
  customerCurrency: string;
  receivable: boolean;
};

export function computeEntityTally(
  entries: FundEntityLedgerEntry[],
  customerId: string,
  profileCurrency?: string,
): EntityTally {
  const customerCurrency = profileCurrency && profileCurrency !== 'USDT' ? profileCurrency : 'USDT';
  let netUsdt = 0;
  let netCustomer = 0;
  let hasCustomerRate = customerCurrency === 'USDT';

  for (const entry of entries) {
    if (entry.customerId !== customerId) continue;
    if (isPendingLedgerEntry(entry, profileCurrency)) continue;

    const usdt = getEntryUsdtAmount(entry);
    const signed = entry.debit > 0 ? usdt : -usdt;
    netUsdt += signed;

    const custAmt = getEntryCustomerAmount(entry);
    if (custAmt != null) {
      hasCustomerRate = true;
      netCustomer += entry.debit > 0 ? custAmt : -custAmt;
    } else if (customerCurrency === 'USDT') {
      netCustomer += signed;
    }
  }

  return {
    netUsdt,
    netCustomer: hasCustomerRate ? netCustomer : null,
    customerCurrency,
    receivable: netUsdt > 0,
  };
}

export function enrichBalanceWithTally(
  balance: FundEntityBalance,
  entries: FundEntityLedgerEntry[],
  profileCurrency?: string,
): FundEntityBalance {
  const tally = computeEntityTally(entries, balance.customerId, profileCurrency);
  return {
    ...balance,
    netUsdt: tally.netUsdt,
    netCustomer: tally.netCustomer ?? undefined,
    customerCurrency: tally.customerCurrency,
  };
}

export function computeBalancesFromEntries(
  entries: FundEntityLedgerEntry[],
  customers: Customer[],
): FundEntityBalance[] {
  const byCustomer = new Map<string, FundEntityLedgerEntry[]>();
  for (const e of entries) {
    const list = byCustomer.get(e.customerId) ?? [];
    list.push(e);
    byCustomer.set(e.customerId, list);
  }

  const result: FundEntityBalance[] = [];
  for (const [customerId, customerEntries] of byCustomer) {
    const customer = customers.find(c => c.id === customerId);
    const profile = customer?.currency;
    const tally = computeEntityTally(customerEntries, customerId, profile);
    if (Math.abs(tally.netUsdt) < 0.0001) continue;

    const active = customerEntries.filter(e => !isPendingLedgerEntry(e, profile));
    const totalDebit = active.reduce((s, e) => s + (e.debit > 0 ? getEntryUsdtAmount(e) : 0), 0);
    const totalCredit = active.reduce((s, e) => s + (e.credit > 0 ? getEntryUsdtAmount(e) : 0), 0);

    result.push({
      customerId,
      customerName: customer?.name ?? customerId.slice(0, 8),
      totalDebit,
      totalCredit,
      net: tally.netUsdt,
      netUsdt: tally.netUsdt,
      netCustomer: tally.netCustomer ?? undefined,
      customerCurrency: tally.customerCurrency,
    });
  }

  return result.sort((a, b) => a.customerName.localeCompare(b.customerName));
}

/** USDT-weighted average of stored rates for a customer's profile currency. */
export function computeCustomerAverageUsdtRate(
  entries: FundEntityLedgerEntry[],
  customerId: string,
  profileCurrency?: string,
): { rate: number; sampleCount: number } | null {
  const currency = profileCurrency && profileCurrency !== 'USDT' ? profileCurrency : null;
  if (!currency) return null;

  let weightedSum = 0;
  let totalUsdt = 0;
  let sampleCount = 0;

  for (const entry of entries) {
    if (entry.customerId !== customerId) continue;
    if (isPendingLedgerEntry(entry, profileCurrency)) continue;
    if ((entry.customerCurrency ?? 'USDT') !== currency) continue;

    const rate = entry.customerCurrencyRate;
    if (!rate || rate <= 0) continue;

    const usdt = getEntryUsdtAmount(entry);
    if (usdt <= 0) continue;

    weightedSum += usdt * rate;
    totalUsdt += usdt;
    sampleCount += 1;
  }

  if (totalUsdt <= 0 || sampleCount === 0) return null;
  return { rate: roundTo14(weightedSum / totalUsdt), sampleCount };
}
