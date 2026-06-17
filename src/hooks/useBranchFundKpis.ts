import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useDateFilter } from '@/hooks/useDateFilter';
import { Branch, Transaction } from '@/types';

export function useBranchFundKpis(branch?: Branch) {
  const { transactions, ledgers } = useApp();
  const branchId = branch?.id;

  const branchTransactions = useMemo(() => {
    if (!branchId) return transactions;
    return transactions.filter((t: Transaction) => t.branchId === branchId);
  }, [transactions, branchId]);

  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    filteredData: filteredTransactions,
  } = useDateFilter(branchTransactions);

  const branchLedgers = useMemo(() => {
    return ledgers.filter(l => !l.branchId || l.branchId === branchId);
  }, [ledgers, branchId]);

  const ledgerBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    branchLedgers.forEach(l => {
      const toSum = filteredTransactions
        .filter((t: Transaction) => t.to === l.name)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const fromSum = filteredTransactions
        .filter((t: Transaction) => t.from === l.name)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const tagSum = filteredTransactions
        .filter((t: Transaction) => t.type === l.name && t.from !== l.name && t.to !== l.name)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      balances[l.id] = toSum - fromSum + tagSum;
    });
    return balances;
  }, [filteredTransactions, branchLedgers]);

  const availableBranchFund = useMemo(() => {
    if (!branch) return 0;
    let base = branch.openingBalance || 0;
    const bName = branch.name;
    const ledgersSet = new Set(branchLedgers.map(l => l.name));

    filteredTransactions.forEach((t: Transaction) => {
      if ((t.assetType || 'currency') !== 'currency' || t.status !== 'completed') return;
      const isLedgerTxn = ledgersSet.has(t.from) || ledgersSet.has(t.to) || ledgersSet.has(t.type);
      if (isLedgerTxn) return;
      if (t.to === bName) base += t.amount;
      if (t.from === bName) base -= t.amount;
    });
    return base;
  }, [branch, filteredTransactions, branchLedgers]);

  const branchGoldVolume = branch?.goldBalance ?? 0;

  const inverseImpactSum = useMemo(() => {
    return branchLedgers.reduce((acc, l) => {
      const bal = ledgerBalances[l.id] || 0;
      if (l.impact === 'positive') return acc - bal;
      if (l.impact === 'negative') return acc + bal;
      return acc;
    }, 0);
  }, [branchLedgers, ledgerBalances]);

  const totalCashInLocker = availableBranchFund - inverseImpactSum;

  const totalVolume = filteredTransactions.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  const transferCount = filteredTransactions.filter((t: Transaction) => t.type === 'transfer').length;
  const pendingCount = filteredTransactions.filter((t: Transaction) => t.status === 'pending').length;

  return {
    branch,
    filteredTransactions,
    branchLedgers,
    ledgerBalances,
    availableBranchFund,
    branchGoldVolume,
    totalCashInLocker,
    totalVolume,
    transferCount,
    pendingCount,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  };
}
