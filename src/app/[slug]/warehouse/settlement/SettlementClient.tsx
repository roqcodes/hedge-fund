'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell } from '@/components/ic-transfer/ui';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { dataTable, tableWrap, filterSelect, btnPrimary, btnSecondary, tabBtn, tabBtnActive } from '@/lib/ui';
import {
  fetchWarehouseOrders,
  fetchDeliveryAgents,
  assignOrderToAgent,
} from '@/app/actions/warehouseActions';
import { formatDateTime } from '@/data/mockData';
import AssignDeliveryAgentModal from './AssignDeliveryAgentModal';
import OrderDetailsModal from './OrderDetailsModal';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { StatusBadge, PriorityBadge, SkeletonRows } from '@/components/warehouse/shared';
import { resolveDateRange } from '@/lib/warehouseDateUtils';
import type { WarehouseOrder, DeliveryAgent } from '@/types/warehouse';

type TabKey = 'Pending' | 'Completed';

type SortField =
  | 'Date'
  | 'Customer'
  | 'Units'
  | 'Total AED'
  | 'Collected Amount'
  | 'Remaining Amount'
  | 'Priority'
  | 'Status'
  | 'Agent';

export default function SettlementClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast, icWarehouses } = useApp();

  const [orders, setOrders]   = useState<WarehouseOrder[]>([]);
  const [agents, setAgents]   = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<TabKey>('Pending');
  const [search, setSearch]   = useState('');

  // Date filter (default = today)
  const [dateFilter, setDateFilter]         = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate]     = useState('');

  // Column filters
  const [filterAgent,    setFilterAgent]    = useState('All');
  const [filterStatus,   setFilterStatus]   = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Sort
  const [sortField, setSortField] = useState<SortField>('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [assignModalOpen,  setAssignModalOpen]  = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder,    setSelectedOrder]    = useState<WarehouseOrder | null>(null);

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
    const [ordersRes, agentsRes] = await Promise.all([
      fetchWarehouseOrders(warehouseId, { dateFrom, dateTo }),
      fetchDeliveryAgents(warehouseId),
    ]);

    if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data as WarehouseOrder[]);
    else showToast(ordersRes.error || 'Failed to fetch orders', 'error');

    if (agentsRes.success && agentsRes.data) setAgents(agentsRes.data as DeliveryAgent[]);

    setLoading(false);
  }, [warehouseId, showToast, dateFilter, customStartDate, customEndDate]);

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

  /* ─── filtering ─────────────────────────────────────────── */
  const filteredOrders = useMemo<WarehouseOrder[]>(() => {
    return orders
      .filter(o =>
        tab === 'Pending'
          ? o.delivery_status === 'Pending' || o.delivery_status === 'Partial' || !o.delivery_status
          : o.delivery_status === 'Completed',
      )
      .filter(o => {
        if (filterAgent === 'Unassigned') return !o.delivery_agent_id;
        if (filterAgent !== 'All')        return o.delivery_agent_id === filterAgent;
        return true;
      })
      .filter(o => {
        if (filterStatus !== 'All') return (o.delivery_status || 'Pending') === filterStatus;
        return true;
      })
      .filter(o => {
        if (filterPriority !== 'All') return (o.priority || 'Normal') === filterPriority;
        return true;
      })
      .filter(o =>
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase()),
      );
  }, [orders, tab, search, filterAgent, filterStatus, filterPriority]);

  /* ─── sorting ────────────────────────────────────────────── */
  const sortedOrders = useMemo<WarehouseOrder[]>(() => {
    return [...filteredOrders].sort((a, b) => {
      let vA: any, vB: any;
      switch (sortField) {
        case 'Customer':          vA = a.customer_name || '';        vB = b.customer_name || '';        break;
        case 'Units':             vA = Number(a.units);              vB = Number(b.units);              break;
        case 'Total AED':         vA = Number(a.aed_amount);         vB = Number(b.aed_amount);         break;
        case 'Collected Amount':  vA = Number(a.collected_amount);   vB = Number(b.collected_amount);   break;
        case 'Remaining Amount':  vA = Number(a.aed_amount) - Number(a.collected_amount || 0);
                                  vB = Number(b.aed_amount) - Number(b.collected_amount || 0);          break;
        case 'Priority':          vA = a.priority || 'Normal';       vB = b.priority || 'Normal';       break;
        case 'Status':            vA = a.delivery_status || 'Pending'; vB = b.delivery_status || 'Pending'; break;
        case 'Agent':             vA = a.delivery_agent_name || ''; vB = b.delivery_agent_name || ''; break;
        default:                  vA = new Date(a.created_at).getTime(); vB = new Date(b.created_at).getTime();
      }
      if (vA < vB) return sortOrder === 'asc' ? -1 : 1;
      if (vA > vB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortOrder]);

  const COLS: { label: SortField; align: 'left' | 'right' | 'center' }[] = [
    { label: 'Date',             align: 'left'   },
    { label: 'Customer',         align: 'left'   },
    { label: 'Units',            align: 'right'  },
    { label: 'Total AED',        align: 'right'  },
    { label: 'Collected Amount', align: 'right'  },
    { label: 'Remaining Amount', align: 'right'  },
    { label: 'Priority',         align: 'center' },
    { label: 'Status',           align: 'center' },
    { label: 'Agent',            align: 'left'   },
  ];

  return (
    <PageShell>
      <PageHeader title="Order Settlement" subtitle="Warehouse Portal / Order Settlement" />

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
            Pending Orders
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
              {orders.filter(o => o.delivery_status === 'Pending' || o.delivery_status === 'Partial' || !o.delivery_status).length}
            </span>
          </button>
          <button onClick={() => setTab('Completed')} className={tab === 'Completed' ? tabBtnActive : tabBtn}>
            Completed Orders
            <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
              {orders.filter(o => o.delivery_status === 'Completed').length}
            </span>
          </button>
        </div>

        {/* Table Card */}
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-4 pb-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">Orders</h3>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:max-w-[200px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
              <select value={filterAgent}    onChange={e => setFilterAgent(e.target.value)}    className={filterSelect}>
                <option value="All">All Agents</option>
                <option value="Unassigned">Unassigned</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={filterStatus}   onChange={e => setFilterStatus(e.target.value)}   className={filterSelect}>
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Completed">Completed</option>
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
                      No {tab.toLowerCase()} orders found for this date range.
                    </td>
                  </tr>
                ) : (
                  sortedOrders.map(order => {
                    const remaining = Math.max(0, Number(order.aed_amount || 0) - Number(order.collected_amount || 0));
                    return (
                      <tr
                        key={order.id}
                        onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        data-interactive-row
                      >
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">{formatDateTime(order.created_at)}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4 text-slate-900">{order.customer_name}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium text-right sm:px-5 sm:py-4 text-slate-600">{Number(order.units).toLocaleString()}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-slate-900">{Number(order.aed_amount || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">AED</span></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-emerald-600">{Number(order.collected_amount || 0).toLocaleString()} <span className="text-[10px] font-normal text-emerald-400">AED</span></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-right sm:px-5 sm:py-4 text-amber-600">{remaining.toLocaleString()} <span className="text-[10px] font-normal text-amber-400">AED</span></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4"><PriorityBadge priority={order.priority} /></td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4"><StatusBadge status={order.delivery_status} /></td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-left last:rounded-r-2xl sm:px-5 sm:py-4">
                          {order.delivery_agent_name ? (
                            <span
                              className={`font-semibold ${canAssignAgents ? 'text-accent cursor-pointer hover:underline' : 'text-slate-900'}`}
                              onClick={canAssignAgents ? e => { e.stopPropagation(); setSelectedOrder(order); setAssignModalOpen(true); } : undefined}
                            >
                              {order.delivery_agent_name}
                            </span>
                          ) : canAssignAgents ? (
                            <button
                              onClick={e => { e.stopPropagation(); setSelectedOrder(order); setAssignModalOpen(true); }}
                              className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                            >
                              Assign Agent
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          )}
                        </td>
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
              <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
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
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-slate-900">{order.customer_name}</span>
                        <span className="text-xs font-mono text-slate-500">{order.id.slice(0, 8)}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(order.created_at)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={order.delivery_status} />
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                      <span>Units: <strong className="text-slate-700">{Number(order.units).toLocaleString()}</strong></span>
                      <span>Total: <strong className="text-accent">{Number(order.aed_amount || 0).toLocaleString()} AED</strong></span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                      <span>Collected: <strong className="text-emerald-600">{Number(order.collected_amount || 0).toLocaleString()} AED</strong></span>
                      <span>Remaining: <strong className="text-amber-600">{remaining.toLocaleString()} AED</strong></span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                      {canAssignAgents && (
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedOrder(order); setAssignModalOpen(true); }}
                          className="text-xs font-bold text-accent hover:text-accent/80"
                        >
                          {order.delivery_agent_name ? `Agent: ${order.delivery_agent_name}` : 'Assign Agent'}
                        </button>
                      )}
                      {!canAssignAgents && (
                        <span className="text-xs text-slate-500">{order.delivery_agent_name || 'Unassigned'}</span>
                      )}
                      <button onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }} className="text-xs font-bold text-slate-500 hover:text-slate-700">
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
          onSuccess={() => { setDetailsModalOpen(false); loadData(); }}
        />
      )}
    </PageShell>
  );
}
