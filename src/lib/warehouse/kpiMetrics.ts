import { isWarehouseRejected } from '@/lib/icTransfer/orderStatus';
import { getDeliveredUnits, getRemainingUnits, isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import type { WarehouseOrder } from '@/types/warehouse';

export type WarehouseKpiMetrics = {
  currentStock: number | null;
  reserved: number;
  remaining: number;
  totalOrders: number;
  totalCompleted: number;
  totalPending: number;
  splitOrders: number;
};

type PendingPredicate = (order: WarehouseOrder) => boolean;

function sumOrderUnits(orders: WarehouseOrder[]): number {
  return orders.reduce((sum, o) => sum + Number(o.units || 0), 0);
}

function computeAvailableStock(currentStock: number | null, reserved: number): number {
  if (currentStock === null) return 0;
  return Math.max(0, currentStock - reserved);
}

/** Warehouse manager view — pending = active, non-rejected orders. */
export function computeWarehouseSettlementKpis(
  orders: WarehouseOrder[],
  currentStock: number | null,
  undeliveredOrders?: WarehouseOrder[],
): WarehouseKpiMetrics {
  const isPending: PendingPredicate = o =>
    !isSaleCompleted(o.order_status) && !isWarehouseRejected(o.order_status);

  const pendingOrders = orders.filter(isPending);
  const reservedOrders = undeliveredOrders ?? pendingOrders;
  const completedOrders = orders.filter(o => isSaleCompleted(o.order_status));
  const splitOrders = orders.filter(o => !!o.derived_from_sale_id);
  const reserved = sumOrderUnits(reservedOrders.filter(isPending));

  return {
    currentStock,
    reserved,
    remaining: computeAvailableStock(currentStock, reserved),
    totalOrders: orders.length,
    totalCompleted: completedOrders.length,
    totalPending: pendingOrders.length,
    splitOrders: splitOrders.length,
  };
}

/** Delivery agent view — pending = wh_processing assigned orders. */
export function computeDeliveryAgentKpis(orders: WarehouseOrder[]): WarehouseKpiMetrics {
  const pendingOrders = orders.filter(o => {
    const status = o.order_status || 'pending';
    return !isSaleCompleted(status) && status === 'wh_processing';
  });
  const completedOrders = orders.filter(o => isSaleCompleted(o.order_status));
  const splitOrders = orders.filter(o => !!o.derived_from_sale_id);

  let totalUnits = 0;
  let deliveredUnits = 0;
  let toDeliverUnits = 0;

  for (const order of orders) {
    const units = Number(order.units || 0);
    totalUnits += units;
    deliveredUnits += getDeliveredUnits(units, order.collected_units, order.order_status);
    toDeliverUnits += getRemainingUnits(units, order.collected_units, order.order_status);
  }

  return {
    currentStock: totalUnits,
    reserved: toDeliverUnits,
    remaining: deliveredUnits,
    totalOrders: orders.length,
    totalCompleted: completedOrders.length,
    totalPending: pendingOrders.length,
    splitOrders: splitOrders.length,
  };
}
