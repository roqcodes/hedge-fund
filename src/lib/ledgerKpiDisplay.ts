import type { Ledger } from '@/types';

/** UI-only KPI sign flip — reads from ledger.kpiInvert, never affects calculations. */
export function applyLedgerKpiDisplay(amount: number, ledger: Pick<Ledger, 'kpiInvert'> | undefined): number {
  return ledger?.kpiInvert ? -amount : amount;
}

export function buildLedgerKpiInvertMap(ledgers: Ledger[]): Record<string, boolean> {
  return Object.fromEntries(ledgers.filter(l => l.kpiInvert).map(l => [l.id, true]));
}
