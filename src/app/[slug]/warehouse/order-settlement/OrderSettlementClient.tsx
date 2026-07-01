'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell } from '@/components/ic-transfer/ui';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { dataTable, tableWrap, tabBtn, tabBtnActive, filterSelect } from '@/lib/ui';
import { fetchDeliveryAgentOrders } from '@/app/actions/warehouseActions';
import { formatDateTime } from '@/data/mockData';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import OrderDetailsModal from '../settlement/OrderDetailsModal';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { normalizeOrderStatus, isDeliveryAgentRejected } from '@/lib/icTransfer/orderStatus';
import { WarehouseOrderStatusCard } from '@/components/warehouse/WarehouseOrderStatusCell';
import { PriorityBadge, SkeletonRows } from '@/components/warehouse/shared';
import { comparePriority, highPriorityRowClass, highPriorityCardClass } from '@/lib/icTransfer/orderPriority';
import { formatUnits, getRemainingUnits, isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import { resolveDateRange } from '@/lib/warehouseDateUtils';
import WarehouseKpiGrid from '@/components/warehouse/WarehouseKpiGrid';
import { computeDeliveryAgentKpis } from '@/lib/warehouse/kpiMetrics';
import { warehouseOrderMatchesSearch } from '@/lib/warehouse/orderSearch';
import type { WarehouseOrder } from '@/types/warehouse';

type TabKey = 'Pending' | 'Completed' | 'Rejected';
type SortField = 'Date' | 'Order ID' | 'Units' | 'Remaining' | 'Priority' | 'Status';

export default function OrderSettlementClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast, branches, refetchData } = useApp();

  const [orders, setOrders]   = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabKey>('Pending');
  const [search, setSearch]   = useState('');
  const [filterPriority, setFilterPriority] = useState('All');

  // Date filter (default = today)
  const [dateFilter, setDateFilter]           = useState('today');
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customEndDate, setCustomEndDate]     = useState(() => new Date().toISOString().slice(0, 10));

  // Sort
  const [sortField, setSortField] = useState<SortField>('Priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal
  const [selectedOrder,    setSelectedOrder]    = useState<WarehouseOrder | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    const { dateFrom, dateTo } = resolveDateRange(dateFilter, customStartDate, customEndDate);
    const res = await fetchDeliveryAgentOrders(user.email, { dateFrom, dateTo });
    if (res.success && res.data) {
      setOrders(res.data as WarehouseOrder[]);
    } else {
      showToast(res.error || 'Failed to load delivery orders', 'error');
    }
    setLoading(false);
  }, [user?.email, showToast, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSort = (field: SortField) => {
    setSortField(f => {
      if (f === field) { setSortOrder(o => (o === 'asc' ? 'desc' : 'asc')); return f; }
      setSortOrder('asc');
      return field;
    });
  };

  const filteredOrders = useMemo<WarehouseOrder[]>(() => {
    return orders.filter(o => {
      const status = normalizeOrderStatus(o.order_status);
      const matchTab =
        tab === 'Pending'
          ? status === 'wh_processing'
          : tab === 'Completed'
            ? isSaleCompleted(o.order_status)
            : isDeliveryAgentRejected(o.order_status);
      const matchSearch = warehouseOrderMatchesSearch(o, search, {
        branches,
        includeAgent: false,
        includeDelivered: false,
      });
      const matchPriority = filterPriority === 'All' || (o.priority || 'Normal') === filterPriority;
      return matchTab && matchSearch && matchPriority;
    });
  }, [orders, tab, search, filterPriority, branches]);

  const sortedOrders = useMemo<WarehouseOrder[]>(() => {
    return [...filteredOrders].sort((a, b) => {
      let vA: any, vB: any;
      switch (sortField) {
        case 'Order ID': vA = getFormattedTxnId(a.id, 'sale', a, branches); vB = getFormattedTxnId(b.id, 'sale', b, branches); break;
        case 'Units':    vA = Number(a.units);                                 vB = Number(b.units);                                 break;
        case 'Remaining': vA = getRemainingUnits(Number(a.units), a.collected_units, a.order_status);
                          vB = getRemainingUnits(Number(b.units), b.collected_units, b.order_status); break;
        case 'Priority': return comparePriority(a.priority, b.priority, sortOrder);
        case 'Status':   vA = a.order_status || 'pending';                  vB = b.order_status || 'pending';                  break;
        default:         vA = new Date(a.created_at).getTime();                vB = new Date(b.created_at).getTime();
      }
      if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
      if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
      const priDiff = comparePriority(a.priority, b.priority, 'asc');
      if (priDiff !== 0) return priDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredOrders, sortField, sortOrder, branches]);

  const pendingCount   = orders.filter(o => normalizeOrderStatus(o.order_status) === 'wh_processing').length;
  const completedCount = orders.filter(o => isSaleCompleted(o.order_status)).length;
  const rejectedCount  = orders.filter(o => isDeliveryAgentRejected(o.order_status)).length;

  const kpiMetrics = useMemo(() => computeDeliveryAgentKpis(orders), [orders]);

  const COLS: { label: SortField; align: 'left' | 'right' | 'center' }[] = [
    { label: 'Date',      align: 'left'   },
    { label: 'Order ID',  align: 'left'   },
    { label: 'Units',      align: 'right'  },
    { label: 'Remaining',  align: 'right'  },
    { label: 'Priority',  align: 'center' },
    { label: 'Status',    align: 'center' },
  ];

  return (
    <PageShell>
      <PageHeader title="My Delivery Orders" subtitle="Delivery Agent Portal / Order Settlement" />

      {/* Date Filter */}
      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <WarehouseKpiGrid metrics={kpiMetrics} variant="delivery" />

      <div className="flex flex-col gap-6 mt-2">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto scrollbar-none">
          <button onClick={() => setTab('Pending')} className={tab === 'Pending' ? tabBtnActive : tabBtn}>
            Pending
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">{pendingCount}</span>
          </button>
          <button onClick={() => setTab('Completed')} className={tab === 'Completed' ? tabBtnActive : tabBtn}>
            Completed
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">{completedCount}</span>
          </button>
          <button onClick={() => setTab('Rejected')} className={tab === 'Rejected' ? tabBtnActive : tabBtn}>
            Rejected
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">{rejectedCount}</span>
          </button>
        </div>

        {/* Table card */}
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
          <div className="flex flex-col gap-3 px-4 pb-4 max-sm:px-0 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:gap-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">My Orders</h3>
            <input
              type="text"
              placeholder="Search date, ID, units, status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="min-w-0 max-sm:w-full flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            <table className={`${dataTable} min-w-[760px]`}>
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
                  <SkeletonRows cols={6} />
                ) : sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                      No {tab.toLowerCase()} orders found for this date range.
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map(order => {
                    const remaining = getRemainingUnits(Number(order.units), order.collected_units, order.order_status);
                    return (
                      <tr
                        key={order.id}
                        className={`cursor-pointer transition-colors ${highPriorityRowClass(order.priority)}`}
                        data-interactive-row
                        onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                      >
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">{formatDateTime(order.created_at)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-mono font-medium sm:px-5 sm:py-4 text-slate-900">
                          {getFormattedTxnId(order.id, 'sale', order, branches)}
                          {order.derived_from_sale_id && (
                            <span className="ml-1.5 text-[10px] font-semibold text-indigo-600">(split)</span>
                          )}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium text-right sm:px-5 sm:py-4 text-slate-600">{formatUnits(order.units)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-amber-600">{formatUnits(remaining)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4"><PriorityBadge priority={order.priority} /></td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4" onClick={e => e.stopPropagation()}>
                          <WarehouseOrderStatusCard order={order} />
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
              <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
            ) : sortedOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No orders found.</div>
            ) : (
              sortedOrders.map(order => {
                const remaining = getRemainingUnits(Number(order.units), order.collected_units, order.order_status);
                return (
                  <div
                    key={order.id}
                    onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer hover:bg-slate-50 transition-colors ${highPriorityCardClass(order.priority)}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-mono font-semibold text-slate-900">{getFormattedTxnId(order.id, 'sale', order, branches)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(order.created_at)}</p>
                      </div>
                      <PriorityBadge priority={order.priority} />
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                      <span>Units: <strong className="text-slate-700">{formatUnits(order.units)}</strong></span>
                      <span>To deliver: <strong className="text-amber-600">{formatUnits(remaining)}</strong></span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-50 pt-2">
                      <div className="min-w-0" onClick={e => e.stopPropagation()}>
                        <WarehouseOrderStatusCard order={order} />
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-bold text-accent hover:text-accent/80"
                        onClick={e => { e.stopPropagation(); setSelectedOrder(order); setDetailsModalOpen(true); }}
                      >
                        Update / View Details →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {detailsModalOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isDeliveryView={true}
          onClose={() => setDetailsModalOpen(false)}
          onSuccess={() => { setDetailsModalOpen(false); loadData(); refetchData(); }}
        />
      )}
    </PageShell>
  );
}
