import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useDateFilter } from '@/hooks/useDateFilter';
import { Branch, Transaction } from '@/types';
import { filterBranchLedgers, calculateLedgerBalances, calculateCashInLocker, calculateAvailableBranchFund } from '@/lib/ledgers';

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
    return filterBranchLedgers(ledgers, branchId);
  }, [ledgers, branchId]);

  const ledgerBalances = useMemo(() => {
    return calculateLedgerBalances(branchLedgers, filteredTransactions);
  }, [filteredTransactions, branchLedgers]);

  const availableBranchFund = useMemo(() => {
    if (!branch) return 0;
    return calculateAvailableBranchFund(branch.name, branch.openingBalance || 0, filteredTransactions);
  }, [branch, filteredTransactions]);

  const branchGoldVolume = branch?.goldBalance ?? 0;

  const totalCashInLocker = useMemo(() => {
    return calculateCashInLocker(availableBranchFund, branchLedgers, ledgerBalances);
  }, [availableBranchFund, branchLedgers, ledgerBalances]);

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
