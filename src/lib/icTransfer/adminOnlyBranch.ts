import type { ICSale } from '@/types';
import { isBranchPageEnabled, normalizeHiddenPages } from '@/lib/branchPages';
import { isCustomerEnteredOrder } from '@/lib/icTransfer/branchOrderOwnership';
import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';

/** IC-DXB — IC Transfer Admin enabled, branch portal inactive, direct customers only. */
export const ADMIN_ONLY_IC_TRANSFER_BRANCH_ID = 'BRMQTJ3VKE';

export type BranchPortalConfig = {
  hiddenPages?: string[] | null;
  branchId?: string | null;
};

/** IC Transfer Admin on, branch portal off — customer orders skip branch review. */
export function isAdminOnlyICTransferBranch(config?: BranchPortalConfig | null): boolean {
  if (!config) return false;
  if (config.branchId && String(config.branchId) === ADMIN_ONLY_IC_TRANSFER_BRANCH_ID) {
    return true;
  }
  const hiddenPages = normalizeHiddenPages(config.hiddenPages);
  return (
    isBranchPageEnabled('ic-transfer-admin', hiddenPages) &&
    !isBranchPageEnabled('ic-transfer', hiddenPages)
  );
}

export function customerOrderInitialStatus(config?: BranchPortalConfig | null): 'pending' | 'pending_branch_review' {
  return isAdminOnlyICTransferBranch(config) ? 'pending' : 'pending_branch_review';
}

export function customerOrderResubmitStatusAfterAdminReject(
  config?: BranchPortalConfig | null,
): 'pending' | 'pending_branch_review' {
  return customerOrderInitialStatus(config);
}

/** Customer-portal order queued at HQ admin (no branch review step). */
export function isCustomerOrderPendingAtAdmin(
  sale: Pick<ICSale, 'orderStatus' | 'orderCustomerId' | 'enteredByName' | 'orderCustomerName'>,
): boolean {
  return isCustomerEnteredOrder(sale) && normalizeOrderStatus(sale.orderStatus) === 'pending';
}
