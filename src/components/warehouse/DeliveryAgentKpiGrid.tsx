'use client';

import React, { useMemo } from 'react';
import KPICard from '@/components/ui/KPICard';
import { kpiGrid } from '@/lib/ui';
import { isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import type { WarehouseOrder } from '@/types/warehouse';

type DeliveryAgentKpiGridProps = {
  orders: WarehouseOrder[];
};

export default function DeliveryAgentKpiGrid({ orders }: DeliveryAgentKpiGridProps) {
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((s, o) => s + Number(o.units || 0), 0);
    const pendingOrders = orders.filter(o => !isSaleCompleted(o.order_status)).length;
    const completedOrders = orders.filter(o => isSaleCompleted(o.order_status)).length;
    const splitOrders = orders.filter(o => !!o.derived_from_sale_id).length;
    return { totalOrders, totalUnits, pendingOrders, completedOrders, splitOrders };
  }, [orders]);

  return (
    <div className={`${kpiGrid} grid-cols-2 lg:grid-cols-4`}>
      <KPICard
        label="Total Orders"
        value={`${kpis.totalOrders} Orders`}
        subValue={`${kpis.totalUnits.toLocaleString()} total units`}
        color="var(--blue)"
        bgColor="var(--blue-light)"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        }
      />
      <KPICard
        label="Total Units"
        value={`${kpis.totalUnits.toLocaleString()} Units`}
        subValue="Across all orders"
        color="var(--profit)"
        bgColor="var(--profit-light)"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
          </svg>
        }
      />
      <KPICard
        label="Completed"
        value={`${kpis.completedOrders} Done`}
        subValue={`${kpis.pendingOrders} still active`}
        color="var(--pending)"
        bgColor="var(--pending-light)"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        }
      />
      <KPICard
        label="Split Orders"
        value={`${kpis.splitOrders} Split`}
        subValue="From partial deliveries"
        color="var(--accent)"
        bgColor="var(--accent-light)"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        }
      />
    </div>
  );
}
