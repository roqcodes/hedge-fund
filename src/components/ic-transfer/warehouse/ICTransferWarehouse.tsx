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

import { PhysicalSingleKPICard } from '@/components/physical/PhysicalSplitKPICard';
import { kpiGrid } from '@/lib/ui';

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;export default function ICTransferWarehouse() {
  const { icPurchases, icWarehouseTransactions, icRegions, icWarehouses } = useApp();
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  const { columns, rows, cities } = useMemo(() => {
    const metricsCols = [
      'Purchase Unit', 'Received Unit', 'Cleared Unit', 'Processing Unit',
      'Pending', 'Balance Unit', 'Service Charge', 'Due'
    ];

    const mRows = icWarehouses.map(w => {
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

    return { columns: metricsCols, rows: mRows, cities: cityRows };
  }, [icPurchases, icWarehouseTransactions, icRegions, icWarehouses]);

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

      <div className={kpiGrid}>
        <PhysicalSingleKPICard label="Opening Balance" value={fmt(0)} color="var(--info)" bgColor="var(--info-light)" icon={<></>} />
        <PhysicalSingleKPICard label="Closing Balance" value={fmt(0)} color="var(--success)" bgColor="var(--success-light)" icon={<></>} />
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
