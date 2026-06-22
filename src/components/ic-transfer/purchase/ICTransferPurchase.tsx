'use client';

import React, { useState } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { IC_BALANCE, IC_CITY_SUMMARY, IC_PURCHASE_COLUMNS } from '@/lib/icTransfer/mockData';
import { IC_TRANSFER_CITIES } from '@/lib/icTransfer/nav';
import {
  AddButton,
  CityMatrix,
  DataTableSection,
  ExportButtons,
  FilterChips,
  PageHeader,
  PageShell,
  SummaryPanel,
  useICTransferFilters,
} from '../ui';
import AddPurchaseModal from './AddPurchaseModal';

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

export default function ICTransferPurchase() {
  const [cityFilter, setCityFilter] = useState('Delhi');
  const [modalOpen, setModalOpen] = useState(false);
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
        title="Purchase"
        subtitle="Track purchase orders across cities"
        actions={<AddButton label="Add Purchase" onClick={() => setModalOpen(true)} />}
      />

      <SummaryPanel
        matrix={
          <CityMatrix
            rows={[
              { label: 'Purchase', vol: IC_CITY_SUMMARY.purchase.vol, rates: IC_CITY_SUMMARY.purchase.rates },
              { label: 'Due', vol: IC_CITY_SUMMARY.due.vol, rates: IC_CITY_SUMMARY.due.rates },
            ]}
          />
        }
        balances={[
          { label: 'Opening', value: fmt(IC_BALANCE), tone: 'blue' },
          { label: 'Paid', value: fmt(IC_BALANCE), tone: 'green' },
          { label: 'Closing', value: fmt(IC_BALANCE), tone: 'orange' },
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
        options={[...IC_TRANSFER_CITIES]}
        value={cityFilter}
        onChange={setCityFilter}
        trailing={<ExportButtons />}
      />

      <DataTableSection
        title="All Purchases"
        columns={IC_PURCHASE_COLUMNS}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search purchases..."
      />

      <AddPurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </PageShell>
  );
}
