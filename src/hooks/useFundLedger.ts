'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  listEntityLedgerEntriesAction,
  createFundLedgerEntryAction,
  createEntityTransferAction,
  deleteFundLedgerEntryAction,
  convertFundLedgerEntryAction,
} from '@/app/actions/fundActions';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { computeBalancesFromEntries } from '@/lib/fundLedgerCurrency';
import { getKpiTotals } from '@/lib/funds/calculations';
import type {
  FundEntityLedgerEntry,
  FundEntityBalance,
  FundEntryDirection,
  FundReferenceType,
  Customer,
} from '@/types';
import type { AmountInputSide, EntityTransferInputSide } from '@/lib/fundLedgerAmounts';

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
  postJournalEntry: (params: {
    customerId: string;
    direction: FundEntryDirection;
    amount: number;
    description: string;
    entryDate?: string;
    customerCurrency?: string;
    customerCurrencyRate?: number;
    inputSide: AmountInputSide;
    referenceType: FundReferenceType;
  }) => Promise<{ success: boolean; error?: string; entryId?: string }>;
  postEntityTransfer: (params: {
    fromCustomerId: string;
    toCustomerId: string;
    inputSide: EntityTransferInputSide;
    inputAmount: number;
    fromCustomerCurrencyRate?: number;
    toCustomerCurrencyRate?: number;
    description?: string;
    entryDate?: string;
  }) => Promise<{ success: boolean; error?: string; transferId?: string }>;
  /** @deprecated use postJournalEntry with referenceType manual */
  createEntry: FundLedgerActions['postJournalEntry'];
  /** @deprecated use postJournalEntry with referenceType settlement */
  recordPayment: FundLedgerActions['postJournalEntry'];
  deleteEntry: (entryId: string) => Promise<{ success: boolean; error?: string }>;
  convertEntry: (entryId: string, rate: number) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export type UseFundLedgerReturn = FundLedgerState & FundLedgerActions;

export function useFundLedger(): UseFundLedgerReturn {
  const { currentSlug, branches, showToast } = useApp();
  const branch = branches.find(b => b.slug === currentSlug);

  const [entries, setEntries] = useState<FundEntityLedgerEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const branchId = branch?.id;

  const fetchEntries = useCallback(async () => {
    if (!branchId) return;
    const result = await listEntityLedgerEntriesAction({ branchId, limit: 5000 });
    setEntries(result);
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
    await fetchEntries();
    setLoading(false);
  }, [branchId, fetchEntries]);

  const balances = useMemo(
    () => computeBalancesFromEntries(entries, customers),
    [entries, customers],
  );

  const selectedCustomerBalance = useMemo(
    () => (selectedCustomerId ? balances.find(b => b.customerId === selectedCustomerId) ?? null : null),
    [balances, selectedCustomerId],
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (branchId) {
      refreshLedger();
    } else {
      setLoading(false);
    }
  }, [branchId, refreshLedger]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchEntries();
    }
  }, [selectedCustomerId, fetchEntries]);

  const kpiTotals = useMemo(() => getKpiTotals(balances), [balances]);

  const selectCustomer = useCallback((customerId: string | null) => {
    setSelectedCustomerId(customerId);
  }, []);

  const postJournalEntry = useCallback(
    async (params: {
      customerId: string;
      direction: FundEntryDirection;
      amount: number;
      description: string;
      entryDate?: string;
      customerCurrency?: string;
      customerCurrencyRate?: number;
      inputSide: AmountInputSide;
      referenceType: FundReferenceType;
    }) => {
      if (!branchId) return { success: false, error: 'No branch selected' };

      const result = await createFundLedgerEntryAction({
        branchId,
        customerId: params.customerId,
        direction: params.direction,
        amount: params.amount,
        description: params.description,
        entryDate: params.entryDate,
        referenceType: params.referenceType,
        customerCurrency: params.customerCurrency,
        customerCurrencyRate: params.customerCurrencyRate,
        inputSide: params.inputSide,
      });

      if (result.success) {
        await refreshLedger();
        await fetchCustomers();
        const label = params.referenceType === 'settlement' ? 'Settlement posted' : 'Journal entry posted';
        showToast(label, 'success');
        return { success: true, entryId: result.entryId };
      }

      return { success: false, error: result.error };
    },
    [branchId, refreshLedger, fetchCustomers, showToast],
  );

  const createEntry = useCallback(
    (params: Omit<Parameters<typeof postJournalEntry>[0], 'referenceType'> & { referenceType?: FundReferenceType }) =>
      postJournalEntry({ ...params, referenceType: params.referenceType ?? 'manual' }),
    [postJournalEntry],
  );

  const recordPayment = useCallback(
    (params: Omit<Parameters<typeof postJournalEntry>[0], 'referenceType'> & { referenceType?: FundReferenceType }) =>
      postJournalEntry({ ...params, referenceType: params.referenceType ?? 'settlement' }),
    [postJournalEntry],
  );

  const postEntityTransfer = useCallback(
    async (params: {
      fromCustomerId: string;
      toCustomerId: string;
      inputSide: EntityTransferInputSide;
      inputAmount: number;
      fromCustomerCurrencyRate?: number;
      toCustomerCurrencyRate?: number;
      description?: string;
      entryDate?: string;
    }) => {
      if (!branchId) return { success: false, error: 'No branch selected' };
      const result = await createEntityTransferAction({ branchId, ...params });
      if (result.success) {
        await refreshLedger();
        showToast('Entity transfer posted', 'success');
        return { success: true, transferId: result.transferId };
      }
      return { success: false, error: result.error };
    },
    [branchId, refreshLedger, showToast],
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const result = await deleteFundLedgerEntryAction(entryId);
      if (result.success) {
        await refreshLedger();
        showToast('Entry deleted', 'success');
        return { success: true };
      }
      showToast(result.error ?? 'Failed to delete entry', 'error');
      return { success: false, error: result.error };
    },
    [refreshLedger, showToast],
  );

  const convertEntry = useCallback(
    async (entryId: string, rate: number) => {
      const result = await convertFundLedgerEntryAction({ entryId, rate });
      if (result.success) {
        await refreshLedger();
        showToast('Entry rated in customer currency', 'success');
        return { success: true };
      }
      return { success: false, error: result.error };
    },
    [refreshLedger, showToast],
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
    postJournalEntry,
    postEntityTransfer,
    createEntry,
    recordPayment,
    deleteEntry,
    convertEntry,
    refresh: useCallback(async () => {
      await Promise.all([refreshLedger(), fetchCustomers()]);
    }, [refreshLedger, fetchCustomers]),
  };
}
