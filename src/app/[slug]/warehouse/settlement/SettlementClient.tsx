'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell } from '@/components/ic-transfer/ui';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { dataTable, tableWrap, filterSelect, btnPrimary, btnSecondary, tabBtn, tabBtnActive } from '@/lib/ui';
import {
  fetchWarehouseOrders,
  fetchWarehouseUndeliveredOrders,
  fetchDeliveryAgents,
  warehouseRejectOrder,
} from '@/app/actions/warehouseActions';
import { formatDateTime } from '@/data/mockData';
import AssignDeliveryAgentModal from './AssignDeliveryAgentModal';
import OrderDetailsModal from './OrderDetailsModal';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { PriorityBadge, SkeletonRows } from '@/components/warehouse/shared';
import { WarehouseOrderStatusCard, WarehouseOrderWorkflowActions, WarehouseAgentNameCell } from '@/components/warehouse/WarehouseOrderStatusCell';
import RejectRemarkModal from '@/components/ic-transfer/shared/RejectRemarkModal';
import { isWarehouseRejected } from '@/lib/icTransfer/orderStatus';
import { comparePriority, highPriorityRowClass, highPriorityCardClass } from '@/lib/icTransfer/orderPriority';
import { formatUnits, getDeliveredUnits, getRemainingUnits, isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import WarehouseKpiGrid from '@/components/warehouse/WarehouseKpiGrid';
import { computeWarehouseSettlementKpis } from '@/lib/warehouse/kpiMetrics';
import { warehouseOrderMatchesSearch } from '@/lib/warehouse/orderSearch';
import { resolveDateRange } from '@/lib/warehouseDateUtils';

import type { WarehouseOrder, DeliveryAgent } from '@/types/warehouse';

type TabKey = 'Pending' | 'AwaitingAdmin' | 'Completed' | 'Rejected';

type SortField =
  | 'Date'
  | 'Order ID'
  | 'Units'
  | 'Delivered'
  | 'Remaining'
  | 'Priority'
  | 'Status'
  | 'Actions'
  | 'Agent';

export default function SettlementClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast, icWarehouses, refetchData, branches } = useApp();

  const [orders, setOrders]   = useState<WarehouseOrder[]>([]);
  const [undeliveredOrders, setUndeliveredOrders] = useState<WarehouseOrder[]>([]);
  const [agents, setAgents]   = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabKey>('Pending');
  const [search, setSearch]   = useState('');

  // Date filter (default = today)
  const [dateFilter, setDateFilter]         = useState('today');
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate]     = useState(() => new Date().toISOString().slice(0, 10));

  // Column filters
  const [filterAgent,    setFilterAgent]    = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Sort
  const [sortField, setSortField] = useState<SortField>('Priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [assignModalOpen,  setAssignModalOpen]  = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder,    setSelectedOrder]    = useState<WarehouseOrder | null>(null);
  const [rejectOrder,      setRejectOrder]      = useState<WarehouseOrder | null>(null);
  const [rejectLoading,    setRejectLoading]    = useState(false);

  // RBAC: warehouse_* can assign agents; delivery_* cannot
  const isDeliveryRole  = user?.role?.startsWith('delivery_');
  const isWarehouseRole = user?.role?.startsWith('warehouse_') || user?.role === 'branch_manager' || user?.role === 'admin';
  const canAssignAgents = isWarehouseRole && !isDeliveryRole;

  const rawRoleId   = (user?.role?.startsWith('warehouse_') || user?.role?.startsWith('delivery_')) ? user.role.split('_')[1] : null;
  const warehouseId = rawRoleId ? icWarehouses.find((w: any) => w.id.startsWith(rawRoleId))?.id : null;

  const loadData = useCallback(async () => {
    if (!warehouseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { dateFrom, dateTo } = resolveDateRange(dateFilter, customStartDate, customEndDate);
    const [ordersRes, undeliveredRes, agentsRes] = await Promise.all([
      fetchWarehouseOrders(warehouseId, { dateFrom, dateTo }),
      fetchWarehouseUndeliveredOrders(warehouseId),
      fetchDeliveryAgents(warehouseId),
    ]);

    if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data as WarehouseOrder[]);
    else showToast(ordersRes.error || 'Failed to fetch orders', 'error');

    if (undeliveredRes.success && undeliveredRes.data) {
      setUndeliveredOrders(undeliveredRes.data as WarehouseOrder[]);
    }

    if (agentsRes.success && agentsRes.data) setAgents(agentsRes.data as DeliveryAgent[]);

    setLoading(false);
  }, [warehouseId, showToast, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAssignModal = (order: WarehouseOrder) => {
    setSelectedOrder(order);
    setAssignModalOpen(true);
  };

  const handleWarehouseReject = async (remarks: string) => {
    if (!rejectOrder) return;
    setRejectLoading(true);
    const res = await warehouseRejectOrder(rejectOrder.id, remarks, user?.email || 'warehouse');
    setRejectLoading(false);
    if (res.success) {
      showToast('Order rejected', 'success');
      setRejectOrder(null);
      loadData();
    } else {
      showToast(res.error || 'Failed to reject order', 'error');
    }
  };

  const handleSort = (field: SortField) => {
    setSortField(f => {
      if (f === field) { setSortOrder(o => (o === 'asc' ? 'desc' : 'asc')); return f; }
      setSortOrder('asc');
      return field;
    });
  };

  /* ─── filtering ─────────────────────────────────────────── */
  const filteredOrders = useMemo<WarehouseOrder[]>(() => {
    return orders
      .filter(o => {
        if (tab === 'Pending') {
          return !isSaleCompleted(o.order_status)
            && o.order_status !== 'delivery_pending_admin'
            && !isWarehouseRejected(o.order_status);
        }
        if (tab === 'AwaitingAdmin') {
          return o.order_status === 'delivery_pending_admin';
        }
        if (tab === 'Completed') {
          return isSaleCompleted(o.order_status);
        }
        return isWarehouseRejected(o.order_status);
      })
      .filter(o => {
        if (filterAgent === 'Unassigned') return !o.delivery_agent_id;
        if (filterAgent !== 'All')        return o.delivery_agent_id === filterAgent;
        return true;
      })
      .filter(o => {
        if (filterPriority !== 'All') return (o.priority || 'Normal') === filterPriority;
        return true;
      })
      .filter(o => warehouseOrderMatchesSearch(o, search, { branches }));
  }, [orders, tab, search, filterAgent, filterPriority, branches]);

  /* ─── sorting ────────────────────────────────────────────── */
  const sortedOrders = useMemo<WarehouseOrder[]>(() => {
    return [...filteredOrders].sort((a, b) => {
      let vA: any, vB: any;
      switch (sortField) {
        case 'Order ID':          vA = getFormattedTxnId(a.id, 'sale', a, branches); vB = getFormattedTxnId(b.id, 'sale', b, branches); break;
        case 'Units':             vA = Number(a.units);              vB = Number(b.units);              break;
        case 'Delivered':         vA = getDeliveredUnits(Number(a.units), a.collected_units, a.order_status);
                                  vB = getDeliveredUnits(Number(b.units), b.collected_units, b.order_status); break;
        case 'Remaining':         vA = getRemainingUnits(Number(a.units), a.collected_units, a.order_status);
                                  vB = getRemainingUnits(Number(b.units), b.collected_units, b.order_status); break;
        case 'Priority':          return comparePriority(a.priority, b.priority, sortOrder);
        case 'Status':            vA = a.order_status || 'pending'; vB = b.order_status || 'pending'; break;
        case 'Actions':           return 0;
        case 'Agent':             vA = a.delivery_agent_name || ''; vB = b.delivery_agent_name || ''; break;
        default:                  vA = new Date(a.created_at).getTime(); vB = new Date(b.created_at).getTime();
      }
      if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
      if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
      const priDiff = comparePriority(a.priority, b.priority, 'asc');
      if (priDiff !== 0) return priDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredOrders, sortField, sortOrder, branches]);
  const pendingCount = orders.filter(
    o => !isSaleCompleted(o.order_status)
      && o.order_status !== 'delivery_pending_admin'
      && !isWarehouseRejected(o.order_status),
  ).length;
  const awaitingAdminCount = orders.filter(o => o.order_status === 'delivery_pending_admin').length;
  const completedCount = orders.filter(o => isSaleCompleted(o.order_status)).length;
  const rejectedCount = orders.filter(o => isWarehouseRejected(o.order_status)).length;

  const tabEmptyLabel =
    tab === 'Pending'
      ? 'pending'
      : tab === 'AwaitingAdmin'
        ? 'awaiting admin verification'
        : tab === 'Completed'
          ? 'completed'
          : 'rejected';

  const COLS: { label: SortField; align: 'left' | 'right' | 'center' }[] = [
    { label: 'Date',       align: 'left'   },
    { label: 'Order ID',   align: 'left'   },
    { label: 'Units',      align: 'right'  },
    { label: 'Delivered',  align: 'right'  },
    { label: 'Remaining',  align: 'right'  },
    { label: 'Priority',   align: 'center' },
    { label: 'Agent',      align: 'left'   },
    { label: 'Status',     align: 'center' },
    { label: 'Actions',    align: 'center' },
  ];

  const warehouseStock = useMemo(() => {
    if (!warehouseId) return null;
    const warehouse = icWarehouses.find(w => w.id === warehouseId);
    return warehouse?.currentStock ?? 0;
  }, [warehouseId, icWarehouses]);

  const kpiMetrics = useMemo(
    () => computeWarehouseSettlementKpis(orders, warehouseStock, undeliveredOrders),
    [orders, warehouseStock, undeliveredOrders],
  );

  return (
    <PageShell>


      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <WarehouseKpiGrid metrics={kpiMetrics} />

      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto scrollbar-none">
          <button onClick={() => setTab('Pending')} className={tab === 'Pending' ? tabBtnActive : tabBtn}>
            Pending Orders
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
              {pendingCount}
            </span>
          </button>
          <button onClick={() => setTab('Rejected')} className={tab === 'Rejected' ? tabBtnActive : tabBtn}>
            Rejected
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
              {rejectedCount}
            </span>
          </button>
          <button onClick={() => setTab('AwaitingAdmin')} className={tab === 'AwaitingAdmin' ? tabBtnActive : tabBtn}>
            Awaiting Admin
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
              {awaitingAdminCount}
            </span>
          </button>
          <button onClick={() => setTab('Completed')} className={tab === 'Completed' ? tabBtnActive : tabBtn}>
            Completed Orders
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Table Card */}
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-4 pb-4 max-sm:px-0 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:gap-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">Orders</h3>
            <input
              type="text"
              placeholder="Search date, ID, units, agent, status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="min-w-0 max-sm:w-full flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:-mx-1 max-sm:overflow-x-auto max-sm:px-1 max-sm:pb-0.5 max-sm:scrollbar-none">
              <select value={filterAgent}    onChange={e => setFilterAgent(e.target.value)}    className={filterSelect}>
                <option value="All">All Agents</option>
                <option value="Unassigned">Unassigned</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={filterSelect}>
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Desktop table */}
          <div className={`${tableWrap} hidden md:block`}>
            <table className={`${dataTable} min-w-[900px]`}>
              <thead>
                <tr>
                  {COLS.map(col => {
                    const isSorted = sortField === col.label;
                    return (
                      <th
                        key={col.label}
                        onClick={() => handleSort(col.label)}
                        className={`px-3 pb-3 text-${col.align} text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5 cursor-pointer select-none hover:text-slate-700 transition-colors`}
                      >
                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                          <span>{col.label}</span>
                          {isSorted && <span className="text-[10px] text-accent">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows cols={9} />
                ) : sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">
                      No {tabEmptyLabel} orders found for this date range.
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map(order => {
                    const delivered = getDeliveredUnits(Number(order.units), order.collected_units, order.order_status);
                    const remaining = getRemainingUnits(Number(order.units), order.collected_units, order.order_status);
                    return (
                      <tr
                        key={order.id}
                        onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                        className={`cursor-pointer transition-colors ${highPriorityRowClass(order.priority)}`}
                        data-interactive-row
                      >
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">{formatDateTime(order.created_at)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-mono font-medium sm:px-5 sm:py-4 text-slate-900">
                          {getFormattedTxnId(order.id, 'sale', order, branches)}
                          {order.derived_from_sale_id && (
                            <span className="ml-1.5 text-[10px] font-semibold text-indigo-600">(split)</span>
                          )}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium text-right sm:px-5 sm:py-4 text-slate-600">{formatUnits(order.units)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-emerald-600">{formatUnits(delivered)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-amber-600">{formatUnits(remaining)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4"><PriorityBadge priority={order.priority} /></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-left sm:px-5 sm:py-4">
                          <WarehouseAgentNameCell order={order} />
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4" onClick={e => e.stopPropagation()}>
                          <WarehouseOrderStatusCard order={order} />
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4" onClick={e => e.stopPropagation()}>
                          <WarehouseOrderWorkflowActions
                            order={order}
                            canAssignAgents={canAssignAgents}
                            onReject={e => { e.stopPropagation(); setRejectOrder(order); }}
                            onAssign={e => { e.stopPropagation(); openAssignModal(order); }}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="flex md:hidden flex-col gap-3 py-4 max-sm:px-0 px-4">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No orders found.</div>
            ) : (
              sortedOrders.map(order => {
                const delivered = getDeliveredUnits(Number(order.units), order.collected_units, order.order_status);
                const remaining = getRemainingUnits(Number(order.units), order.collected_units, order.order_status);
                return (
                  <div
                    key={order.id}
                    onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer hover:bg-slate-50 transition-colors ${highPriorityCardClass(order.priority)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-mono font-semibold text-slate-900">{getFormattedTxnId(order.id, 'sale', order, branches)}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(order.created_at)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                      <span>Units: <strong className="text-slate-700">{formatUnits(order.units)}</strong></span>
                      <WarehouseAgentNameCell order={order} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                      <span>Delivered: <strong className="text-emerald-600">{formatUnits(delivered)}</strong></span>
                      <span>Remaining: <strong className="text-amber-600">{formatUnits(remaining)}</strong></span>
                    </div>
                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <WarehouseOrderWorkflowActions
                        order={order}
                        canAssignAgents={canAssignAgents}
                        onReject={e => { e.stopPropagation(); setRejectOrder(order); }}
                        onAssign={e => { e.stopPropagation(); openAssignModal(order); }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-50 pt-2">
                      <div className="min-w-0" onClick={e => e.stopPropagation()}>
                        <WarehouseOrderStatusCard order={order} />
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedOrder(order); setDetailsModalOpen(true); }}
                        className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {assignModalOpen && selectedOrder && (
        <AssignDeliveryAgentModal
          order={selectedOrder}
          agents={agents}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={() => { setAssignModalOpen(false); loadData(); }}
        />
      )}
      {detailsModalOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isDeliveryView={isDeliveryRole ?? false}
          onClose={() => setDetailsModalOpen(false)}
          onSuccess={() => { setDetailsModalOpen(false); loadData(); refetchData(); }}
        />
      )}
      <RejectRemarkModal
        open={!!rejectOrder}
        loading={rejectLoading}
        title="Reject Order"
        description="Provide a reason for rejecting this order. The admin will be notified to reassign or reject."
        onConfirm={handleWarehouseReject}
        onCancel={() => setRejectOrder(null)}
      />
    </PageShell>
  );
}
