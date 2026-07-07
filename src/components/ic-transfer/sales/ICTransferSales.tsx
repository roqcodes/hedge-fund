'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { useICTransferRegionFilter } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import { matchesSaleRegionFilter } from '@/lib/icTransfer/regionFilter';
import { useApp } from '@/context/AppContext';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import {
  getAdminSaleCustomerName,
  scopeSalesForBranchAdmin,
  saleMatchesDateFilter,
  saleMatchesSearchQuery,
} from '@/lib/icTransfer/branchOrderOwnership';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import {
  DataTableSection,
  ExportButtons,
  PageHeader,
  PageShell,
  useICTransferFilters,
  AddButton,
} from '../ui';
import AddSaleModal from './AddSaleModal';
import ViewSaleModal from './ViewSaleModal';
import { ICSale } from '@/types';
import PhysicalSplitKPICard from '@/components/physical/PhysicalSplitKPICard';
import { portalKpiGrid } from '@/lib/icTransfer/layoutConstants';
import { ConfirmModal } from '@/components/warehouse/shared';
import { AdminOrderStatusCard, AdminOrderWorkflowActions } from '../shared/AdminOrderWorkflowPanel';
import SalePriorityControl from '../shared/SalePriorityControl';
import { IC_ORDER_STATUSES, getAdminStatusLabel, normalizeOrderStatus, canAdminAccept, getCustomerOrderStatus, getAdminRowAccentClass, getAdminCardAccentClass } from '@/lib/icTransfer/orderStatus';
import { comparePriority, highPriorityRowClass, highPriorityCardClass } from '@/lib/icTransfer/orderPriority';
import { getDeliveredUnits, getRemainingUnits } from '@/lib/icTransfer/saleUnits';
import { PriorityBadge } from '@/components/warehouse/shared';
import { portalMobileCardFooterClass } from '@/lib/icTransfer/layoutConstants';
import { tabBtn, tabBtnActive } from '@/lib/ui';
import { adminBulkVerifyDeliveryAction } from '@/app/actions/icTransferActions';

const icCompactTd = (align: 'left'|'center'|'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const verifyCheckboxClass =
  'h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer';

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

type SalesTab = 'all' | 'awaiting_verification';

const SALE_COLUMNS = [
  'Date', 'Customer', 'Units', 'Total AED', 'Delivered Units', 'Remaining Units', 'Warehouse', 'Priority', 'Status', 'Actions'
];

export default function ICTransferSales() {
  const { icSales, icWarehouses, deleteICSale, branches, currentSlug, refetchData, showToast } = useApp();
  const branchSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;
  const { selectedRegionIds } = useICTransferRegionFilter();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ICSale | null>(null);
  const [search, setSearch] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWarehouse, setFilterWarehouse] = useState('All');
  const [tab, setTab] = useState<SalesTab>('all');

  const [sortField, setSortField] = useState<string>('Priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Delete from Table states
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<ICSale | null>(null);

  const [selectedVerifyIds, setSelectedVerifyIds] = useState<Set<string>>(new Set());
  const [bulkVerifyOpen, setBulkVerifyOpen] = useState(false);
  const [bulkVerifyLoading, setBulkVerifyLoading] = useState(false);
  const [branchCustomers, setBranchCustomers] = useState<{ id: string; name: string }[]>([]);

  const isVerificationTab = tab === 'awaiting_verification';
  const tableColumns = isVerificationTab ? ['Select', ...SALE_COLUMNS] : SALE_COLUMNS;
  const selectedVerifyCount = selectedVerifyIds.size;

  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  const getWarehouseName = (id?: string) => icWarehouses.find(w => w.id === id)?.name || 'None';

  const branchName = branches.find(b => b.slug === currentSlug)?.name || currentSlug || '';
  const isBranchAdminView = !!branchSlug;
  const txnBranchName = isBranchAdminView ? branchName : undefined;

  const branchCustomerIds = useMemo(
    () => new Set(branchCustomers.map(c => c.id)),
    [branchCustomers],
  );

  const branchCustomerNames = useMemo(
    () => new Set(branchCustomers.map(c => c.name.trim().toLowerCase())),
    [branchCustomers],
  );

  useEffect(() => {
    if (!branchSlug) return;
    getCustomersBySlug(branchSlug).then(res => {
      if (res.success && res.customers) {
        setBranchCustomers(res.customers.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    });
  }, [branchSlug]);

  useEffect(() => {
    void refetchData();
  }, [refetchData]);

  const scopedSales = useMemo(() => {
    if (!isBranchAdminView) return icSales;
    return scopeSalesForBranchAdmin(icSales, branchName, branchCustomerIds, branchCustomerNames);
  }, [icSales, isBranchAdminView, branchName, branchCustomerIds, branchCustomerNames]);

  const baseFilteredSales = useMemo<ICSale[]>(() => {
    const range = resolveDateFilterRange(dateFilter, customStartDate, customEndDate);

    return scopedSales.filter((s: ICSale) => {
      if (!saleMatchesDateFilter(s, range)) {
        return false;
      }

      if (search && !saleMatchesSearchQuery(s, search, branches, branchName)) {
        return false;
      }

      if (!matchesSaleRegionFilter(s, icWarehouses, selectedRegionIds)) {
        return false;
      }

      if (filterStatus !== 'All') {
        if (filterStatus === 'paid') return s.paymentStatus === 'paid';
        if (filterStatus === 'Partial') return getCustomerOrderStatus(s) === 'Partial';
        if (IC_ORDER_STATUSES.includes(filterStatus as any)) {
          return normalizeOrderStatus(s.orderStatus) === filterStatus;
        }
      }
      if (filterWarehouse !== 'All') {
        if (filterWarehouse === 'None') return !s.warehouseId;
        return s.warehouseId === filterWarehouse;
      }
      return true;
    });
  }, [scopedSales, search, selectedRegionIds, icWarehouses, filterStatus, filterWarehouse, dateFilter, customStartDate, customEndDate, branches, branchName]);

  const tabCounts = useMemo(() => ({
    all: baseFilteredSales.length,
    awaitingVerification: baseFilteredSales.filter(
      s => normalizeOrderStatus(s.orderStatus) === 'delivery_pending_admin',
    ).length,
  }), [baseFilteredSales]);

  const filteredSales = useMemo<ICSale[]>(() => {
    if (tab === 'awaiting_verification') {
      return baseFilteredSales.filter(
        s => normalizeOrderStatus(s.orderStatus) === 'delivery_pending_admin',
      );
    }
    return baseFilteredSales;
  }, [baseFilteredSales, tab]);

  const handleHeaderClick = (colName: string) => {
    const map: Record<string, string> = {
      'Date': 'Date',
      'Customer': 'Customer',
      'Units': 'Units',
      'Total AED': 'Total AED',
      'Delivered Units': 'Delivered Units',
      'Remaining Units': 'Remaining Units',
      'Warehouse': 'Warehouse',
      'Priority': 'Priority',
      'Status': 'Status',
    };
    const field = map[colName] ?? 'Date';
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSales = useMemo<ICSale[]>(() => {
    const sorted = [...filteredSales];
    sorted.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'Customer') {
        valA = getAdminSaleCustomerName(a, branchName, branches) || '';
        valB = getAdminSaleCustomerName(b, branchName, branches) || '';
      } else if (sortField === 'Units') {
        valA = Number(a.units || 0);
        valB = Number(b.units || 0);
      } else if (sortField === 'Total AED') {
        valA = Number(a.aedAmount || 0);
        valB = Number(b.aedAmount || 0);
      } else if (sortField === 'Delivered Units') {
        valA = getDeliveredUnits(Number(a.units || 0), a.collectedUnits, a.orderStatus);
        valB = getDeliveredUnits(Number(b.units || 0), b.collectedUnits, b.orderStatus);
      } else if (sortField === 'Remaining Units') {
        valA = getRemainingUnits(Number(a.units || 0), a.collectedUnits, a.orderStatus);
        valB = getRemainingUnits(Number(b.units || 0), b.collectedUnits, b.orderStatus);
      } else if (sortField === 'Warehouse') {
        valA = getWarehouseName(a.warehouseId);
        valB = getWarehouseName(b.warehouseId);
      } else if (sortField === 'Priority') {
        const order: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
        valA = order[a.priority || 'Normal'] ?? 1;
        valB = order[b.priority || 'Normal'] ?? 1;
      } else if (sortField === 'Status') {
        valA = a.orderStatus || 'pending';
        valB = b.orderStatus || 'pending';
      } else {
        valA = new Date(a.createdAt || '').getTime();
        valB = new Date(b.createdAt || '').getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      // Secondary sort: always keep high priority on top within same primary value
      const priDiff = comparePriority(a.priority, b.priority, 'asc');
      if (priDiff !== 0) return priDiff;
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
    return sorted;
  }, [filteredSales, sortField, sortOrder, branchName]);

  const stats = useMemo(() => {
    const totalOrders = filteredSales.length;
    const totalValue = filteredSales.reduce((acc: number, s: ICSale) => acc + (s.aedAmount || 0), 0);
    const totalUnits = filteredSales.reduce((acc: number, s: ICSale) => acc + s.units, 0);
    const avgRate = totalUnits > 0 ? totalValue / totalUnits : 0;
    
    const pendingCount = filteredSales.filter((s: ICSale) => normalizeOrderStatus(s.orderStatus) === 'pending').length;
    const pendingVerificationCount = filteredSales.filter(
      (s: ICSale) => normalizeOrderStatus(s.orderStatus) === 'delivery_pending_admin',
    ).length;
    const partialCount = filteredSales.filter((s: ICSale) => getCustomerOrderStatus(s) === 'Partial').length;
    const completedCount = filteredSales.filter((s: ICSale) => normalizeOrderStatus(s.orderStatus) === 'completed').length;
    
    const totalPartialUnitsDelivered = filteredSales
      .filter((s: ICSale) => getCustomerOrderStatus(s) === 'Partial' || !!s.derivedFromSaleId)
      .reduce((acc: number, s: ICSale) => acc + getDeliveredUnits(s.units, s.collectedUnits, s.orderStatus), 0);

    return {
      totalOrders,
      totalValue,
      totalUnits,
      avgRate,
      pendingCount,
      pendingVerificationCount,
      partialCount,
      completedCount,
      totalPartialUnitsDelivered
    };
  }, [filteredSales]);

  const handleEdit = (s: ICSale) => {
    setSelectedSale(s);
    setModalOpen(true);
  };

  const handleView = (s: ICSale) => {
    setSelectedSale(s);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !selectedSale) return;
    const fresh = icSales.find(s => s.id === selectedSale.id);
    if (fresh) setSelectedSale(fresh);
  }, [icSales, viewModalOpen, selectedSale?.id]);

  useEffect(() => {
    setSelectedVerifyIds(new Set());
  }, [tab]);

  const toggleVerifySelection = (id: string) => {
    setSelectedVerifyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVerifySelected =
    sortedSales.length > 0 && sortedSales.every(s => selectedVerifyIds.has(s.id));

  const toggleSelectAllVerify = () => {
    if (allVerifySelected) {
      setSelectedVerifyIds(new Set());
    } else {
      setSelectedVerifyIds(new Set(sortedSales.map(s => s.id)));
    }
  };

  const handleBulkVerifyConfirm = async () => {
    const ids = [...selectedVerifyIds];
    if (ids.length === 0) return;
    setBulkVerifyLoading(true);
    const res = await adminBulkVerifyDeliveryAction(ids, branchSlug);
    setBulkVerifyLoading(false);
    if (res.success && res.data) {
      const { verifiedCount, failedCount } = res.data;
      if (failedCount > 0) {
        showToast(
          `Verified ${verifiedCount} order(s). ${failedCount} could not be verified.`,
          verifiedCount > 0 ? 'success' : 'error',
        );
      } else {
        showToast(`Verified ${verifiedCount} order(s)`, 'success');
      }
      setBulkVerifyOpen(false);
      setSelectedVerifyIds(new Set());
      await refetchData();
    } else {
      showToast(res.error || 'Failed to verify deliveries', 'error');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, s: ICSale) => {
    e.stopPropagation();
    setSaleToDelete(s);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setDeleteLoading(true);
    await deleteICSale(saleToDelete.id);
    setDeleteLoading(false);
    setConfirmDeleteOpen(false);
    setSaleToDelete(null);
  };

  const { salesColumns, matrixRows } = React.useMemo(() => {
    const columns = ['Sales Vol', 'Sales Rate', 'Status'];
    const uniqueCustomers = Array.from(
      new Set(scopedSales.map(s => getAdminSaleCustomerName(s, branchName, branches)).filter(Boolean)),
    );
    uniqueCustomers.sort((a, b) => a.localeCompare(b));

    const mRows = uniqueCustomers.map(custName => {
      const customerSales = scopedSales.filter(
        s => getAdminSaleCustomerName(s, branchName, branches) === custName,
      );
      const vol = customerSales.reduce((acc, s) => acc + s.units, 0);
      const rate = customerSales.length > 0 ? customerSales[0].unitRate : 0;
      const hasActive = customerSales.some(s => normalizeOrderStatus(s.orderStatus) !== 'completed');
      const statusValue = hasActive ? 'Processing' : 'Completed';

      return {
        label: custName,
        metrics: [
          { label: 'Sales Vol', value: vol },
          { label: 'Sales Rate', value: rate.toLocaleString() },
          { label: 'Status', value: statusValue },
        ]
      };
    });
    return { salesColumns: columns, matrixRows: mRows };
  }, [scopedSales, branchName]);

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        subtitle="Customer sale orders and settlement status"
        actions={
          <div className="flex items-center gap-3">
            <AddButton label="Add Sale" onClick={() => setModalOpen(true)} />
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
          top={{ label: 'Active Orders', value: `${stats.pendingCount + stats.partialCount + stats.pendingVerificationCount} Active` }}
          bottom={{ label: 'Awaiting Verification', value: `${stats.pendingVerificationCount} Delivery` }}
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
          top={{ label: 'Partial Orders', value: `${stats.partialCount} Partial` }}
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

      <div className="mb-4 flex items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={tab === 'all' ? tabBtnActive : tabBtn}
        >
          All Sales
          <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
            {tabCounts.all}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('awaiting_verification')}
          className={tab === 'awaiting_verification' ? tabBtnActive : tabBtn}
        >
          Awaiting Verification
          <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
            {tabCounts.awaitingVerification}
          </span>
        </button>
      </div>

      <div className="mb-5">
        <DataTableSection
          title="Sales Matrix"
          columns={['Customer', ...salesColumns]}
          data={matrixRows.map(r => [
            r.label,
            ...r.metrics.map(m => typeof m.value === 'number' ? m.value.toLocaleString() : m.value)
          ])}
        />
      </div>

      <DataTableSection
        title={tab === 'awaiting_verification' ? 'Awaiting Verification' : 'All Sales'}
        columns={tableColumns}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sales..."
        onHeaderClick={handleHeaderClick}
        sortField={sortField}
        sortOrder={sortOrder}
        headerCellContent={
          isVerificationTab
            ? {
                Select: (
                  <input
                    type="checkbox"
                    checked={allVerifySelected}
                    onChange={toggleSelectAllVerify}
                    onClick={e => e.stopPropagation()}
                    className={verifyCheckboxClass}
                    aria-label="Select all orders for verification"
                  />
                ),
              }
            : undefined
        }
        toolbar={
          <div className="flex gap-2 items-center flex-wrap">
            {isVerificationTab && selectedVerifyCount > 0 && (
              <button
                type="button"
                onClick={() => setBulkVerifyOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Verify Selected ({selectedVerifyCount})
              </button>
            )}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white shadow-sm focus:border-accent focus:outline-none"
            >
              <option value="All">All Statuses</option>
              {IC_ORDER_STATUSES.map(st => (
                <option key={st} value={st}>{getAdminStatusLabel(st)}</option>
              ))}
              <option value="paid">Fully Paid</option>
              <option value="Partial">Partial Delivered</option>
            </select>

            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white shadow-sm focus:border-accent focus:outline-none"
            >
              <option value="All">All Warehouses</option>
              <option value="None">No Warehouse</option>
              {icWarehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        }
        mobileView={
          sortedSales.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {tab === 'awaiting_verification'
                ? 'No orders awaiting delivery verification.'
                : 'No sales found.'}
            </div>
          ) : (
            sortedSales.map((s: ICSale) => {
              const delivered = getDeliveredUnits(s.units, s.collectedUnits, s.orderStatus);
              const remaining = getRemainingUnits(s.units, s.collectedUnits, s.orderStatus);
              const warehouseName = getWarehouseName(s.warehouseId);
              const customerLabel = getAdminSaleCustomerName(s, branchName, branches);
              return (
                <div
                  key={s.id}
                  onClick={() => handleView(s)}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer transition-colors ${getAdminCardAccentClass(s.orderStatus, s.transactionType) ?? `hover:bg-slate-50 ${highPriorityCardClass(s.priority)}`}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    {isVerificationTab && (
                      <input
                        type="checkbox"
                        checked={selectedVerifyIds.has(s.id)}
                        onChange={() => toggleVerifySelection(s.id)}
                        onClick={e => e.stopPropagation()}
                        className={`${verifyCheckboxClass} mt-0.5 shrink-0`}
                        aria-label={`Select ${customerLabel} for verification`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{customerLabel}</p>
                      <p className="mt-0.5 text-xs font-mono text-slate-500">{getFormattedTxnId(s.id, 'sale', s, branches, txnBranchName)}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{new Date(s.createdAt || '').toLocaleString()}</p>
                    </div>
                    <PriorityBadge priority={s.priority} />
                  </div>
                  <div className="flex justify-between items-center rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-500">
                    <span>Units: <strong className="text-slate-700">{s.units.toLocaleString()}</strong></span>
                    <span className="truncate pl-2">{warehouseName}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-500">
                    <span>Delivered: <strong className="text-emerald-600">{delivered.toLocaleString()}</strong></span>
                    <span>Remaining: <strong className="text-amber-600">{remaining.toLocaleString()}</strong></span>
                  </div>
                  <div className={portalMobileCardFooterClass}>
                    <div className="min-w-0" onClick={e => e.stopPropagation()}>
                      <AdminOrderStatusCard sale={s} />
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleView(s); }}
                      className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )
        }
      >
        {sortedSales.map((s: ICSale) => {
          const total = s.aedAmount || 0;
          const delivered = getDeliveredUnits(s.units, s.collectedUnits, s.orderStatus);
          const remaining = getRemainingUnits(s.units, s.collectedUnits, s.orderStatus);
          const customerLabel = getAdminSaleCustomerName(s, branchName, branches);

          const hasWarehouse = !!s.warehouseId;
          const warehouseName = getWarehouseName(s.warehouseId);

          return (
            <tr
              key={s.id}
              onClick={() => handleView(s)}
              className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${getAdminRowAccentClass(s.orderStatus, s.transactionType) ?? highPriorityRowClass(s.priority)}`}
            >
              {isVerificationTab && (
                <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedVerifyIds.has(s.id)}
                    onChange={() => toggleVerifySelection(s.id)}
                    className={verifyCheckboxClass}
                    aria-label={`Select ${customerLabel} for verification`}
                  />
                </td>
              )}
              {/* DATE */}
              <td className={icCompactTd('left')}>
                <div className="leading-tight">
                  <div className="font-semibold text-slate-800 text-xs">
                    {new Date(s.createdAt || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(s.createdAt || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </td>

              {/* CUSTOMER */}
              <td className={icCompactTd('left')}>
                <span className="font-semibold text-slate-900">{customerLabel}</span>
                {s.transactionType === 'by_hand' && (
                  <span className="ml-1.5 inline-flex rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">
                    By Hand
                  </span>
                )}
                {s.derivedFromSaleId && (
                  <span className="ml-1.5 inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600" title={`Derived from ${getFormattedTxnId(s.derivedFromSaleId, 'sale', null, branches, txnBranchName)}`}>
                    SPLIT
                  </span>
                )}
              </td>

              {/* UNITS */}
              <td className={icCompactTd('right')}>
                <span className="tabular-nums font-medium text-slate-700">{s.units.toLocaleString()}</span>
              </td>

              {/* TOTAL AED */}
              <td className={icCompactTd('right')}>
                <span className="tabular-nums font-bold text-slate-900">
                  {total.toLocaleString()} <span className="font-normal text-slate-400 text-[10px]">AED</span>
                </span>
              </td>

              {/* DELIVERED UNITS */}
              <td className={icCompactTd('right')}>
                <span className="tabular-nums font-bold text-emerald-600">
                  {delivered.toLocaleString()}
                </span>
              </td>

              {/* REMAINING UNITS */}
              <td className={icCompactTd('right')}>
                <span className={`tabular-nums font-bold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {remaining.toLocaleString()}
                </span>
              </td>

              {/* WAREHOUSE COLUMN */}
              <td className={icCompactTd('left')}>
                {hasWarehouse ? (
                  <span className="font-semibold text-slate-700">{warehouseName}</span>
                ) : canAdminAccept(s.orderStatus) ? (
                  <span className="text-[10.5px] font-medium text-slate-400 italic">Awaiting acceptance</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(s);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/50 px-2.5 py-1 text-[10.5px] font-bold text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors shadow-sm"
                  >
                    Assign Warehouse
                  </button>
                )}
              </td>

              {/* PRIORITY */}
              <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
                <SalePriorityControl saleId={s.id} priority={s.priority} compact />
              </td>

              {/* STATUS */}
              <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
                <AdminOrderStatusCard sale={s} />
              </td>

              {/* ACTIONS */}
              <td className={icCompactTd('center')} onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center gap-1.5">
                  <AdminOrderWorkflowActions sale={s} />
                  <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(s);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="View Details"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(s);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit Sale"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete Sale"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTableSection>

      <AddSaleModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setSelectedSale(null); }} 
        initialData={selectedSale || undefined}
      />
      <ViewSaleModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
        onEdit={handleEdit}
        workflowVariant="admin"
      />

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? This action cannot be undone."
        confirmLabel="Delete Sale"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmModal
        open={bulkVerifyOpen}
        title="Verify Selected Deliveries"
        message={
          selectedVerifyCount === 1
            ? 'Confirm delivery proof and mark this order as completed? The customer will see the order as delivered.'
            : `Confirm delivery proof and mark ${selectedVerifyCount} orders as completed? Customers will see these orders as delivered.`
        }
        confirmLabel={
          selectedVerifyCount === 1
            ? 'Verify Delivery'
            : `Verify ${selectedVerifyCount} Orders`
        }
        variant="success"
        loading={bulkVerifyLoading}
        onConfirm={handleBulkVerifyConfirm}
        onCancel={() => setBulkVerifyOpen(false)}
      />
    </PageShell>
  );
}
