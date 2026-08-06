'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { useICTransferRegionFilter } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import { matchesSaleRegionFilter } from '@/lib/icTransfer/regionFilter';
import { useApp } from '@/context/AppContext';
import { isCustomerRole } from '@/lib/rbac';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import {
  DataTableSection,
  PageHeader,
  PageShell,
  useICTransferFilters,
  AddButton,
} from '../ui';
import AddICBranchOrderModal from './AddICBranchOrderModal';
import SubCustomerModal from './SubCustomerModal';
import ViewSaleModal from '../sales/ViewSaleModal';
import { ICSale } from '@/types';
import PhysicalSplitKPICard from '@/components/physical/PhysicalSplitKPICard';
import { portalKpiGrid, portalMobileCardFooterClass } from '@/lib/icTransfer/layoutConstants';
import { BranchOrderStatusCell, BranchOrderWorkflowActions } from '../shared/BranchOrderStatusCell';
import BranchHandledOrderActions from '../shared/BranchHandledOrderActions';
import BranchCustomerOrderReviewActions from '../shared/BranchCustomerOrderReviewActions';
import { getBranchOrderStatus } from '@/lib/icTransfer/orderStatus';
import { isBranchHandledSale } from '@/lib/icTransfer/fulfillmentHandler';
import { getDeliveredUnits } from '@/lib/icTransfer/saleUnits';
import { ConfirmModal } from '@/components/warehouse/shared';
import { customerOwnsSale, getBranchPortalOrderCustomerName, saleBelongsToBranchPortal, saleMatchesDateFilter } from '@/lib/icTransfer/branchOrderOwnership';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import { canEditOrder } from '@/lib/icTransfer/customerOrderReview';
import { getCustomerPortalSubCustomerName, getCustomerPortalDisplayName } from '@/lib/icTransfer/customerPortalScope';
import { getBranchPortalDisplayName } from '@/lib/icTransfer/branchPortalScope';
import { getAdminAssignedBranchRateGroup } from '@/lib/icTransfer/branchRateScope';
import { formatBranchProfit, resolveSaleBranchProfit } from '@/lib/icTransfer/branchSaleProfit';

const icCompactTd = (align: 'left' | 'center' | 'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const ORDER_COLUMNS_CUSTOMER = [
  'Date', 'ID', 'Sub Customer', 'Address', 'Units', 'Total AED', 'Status', 'Actions',
] as const;

const ORDER_COLUMNS_BASE = [
  'Date', 'ID', 'Customer', 'Address', 'Units', 'Total AED', 'Status', 'Actions',
] as const;

const ORDER_COLUMNS_WITH_PROFIT = [
  'Date', 'ID', 'Customer', 'Address', 'Units', 'Total AED', 'Profit', 'Status', 'Actions',
] as const;

type SortField = 'date' | 'customer' | 'units' | 'totalaed';
const SORTABLE_COLUMNS: Record<string, SortField> = {
  date: 'date',
  customer: 'customer',
  units: 'units',
  totalaed: 'totalaed',
};

export default function ICTransferBranch() {
  const {
    icSales,
    icWarehouses,
    icRateGroups,
    currentSlug,
    branches,
    branchDeleteICSale,
    branchRequestCancelICSale,
    user,
    icTransferSettings,
    showToast,
  } = useApp();
  const isCustomer = isCustomerRole(user?.role);
  const customerId = user?.customerId;
  const salesPaused = !icTransferSettings.salesEnabled;
  const { selectedRegionIds } = useICTransferRegionFilter();
  const [modalOpen, setModalOpen] = useState(false);
  const [subCustomerModalOpen, setSubCustomerModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ICSale | null>(null);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [subCustomerFilter, setSubCustomerFilter] = useState('');
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

  const currentBranch = branches.find(b => b.slug === currentSlug) ?? branches.find(b => b.id === user?.branchId);
  const branchName = currentBranch?.name || currentSlug || 'Branch Customer';
  const branchPortalDisplay = getBranchPortalDisplayName(currentBranch);
  const pageDisplay = isCustomer
    ? getCustomerPortalDisplayName(user?.name, currentBranch)
    : branchPortalDisplay;
  const currentBranchId = currentBranch?.id ?? user?.branchId;
  const isBranchManager = user?.role === 'branch_manager';
  const showBranchProfit = isBranchManager;

  const adminAssignedRate = useMemo(
    () => (currentBranchId ? getAdminAssignedBranchRateGroup(icRateGroups, currentBranchId) : undefined),
    [icRateGroups, currentBranchId],
  );
  const profitCurrency = adminAssignedRate?.currency ?? 'AED';

  const orderColumns = isCustomer
    ? ORDER_COLUMNS_CUSTOMER
    : (showBranchProfit ? ORDER_COLUMNS_WITH_PROFIT : ORDER_COLUMNS_BASE);

  const getOrderCustomer = (s: ICSale) =>
    isCustomer ? getCustomerPortalSubCustomerName(s) : getBranchPortalOrderCustomerName(s, branchName);

  const branchCustomerIds = useMemo(
    () => new Set(branchCustomers.map(c => c.id)),
    [branchCustomers],
  );

  const branchCustomerNames = useMemo(
    () => new Set(branchCustomers.map(c => c.name.trim().toLowerCase())),
    [branchCustomers],
  );

  const getWarehouseName = (id?: string) => icWarehouses.find(w => w.id === id)?.name || 'None';

  useEffect(() => {
    if (!currentSlug) return;
    getCustomersBySlug(currentSlug).then(res => {
      if (res.success && res.customers) {
        setBranchCustomers(res.customers.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    });
  }, [currentSlug]);

  const branchSales = useMemo(() => {
    if (isCustomer && customerId) {
      return icSales.filter(s =>
        customerOwnsSale(s, customerId, user?.name || '', branchName),
      );
    }
    return icSales.filter(s => saleBelongsToBranchPortal(s, branchName, branchCustomerIds, branchCustomerNames));
  }, [icSales, branchName, branchCustomerIds, branchCustomerNames, isCustomer, customerId, user?.name]);

  const customerOptions = useMemo(() => {
    const names = new Set<string>();
    branchCustomers.forEach(c => names.add(c.name));
    branchSales.forEach(s => {
      const name = getBranchPortalOrderCustomerName(s, branchName);
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [branchCustomers, branchSales, branchName]);

  const subCustomerOptions = useMemo(() => {
    const names = new Set<string>();
    branchSales.forEach(s => {
      const name = s.subCustomerName?.trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [branchSales]);

  const filteredSales = useMemo(() => {
    const dateRange = resolveDateFilterRange(dateFilter, customStartDate, customEndDate);
    const q = search.trim().toLowerCase();
    const rows = branchSales.filter(s => {
      if (!saleMatchesDateFilter(s, dateRange)) return false;
      const orderCustomer = getOrderCustomer(s);
      const formattedId = getFormattedTxnId(s.id, 'sale', s, branches, branchName);
      if (q &&
          !formattedId.toLowerCase().includes(q) &&
          !s.id.toLowerCase().includes(q) &&
          !orderCustomer.toLowerCase().includes(q)) return false;
      if (customerFilter && orderCustomer !== customerFilter) return false;
      if (isCustomer && subCustomerFilter) {
        const subName = getCustomerPortalSubCustomerName(s);
        if (subName !== subCustomerFilter) return false;
      }
      if (!matchesSaleRegionFilter(s, icWarehouses, selectedRegionIds)) {
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
  }, [branchSales, branches, search, customerFilter, subCustomerFilter, isCustomer, selectedRegionIds, icWarehouses, sortField, sortOrder, branchName, dateFilter, customStartDate, customEndDate]);

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
    if (!canEditOrder(s, user?.role)) return;
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
    if (salesPaused) {
      showToast('Sales are temporarily paused. New orders cannot be created right now.', 'error');
      return;
    }
    setSelectedSale(null);
    setModalOpen(true);
  };

  const handleView = (s: ICSale) => {
    setSelectedSale(s);
    setViewModalOpen(true);
  };

  const getSaleProfit = (sale: ICSale) =>
    resolveSaleBranchProfit(sale, icRateGroups, currentBranchId);

  // Compute stats for current branch orders
  const stats = React.useMemo(() => {
    const totalOrders = branchSales.length;
    const totalUnits = branchSales.reduce((acc, s) => acc + s.units, 0);
    const totalValue = branchSales.reduce((acc, s) => acc + (s.aedAmount || 0), 0);
    const avgRate = totalUnits > 0 ? totalValue / totalUnits : 0;
    const totalProfit = branchSales.reduce((acc, s) => acc + (getSaleProfit(s)?.profit ?? 0), 0);

    const pendingOrders = branchSales.filter(s => {
      const status = getBranchOrderStatus(s);
      return status === 'Pending' || status === 'Pending Review';
    }).length;
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
      totalProfit,
      pendingOrders,
      partialOrders,
      fulfilledOrders,
      totalPartialUnitsDelivered
    };
  }, [branchSales, icRateGroups, currentBranchId]);

  return (
    <PageShell>
      <PageHeader
        title={pageDisplay.title}
        subtitle={
          pageDisplay.subtitle ??
          (isCustomer
            ? 'Submit and track your transfer orders'
            : 'Submit and track transfer orders from your branch')
        }
        actions={
          <div className="flex items-center gap-3">
            {isCustomer && (
              <AddButton
                label="Sub Customer"
                ariaLabel="Manage sub customers"
                onClick={() => setSubCustomerModalOpen(true)}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="sm:h-[18px] sm:w-[18px]">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
              />
            )}
            <AddButton label="Create Order" onClick={handleCreateOrder} disabled={salesPaused} />
          </div>
        }
      />

      {salesPaused ? (
        <div
          role="status"
          className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 md:px-5 md:py-4"
        >
          Sales are temporarily paused. New orders cannot be created right now.
        </div>
      ) : null}

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
          bottom={
            showBranchProfit
              ? { label: 'Branch Profit', value: formatBranchProfit(stats.totalProfit, profitCurrency) }
              : { label: 'Average Rate', value: fmt(stats.avgRate) }
          }
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
        columns={[...orderColumns]}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search orders..."
        onHeaderClick={handleHeaderClick}
        sortField={sortField}
        sortOrder={sortOrder}
        toolbar={
          isCustomer ? (
            <div className="relative">
              <select
                value={subCustomerFilter}
                onChange={e => setSubCustomerFilter(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-accent focus:outline-none sm:w-56"
                aria-label="Filter by sub-customer"
              >
                <option value="">All Sub Customers</option>
                {subCustomerOptions.map(name => (
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
          ) : !isCustomer ? (
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
          ) : undefined
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
                  <p className="mt-0.5 text-xs font-mono text-slate-500">{getFormattedTxnId(s.id, 'sale', s, branches, branchName)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{new Date(s.createdAt || '').toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-500">
                  <span>Units: <strong className="text-slate-700">{s.units.toLocaleString()}</strong></span>
                  <span>Total: <strong className="text-slate-700">{(s.aedAmount || 0).toLocaleString()} AED</strong></span>
                </div>
                {showBranchProfit && (() => {
                  const profitResult = getSaleProfit(s);
                  if (!profitResult) return null;
                  return (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50/60 px-2.5 py-2 text-xs">
                      <span className="text-slate-500">Branch profit</span>
                      <strong className={profitResult.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                        {formatBranchProfit(profitResult.profit, profitResult.currency)}
                      </strong>
                    </div>
                  );
                })()}
                <div className="text-xs text-slate-500 truncate">{s.address || 'No address'}</div>
                <div onClick={e => e.stopPropagation()}>
                  {isBranchManager && (
                    <div className="mb-2">
                      <BranchCustomerOrderReviewActions sale={s} compact />
                    </div>
                  )}
                  {isBranchHandledSale(s) && isBranchManager && (
                    <div className="mb-2">
                      <BranchHandledOrderActions sale={s} branchId={currentBranchId} compact />
                    </div>
                  )}
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
            <td className={icCompactTd('left')}><span className="font-mono text-slate-500">{getFormattedTxnId(s.id, 'sale', s, branches, branchName)}</span></td>
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{getOrderCustomer(s)}</span></td>
            <td className={icCompactTd('left')}>{s.address || '—'}</td>
            <td className={icCompactTd('right')}>{s.units.toLocaleString()}</td>
            <td className={icCompactTd('right')}><span className="font-bold text-slate-900">{(s.aedAmount || 0).toLocaleString()}</span></td>
            {showBranchProfit && (
              <td className={icCompactTd('right')}>
                {(() => {
                  const profitResult = getSaleProfit(s);
                  if (!profitResult) return <span className="text-slate-400">—</span>;
                  return (
                    <span className={`font-semibold ${profitResult.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatBranchProfit(profitResult.profit, profitResult.currency)}
                    </span>
                  );
                })()}
              </td>
            )}
            <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
              <BranchOrderStatusCell sale={s} />
            </td>
            <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
              {isBranchManager && (
                <div className="mb-1.5">
                  <BranchCustomerOrderReviewActions sale={s} compact />
                </div>
              )}
              {isBranchHandledSale(s) && isBranchManager && (
                <div className="mb-1.5">
                  <BranchHandledOrderActions sale={s} branchId={currentBranchId} compact />
                </div>
              )}
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
      {isCustomer && currentSlug && (
        <SubCustomerModal
          slug={currentSlug}
          open={subCustomerModalOpen}
          onClose={() => setSubCustomerModalOpen(false)}
        />
      )}
      <ViewSaleModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
        workflowVariant="branch"
        onEdit={
          selectedSale && canEditOrder(selectedSale, user?.role) ? handleEdit : undefined
        }
        branchId={currentBranchId}
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
