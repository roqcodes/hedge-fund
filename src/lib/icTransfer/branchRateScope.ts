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

/** HQ admin rate groups only — excludes branch-created groups. */
export function filterRateGroupsForAdminPortal(groups: ICRateGroup[]): ICRateGroup[] {
  return groups.filter(g => !g.createdByBranchId);
}

export type BranchOrderRateContext = 'branch-handled' | 'admin-handled';

/** Branch manager customer rate — customer always pays this rate on branch-portal orders. */
export function resolveBranchCustomerOrderRate(
  groups: ICRateGroup[],
  options: {
    branchId?: string;
    customerId?: string;
    branchCustomerIds: Set<string>;
  },
): ICRateGroup | undefined {
  const { branchId, customerId, branchCustomerIds } = options;
  if (!customerId || !branchId) return undefined;

  return getBranchManageableRateGroups(groups, branchId, branchCustomerIds).find(g =>
    g.customerIds?.includes(customerId),
  );
}

export function resolveBranchOrderRates(
  groups: ICRateGroup[],
  options: {
    branchId?: string;
    customerId?: string;
    branchCustomerIds: Set<string>;
  },
): { branchGroup: ICRateGroup | undefined; adminGroup: ICRateGroup | undefined } {
  const branchGroup = resolveBranchCustomerOrderRate(groups, options);
  const adminGroup = options.branchId
    ? getAdminAssignedBranchRateGroup(groups, options.branchId)
    : undefined;
  return { branchGroup, adminGroup };
}

/**
 * Resolve which rate applies on the branch portal when creating an order.
 * @deprecated Use resolveBranchCustomerOrderRate — customers always get the branch manager rate.
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
  const { branchId, customerId, branchCustomerIds } = options;
  return resolveBranchCustomerOrderRate(groups, { branchId, customerId, branchCustomerIds });
}
