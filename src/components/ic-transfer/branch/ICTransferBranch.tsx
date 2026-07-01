'use client';

import React, { useState } from 'react';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { useICTransferRegionFilter } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import { getWarehouseRegionId, matchesSelectedRegions } from '@/lib/icTransfer/regionFilter';
import { useApp } from '@/context/AppContext';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import {
  DataTableSection,
  PageHeader,
  PageShell,
  useICTransferFilters,
  AddButton,
} from '../ui';
import AddICBranchOrderModal from './AddICBranchOrderModal';
import ViewSaleModal from '../sales/ViewSaleModal';
import { ICSale } from '@/types';
import PhysicalSplitKPICard from '@/components/physical/PhysicalSplitKPICard';
import { portalKpiGrid, portalMobileCardFooterClass } from '@/lib/icTransfer/layoutConstants';
import { BranchOrderStatusCell, BranchOrderWorkflowActions } from '../shared/BranchOrderStatusCell';
import { getCustomerOrderStatus, canBranchResubmitOrder } from '@/lib/icTransfer/orderStatus';
import { getDeliveredUnits } from '@/lib/icTransfer/saleUnits';

const icCompactTd = (align: 'left' | 'center' | 'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const ORDER_COLUMNS = [
  'Date', 'ID', 'Customer', 'Address', 'Units', 'Total AED', 'Status', 'Actions'
];

export default function ICTransferBranch() {
  const { icSales, icWarehouses, currentSlug, branches } = useApp();
  const { selectedRegionIds } = useICTransferRegionFilter();
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

  // Filter sales to only include those where customerName equals our branchName
  const filteredSales = icSales.filter(s => {
    const isOurOrder = s.customerName.toLowerCase() === branchName.toLowerCase();
    if (!isOurOrder) return false;

    const formattedId = getFormattedTxnId(s.id, 'sale', s, branches);
    if (search && 
        !formattedId.toLowerCase().includes(search.toLowerCase()) && 
        !s.id.toLowerCase().includes(search.toLowerCase()) && 
        !s.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (!matchesSelectedRegions(getWarehouseRegionId(s.warehouseId, icWarehouses), selectedRegionIds)) {
      return false;
    }
    return true;
  });

  const handleEdit = (s: ICSale) => {
    if (!canBranchResubmitOrder(s.orderStatus)) return;
    setSelectedSale(s);
    setModalOpen(true);
  };

  const handleCreateOrder = () => {
    setSelectedSale(null);
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

    const pendingOrders = branchSales.filter(s => getCustomerOrderStatus(s) === 'Pending').length;
    const partialOrders = branchSales.filter(s => getCustomerOrderStatus(s) === 'Partial').length;
    const fulfilledOrders = branchSales.filter(s => getCustomerOrderStatus(s) === 'Paid').length;

    const totalPartialUnitsDelivered = branchSales
      .filter(s => getCustomerOrderStatus(s) === 'Partial' || !!s.derivedFromSaleId)
      .reduce((acc, s) => acc + getDeliveredUnits(s.units, s.collectedUnits, s.orderStatus), 0);

    return {
      totalOrders,
      totalUnits,
      totalValue,
      avgRate,
      pendingOrders,
      partialOrders,
      fulfilledOrders,
      totalPartialUnitsDelivered
    };
  }, [icSales, branchName]);

  return (
    <PageShell>
      <PageHeader
        title="IC Transfer (Branch)"
        subtitle="Submit and track transfer orders from your branch"
        actions={
          <div className="flex items-center gap-3">
            <AddButton label="Create Order" onClick={handleCreateOrder} />
          </div>
        }
      />

      <ICTransferDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <div className={portalKpiGrid}>
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
          bottom={{ label: 'Delivered Units', value: `${stats.totalPartialUnitsDelivered.toLocaleString()} Units` }}
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
        mobileView={
          filteredSales.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No orders found.</div>
          ) : (
            filteredSales.map(s => (
              <div
                key={s.id}
                onClick={() => handleView(s)}
                className="flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{s.customerName}</p>
                  <p className="mt-0.5 text-xs font-mono text-slate-500">{getFormattedTxnId(s.id, 'sale', s, branches)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{new Date(s.createdAt || '').toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-500">
                  <span>Units: <strong className="text-slate-700">{s.units.toLocaleString()}</strong></span>
                  <span>Total: <strong className="text-slate-700">{(s.aedAmount || 0).toLocaleString()} AED</strong></span>
                </div>
                <div className="text-xs text-slate-500 truncate">{s.address || 'No address'}</div>
                <div onClick={e => e.stopPropagation()}>
                  <BranchOrderWorkflowActions sale={s} onResubmit={handleEdit} />
                </div>
                <div className={portalMobileCardFooterClass}>
                  <div className="min-w-0">
                    <BranchOrderStatusCell sale={s} />
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleView(s); }}
                    className="shrink-0 text-xs font-bold text-accent hover:text-accent/80"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )
        }
      >
        {filteredSales.map((s) => (
          <tr key={s.id} onClick={() => handleView(s)} className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
            <td className={icCompactTd('left')}>{new Date(s.createdAt || '').toLocaleDateString()}</td>
            <td className={icCompactTd('left')}><span className="font-mono text-slate-500">{getFormattedTxnId(s.id, 'sale', s, branches)}</span></td>
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{s.customerName}</span></td>
            <td className={icCompactTd('left')}>{s.address || 'None'}</td>
            <td className={icCompactTd('right')}>{s.units.toLocaleString()}</td>
            <td className={icCompactTd('right')}><span className="font-bold text-slate-900">{(s.aedAmount || 0).toLocaleString()}</span></td>
            <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
              <BranchOrderStatusCell sale={s} />
            </td>
            <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center gap-1.5">
                <BranchOrderWorkflowActions sale={s} onResubmit={handleEdit} />
                <div className="flex items-center justify-center gap-1.5">
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
                </div>
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
        onEdit={
          selectedSale && canBranchResubmitOrder(selectedSale.orderStatus)
            ? handleEdit
            : undefined
        }
      />
    </PageShell>
  );
}
