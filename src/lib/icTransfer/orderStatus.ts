import type { ICSale } from '@/types';

/** Internal workflow status — visible in admin panel only. */
export type ICOrderStatus =
  | 'pending'
  | 'accepted'
  | 'admin_rejected'
  | 'wh_rejected'
  | 'wh_processing'
  | 'da_rejected'
  | 'completed';

/** Simplified status shown to branch/customer. */
export type ICCustomerOrderStatus =
  | 'Pending'
  | 'Admin Accepted'
  | 'Warehouse Processing'
  | 'Order Dispatched'
  | 'Partial'
  | 'Paid'
  | 'Rejected';

export const IC_ORDER_STATUSES: ICOrderStatus[] = [
  'pending',
  'accepted',
  'admin_rejected',
  'wh_rejected',
  'wh_processing',
  'da_rejected',
  'completed',
];

export const ADMIN_STATUS_LABELS: Record<ICOrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Admin Accepted',
  admin_rejected: 'Admin Rejected',
  wh_rejected: 'WH Rejected',
  wh_processing: 'WH Processing',
  da_rejected: 'Delivery Agent Rejected',
  completed: 'Completed',
};

export const ADMIN_STATUS_STYLES: Record<ICOrderStatus, string> = {
  pending: 'bg-slate-50 text-slate-600 border-slate-200',
  accepted: 'bg-blue-50 text-blue-700 border-blue-200',
  admin_rejected: 'bg-red-50 text-red-700 border-red-200',
  wh_rejected: 'bg-orange-50 text-orange-700 border-orange-200',
  wh_processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  da_rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const CUSTOMER_STATUS_STYLES: Record<ICCustomerOrderStatus, string> = {
  Pending: 'bg-slate-50 text-slate-600 border-slate-200',
  'Admin Accepted': 'bg-blue-50 text-blue-700 border-blue-200',
  'Warehouse Processing': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Order Dispatched': 'bg-violet-50 text-violet-700 border-violet-200',
  Partial: 'bg-amber-50 text-amber-700 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-50 text-red-700 border-red-200',
};

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
