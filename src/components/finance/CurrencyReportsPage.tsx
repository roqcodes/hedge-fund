'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import {
  getBranchUsdtBalanceAction,
  getUsdtIdrConversionsAction,
} from '@/app/actions/usdtActions';
import FinanceReportLayout from './FinanceReportLayout';
import CurrencyReportsSection from './CurrencyReportsSection';
import type { UsdtIdrConversion } from '@/types';

export default function CurrencyReportsPage() {
  const { currentSlug, branches, usdtBuys, usdtSells, refetchData } = useApp();

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
  const [conversions, setConversions] = useState<UsdtIdrConversion[]>([]);
  const [cashBalances, setCashBalances] = useState<{ usdt: number; aed: number; idr: number } | null>(null);

  const range = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const scopedBuys = useMemo(
    () => (branchId ? usdtBuys.filter(b => b.branchId === branchId) : []),
    [usdtBuys, branchId],
  );
  const scopedSells = useMemo(
    () => (branchId ? usdtSells.filter(s => s.branchId === branchId) : []),
    [usdtSells, branchId],
  );

  const fetchData = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [bal, conv] = await Promise.all([
        getBranchUsdtBalanceAction(branchId),
        getUsdtIdrConversionsAction(branchId),
      ]);
      if (bal) {
        setCashBalances({
          usdt: bal.availableFund,
          aed: bal.aedBalance,
          idr: bal.idrBalance,
        });
      }
      if (conv.success && conv.data) setConversions(conv.data);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await refetchData();
    await fetchData();
  };

  const enabled = isBranchPageEnabled('usdt', branch?.hiddenPages);

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        Currency module not enabled for this branch.
      </div>
    );
  }

  return (
    <FinanceReportLayout
      title="Currency Reports"
      subtitle={`USDT and cash flow reports for ${branchName}`}
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
      <CurrencyReportsSection
        buys={scopedBuys}
        sells={scopedSells}
        conversions={conversions}
        cashBalances={cashBalances}
        range={range}
        search={search}
        branchName={branchName}
      />
    </FinanceReportLayout>
  );
}
