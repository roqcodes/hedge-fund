import type { ICSale } from '@/types';

/** Internal workflow status — visible in admin panel only. */
export type ICOrderStatus =
  | 'pending'
  | 'accepted'
  | 'admin_rejected'
  | 'wh_rejected'
  | 'wh_processing'
  | 'da_rejected'
  | 'cancellation_pending'
  | 'cancelled'
  | 'completed';

/** Simplified status shown to branch/customer. */
export type ICCustomerOrderStatus =
  | 'Pending'
  | 'Admin Accepted'
  | 'Warehouse Processing'
  | 'Order Dispatched'
  | 'Cancellation Requested'
  | 'Cancelled'
  | 'Partial'
  | 'Paid'
  | 'Completed'
  | 'Rejected';

export const IC_ORDER_STATUSES: ICOrderStatus[] = [
  'pending',
  'accepted',
  'admin_rejected',
  'wh_rejected',
  'wh_processing',
  'da_rejected',
  'cancellation_pending',
  'cancelled',
  'completed',
];

export const ADMIN_STATUS_LABELS: Record<ICOrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Admin Accepted',
  admin_rejected: 'Admin Rejected',
  wh_rejected: 'WH Rejected',
  wh_processing: 'WH Processing',
  da_rejected: 'Delivery Agent Rejected',
  cancellation_pending: 'Cancellation Pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const ADMIN_STATUS_STYLES: Record<ICOrderStatus, string> = {
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200',
  admin_rejected: 'bg-red-50 text-red-700 border-red-200',
  wh_rejected: 'bg-orange-50 text-orange-700 border-orange-200',
  wh_processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  da_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  cancellation_pending: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const CUSTOMER_STATUS_STYLES: Record<ICCustomerOrderStatus, string> = {
  Pending: 'bg-slate-50 text-slate-600 border-slate-200',
  'Admin Accepted': 'bg-blue-50 text-blue-700 border-blue-200',
  'Warehouse Processing': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Order Dispatched': 'bg-violet-50 text-violet-700 border-violet-200',
  'Cancellation Requested': 'bg-red-50 text-red-700 border-red-200',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

/**
 * Left-to-right row gradient accent for the admin sales table.
 * Pending orders get a yellow gradient; cancellation requests get a red one.
 */
export function getAdminRowAccentClass(status?: string | null): string | null {
  const s = normalizeOrderStatus(status);
  if (s === 'cancellation_pending') {
    return 'bg-gradient-to-l from-red-100 via-red-50/50 to-transparent hover:from-red-200/90 hover:via-red-100/50';
  }
  if (s === 'pending') {
    return 'bg-gradient-to-l from-amber-100 via-amber-50/50 to-transparent hover:from-amber-200/90 hover:via-amber-100/50';
  }
  return null;
}

/** Mobile card accent mirroring the row gradient. */
export function getAdminCardAccentClass(status?: string | null): string | null {
  const s = normalizeOrderStatus(status);
  if (s === 'cancellation_pending') {
    return 'border-red-200 bg-gradient-to-l from-red-100 to-white ring-1 ring-red-100';
  }
  if (s === 'pending') {
    return 'border-amber-200 bg-gradient-to-l from-amber-100 to-white ring-1 ring-amber-100';
  }
  return null;
}

export function normalizeOrderStatus(status?: string | null): ICOrderStatus {
  if (status && IC_ORDER_STATUSES.includes(status as ICOrderStatus)) {
    return status as ICOrderStatus;
  }
  return 'pending';
}

/** Map internal workflow state to customer-facing label. */
export function getCustomerOrderStatus(
  sale: Pick<ICSale, 'orderStatus' | 'deliveryAgentId' | 'aedAmount' | 'paymentStatus' | 'derivedFromSaleId'>,
): ICCustomerOrderStatus {
  const status = normalizeOrderStatus(sale.orderStatus);

  if (status === 'admin_rejected') return 'Rejected';
  if (status === 'cancellation_pending') return 'Cancellation Requested';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'pending') return 'Pending';
  if (status === 'accepted') return 'Admin Accepted';

  if (status === 'wh_rejected') return 'Admin Accepted';
  if (status === 'da_rejected') return 'Warehouse Processing';

  if (status === 'wh_processing') {
    return sale.deliveryAgentId ? 'Order Dispatched' : 'Warehouse Processing';
  }

  if (status === 'completed') {
    if (sale.paymentStatus === 'paid') return 'Paid';
    if (sale.paymentStatus === 'partial') return 'Partial';
    return 'Paid';
  }

  return 'Pending';
}

/** Branch-facing status — shows Completed instead of Paid for finished orders. */
export function getBranchOrderStatus(
  sale: Pick<ICSale, 'orderStatus' | 'deliveryAgentId' | 'aedAmount' | 'paymentStatus' | 'derivedFromSaleId'>,
): ICCustomerOrderStatus {
  const status = getCustomerOrderStatus(sale);
  return status === 'Paid' ? 'Completed' : status;
}

export function getAdminStatusLabel(status?: string | null): string {
  return ADMIN_STATUS_LABELS[normalizeOrderStatus(status)];
}

export function getAdminStatusStyle(status?: string | null): string {
  return ADMIN_STATUS_STYLES[normalizeOrderStatus(status)];
}

export function canAdminAccept(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'pending';
}

export function canAdminReject(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return s === 'pending' || s === 'wh_rejected' || s === 'da_rejected';
}

export function canAdminReassignWarehouse(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return s === 'wh_rejected' || s === 'da_rejected';
}

export function canWarehouseAct(status?: string | null): boolean {
  const s = normalizeOrderStatus(status);
  return s === 'accepted' || s === 'da_rejected';
}

export function canDeliveryAgentAct(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'wh_processing';
}

export function isDeliveryAgentRejected(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'da_rejected';
}

/** Warehouse rejected — awaiting admin warehouse reassignment. */
export function isWarehouseRejected(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'wh_rejected';
}

/** Branch may edit and resubmit orders rejected by admin. */
export function canBranchResubmitOrder(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'admin_rejected';
}

/** Branch may delete its own order only while still pending admin acceptance. */
export function canBranchDeleteOrder(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'pending';
}

/** Branch may request cancellation once the order has been admin-accepted. */
export function canBranchRequestCancel(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'accepted';
}

/** Admin may approve or decline a pending cancellation request. */
export function canAdminResolveCancellation(status?: string | null): boolean {
  return normalizeOrderStatus(status) === 'cancellation_pending';
}
