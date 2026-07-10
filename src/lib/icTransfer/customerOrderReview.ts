import type { ICSale } from '@/types';

import { isCustomerCreatedOrder } from '@/lib/icTransfer/fulfillmentHandler';

import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';

import {

  canEditOrder,

  canDeleteOrder,

  canRequestOrderCancellation,

  canBranchResolveCustomerCancellation,

} from '@/lib/icTransfer/orderWorkflowRules';



export function isPendingBranchReviewStatus(status?: string | null): boolean {

  return normalizeOrderStatus(status) === 'pending_branch_review';

}



export function isBranchRejectedStatus(status?: string | null): boolean {

  return normalizeOrderStatus(status) === 'branch_rejected';

}



/** Customer-portal order awaiting branch manager review. */

export function canBranchReviewCustomerOrder(sale: ICSale): boolean {

  return isCustomerCreatedOrder(sale) && isPendingBranchReviewStatus(sale.orderStatus);

}



export function canResubmitRejectedOrder(

  sale: ICSale,

  role?: string | null,

): boolean {

  return canEditOrder(sale, role);

}



export function canCustomerRequestCancel(sale: ICSale): boolean {

  return canRequestOrderCancellation(sale, 'customer');

}



export function canBranchRequestCancelOrder(sale: ICSale): boolean {

  return (

    canRequestOrderCancellation(sale, 'branch_manager') ||

    canRequestOrderCancellation(sale, 'staff')

  );

}



export {
  canEditOrder,
  canDeleteOrder,
  canRequestOrderCancellation,
  canBranchResolveCustomerCancellation,
};

