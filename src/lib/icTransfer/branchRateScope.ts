import type { ICRateGroup } from '@/types';

/** Rate group HQ admin assigned to this branch (via branchIds). */
export function getAdminAssignedBranchRateGroup(
  groups: ICRateGroup[],
  branchId: string,
): ICRateGroup | undefined {
  return groups.find(g => g.branchIds?.includes(branchId));
}

/** Groups with at least one customer from this branch. */
export function getBranchCustomerRateGroups(
  groups: ICRateGroup[],
  branchCustomerIds: Set<string>,
): ICRateGroup[] {
  return groups.filter(
    g => g.customerIds?.some(id => branchCustomerIds.has(id)) ?? false,
  );
}

/**
 * Groups a branch manager can view and manage on the rates page / assign customers to.
 * Includes branch-created groups (even with no customers yet) and groups with branch customers.
 * Excludes the HQ admin-assigned default branch rate group.
 */
export function getBranchManageableRateGroups(
  groups: ICRateGroup[],
  branchId: string,
  branchCustomerIds: Set<string>,
): ICRateGroup[] {
  const adminAssigned = getAdminAssignedBranchRateGroup(groups, branchId);

  return groups.filter(g => {
    if (adminAssigned && g.id === adminAssigned.id) return false;
    if (g.createdByBranchId === branchId) return true;
    return g.customerIds?.some(id => branchCustomerIds.has(id)) ?? false;
  });
}

export type BranchOrderRateContext = 'branch-handled' | 'admin-handled';

/**
 * Resolve which rate applies on the branch portal when creating an order.
 * Branch-handled → branch manager's customer groups only.
 * Admin-handled → HQ admin's branch assignment only (no group metadata exposed in UI).
 */
export function resolveBranchPortalOrderRate(
  groups: ICRateGroup[],
  options: {
    branchId?: string;
    customerId?: string;
    branchCustomerIds: Set<string>;
    rateContext: BranchOrderRateContext;
  },
): ICRateGroup | undefined {
  const { branchId, customerId, branchCustomerIds, rateContext } = options;

  if (rateContext === 'admin-handled') {
    return branchId ? getAdminAssignedBranchRateGroup(groups, branchId) : undefined;
  }

  if (customerId && branchId) {
    const match = getBranchManageableRateGroups(groups, branchId, branchCustomerIds).find(g =>
      g.customerIds?.includes(customerId),
    );
    if (match) return match;
  }

  return undefined;
}
