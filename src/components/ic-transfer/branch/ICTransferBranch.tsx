'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { getCustomersBySlug } from '@/app/actions/customerActions';
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
import { getBranchOrderStatus, canBranchResubmitOrder } from '@/lib/icTransfer/orderStatus';
import { getDeliveredUnits } from '@/lib/icTransfer/saleUnits';
import { ConfirmModal } from '@/components/warehouse/shared';

const icCompactTd = (align: 'left' | 'center' | 'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const ORDER_COLUMNS = [
  'Date', 'ID', 'Customer', 'Address', 'Units', 'Total AED', 'Status', 'Actions'
];

// The end-customer chosen by the branch manager, falling back to the branch name for legacy orders.
const getOrderCustomer = (s: ICSale) => s.orderCustomerName || s.customerName;

type SortField = 'date' | 'customer' | 'units' | 'totalaed';
const SORTABLE_COLUMNS: Record<string, SortField> = {
  date: 'date',
  customer: 'customer',
  units: 'units',
  totalaed: 'totalaed',
};

export default function ICTransferBranch() {
  const { icSales, icWarehouses, currentSlug, branches, branchDeleteICSale, branchRequestCancelICSale } = useApp();
  const { selectedRegionIds } = useICTransferRegionFilter();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ICSale | null>(null);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [branchCustomers, setBranchCustomers] = useState<{ id: string; name: string }[]>([]);

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

  useEffect(() => {
    if (!currentSlug) return;
    getCustomersBySlug(currentSlug).then(res => {
      if (res.success && res.customers) {
        setBranchCustomers(res.customers.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    });
  }, [currentSlug]);

  // Orders belonging to this branch (customerName holds the owning branch name).
  const branchSales = useMemo(
    () => icSales.filter(s => s.customerName.toLowerCase() === branchName.toLowerCase()),
    [icSales, branchName],
  );

  // Customer filter options: branch customers plus any names already present on orders.
  const customerOptions = useMemo(() => {
    const names = new Set<string>();
    branchCustomers.forEach(c => names.add(c.name));
    branchSales.forEach(s => {
      if (s.orderCustomerName) names.add(s.orderCustomerName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [branchCustomers, branchSales]);

  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = branchSales.filter(s => {
      const orderCustomer = getOrderCustomer(s);
      const formattedId = getFormattedTxnId(s.id, 'sale', s, branches);
      if (q &&
          !formattedId.toLowerCase().includes(q) &&
          !s.id.toLowerCase().includes(q) &&
          !orderCustomer.toLowerCase().includes(q)) return false;
      if (customerFilter && orderCustomer !== customerFilter) return false;
      if (!matchesSelectedRegions(getWarehouseRegionId(s.warehouseId, icWarehouses), selectedRegionIds)) {
        return false;
      }
      return true;
    });

    const dir = sortOrder === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      switch (sortField) {
        case 'customer':
          return getOrderCustomer(a).localeCompare(getOrderCustomer(b)) * dir;
        case 'units':
          return (a.units - b.units) * dir;
        case 'totalaed':
          return ((a.aedAmount || 0) - (b.aedAmount || 0)) * dir;
        case 'date':
        default:
          return (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * dir;
      }
    });
  }, [branchSales, branches, search, customerFilter, selectedRegionIds, icWarehouses, sortField, sortOrder]);

  const handleHeaderClick = (column: string) => {
    const key = column.toLowerCase().replace(/\s/g, '');
    const field = SORTABLE_COLUMNS[key];
    if (!field) return;
    if (field === sortField) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<ICSale | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ICSale | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleEdit = (s: ICSale) => {
    if (!canBranchResubmitOrder(s.orderStatus)) return;
    setSelectedSale(s);
    setModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    await branchDeleteICSale(deleteTarget.id);
    setActionLoading(false);
    setDeleteTarget(null);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setActionLoading(true);
    await branchRequestCancelICSale(cancelTarget.id);
    setActionLoading(false);
    setCancelTarget(null);
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
    const totalOrders = branchSales.length;
    const totalUnits = branchSales.reduce((acc, s) => acc + s.units, 0);
    const totalValue = branchSales.reduce((acc, s) => acc + (s.aedAmount || 0), 0);
    const avgRate = totalUnits > 0 ? totalValue / totalUnits : 0;

    const pendingOrders = branchSales.filter(s => getBranchOrderStatus(s) === 'Pending').length;
    const partialOrders = branchSales.filter(s => getBranchOrderStatus(s) === 'Partial').length;
    const fulfilledOrders = branchSales.filter(s => getBranchOrderStatus(s) === 'Completed').length;

    const totalPartialUnitsDelivered = branchSales
      .filter(s => getBranchOrderStatus(s) === 'Partial' || !!s.derivedFromSaleId)
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
  }, [branchSales]);

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
          bottom={{ label: 'Completed Orders', value: `${stats.fulfilledOrders} Completed` }}
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
        onHeaderClick={handleHeaderClick}
        sortField={sortField}
        sortOrder={sortOrder}
        toolbar={
          <div className="relative">
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-accent focus:outline-none sm:w-56"
              aria-label="Filter by customer"
            >
              <option value="">All Customers</option>
              {customerOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        }
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
                  <p className="text-sm font-semibold text-slate-900">{getOrderCustomer(s)}</p>
                  <p className="mt-0.5 text-xs font-mono text-slate-500">{getFormattedTxnId(s.id, 'sale', s, branches)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{new Date(s.createdAt || '').toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-500">
                  <span>Units: <strong className="text-slate-700">{s.units.toLocaleString()}</strong></span>
                  <span>Total: <strong className="text-slate-700">{(s.aedAmount || 0).toLocaleString()} AED</strong></span>
                </div>
                <div className="text-xs text-slate-500 truncate">{s.address || 'No address'}</div>
                <div onClick={e => e.stopPropagation()}>
                  <BranchOrderWorkflowActions
                    sale={s}
                    inline
                    onView={handleView}
                    onResubmit={handleEdit}
                    onDelete={setDeleteTarget}
                    onCancelRequest={setCancelTarget}
                  />
                </div>
                <div className={portalMobileCardFooterClass}>
                  <div className="min-w-0">
                    <BranchOrderStatusCell sale={s} />
                  </div>
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
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{getOrderCustomer(s)}</span></td>
            <td className={icCompactTd('left')}>{s.address || '—'}</td>
            <td className={icCompactTd('right')}>{s.units.toLocaleString()}</td>
            <td className={icCompactTd('right')}><span className="font-bold text-slate-900">{(s.aedAmount || 0).toLocaleString()}</span></td>
            <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
              <BranchOrderStatusCell sale={s} />
            </td>
            <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
              <BranchOrderWorkflowActions
                sale={s}
                inline
                onView={handleView}
                onResubmit={handleEdit}
                onDelete={setDeleteTarget}
                onCancelRequest={setCancelTarget}
              />
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
        workflowVariant="branch"
        onEdit={
          selectedSale && canBranchResubmitOrder(selectedSale.orderStatus)
            ? handleEdit
            : undefined
        }
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Order"
        message="Are you sure you want to delete this pending order? This action cannot be undone."
        confirmLabel="Delete Order"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={!!cancelTarget}
        title="Request Cancellation"
        message="Request cancellation of this accepted order? An admin will review and confirm the cancellation."
        confirmLabel="Request Cancellation"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTarget(null)}
      />
    </PageShell>
  );
}
