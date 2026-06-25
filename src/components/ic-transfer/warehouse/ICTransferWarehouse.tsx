'use client';

import React, { useMemo } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useApp } from '@/context/AppContext';
import {
  AllocationTable,
  ExportButtons,
  FilterChips,
  MatrixTable,
  PageHeader,
  PageShell,
  SummaryPanel,
  useICTransferFilters,
} from '../ui';

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;



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

  const { columns, rows, cities } = useMemo(() => {
    const warehouseCols = icWarehouses.length > 0 ? icWarehouses : [];
    const colLabels = warehouseCols.length > 0 ? warehouseCols.map(w => w.name) : ['Total'];
    const numCols = Math.max(warehouseCols.length, 1);

    const initArray = () => new Array(numCols).fill(0);

    const purchaseUnit = initArray();
    const receivedUnit = initArray();
    const clearedUnit = initArray();
    const processingUnit = initArray();
    const serviceCharge = initArray();

    icPurchases.forEach(p => {
      const idx = warehouseCols.findIndex(w => w.id === p.warehouseId);
      const colIdx = idx >= 0 ? idx : 0;
      purchaseUnit[colIdx] += p.units;
    });

    icWarehouseTransactions.forEach(t => {
      const idx = warehouseCols.findIndex(w => w.id === t.warehouseId);
      const colIdx = idx >= 0 ? idx : 0;
      if (t.transactionType === 'receive') receivedUnit[colIdx] += t.units;
      if (t.transactionType === 'clear') clearedUnit[colIdx] += t.units;
      if (t.transactionType === 'processing') processingUnit[colIdx] += t.units;
    });

    const pending = purchaseUnit.map((p, i) => p - receivedUnit[i]);
    const balanceUnit = receivedUnit.map((r, i) => r - clearedUnit[i] - processingUnit[i]);
    const due = serviceCharge.map(s => s); // proxy

    const matrixRows = [
      { label: 'Purchase Unit', values: purchaseUnit },
      { label: 'Received Unit', values: receivedUnit },
      { label: 'Cleared Unit', values: clearedUnit },
      { label: 'Processing Unit', values: processingUnit },
      { label: 'Pending', values: pending },
      { label: 'Balance Unit', values: balanceUnit },
      { label: 'Service Charge', values: serviceCharge },
      { label: 'Due', values: due },
    ];

    const cityRows = icRegions.map(r => ({
      label: r.name,
      values: [0, 0] as [number, number],
    }));

    return { columns: colLabels, rows: matrixRows, cities: cityRows };
  }, [icPurchases, icWarehouseTransactions, icRegions, icWarehouses]);

  return (
    <PageShell>
      <PageHeader
        title="Warehouse"
        subtitle="Weekly warehouse volumes and allocation"
      />

      <SummaryPanel
        matrix={
          <MatrixTable
            columns={columns}
            rows={rows}
          />
        }
        balances={[
          { label: 'Opening', value: fmt(0), tone: 'blue' },
          { label: 'Closing', value: fmt(0), tone: 'green' },
        ]}
        sidebarExtra={
          <AllocationTable
            columns={[
              { key: 'sale', label: 'Sale · 0' },
              { key: 'sc', label: 'SC · 0' },
            ]}
            rows={cities.length ? cities : [{ label: 'None', values: [0, 0] }]}
            footer={{ label: 'Total', values: [0, 0] }}
          />
        }
      />

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <FilterChips options={['All Warehouses']} value="All Warehouses" onChange={() => {}} />
    </PageShell>
  );
}
