import type { ICSale } from '@/types';
import { normalizeOrderStatus } from './orderStatus';

export type FulfillmentHandler = 'hq_admin' | 'branch';

export function isBranchHandledSale(
  sale: Pick<ICSale, 'fulfillmentHandler'> | null | undefined,
): boolean {
  return sale?.fulfillmentHandler === 'branch';
}

export function isHqAdminHandledSale(
  sale: Pick<ICSale, 'fulfillmentHandler'> | null | undefined,
): boolean {
  return !isBranchHandledSale(sale);
}

/** Customer-portal orders (admin may assign branch vs HQ handling). */
export function isCustomerCreatedOrder(sale: Pick<ICSale, 'orderCustomerId'>): boolean {
  return !!sale.orderCustomerId;
}

export function canBranchCompleteHandled(
  sale: Pick<ICSale, 'fulfillmentHandler' | 'orderStatus' | 'warehouseId'>,
): boolean {
  return (
    isBranchHandledSale(sale) &&
    !!sale.warehouseId &&
    normalizeOrderStatus(sale.orderStatus) === 'accepted'
  );
}

export function canBranchReopenHandled(
  sale: Pick<ICSale, 'fulfillmentHandler' | 'orderStatus'>,
): boolean {
  return isBranchHandledSale(sale) && normalizeOrderStatus(sale.orderStatus) === 'completed';
}

export function canBranchEditHandledOrder(sale: ICSale): boolean {
  if (!isBranchHandledSale(sale)) return false;
  return normalizeOrderStatus(sale.orderStatus) === 'pending';
}

/** Exclude branch-handled orders from HQ admin warehouse queues. */
export const SQL_EXCLUDE_BRANCH_HANDLED_FROM_HQ_WAREHOUSE =
  `fulfillment_handler IS DISTINCT FROM 'branch'`;

export function getFulfillmentHandlerLabel(handler?: FulfillmentHandler | null): string {
  return handler === 'branch' ? 'Branch' : 'Admin';
}
