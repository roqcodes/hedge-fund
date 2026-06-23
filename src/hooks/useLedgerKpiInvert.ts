'use client';

import { useCallback, useMemo } from 'react';
import { applyLedgerKpiDisplay } from '@/lib/ledgerKpiDisplay';
import type { Ledger } from '@/types';

export function useLedgerKpiInvert(ledgers: Ledger[]) {
  const ledgerById = useMemo(() => new Map(ledgers.map(l => [l.id, l])), [ledgers]);

  const displayAmount = useCallback(
    (ledgerId: string, amount: number) =>
      applyLedgerKpiDisplay(amount, ledgerById.get(ledgerId)),
    [ledgerById],
  );

  return { displayAmount };
}
