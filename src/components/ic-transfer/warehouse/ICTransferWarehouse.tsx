'use client';

import React, { useMemo } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useApp } from '@/context/AppContext';
import {
  DataTableSection,
  ExportButtons,
  FilterChips,
  PageHeader,
  PageShell,
  useICTransferFilters,
  SectionCard,
} from '../ui';

import KPICard from '@/components/ui/KPICard';
import { kpiGrid } from '@/lib/ui';

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString('en-US');

export default function ICTransferWarehouse() {
  const { icPurchases, icWarehouseTransactions, icRegions, icWarehouses } = useApp();
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();
  const [location, setLocation] = React.useState('All');

  const selectedRegionId = useMemo(() => {
    if (location === 'All') return '';
    return icRegions.find(r => r.name === location)?.id || '';
  }, [location, icRegions]);

  const { columns, rows, cities, kpis } = useMemo(() => {
    const metricsCols = [
      'Purchase Unit', 'Received Unit', 'Cleared Unit', 'Processing Unit',
      'Pending', 'Balance Unit', 'Service Charge', 'Due'
    ];

    const filteredWarehouses = selectedRegionId 
      ? icWarehouses.filter(w => w.regionId === selectedRegionId)
      : icWarehouses;
    const warehouseIds = new Set(filteredWarehouses.map(w => w.id));

    let totalVolume = 0;
    let numOrders = 0;
    let totalRate = 0;

    icPurchases.forEach(p => {
      if (p.warehouseId && warehouseIds.has(p.warehouseId)) {
        totalVolume += p.units;
        totalRate += p.unitRate;
        numOrders++;
      }
    });

    const avgRate = numOrders > 0 ? totalRate / numOrders : 0;

    let receivedUnitTotal = 0;
    icWarehouseTransactions.forEach(t => {
      if (warehouseIds.has(t.warehouseId) && t.transactionType === 'receive') {
        receivedUnitTotal += t.units;
      }
    });

    const pendingOrders = totalVolume - receivedUnitTotal;
    const fulfilledOrders = receivedUnitTotal;

    const mRows = filteredWarehouses.map(w => {
      let purchaseUnit = 0;
      let receivedUnit = 0;
      let clearedUnit = 0;
      let processingUnit = 0;
      let serviceCharge = 0;

      icPurchases.filter(p => p.warehouseId === w.id).forEach(p => purchaseUnit += p.units);
      icWarehouseTransactions.filter(t => t.warehouseId === w.id).forEach(t => {
        if (t.transactionType === 'receive') receivedUnit += t.units;
        if (t.transactionType === 'clear') clearedUnit += t.units;
        if (t.transactionType === 'processing') processingUnit += t.units;
      });

      const pending = purchaseUnit - receivedUnit;
      const balanceUnit = receivedUnit - clearedUnit - processingUnit;
      const due = serviceCharge; // proxy

      return {
        label: w.name,
        metrics: [
          { label: 'Purchase Unit', value: purchaseUnit },
          { label: 'Received Unit', value: receivedUnit },
          { label: 'Cleared Unit', value: clearedUnit },
          { label: 'Processing Unit', value: processingUnit },
          { label: 'Pending', value: pending },
          { label: 'Balance Unit', value: balanceUnit },
          { label: 'Service Charge', value: serviceCharge },
          { label: 'Due', value: due },
        ]
      };
    });

    const cityRows = icRegions.map(r => ({
      label: r.name,
      values: [0, 0] as [number, number],
    }));

    return { 
      columns: metricsCols, 
      rows: mRows, 
      cities: cityRows,
      kpis: {
        numOrders,
        totalVolume,
        avgRate,
        pendingOrders,
        fulfilledOrders
      }
    };
  }, [icPurchases, icWarehouseTransactions, icRegions, icWarehouses, selectedRegionId]);

  return (
    <PageShell>
      <PageHeader
        title="Warehouse"
        subtitle="Weekly warehouse volumes and allocation"
      />

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <div className="mb-4">
        <FilterChips
          options={['All', ...icRegions.map(r => r.name)]}
          value={location}
          onChange={setLocation}
        />
      </div>

      <div className={`${kpiGrid} grid-cols-2 lg:grid-cols-4 mb-6`}>
        <KPICard 
          label="Number of Orders" 
          value={fmtNum(kpis.numOrders)} 
          color="var(--info)" 
          bgColor="var(--info-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          } 
        />
        <KPICard 
          label="Total Volume" 
          value={fmtNum(kpis.totalVolume)} 
          color="var(--profit)" 
          bgColor="var(--profit-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20 7h-9M14 3v8M3 17h18M3 21h18" />
            </svg>
          } 
        />
        <KPICard 
          label="Average Rate" 
          value={fmt(kpis.avgRate)} 
          color="var(--warning)" 
          bgColor="var(--warning-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          } 
        />
        <KPICard 
          label="Pending / Fulfilled" 
          value={`${fmtNum(kpis.pendingOrders)} / ${fmtNum(kpis.fulfilledOrders)}`} 
          color="var(--loss)" 
          bgColor="var(--loss-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          } 
        />
      </div>

      <div className="mb-5">
        <DataTableSection
          title="Warehouse Matrix"
          columns={['Warehouse', ...columns]}
          data={rows.map(r => [
            r.label,
            ...r.metrics.map(m => typeof m.value === 'number' ? m.value.toLocaleString() : m.value)
          ])}
        />
      </div>

      <div className="mb-5">
        <DataTableSection
          title="Allocation Table"
          columns={['Region', 'Sale · 0', 'SC · 0']}
          data={cities.length ? cities.map(c => [c.label, ...c.values]) : [['None', 0, 0]]}
        />
      </div>

    </PageShell>
  );
}
