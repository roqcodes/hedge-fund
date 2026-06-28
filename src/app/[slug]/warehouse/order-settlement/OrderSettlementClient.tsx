'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell } from '@/components/ic-transfer/ui';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { dataTable, tableWrap, tabBtn, tabBtnActive } from '@/lib/ui';
import { fetchDeliveryAgentOrders } from '@/app/actions/warehouseActions';
import { formatDateTime } from '@/data/mockData';
import OrderDetailsModal from '../settlement/OrderDetailsModal';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { StatusBadge, PriorityBadge, SkeletonRows } from '@/components/warehouse/shared';
import { resolveDateRange } from '@/lib/warehouseDateUtils';
import type { WarehouseOrder } from '@/types/warehouse';

type TabKey = 'Pending' | 'Completed';
type SortField = 'Date' | 'Customer' | 'Units' | 'Total AED' | 'Remaining' | 'Priority' | 'Status';

export default function OrderSettlementClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast } = useApp();

  const [orders, setOrders]   = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabKey>('Pending');
  const [search, setSearch]   = useState('');

  // Date filter (default = today)
  const [dateFilter, setDateFilter]           = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate]     = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      const matchTab =
        tab === 'Pending'
          ? o.delivery_status === 'Pending' || o.delivery_status === 'Partial' || !o.delivery_status
          : o.delivery_status === 'Completed';
      const matchSearch =
        o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [orders, tab, search]);

  const sortedOrders = useMemo<WarehouseOrder[]>(() => {
    return [...filteredOrders].sort((a, b) => {
      let vA: any, vB: any;
      switch (sortField) {
        case 'Customer': vA = a.customer_name;                                 vB = b.customer_name;                                 break;
        case 'Units':    vA = Number(a.units);                                 vB = Number(b.units);                                 break;
        case 'Total AED':vA = Number(a.aed_amount);                            vB = Number(b.aed_amount);                            break;
        case 'Remaining':vA = Number(a.aed_amount) - Number(a.collected_amount || 0); vB = Number(b.aed_amount) - Number(b.collected_amount || 0); break;
        case 'Priority': vA = a.priority || 'Normal';                          vB = b.priority || 'Normal';                          break;
        case 'Status':   vA = a.delivery_status || 'Pending';                  vB = b.delivery_status || 'Pending';                  break;
        default:         vA = new Date(a.created_at).getTime();                vB = new Date(b.created_at).getTime();
      }
      if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
      if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortOrder]);

  const pendingCount   = orders.filter(o => o.delivery_status === 'Pending' || o.delivery_status === 'Partial' || !o.delivery_status).length;
  const completedCount = orders.filter(o => o.delivery_status === 'Completed').length;

  const COLS: { label: SortField; align: 'left' | 'right' | 'center' }[] = [
    { label: 'Date',      align: 'left'   },
    { label: 'Customer',  align: 'left'   },
    { label: 'Units',     align: 'right'  },
    { label: 'Total AED', align: 'right'  },
    { label: 'Remaining', align: 'right'  },
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

      <div className="flex flex-col gap-6">
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
        </div>

        {/* Table card */}
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
          <div className="flex flex-col gap-3 px-4 pb-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">My Orders</h3>
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:max-w-xs rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
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
                  <SkeletonRows cols={7} />
                ) : sortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      No {tab.toLowerCase()} orders found for this date range.
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map(order => {
                    const remaining = Math.max(0, Number(order.aed_amount || 0) - Number(order.collected_amount || 0));
                    return (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        data-interactive-row
                        onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                      >
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">{formatDateTime(order.created_at)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4 text-slate-900">{order.customer_name}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium text-right sm:px-5 sm:py-4 text-slate-600">{Number(order.units).toLocaleString()}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-slate-900">{Number(order.aed_amount || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">AED</span></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-amber-600">{remaining.toLocaleString()} <span className="text-[10px] font-normal text-amber-400">AED</span></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4"><PriorityBadge priority={order.priority} /></td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4"><StatusBadge status={order.delivery_status} /></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="flex md:hidden flex-col gap-3 py-4 px-4">
            {loading ? (
              <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
            ) : sortedOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No orders found.</div>
            ) : (
              sortedOrders.map(order => {
                const remaining = Math.max(0, Number(order.aed_amount || 0) - Number(order.collected_amount || 0));
                return (
                  <div
                    key={order.id}
                    onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{order.customer_name}</p>
                        <p className="text-xs font-mono text-slate-500">{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(order.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={order.delivery_status} />
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                      <span>Units: <strong className="text-slate-700">{Number(order.units).toLocaleString()}</strong></span>
                      <span className="text-right">Total: <strong className="text-accent">{Number(order.aed_amount || 0).toLocaleString()} AED</strong></span>
                      <span>Collected: <strong className="text-emerald-600">{Number(order.collected_amount || 0).toLocaleString()} AED</strong></span>
                      <span className="text-right">Remaining: <strong className="text-amber-600">{remaining.toLocaleString()} AED</strong></span>
                    </div>
                    <div className="flex justify-end pt-1 border-t border-slate-50">
                      <button className="text-xs font-bold text-accent hover:text-accent/80" onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}>Update / View Details →</button>
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
          onSuccess={() => { setDetailsModalOpen(false); loadData(); }}
        />
      )}
    </PageShell>
  );
}
