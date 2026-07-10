import type { ICSale } from '@/types';
import { isByHandSale, canAdminCompleteByHand, canAdminReopenByHand } from './byHand';
import { isCustomerEnteredOrder } from './branchOrderOwnership';
import { isBranchHandledSale } from './fulfillmentHandler';
import {
  normalizeOrderStatus,
  canAdminAccept,
  canAdminReject,
  canAdminReassignWarehouse,
  canAdminVerifyDelivery,
  type ICOrderStatus,
} from './orderStatus';

/**
 * Orders that stay visible in date-filtered lists regardless of created date.
 * Broader than edit/delete — e.g. customer `pending` at admin is read-only but still shown.
 */
export const DATE_FILTER_PINNED_STATUSES: ICOrderStatus[] = [
  'pending_branch_review',
  'pending',
  'branch_rejected',
  'admin_rejected',
];

export function isDateFilterPinnedStatus(status?: string | null): boolean {
  return DATE_FILTER_PINNED_STATUSES.includes(normalizeOrderStatus(status));
}

/** Customer ↔ branch level: edit while awaiting or fixing branch review. */
const CUSTOMER_EDIT_STATUSES: ICOrderStatus[] = [
  'pending_branch_review',
  'branch_rejected',
  'admin_rejected',
];

/** Customer ↔ branch level: delete only before branch forwards the order. */
const CUSTOMER_DELETE_STATUSES: ICOrderStatus[] = [
  'pending_branch_review',
  'branch_rejected',
];

/** Branch ↔ admin level: branch-submitted orders awaiting or fixing admin review. */
const BRANCH_STAFF_EDIT_STATUSES: ICOrderStatus[] = ['pending', 'admin_rejected'];

function canCustomerEditOrder(sale: ICSale): boolean {
  if (!sale.orderCustomerId || !isCustomerEnteredOrder(sale)) return false;
  return CUSTOMER_EDIT_STATUSES.includes(normalizeOrderStatus(sale.orderStatus));
}

function canCustomerDeleteOrder(sale: ICSale): boolean {
  if (!sale.orderCustomerId || !isCustomerEnteredOrder(sale)) return false;
  return CUSTOMER_DELETE_STATUSES.includes(normalizeOrderStatus(sale.orderStatus));
}

function canBranchStaffEditOrder(sale: ICSale): boolean {
  if (isCustomerEnteredOrder(sale)) return false;
  const status = normalizeOrderStatus(sale.orderStatus);
  if (isBranchHandledSale(sale)) {
    return status === 'pending';
  }
  return BRANCH_STAFF_EDIT_STATUSES.includes(status);
}

function canBranchStaffDeleteOrder(sale: ICSale): boolean {
  return canBranchStaffEditOrder(sale);
}

/** Edit allowed only while the order is pending at this role's adjacent upstream level. */
export function canEditOrder(sale: ICSale, role?: string | null): boolean {
  if (normalizeOrderStatus(sale.orderStatus) === 'unknown') return false;

  if (role === 'customer') {
    return canCustomerEditOrder(sale);
  }

  if (role === 'branch_manager' || role === 'staff') {
    return canBranchStaffEditOrder(sale);
  }

  return false;
}

/** Delete allowed only while the order is pending at this role's adjacent upstream level. */
export function canDeleteOrder(sale: ICSale, role?: string | null): boolean {
  if (normalizeOrderStatus(sale.orderStatus) === 'unknown') return false;

  if (role === 'customer') {
    return canCustomerDeleteOrder(sale);
  }

  if (role === 'branch_manager' || role === 'staff') {
    return canBranchStaffDeleteOrder(sale);
  }

  return false;
}

export function canRequestOrderCancellation(sale: ICSale, role?: string | null): boolean {
  if (normalizeOrderStatus(sale.orderStatus) !== 'accepted') return false;

  if (role === 'customer') {
    return isCustomerEnteredOrder(sale);
  }

  if (role === 'branch_manager' || role === 'staff') {
    return !isCustomerEnteredOrder(sale);
  }

  return false;
}

/** Branch manager resolves cancellation requested by a portal customer. */
export function canBranchResolveCustomerCancellation(sale: ICSale): boolean {
  return (
    normalizeOrderStatus(sale.orderStatus) === 'cancellation_pending' &&
    isCustomerEnteredOrder(sale)
  );
}

/** Admin resolves cancellation requested by branch staff. */
export function canAdminResolveBranchCancellation(sale: ICSale): boolean {
  return (
    normalizeOrderStatus(sale.orderStatus) === 'cancellation_pending' &&
    !isCustomerEnteredOrder(sale)
  );
}

export function hasAdminWorkflowActions(sale: ICSale): boolean {
  if (normalizeOrderStatus(sale.orderStatus) === 'unknown') return false;
  if (isBranchHandledSale(sale)) return false;

  const status = normalizeOrderStatus(sale.orderStatus);
  if (status === 'pending_branch_review') return false;

  if (canAdminAccept(sale.orderStatus)) return true;
  if (canAdminReject(sale.orderStatus)) return true;
  if (canAdminReassignWarehouse(sale.orderStatus)) return true;
  if (canAdminResolveBranchCancellation(sale)) return true;
  if (canAdminVerifyDelivery(sale.orderStatus)) return true;
  if (isByHandSale(sale) && (canAdminCompleteByHand(sale) || canAdminReopenByHand(sale))) {
    return true;
  }

  return false;
}

export function canAdminChangeFulfillmentHandler(sale: ICSale): boolean {
  return (
    !!sale.orderCustomerId &&
    normalizeOrderStatus(sale.orderStatus) === 'pending' &&
    !isBranchHandledSale(sale)
  );
}
