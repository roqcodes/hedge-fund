import type { ICSale } from '@/types';
import { normalizeOrderStatus } from './orderStatus';

export function isByHandSale(sale: Pick<ICSale, 'transactionType'>): boolean {
  return sale.transactionType === 'by_hand';
}

/** SQL fragment — exclude by-hand orders from warehouse / delivery queues. */
export const SQL_EXCLUDE_BY_HAND_FROM_WAREHOUSE = `transaction_type IS DISTINCT FROM 'by_hand'`;

export function canAdminCompleteByHand(
  sale: Pick<ICSale, 'transactionType' | 'orderStatus' | 'warehouseId'>,
): boolean {
  return (
    isByHandSale(sale) &&
    !!sale.warehouseId &&
    normalizeOrderStatus(sale.orderStatus) === 'accepted'
  );
}

export function canAdminReopenByHand(
  sale: Pick<ICSale, 'transactionType' | 'orderStatus'>,
): boolean {
  return isByHandSale(sale) && normalizeOrderStatus(sale.orderStatus) === 'completed';
}

export function isByHandAwaitingCompletion(
  sale: Pick<ICSale, 'transactionType' | 'orderStatus' | 'warehouseId'>,
): boolean {
  return canAdminCompleteByHand(sale);
}
