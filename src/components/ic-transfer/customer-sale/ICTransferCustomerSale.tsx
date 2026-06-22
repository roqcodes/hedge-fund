'use client';

import React, { useState } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { IC_BALANCE, IC_SALE_COLUMNS, IC_SALE_SUMMARY } from '@/lib/icTransfer/mockData';
import { IC_TRANSFER_LOCATIONS } from '@/lib/icTransfer/nav';
import {
  CityMatrix,
  DataTableSection,
  ExportButtons,
  FilterChips,
  PageHeader,
  PageShell,
  SummaryPanel,
  useICTransferFilters,
} from '../ui';

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

export default function ICTransferCustomerSale() {
  const [location, setLocation] = useState('ALL');
  const [search, setSearch] = useState('');
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
        title="Customer Sale"
        subtitle="Customer sale orders and settlement status"
      />

      <SummaryPanel
        matrix={
          <CityMatrix
            rows={[
              {
                label: 'Purchase',
                vol: IC_SALE_SUMMARY.purchase.vol,
                rates: IC_SALE_SUMMARY.purchase.rates,
                statuses: IC_SALE_SUMMARY.purchase.statuses,
              },
            ]}
          />
        }
        balances={[
          { label: 'Opening', value: fmt(IC_BALANCE), tone: 'blue' },
          { label: 'Closing', value: fmt(IC_BALANCE), tone: 'green' },
        ]}
      />

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <FilterChips
        options={[...IC_TRANSFER_LOCATIONS]}
        value={location}
        onChange={setLocation}
        trailing={<ExportButtons />}
      />

      <DataTableSection
        title="All Sales"
        columns={IC_SALE_COLUMNS}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sales..."
      />
    </PageShell>
  );
}
