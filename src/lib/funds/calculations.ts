import type { FundEntityLedgerEntry, FundEntityBalance } from '@/types';

export function calculateEntityNet(entries: FundEntityLedgerEntry[]): number {
  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
  return totalDebit - totalCredit;
}

export function calculateEntityBalance(
  entries: FundEntityLedgerEntry[],
  customerId: string,
): number {
  const relevant = entries.filter(e => e.customerId === customerId);
  return calculateEntityNet(relevant);
}

export function aggregateEntityBalances(
  entries: FundEntityLedgerEntry[],
): Record<string, { debit: number; credit: number; net: number }> {
  const map: Record<string, { debit: number; credit: number; net: number }> = {};

  for (const entry of entries) {
    if (!map[entry.customerId]) {
      map[entry.customerId] = { debit: 0, credit: 0, net: 0 };
    }
    map[entry.customerId].debit += entry.debit;
    map[entry.customerId].credit += entry.credit;
    map[entry.customerId].net += entry.debit - entry.credit;
  }

  return map;
}

export function getKpiTotals(
  balances: FundEntityBalance[],
): { totalReceivable: number; totalPayable: number; netPosition: number } {
  let totalReceivable = 0;
  let totalPayable = 0;

  for (const b of balances) {
    if (b.net > 0) totalReceivable += b.net;
    else totalPayable += Math.abs(b.net);
  }

  return {
    totalReceivable,
    totalPayable,
    netPosition: totalReceivable - totalPayable,
  };
}
