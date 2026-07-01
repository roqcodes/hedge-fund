'use client';

import React, { useMemo, useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import { portalKpiGrid } from '@/lib/icTransfer/layoutConstants';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import { ChartCard, PageShell } from '../ui';
import { useApp } from '@/context/AppContext';
import { resolveDateFilterRange, isDateInRange } from '@/lib/dateFilterRange';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { useICTransferRegionFilter } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import { getWarehouseRegionId, matchesSelectedRegions } from '@/lib/icTransfer/regionFilter';
import { formatAEDStr } from '@/data/mockData';
import Card from '@/components/ui/Card';

function TrendChart({ data }: { data: { label: string; purchases: number; sales: number }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.purchases, d.sales]), 1);

  return (
    <ChartCard 
      title="Volume Trends (AED)"
      legend={
        <div className="flex gap-4 text-xs font-semibold">
           <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-accent"></span>Purchases</span>
           <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-400"></span>Sales</span>
        </div>
      }
    >
      <div className="flex h-48 items-end gap-1.5 sm:gap-3 px-2 mt-4 pb-6 border-b border-slate-100">
        {data.length === 0 ? (
          <div className="w-full flex items-center justify-center text-sm text-slate-400 h-full pb-6">No data available in this period</div>
        ) : data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center h-full relative group">
             <div className="w-full flex justify-center items-end gap-[1px] sm:gap-1 h-full min-h-[1px]">
               <div 
                 className="w-1/2 max-w-[24px] bg-accent rounded-t-[3px] transition-all duration-300 group-hover:opacity-80 relative" 
                 style={{ height: `${Math.max((d.purchases / maxVal) * 100, 1)}%` }} 
                 title={`Purchases: ${formatAEDStr(d.purchases)}`}
               />
               <div 
                 className="w-1/2 max-w-[24px] bg-emerald-400 rounded-t-[3px] transition-all duration-300 group-hover:opacity-80 relative" 
                 style={{ height: `${Math.max((d.sales / maxVal) * 100, 1)}%` }} 
                 title={`Sales: ${formatAEDStr(d.sales)}`}
               />
             </div>
             <span className="text-[10px] font-medium text-slate-400 absolute -bottom-5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[120%] text-center">
               {d.label}
             </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function RankingList({ title, data, colorClass = "bg-accent" }: { title: string, data: { name: string; volume: number; percentage: number }[], colorClass?: string }) {
  return (
    <Card title={title} className="h-full">
      <div className="flex flex-col gap-4 mt-2">
         {data.length === 0 ? (
           <div className="text-sm text-slate-400 text-center py-4">No data available</div>
         ) : data.slice(0,6).map((d, i) => (
           <div key={i} className="flex flex-col gap-1.5">
             <div className="flex justify-between items-end text-xs font-bold text-slate-700">
                <span className="truncate pr-2">{d.name}</span>
                <span className="font-mono text-slate-900">{formatAEDStr(d.volume)}</span>
             </div>
             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.max(d.percentage, 1)}%` }} />
             </div>
           </div>
         ))}
      </div>
    </Card>
  );
}

export default function ICTransferDashboard() {
  const { icPurchases, icSales, icSuppliers, icRegions, icWarehouses } = useApp();
  const { selectedRegionIds } = useICTransferRegionFilter();

  const [dateFilter, setDateFilter] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const range = useMemo(() => resolveDateFilterRange(dateFilter, customStartDate, customEndDate), [dateFilter, customStartDate, customEndDate]);

  const { filteredPurchases, filteredSales } = useMemo(() => {
    const isFiltered = (dateStr: string) => !range.startDate && !range.endDate ? true : isDateInRange(dateStr, range);
    return {
      filteredPurchases: icPurchases.filter(
        p =>
          isFiltered(p.createdAt || '') &&
          matchesSelectedRegions(p.locationId, selectedRegionIds),
      ),
      filteredSales: icSales.filter(
        s =>
          isFiltered(s.createdAt || '') &&
          matchesSelectedRegions(getWarehouseRegionId(s.warehouseId, icWarehouses), selectedRegionIds),
      ),
    };
  }, [icPurchases, icSales, icWarehouses, range, selectedRegionIds]);

  const { kpis, trendData, supplierData, regionData } = useMemo(() => {
    let totalPurchaseVol = 0;
    let totalSalesVol = 0;
    let pendingPayables = 0;
    let pendingReceivables = 0;
    let totalCommission = 0;

    const trendMap: Record<string, { purchases: number, sales: number }> = {};
    const supplierMap: Record<string, number> = {};
    const regionMap: Record<string, number> = {};

    // Grouping by day if the range is short (<= 31 days), otherwise by month
    let groupByMonth = false;
    if (range.startDate && range.endDate) {
      const diffTime = Math.abs(new Date(range.endDate).getTime() - new Date(range.startDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 35) groupByMonth = true;
    } else if (dateFilter === 'all-time' || dateFilter === 'last-3-months' || dateFilter === 'this-year') {
      groupByMonth = true;
    }

    const getGroupKey = (dateStr: string) => {
      const d = new Date(dateStr);
      if (groupByMonth) {
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    filteredPurchases.forEach(p => {
      const aed = p.aedTotal || 0;
      totalPurchaseVol += aed;
      if (p.paymentStatus === 'pending') pendingPayables += aed;
      
      const supplier = icSuppliers.find(s => s.id === p.supplierId);
      if (supplier?.commission) {
         totalCommission += (p.units * supplier.commission);
      }

      const key = getGroupKey(p.createdAt || '');
      if (!trendMap[key]) trendMap[key] = { purchases: 0, sales: 0 };
      trendMap[key].purchases += aed;

      const supName = supplier?.name || 'Unknown Supplier';
      supplierMap[supName] = (supplierMap[supName] || 0) + aed;

      const locName = icRegions.find(r => r.id === p.locationId)?.name || 'Unknown Location';
      regionMap[locName] = (regionMap[locName] || 0) + aed;
    });

    filteredSales.forEach(s => {
      const aed = s.aedAmount || 0;
      totalSalesVol += aed;
      if (s.paymentStatus === 'pending') pendingReceivables += aed;

      const key = getGroupKey(s.createdAt || '');
      if (!trendMap[key]) trendMap[key] = { purchases: 0, sales: 0 };
      trendMap[key].sales += aed;

      const warehouse = icWarehouses.find(w => w.id === s.warehouseId);
      const locName = warehouse ? icRegions.find(r => r.id === warehouse.regionId)?.name || 'Unknown Location' : 'Unknown Location';
      regionMap[locName] = (regionMap[locName] || 0) + aed;
    });

    // Format Trend Data
    const sortedKeys = Object.keys(trendMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const trendDataArray = sortedKeys.map(k => ({
      label: k,
      purchases: trendMap[k].purchases,
      sales: trendMap[k].sales
    }));

    // Format Supplier Data
    const maxSupplierVol = Math.max(...Object.values(supplierMap), 1);
    const supplierDataArray = Object.entries(supplierMap)
      .map(([name, volume]) => ({ name, volume, percentage: (volume / maxSupplierVol) * 100 }))
      .sort((a, b) => b.volume - a.volume);

    // Format Region Data
    const maxRegionVol = Math.max(...Object.values(regionMap), 1);
    const regionDataArray = Object.entries(regionMap)
      .map(([name, volume]) => ({ name, volume, percentage: (volume / maxRegionVol) * 100 }))
      .sort((a, b) => b.volume - a.volume);

    return {
      kpis: { totalPurchaseVol, totalSalesVol, pendingPayables, pendingReceivables, totalCommission, txnCount: filteredPurchases.length + filteredSales.length },
      trendData: trendDataArray,
      supplierData: supplierDataArray,
      regionData: regionDataArray
    };
  }, [filteredPurchases, filteredSales, icSuppliers, icRegions, range, dateFilter]);

  return (
    <PageShell>
      <div className={pageHeader}>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={pageTitle}>Transfer Dashboard</h2>
            <p className={pageSubtitle}>Analytics and financial tracking for IC Transfers</p>
          </div>
        </div>
      </div>

      <ICTransferDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <div className={portalKpiGrid}>
        <KPICard
          label="Purchase Volume (AED)"
          value={formatAEDStr(kpis.totalPurchaseVol)}
          subValue={`${filteredPurchases.length} transactions`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Sales Volume (AED)"
          value={formatAEDStr(kpis.totalSalesVol)}
          subValue={`${filteredSales.length} transactions`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--success)"
          bgColor="var(--success-light)"
        />
        <KPICard
          label="Pending Payables"
          value={formatAEDStr(kpis.pendingPayables)}
          subValue="Owed to suppliers"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 3h15v13H1zM16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          }
          color="var(--warning)"
          bgColor="var(--warning-light)"
        />
        <KPICard
          label="Pending Receivables"
          value={formatAEDStr(kpis.pendingReceivables)}
          subValue="Expected from sales"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
            </svg>
          }
          color="var(--purple)"
          bgColor="var(--purple-light)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        <div className="lg:col-span-8">
          <TrendChart data={trendData} />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-6">
          <RankingList title="Top Suppliers (By Volume)" data={supplierData} colorClass="bg-accent" />
          <RankingList title="Warehouse Activity (By Volume)" data={regionData} colorClass="bg-emerald-400" />
        </div>
      </div>
    </PageShell>
  );
}
