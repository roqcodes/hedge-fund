'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import DateFilterBar from '@/components/ui/DateFilterBar';
import PhysicalReportsSection from './PhysicalReportsSection';
import CurrencyReportsSection from './CurrencyReportsSection';
import FundsReportsSection from './FundsReportsSection';
import {
  listEntityLedgerEntriesAction,
  getEntityBalancesAction,
} from '@/app/actions/fundActions';
import {
  getBranchUsdtBalanceAction,
  getUsdtIdrConversionsAction,
} from '@/app/actions/usdtActions';
import type { FundEntityLedgerEntry, FundEntityBalance, UsdtIdrConversion } from '@/types';
import { btnSecondary, formInput, pageHeader, pageSubtitle, pageTitle, tabBtn, tabBtnActive, tabsBar } from '@/lib/ui';

type ReportTab = 'physical' | 'currency' | 'funds';

const TAB_LABELS: Record<ReportTab, string> = {
  physical: 'Physical Deals',
  currency: 'Currency',
  funds: 'Transaction',
};

export default function FinancePage() {
  const {
    currentSlug,
    branches,
    physicalBuys,
    physicalSells,
    physicalBalances,
    usdtBuys,
    usdtSells,
    currencyRates,
    refetchData,
  } = useApp();

  const branch = useMemo(
    () => branches.find(b => b.slug === currentSlug) ?? branches[0] ?? null,
    [branches, currentSlug],
  );
  const branchId = branch?.id;
  const branchName = branch?.name ?? currentSlug;

  const showPhysical = isBranchPageEnabled('physical', branch?.hiddenPages);
  const showCurrency = isBranchPageEnabled('usdt', branch?.hiddenPages);
  const showFunds = isBranchPageEnabled('funds', branch?.hiddenPages);

  const enabledTabs = useMemo(() => {
    const tabs: ReportTab[] = [];
    if (showPhysical) tabs.push('physical');
    if (showCurrency) tabs.push('currency');
    if (showFunds) tabs.push('funds');
    return tabs;
  }, [showPhysical, showCurrency, showFunds]);

  const [activeTab, setActiveTab] = useState<ReportTab>('physical');

  useEffect(() => {
    if (enabledTabs.length > 0 && !enabledTabs.includes(activeTab)) {
      setActiveTab(enabledTabs[0]);
    }
  }, [enabledTabs, activeTab]);

  const [dateFilter, setDateFilter] = useState('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [fundEntries, setFundEntries] = useState<FundEntityLedgerEntry[]>([]);
  const [fundBalances, setFundBalances] = useState<FundEntityBalance[]>([]);
  const [usdtConversions, setUsdtConversions] = useState<UsdtIdrConversion[]>([]);
  const [cashBalances, setCashBalances] = useState<{ usdt: number; aed: number; idr: number } | null>(null);

  const range = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const scopedBuys = useMemo(
    () => (branchId ? physicalBuys.filter(b => b.branchId === branchId) : []),
    [physicalBuys, branchId],
  );
  const buyIds = useMemo(() => new Set(scopedBuys.map(b => b.id)), [scopedBuys]);
  const scopedSells = useMemo(
    () => physicalSells.filter(s => buyIds.has(s.buyId)),
    [physicalSells, buyIds],
  );
  const physicalBalance = useMemo(
    () => physicalBalances.find(b => b.branchId === branchId) ?? null,
    [physicalBalances, branchId],
  );
  const scopedUsdtBuys = useMemo(
    () => (branchId ? usdtBuys.filter(b => b.branchId === branchId) : []),
    [usdtBuys, branchId],
  );
  const scopedUsdtSells = useMemo(
    () => (branchId ? usdtSells.filter(s => s.branchId === branchId) : []),
    [usdtSells, branchId],
  );

  const fetchReportData = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tasks: Promise<void>[] = [];

      if (showFunds) {
        tasks.push(
          (async () => {
            const [entries, balances] = await Promise.all([
              listEntityLedgerEntriesAction({ branchId, limit: 5000 }),
              getEntityBalancesAction(branchId),
            ]);
            setFundEntries(entries);
            setFundBalances(balances);
          })(),
        );
      }

      if (showCurrency) {
        tasks.push(
          (async () => {
            const [bal, conversions] = await Promise.all([
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
            if (conversions.success && conversions.data) {
              setUsdtConversions(conversions.data);
            }
          })(),
        );
      }

      await Promise.all(tasks);
    } finally {
      setLoading(false);
    }
  }, [branchId, showFunds, showCurrency]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleRefresh = async () => {
    await refetchData();
    await fetchReportData();
  };

  const visibleSections = enabledTabs.length;

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] space-y-6">
      <header className={pageHeader}>
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Branch finance</p>
          <h1 className={pageTitle}>Finance Reports</h1>
          <p className={pageSubtitle}>
            Consolidated reports for {branchName}
            {visibleSections === 0 && ' — no report modules enabled for this branch'}
          </p>
        </div>
        <button type="button" className={btnSecondary} onClick={handleRefresh} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      {visibleSections > 0 && (
        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-surface sm:p-6">
          <div className="min-w-0">
            <label htmlFor="finance-search" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Search
            </label>
            <input
              id="finance-search"
              className={formInput}
              placeholder="Customer, txn ID, description, particulars…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <DateFilterBar
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />

          <div className={`${tabsBar} mb-0`} role="tablist" aria-label="Report modules">
            {enabledTabs.map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={activeTab === tab ? tabBtnActive : tabBtn}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      )}

      {!branchId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
          Select a branch to view finance reports.
        </div>
      )}

      {branchId && visibleSections === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
          No report modules enabled. Enable Physical Deals, Currency, or Transaction in branch settings.
        </div>
      )}

      {branchId && activeTab === 'physical' && showPhysical && (
        <PhysicalReportsSection
          buys={scopedBuys}
          sells={scopedSells}
          balance={physicalBalance}
          range={range}
          search={search}
          branchName={branchName}
          rates={currencyRates}
        />
      )}

      {branchId && activeTab === 'currency' && showCurrency && (
        <CurrencyReportsSection
          buys={scopedUsdtBuys}
          sells={scopedUsdtSells}
          conversions={usdtConversions}
          cashBalances={cashBalances}
          range={range}
          search={search}
          branchName={branchName}
        />
      )}

      {branchId && activeTab === 'funds' && showFunds && (
        <FundsReportsSection
          entries={fundEntries}
          balances={fundBalances}
          range={range}
          search={search}
          branchName={branchName}
        />
      )}
    </div>
  );
}
