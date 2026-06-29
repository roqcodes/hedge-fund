'use client';

import React, { useState } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useApp } from '@/context/AppContext';
import {
  DataTableSection,
  FilterChips,
  PageHeader,
  PageShell,
  useICTransferFilters,
  AddButton,
} from '../ui';
import AddICBranchOrderModal from './AddICBranchOrderModal';
import ViewSaleModal from '../sales/ViewSaleModal';
import { ICSale } from '@/types';
import PhysicalSplitKPICard from '@/components/physical/PhysicalSplitKPICard';
import { kpiGrid } from '@/lib/ui';

const icCompactTd = (align: 'left' | 'center' | 'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const ORDER_COLUMNS = [
  'Date', 'ID', 'Customer', 'Address', 'Units', 'Total AED', 'Status', 'Actions'
];

export default function ICTransferBranch() {
  const { icSales, icRegions, icWarehouses, currentSlug, branches } = useApp();
  const [location, setLocation] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ICSale | null>(null);
  const [search, setSearch] = useState('');

  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  const branchName = branches.find(b => b.slug === currentSlug)?.name || currentSlug || 'Branch Customer';

  const getWarehouseName = (id?: string) => icWarehouses.find(w => w.id === id)?.name || 'None';
  const getRegionNameByWarehouseId = (id?: string) => {
    const warehouse = icWarehouses.find(w => w.id === id);
    return warehouse ? icRegions.find(r => r.id === warehouse.regionId)?.name || 'Unknown' : 'Unknown';
  };

  // Filter sales to only include those where customerName equals our branchName
  const filteredSales = icSales.filter(s => {
    const isOurOrder = s.customerName.toLowerCase() === branchName.toLowerCase();
    if (!isOurOrder) return false;

    if (search && !s.id.toLowerCase().includes(search.toLowerCase()) && !s.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (location !== 'All' && getRegionNameByWarehouseId(s.warehouseId) !== location) return false;
    return true;
  });

  const handleEdit = (s: ICSale) => {
    setSelectedSale(s);
    setModalOpen(true);
  };

  const handleView = (s: ICSale) => {
    setSelectedSale(s);
    setViewModalOpen(true);
  };

  // Compute stats for current branch orders
  const stats = React.useMemo(() => {
    const branchSales = icSales.filter(s => s.customerName.toLowerCase() === branchName.toLowerCase());
    const totalOrders = branchSales.length;
    const totalUnits = branchSales.reduce((acc, s) => acc + s.units, 0);
    const totalValue = branchSales.reduce((acc, s) => acc + (s.aedAmount || 0), 0);
    const avgRate = totalUnits > 0 ? totalValue / totalUnits : 0;

    const pendingOrders = branchSales.filter(s => s.deliveryStatus === 'Pending' || !s.deliveryStatus).length;
    const partialOrders = branchSales.filter(s => s.deliveryStatus === 'Partial').length;
    const fulfilledOrders = branchSales.filter(s => s.deliveryStatus === 'Completed').length;

    const totalPartialAmountReceived = branchSales
      .filter(s => s.deliveryStatus === 'Partial')
      .reduce((acc, s) => acc + (s.collectedAmount || 0), 0);

    return {
      totalOrders,
      totalUnits,
      totalValue,
      avgRate,
      pendingOrders,
      partialOrders,
      fulfilledOrders,
      totalPartialAmountReceived
    };
  }, [icSales, branchName]);

  return (
    <PageShell>
      <PageHeader
        title="IC Transfer (Branch)"
        subtitle="Submit and track transfer orders from your branch"
        actions={
          <div className="flex items-center gap-3">
            <AddButton label="Create Order" onClick={() => setModalOpen(true)} />
          </div>
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

      <FilterChips
        options={['All', ...icRegions.map(r => r.name)]}
        value={location}
        onChange={setLocation}
      />

      <div className={kpiGrid}>
        <PhysicalSplitKPICard
          top={{ label: 'Total Orders', value: `${stats.totalOrders} Orders` }}
          bottom={{ label: 'Total Value', value: fmt(stats.totalValue) }}
          color="var(--info)"
          bgColor="var(--info-light)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          }
        />
        <PhysicalSplitKPICard
          top={{ label: 'Total Units', value: `${stats.totalUnits.toLocaleString()} Units` }}
          bottom={{ label: 'Average Rate', value: fmt(stats.avgRate) }}
          color="var(--profit)"
          bgColor="var(--profit-light)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        />
        <PhysicalSplitKPICard
          top={{ label: 'Active Orders', value: `${stats.pendingOrders + stats.partialOrders} Active` }}
          bottom={{ label: 'Paid Orders', value: `${stats.fulfilledOrders} Paid` }}
          color="var(--pending)"
          bgColor="var(--pending-light)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <PhysicalSplitKPICard
          top={{ label: 'Partial Orders', value: `${stats.partialOrders} Partial` }}
          bottom={{ label: 'Collected Amount', value: fmt(stats.totalPartialAmountReceived) }}
          color="var(--accent)"
          bgColor="var(--accent-light)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
      </div>

      <DataTableSection
        title="All Orders"
        columns={ORDER_COLUMNS}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search orders..."
      >
        {filteredSales.map((s) => (
          <tr key={s.id} onClick={() => handleView(s)} className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
            <td className={icCompactTd('left')}>{new Date(s.createdAt || '').toLocaleDateString()}</td>
            <td className={icCompactTd('left')}><span className="font-mono text-slate-500">{s.id.substring(0, 8)}</span></td>
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{s.customerName}</span></td>
            <td className={icCompactTd('left')}>{s.address || 'None'}</td>
            <td className={icCompactTd('right')}>{s.units.toLocaleString()}</td>
            <td className={icCompactTd('right')}><span className="font-bold text-slate-900">{(s.aedAmount || 0).toLocaleString()}</span></td>
            <td className={icCompactTd('center')}>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                {s.paymentStatus || 'pending'}
              </span>
            </td>
            <td className={icCompactTd('center')}>
              <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleView(s)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                  title="More Info"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(s)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTableSection>

      <AddICBranchOrderModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedSale(null); }}
        initialData={selectedSale || undefined}
      />
      <ViewSaleModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
      />
    </PageShell>
  );
}
