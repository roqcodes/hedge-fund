import type { ICSale } from '@/types';
import { isByHandSale } from './byHand';
import { isCustomerEnteredOrder } from './branchOrderOwnership';
import { isBranchHandledSale } from './fulfillmentHandler';
import { normalizeOrderStatus } from './orderStatus';

export type OrderStatusAudience = 'admin' | 'branch' | 'customer';

export function getOrderStatusDescription(
  sale: ICSale,
  audience: OrderStatusAudience,
): string {
  const status = normalizeOrderStatus(sale.orderStatus);
  const branchHandled = isBranchHandledSale(sale);
  const customerOrder = isCustomerEnteredOrder(sale);
  const byHand = isByHandSale(sale);

  if (status === 'unknown') {
    return 'This order has an unrecognized status. Contact support if it does not update.';
  }

  const descriptions: Record<string, Record<OrderStatusAudience, string>> = {
    pending_branch_review: {
      customer: 'Your order is waiting for the branch manager to review and approve it.',
      branch: customerOrder
        ? 'Customer order waiting for your review. Accept to send to admin or handle at branch, or reject with a reason.'
        : 'Waiting for branch manager review.',
      admin: 'Waiting for branch manager review. No admin action needed yet.',
    },
    branch_rejected: {
      customer: 'The branch manager rejected this order. Update the details and resubmit, or delete the order.',
      branch: 'You rejected this customer order. The customer can edit and resubmit.',
      admin: 'Rejected by branch manager. Awaiting customer update.',
    },
    pending: {
      customer: customerOrder
        ? branchHandled
          ? 'Branch approved your order for local handling. Waiting for the branch to assign a warehouse. You can track progress here but cannot edit this order.'
          : 'Branch approved your order and sent it to admin. Waiting for admin acceptance — you can track progress here but cannot edit or delete.'
        : 'Order is waiting to be accepted.',
      branch: branchHandled
        ? 'Assign a branch warehouse to start fulfillment, or edit/delete while still pending.'
        : 'Waiting for admin to accept and assign a warehouse. You can still edit or delete.',
      admin: branchHandled
        ? 'Branch-managed order. You have view-only access.'
        : byHand
          ? 'By Hand order waiting for you to accept and assign a warehouse.'
          : 'Waiting for you to accept and assign a warehouse.',
    },
    admin_rejected: {
      customer: customerOrder
        ? 'Admin rejected this order after branch approval. Edit and resubmit — it will go back to branch review first.'
        : 'Admin rejected this order. Edit and resubmit.',
      branch: customerOrder
        ? 'Admin rejected this customer order. Waiting for the customer to update and resubmit — no action needed from you.'
        : 'Admin rejected this order. Edit and resubmit, or delete it.',
      admin: customerOrder
        ? 'You rejected this customer order. Waiting for the customer to update and resubmit via branch review.'
        : 'You rejected this order. Branch can edit and resubmit.',
    },
    accepted: {
      customer: byHand
        ? 'Order accepted. Being processed for completion.'
        : branchHandled
          ? 'Branch is fulfilling this order.'
          : 'Admin accepted the order. Warehouse will assign a delivery agent next.',
      branch: branchHandled
        ? 'Assign a warehouse if needed, mark complete when done, or request cancellation.'
        : byHand
          ? 'Admin accepted this By Hand order.'
          : 'Admin accepted. Warehouse processing will follow.',
      admin: byHand
        ? 'By Hand order accepted. Mark complete manually or wait for end-of-day auto-complete.'
        : branchHandled
          ? 'Branch-managed — view only.'
          : 'Accepted. Warehouse should assign a delivery agent.',
    },
    wh_rejected: {
      customer: 'Warehouse could not process this order. Admin is reassigning a warehouse.',
      branch: branchHandled
        ? 'Warehouse rejected. Reassign a branch warehouse.'
        : 'Warehouse rejected. Admin will reassign.',
      admin: 'Warehouse rejected. Reassign a warehouse or reject the order.',
    },
    wh_processing: {
      customer: sale.deliveryAgentId
        ? 'Delivery agent is carrying out the delivery.'
        : 'Warehouse is preparing the order for dispatch.',
      branch: 'Warehouse is processing or delivery is in progress.',
      admin: 'Warehouse processing or delivery in progress.',
    },
    da_rejected: {
      customer: 'Delivery agent could not complete delivery. Admin is reassigning.',
      branch: branchHandled
        ? 'Delivery agent rejected. Reassign warehouse to retry.'
        : 'Delivery agent rejected. Admin will reassign.',
      admin: 'Delivery agent rejected. Reassign warehouse or reject the order.',
    },
    delivery_pending_admin: {
      customer: 'Delivery completed. Admin is verifying proof before marking complete.',
      branch: 'Delivery done. Admin is verifying proof.',
      admin: 'Delivery proof submitted. Verify to mark the order complete.',
    },
    cancellation_pending: {
      customer: customerOrder
        ? 'You requested cancellation. Waiting for branch manager approval.'
        : 'Cancellation requested. Waiting for admin approval.',
      branch: customerOrder
        ? 'Customer requested cancellation. Approve or decline.'
        : 'Cancellation requested. Waiting for admin approval.',
      admin: customerOrder
        ? 'Customer cancellation — branch manager will resolve.'
        : 'Branch requested cancellation. Approve or decline.',
    },
    cancelled: {
      customer: 'This order was cancelled.',
      branch: 'This order was cancelled.',
      admin: 'This order was cancelled.',
    },
    completed: {
      customer: 'Order fulfilled and completed.',
      branch: 'Order fulfilled and completed.',
      admin: 'Order fulfilled and completed.',
    },
  };

  return descriptions[status]?.[audience] ?? 'Order is in progress.';
}
