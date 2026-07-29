'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import {
  listEntityLedgerEntriesAction,
  getEntityBalancesAction,
} from '@/app/actions/fundActions';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import FinanceReportLayout from './FinanceReportLayout';
import ReportTabbedView from './ReportTabbedView';
import { getFundReportDefs } from '@/lib/finance/fundReports';
import type { Customer, FundEntityLedgerEntry, FundEntityBalance } from '@/types';

export default function TransactionReportsPage() {
  const { currentSlug, branches, refetchData } = useApp();

  const branch = useMemo(
    () => branches.find(b => b.slug === currentSlug) ?? branches[0] ?? null,
    [branches, currentSlug],
  );
  const branchId = branch?.id;
  const branchName = branch?.name ?? currentSlug ?? '';
  const basePath = currentSlug ? `/${currentSlug}` : '';

  const [dateFilter, setDateFilter] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fundEntries, setFundEntries] = useState<FundEntityLedgerEntry[]>([]);
  const [fundBalances, setFundBalances] = useState<FundEntityBalance[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const range = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const fetchData = useCallback(async () => {
    if (!branchId || !currentSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [entries, balances, customerRes] = await Promise.all([
        listEntityLedgerEntriesAction({ branchId, limit: 5000 }),
        getEntityBalancesAction(branchId),
        getCustomersBySlug(currentSlug),
      ]);
      setFundEntries(entries);
      setFundBalances(balances);
      if (customerRes.success && customerRes.customers) {
        setCustomers(customerRes.customers);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, currentSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await refetchData();
    await fetchData();
  };

  const reportDefs = useMemo(
    () =>
      getFundReportDefs({
        entries: fundEntries,
        balances: fundBalances,
        customers,
        range,
      }),
    [fundEntries, fundBalances, customers, range],
  );

  const enabled = isBranchPageEnabled('funds', branch?.hiddenPages);

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        Transaction module not enabled for this branch.
      </div>
    );
  }

  return (
    <FinanceReportLayout
      title="Transaction Reports"
      subtitle={`Financial statements and entity ledger reports for ${branchName}`}
      backHref={`${basePath}/finance`}
      dateFilter={dateFilter}
      setDateFilter={setDateFilter}
      customStartDate={customStartDate}
      setCustomStartDate={setCustomStartDate}
      customEndDate={customEndDate}
      setCustomEndDate={setCustomEndDate}
      search={search}
      setSearch={setSearch}
      onRefresh={handleRefresh}
      loading={loading}
    >
      <ReportTabbedView defs={reportDefs} branchName={branchName} globalSearch={search} />
    </FinanceReportLayout>
  );
}
