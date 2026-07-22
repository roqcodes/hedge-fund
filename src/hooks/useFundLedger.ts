'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  listEntityLedgerEntriesAction,
  getEntityBalancesAction,
  getEntityBalanceAction,
  createFundLedgerEntryAction,
  deleteFundLedgerEntryAction,
} from '@/app/actions/fundActions';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { getKpiTotals } from '@/lib/funds/calculations';
import type {
  FundEntityLedgerEntry,
  FundEntityBalance,
  FundEntryDirection,
  Customer,
} from '@/types';

export interface FundLedgerState {
  entries: FundEntityLedgerEntry[];
  balances: FundEntityBalance[];
  customers: Customer[];
  selectedCustomerId: string | null;
  selectedCustomerBalance: FundEntityBalance | null;
  totalReceivable: number;
  totalPayable: number;
  netPosition: number;
  loading: boolean;
}

export interface FundLedgerActions {
  selectCustomer: (customerId: string | null) => void;
  createEntry: (params: {
    customerId: string;
    direction: FundEntryDirection;
    amount: number;
    description: string;
    entryDate?: string;
    customerCurrency?: string;
    customerCurrencyRate?: number;
    settlementCurrency?: string;
  }) => Promise<{ success: boolean; error?: string; entryId?: string }>;
  recordPayment: (params: {
    customerId: string;
    direction: FundEntryDirection;
    amount: number;
    description: string;
    entryDate?: string;
    customerCurrency?: string;
    customerCurrencyRate?: number;
    settlementCurrency?: string;
  }) => Promise<{ success: boolean; error?: string; entryId?: string }>;
  deleteEntry: (entryId: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export type UseFundLedgerReturn = FundLedgerState & FundLedgerActions;

export function useFundLedger(): UseFundLedgerReturn {
  const { currentSlug, branches, showToast } = useApp();
  const branch = branches.find(b => b.slug === currentSlug);

  const [entries, setEntries] = useState<FundEntityLedgerEntry[]>([]);
  const [balances, setBalances] = useState<FundEntityBalance[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<FundEntityBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const branchId = branch?.id;

  const fetchEntries = useCallback(async () => {
    if (!branchId) return;
    const result = await listEntityLedgerEntriesAction({
      branchId,
      customerId: selectedCustomerId ?? undefined,
      limit: 1000,
    });
    setEntries(result);
  }, [branchId, selectedCustomerId]);

  const fetchBalances = useCallback(async () => {
    if (!branchId) return;
    const result = await getEntityBalancesAction(branchId);
    setBalances(result);
  }, [branchId]);

  const fetchCustomers = useCallback(async () => {
    if (!currentSlug) return;
    const result = await getCustomersBySlug(currentSlug);
    if (result.success) {
      setCustomers(result.customers ?? []);
    }
  }, [currentSlug]);

  const refreshLedger = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    await Promise.all([fetchEntries(), fetchBalances()]);
    setLoading(false);
  }, [branchId, fetchEntries, fetchBalances]);

  // Fetch customers as soon as currentSlug is available (independent of branch)
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch ledger data when branch (and thus branchId) is available
  useEffect(() => {
    if (branchId) {
      refreshLedger();
    } else {
      setLoading(false);
    }
  }, [branchId, refreshLedger]);

  // When selectedCustomerId changes, re-fetch entries and fetch their balance
  useEffect(() => {
    if (!branchId || !selectedCustomerId) {
      setSelectedCustomerBalance(null);
      return;
    }
    getEntityBalanceAction(branchId, selectedCustomerId).then(setSelectedCustomerBalance);
    fetchEntries();
  }, [branchId, selectedCustomerId, fetchEntries]);

  const kpiTotals = useMemo(() => getKpiTotals(balances), [balances]);

  const selectCustomer = useCallback((customerId: string | null) => {
    setSelectedCustomerId(customerId);
  }, []);

  const createEntry = useCallback(
    async (params: {
      customerId: string;
      direction: FundEntryDirection;
      amount: number;
      description: string;
      entryDate?: string;
      customerCurrency?: string;
      customerCurrencyRate?: number;
      settlementCurrency?: string;
    }) => {
      if (!branchId) return { success: false, error: 'No branch selected' };

      const result = await createFundLedgerEntryAction({
        branchId,
        customerId: params.customerId,
        direction: params.direction,
        amount: params.amount,
        description: params.description,
        entryDate: params.entryDate,
        customerCurrency: params.customerCurrency,
        customerCurrencyRate: params.customerCurrencyRate,
        settlementCurrency: params.settlementCurrency,
      });

      if (result.success) {
        await refreshLedger();
        await fetchCustomers();
        showToast('Entry created', 'success');
        return { success: true, entryId: result.entryId };
      }

      return { success: false, error: result.error };
    },
    [branchId, refreshLedger, fetchCustomers, showToast],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const result = await deleteFundLedgerEntryAction(entryId);
      if (result.success) {
        await refreshLedger();
        showToast('Entry deleted', 'success');
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [refreshLedger, showToast],
  );

  const recordPayment = useCallback(
    async (params: {
      customerId: string;
      direction: FundEntryDirection;
      amount: number;
      description: string;
      entryDate?: string;
      customerCurrency?: string;
      customerCurrencyRate?: number;
      settlementCurrency?: string;
    }) => {
      if (!branchId) return { success: false, error: 'No branch selected' };

      const result = await createFundLedgerEntryAction({
        branchId,
        customerId: params.customerId,
        direction: params.direction,
        amount: params.amount,
        description: params.description || `Payment ${params.direction === 'credit' ? 'received from' : 'made to'} entity`,
        entryDate: params.entryDate,
        referenceType: 'settlement',
        customerCurrency: params.customerCurrency,
        customerCurrencyRate: params.customerCurrencyRate,
        settlementCurrency: params.settlementCurrency,
      });

      if (result.success) {
        await refreshLedger();
        await fetchCustomers();
        showToast('Payment recorded', 'success');
        return { success: true, entryId: result.entryId };
      }

      return { success: false, error: result.error };
    },
    [branchId, refreshLedger, fetchCustomers, showToast],
  );

  return {
    entries,
    balances,
    customers,
    selectedCustomerId,
    selectedCustomerBalance,
    totalReceivable: kpiTotals.totalReceivable,
    totalPayable: kpiTotals.totalPayable,
    netPosition: kpiTotals.netPosition,
    loading,
    selectCustomer,
    createEntry,
    recordPayment,
    deleteEntry,
    refresh: useCallback(async () => {
      await Promise.all([refreshLedger(), fetchCustomers()]);
    }, [refreshLedger, fetchCustomers]),
  };
}
