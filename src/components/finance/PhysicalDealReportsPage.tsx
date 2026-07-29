'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import { listEntityLedgerEntriesAction } from '@/app/actions/fundActions';
import FinanceReportLayout from './FinanceReportLayout';
import ReportTabbedView from './ReportTabbedView';
import { getPhysicalDealReportDefs } from '@/lib/finance/physicalDealReports';
import type { FundEntityLedgerEntry } from '@/types';

export default function PhysicalDealReportsPage() {
  const {
    currentSlug,
    branches,
    physicalBuys,
    physicalSells,
    physicalBulkSells,
    refetchData,
  } = useApp();

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
  const [ledgerEntries, setLedgerEntries] = useState<FundEntityLedgerEntry[]>([]);

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
  const scopedBulkSells = useMemo(
    () => (branchId ? physicalBulkSells.filter(b => b.branchId === branchId) : []),
    [physicalBulkSells, branchId],
  );

  const fetchLedger = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const entries = await listEntityLedgerEntriesAction({ branchId, limit: 5000 });
      setLedgerEntries(entries);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleRefresh = async () => {
    await refetchData();
    await fetchLedger();
  };

  const reportDefs = useMemo(
    () =>
      getPhysicalDealReportDefs({
        buys: scopedBuys,
        sells: scopedSells,
        bulkSells: scopedBulkSells,
        ledgerEntries,
        branchName,
        range,
      }),
    [scopedBuys, scopedSells, scopedBulkSells, ledgerEntries, branchName, range],
  );

  const enabled = isBranchPageEnabled('physical', branch?.hiddenPages);

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
        Physical Deals module not enabled for this branch.
      </div>
    );
  }

  return (
    <FinanceReportLayout
      title="Physical Deals Reports"
      subtitle={`Transaction & metal accounting reports for ${branchName}`}
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
