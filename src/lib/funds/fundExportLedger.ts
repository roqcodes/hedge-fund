import { parseCalendarDate } from '@/lib/businessTime';
import { isDateInRange } from '@/lib/dateFilterRange';
import type { DateFilterRange } from '@/lib/dateFilterRange';
import {
  getEntryUsdtAmount,
  getEntryWalletDisplay,
  isPendingLedgerEntry,
} from '@/lib/fundLedgerCurrency';
import type { Customer, FundEntityLedgerEntry } from '@/types';

const ANONYMOUS_PARTY = 'Entity';
const BRANCH_PARTY = 'Branch';

export type FundExportLedgerRow = {
  date: string;
  txnType: string;
  counterparty: string;
  description: string;
  walletAmount: number | null;
  walletCurrency: string;
  debit: number;
  credit: number;
  balance: number;
  createdAt: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function anonymizePartyName(
  customerId: string,
  selectedCustomerId: string,
  name: string,
): string {
  if (!customerId || customerId === selectedCustomerId) return name;
  return ANONYMOUS_PARTY;
}

export function anonymizeText(
  text: string,
  selectedCustomerId: string,
  customers: Customer[],
): string {
  let result = text;
  for (const customer of customers) {
    if (customer.id === selectedCustomerId || !customer.name.trim()) continue;
    result = result.replace(new RegExp(escapeRegExp(customer.name), 'gi'), ANONYMOUS_PARTY);
  }
  return result;
}

function entryTypeLabel(entry: FundEntityLedgerEntry, profileCurrency?: string): string {
  if (isPendingLedgerEntry(entry, profileCurrency)) return 'Pending';
  if (entry.referenceType === 'entity_transfer') {
    return entry.credit > 0 ? 'Transfer out' : 'Transfer in';
  }
  if (entry.referenceType === 'settlement') return 'Settlement';
  if (entry.referenceType === 'physical_buy') return 'Physical buy';
  if (entry.referenceType === 'physical_sell') return 'Physical sell';
  if (entry.referenceType === 'usdt_buy') return 'USDT buy';
  if (entry.referenceType === 'usdt_sell') return 'USDT sell';
  return entry.debit > 0 ? 'Receivable' : 'Payable';
}

function resolveCounterparty(
  entry: FundEntityLedgerEntry,
  selectedCustomerId: string,
  customers: Customer[],
  transferLegsByRef: Map<string, FundEntityLedgerEntry[]>,
): string {
  if (entry.referenceType === 'entity_transfer' && entry.referenceId) {
    const legs = transferLegsByRef.get(entry.referenceId) ?? [];
    const otherLeg = legs.find(leg => leg.id !== entry.id);
    if (otherLeg) {
      return anonymizePartyName(
        otherLeg.customerId,
        selectedCustomerId,
        customers.find(c => c.id === otherLeg.customerId)?.name ?? ANONYMOUS_PARTY,
      );
    }
    return ANONYMOUS_PARTY;
  }
  if (entry.referenceType === 'settlement') return BRANCH_PARTY;
  return BRANCH_PARTY;
}

export function buildFundExportLedger(params: {
  entries: FundEntityLedgerEntry[];
  customers: Customer[];
  selectedCustomerId: string;
  dateRange: DateFilterRange;
}): FundExportLedgerRow[] {
  const { entries, customers, selectedCustomerId, dateRange } = params;
  const profileCurrency = customers.find(c => c.id === selectedCustomerId)?.currency;

  const transferLegsByRef = new Map<string, FundEntityLedgerEntry[]>();
  for (const entry of entries) {
    if (entry.referenceType !== 'entity_transfer' || !entry.referenceId) continue;
    const list = transferLegsByRef.get(entry.referenceId) ?? [];
    list.push(entry);
    transferLegsByRef.set(entry.referenceId, list);
  }

  const scoped = entries
    .filter(entry => entry.customerId === selectedCustomerId)
    .filter(entry => !isPendingLedgerEntry(entry, profileCurrency))
    .filter(entry => isDateInRange(parseCalendarDate(entry.entryDate), dateRange))
    .map(entry => {
      const wallet = getEntryWalletDisplay(entry);
      const usdt = getEntryUsdtAmount(entry);
      const isDebit = entry.debit > 0;
      const rawDescription = entry.referenceType === 'entity_transfer'
        ? entry.description.replace(/\s*\((out|in)\)\s*$/i, '').trim()
        : entry.description;

      return {
        date: parseCalendarDate(entry.entryDate),
        txnType: entryTypeLabel(entry, profileCurrency),
        counterparty: resolveCounterparty(entry, selectedCustomerId, customers, transferLegsByRef),
        description: anonymizeText(rawDescription, selectedCustomerId, customers),
        walletAmount: wallet.walletAmount > 0 ? wallet.walletAmount : null,
        walletCurrency: wallet.walletCurrency,
        debit: isDebit ? usdt : 0,
        credit: !isDebit ? usdt : 0,
        balance: 0,
        createdAt: entry.createdAt || entry.entryDate,
      };
    });

  scoped.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.createdAt.localeCompare(b.createdAt);
  });

  let runningBalance = 0;
  return scoped.map(row => {
    runningBalance += row.debit - row.credit;
    return { ...row, balance: runningBalance };
  });
}

export function formatFundExportDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');
}
