'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell, FilterChips } from '@/components/ic-transfer/ui';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { fetchWarehouseOrders, fetchDeliveryAgents, warehouseRejectOrder } from '@/app/actions/warehouseActions';
import { formatAED, formatDateTime } from '@/data/mockData';
import Link from 'next/link';
import KPICard from '@/components/ui/KPICard';
import { dataTable, tableWrap, kpiGrid } from '@/lib/ui';
import AssignDeliveryAgentModal from './settlement/AssignDeliveryAgentModal';
import OrderDetailsModal from './settlement/OrderDetailsModal';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { PriorityBadge, SkeletonRows } from '@/components/warehouse/shared';
import { WarehouseOrderStatusCard, WarehouseOrderWorkflowActions, WarehouseAgentNameCell } from '@/components/warehouse/WarehouseOrderStatusCell';
import RejectRemarkModal from '@/components/ic-transfer/shared/RejectRemarkModal';
import { highPriorityRowClass, highPriorityCardClass } from '@/lib/icTransfer/orderPriority';
import { formatUnits, isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import { resolveDateRange } from '@/lib/warehouseDateUtils';
import type { WarehouseOrder, DeliveryAgent } from '@/types/warehouse';

export default function WarehouseDashboardClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast, icWarehouses, icRegions, branches } = useApp();

  const [orders, setOrders]   = useState<WarehouseOrder[]>([]);
  const [agents, setAgents]   = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [location, setLocation] = useState('All');

  // Date filter (default = today)
  const [dateFilter, setDateFilter]           = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate]     = useState('');

  const [agentModalOpen,          setAgentModalOpen]          = useState(false);
  const [selectedOrderIdForAgent, setSelectedOrderIdForAgent] = useState<string | null>(null);
  const [viewModalOpen,           setViewModalOpen]           = useState(false);
  const [selectedOrderForView,    setSelectedOrderForView]    = useState<WarehouseOrder | null>(null);
  const [rejectOrder,             setRejectOrder]             = useState<WarehouseOrder | null>(null);
  const [rejectLoading,           setRejectLoading]           = useState(false);

  const isDeliveryRole  = user?.role?.startsWith('delivery_');
  const isWarehouseRole = user?.role?.startsWith('warehouse_') || user?.role === 'branch_manager' || user?.role === 'admin';
  const canAssignAgents = isWarehouseRole && !isDeliveryRole;

  const rawRoleId       = (user?.role?.startsWith('warehouse_') || user?.role?.startsWith('delivery_')) ? user.role.split('_')[1] : null;
  const roleWarehouseId = rawRoleId ? icWarehouses.find((w: any) => w.id.startsWith(rawRoleId))?.id : null;

  const filteredWarehouses = useMemo(() => {
    if (location === 'All') return icWarehouses;
    const region = icRegions.find((r: any) => r.name === location);
    if (!region) return icWarehouses;
    return icWarehouses.filter((w: any) => w.regionId === region.id);
  }, [icWarehouses, icRegions, location]);

  useEffect(() => {
    if (roleWarehouseId) {
      setSelectedWarehouseId(roleWarehouseId);
    } else if (filteredWarehouses.length > 0) {
      if (!selectedWarehouseId || !filteredWarehouses.find((w: any) => w.id === selectedWarehouseId)) {
        setSelectedWarehouseId(filteredWarehouses[0].id);
      }
    } else {
      setSelectedWarehouseId('');
    }
  }, [roleWarehouseId, filteredWarehouses, selectedWarehouseId]);

  const loadData = useCallback(async () => {
    if (!selectedWarehouseId) { setLoading(false); return; }
    setLoading(true);
    const { dateFrom, dateTo } = resolveDateRange(dateFilter, customStartDate, customEndDate);
    const [ordersRes, agentsRes] = await Promise.all([
      fetchWarehouseOrders(selectedWarehouseId, { dateFrom, dateTo }),
      fetchDeliveryAgents(selectedWarehouseId),
    ]);
    if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data as WarehouseOrder[]);
    else showToast(ordersRes.error || 'Failed to load orders', 'error');
    if (agentsRes.success && agentsRes.data) setAgents(agentsRes.data as DeliveryAgent[]);
    setLoading(false);
  }, [selectedWarehouseId, showToast, dateFilter, customStartDate, customEndDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const displayedOrders = useMemo<WarehouseOrder[]>(() => {
    if (isDeliveryRole) {
      return orders.filter(o => o.delivery_agent_email === user?.email);
    }
    return orders;
  }, [orders, user, isDeliveryRole]);

  const kpis = useMemo(() => {
    const totalOrders   = displayedOrders.length;
    const totalUnits    = displayedOrders.reduce((s, o) => s + Number(o.units || 0), 0);
    const pendingOrders = displayedOrders.filter(o => !isSaleCompleted(o.order_status)).length;
    const completedOrders = displayedOrders.filter(o => isSaleCompleted(o.order_status)).length;
    const splitOrders = displayedOrders.filter(o => !!o.derived_from_sale_id).length;
    return { totalOrders, totalUnits, pendingOrders, completedOrders, splitOrders };
  }, [displayedOrders]);

  const agentOrderForModal = useMemo(
    () => (selectedOrderIdForAgent ? orders.find(o => o.id === selectedOrderIdForAgent) : undefined),
    [orders, selectedOrderIdForAgent],
  );

  const openAssignModal = (orderId: string) => {
    setSelectedOrderIdForAgent(orderId);
    setAgentModalOpen(true);
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

  return (
    <PageShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
        <PageHeader title="Warehouse Portal Dashboard" />
        {!roleWarehouseId && filteredWarehouses.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-sm font-semibold text-slate-500">Warehouse:</label>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 outline-none shadow-surface-xs"
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
            >
              {filteredWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Date filter */}
      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      {!roleWarehouseId && (
        <div className="mb-4">
          <FilterChips
            options={['All', ...icRegions.map((r: any) => r.name)]}
            value={location}
            onChange={setLocation}
          />
        </div>
      )}

      <div className="flex flex-col gap-8">
        {/* KPI Cards */}
        <div className={`${kpiGrid} grid-cols-2 lg:grid-cols-4`}>
          <KPICard
            label="Total Orders"
            value={`${kpis.totalOrders} Orders`}
            subValue={`${kpis.totalUnits.toLocaleString()} total units`}
            color="var(--blue)"
            bgColor="var(--blue-light)"
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>}
          />
          <KPICard
            label="Total Units"
            value={`${kpis.totalUnits.toLocaleString()} Units`}
            subValue="Across all orders"
            color="var(--profit)"
            bgColor="var(--profit-light)"
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>}
          />
          <KPICard
            label="Completed"
            value={`${kpis.completedOrders} Done`}
            subValue={`${kpis.pendingOrders} still active`}
            color="var(--pending)"
            bgColor="var(--pending-light)"
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
          <KPICard
            label="Split Orders"
            value={`${kpis.splitOrders} Split`}
            subValue="From partial deliveries"
            color="var(--accent)"
            bgColor="var(--accent-light)"
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
          />
        </div>

        {/* Recent Deliveries Table */}
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 pb-4 px-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">Recent Deliveries</h3>
            <Link
              href={`/${branchSlug}/warehouse/${isDeliveryRole ? 'order-settlement' : 'settlement'}`}
              className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              View all &rarr;
            </Link>
          </div>

          {/* Desktop table */}
          <div className={`${tableWrap} hidden md:block`}>
            <table className={`${dataTable} min-w-[760px]`}>
              <thead>
                <tr>
                  {['Date', 'Order ID', 'Customer', 'Units', 'Priority', 'Agent', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-3 pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5 ${h === 'Actions' || h === 'Status' || h === 'Priority' ? 'text-center' : h === 'Agent' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows cols={8} />
                ) : displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No orders found for today. Try a different date range.</td>
                  </tr>
                ) : (
                  displayedOrders.slice(0, 8).map(order => (
                    <tr
                      key={order.id}
                      className={`cursor-pointer transition-colors ${highPriorityRowClass(order.priority)}`}
                      data-interactive-row
                      onClick={() => { setSelectedOrderForView(order); setViewModalOpen(true); }}
                    >
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">{formatDateTime(order.created_at)}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-mono sm:px-5 sm:py-4 text-slate-600">{getFormattedTxnId(order.id, 'sale', order, branches)}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4 text-slate-900">{order.customer_name}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4 text-slate-900">{formatUnits(order.units)}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4"><PriorityBadge priority={order.priority} /></td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-right sm:px-5 sm:py-4">
                        <WarehouseAgentNameCell order={order} />
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4" onClick={e => e.stopPropagation()}>
                        <WarehouseOrderStatusCard order={order} />
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-center last:rounded-r-2xl sm:px-5 sm:py-4" onClick={e => e.stopPropagation()}>
                        <WarehouseOrderWorkflowActions
                          order={order}
                          canAssignAgents={canAssignAgents}
                          onReject={e => { e.stopPropagation(); setRejectOrder(order); }}
                          onAssign={e => { e.stopPropagation(); openAssignModal(order.id); }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view — fully featured */}
          <div className="flex md:hidden flex-col gap-3 py-4 px-4">
            {loading ? (
              <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
            ) : displayedOrders.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No orders found for today.</div>
            ) : (
              displayedOrders.slice(0, 8).map(order => (
                <div
                  key={order.id}
                  onClick={() => { setSelectedOrderForView(order); setViewModalOpen(true); }}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer hover:bg-slate-50 transition-colors ${highPriorityCardClass(order.priority)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-900">{order.customer_name}</span>
                      <span className="text-xs font-mono text-slate-500">{getFormattedTxnId(order.id, 'sale', order, branches)}</span>
                    </div>
                    <PriorityBadge priority={order.priority} />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl">
                    <span>Units: <strong className="text-slate-700">{formatUnits(order.units)}</strong></span>
                    <WarehouseAgentNameCell order={order} />
                  </div>
                  <div className="flex justify-end items-end gap-2 pt-2 border-t border-slate-50" onClick={e => e.stopPropagation()}>
                    <WarehouseOrderStatusCard order={order} />
                    <WarehouseOrderWorkflowActions
                      order={order}
                      canAssignAgents={canAssignAgents}
                      onReject={e => { e.stopPropagation(); setRejectOrder(order); }}
                      onAssign={e => { e.stopPropagation(); openAssignModal(order.id); }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {agentModalOpen && agentOrderForModal && (
        <AssignDeliveryAgentModal
          order={agentOrderForModal}
          agents={agents}
          onClose={() => { setAgentModalOpen(false); setSelectedOrderIdForAgent(null); }}
          onSuccess={loadData}
        />
      )}
      {viewModalOpen && selectedOrderForView && (
        <OrderDetailsModal
          order={selectedOrderForView}
          isDeliveryView={isDeliveryRole ?? false}
          onClose={() => { setViewModalOpen(false); setSelectedOrderForView(null); }}
          onSuccess={() => { setViewModalOpen(false); setSelectedOrderForView(null); loadData(); }}
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
