'use client';

import React from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { IC_BALANCE, IC_WAREHOUSE_ROWS, IC_WAREHOUSE_WEEKS } from '@/lib/icTransfer/mockData';
import { IC_TRANSFER_CITIES } from '@/lib/icTransfer/nav';
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
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  return (
    <PageShell>
      <PageHeader
        title="Warehouse"
        subtitle="Weekly warehouse volumes and allocation"
      />

      <SummaryPanel
        matrix={
          <MatrixTable
            columns={[...IC_WAREHOUSE_WEEKS]}
            rows={IC_WAREHOUSE_ROWS.map(r => ({ label: r.label, values: r.values }))}
          />
        }
        balances={[
          { label: 'Opening', value: fmt(IC_BALANCE), tone: 'blue' },
          { label: 'Closing', value: fmt(IC_BALANCE), tone: 'green' },
        ]}
        sidebarExtra={
          <AllocationTable
            columns={[
              { key: 'sale', label: 'Sale · 65' },
              { key: 'sc', label: 'SC · 10k' },
            ]}
            rows={IC_TRANSFER_CITIES.map(city => ({
              label: city,
              values: [100, 100],
            }))}
            footer={{ label: 'Total', values: [400, 400] }}
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

      <FilterChips options={['All Warehouses']} value="All Warehouses" onChange={() => {}} trailing={<ExportButtons />} />
    </PageShell>
  );
}
