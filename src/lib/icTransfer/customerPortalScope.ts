import type { ICSale, ICRateGroup } from '@/types';
import {
  getAdminAssignedBranchRateGroup,
  resolveBranchCustomerOrderRate,
} from '@/lib/icTransfer/branchRateScope';

/** Strip HQ admin rate fields from sales returned to customer sessions. */
export function stripAdminRatesFromSale(sale: ICSale): ICSale {
  const { adminUnitRate: _a, adminConversionRate: _b, ...rest } = sale;
  return rest;
}

/** Resolve the branch-manager rate for a customer portal session. */
export function resolveCustomerPortalRateGroup(
  groups: ICRateGroup[],
  customerId: string,
  branchId?: string,
): ICRateGroup | undefined {
  if (groups.length === 1 && groups[0].customerIds?.includes(customerId)) {
    return groups[0];
  }

  if (branchId) {
    const managerRate = resolveBranchCustomerOrderRate(groups, {
      branchId,
      customerId,
      branchCustomerIds: new Set([customerId]),
    });
    if (managerRate) return managerRate;
  }

  const adminAssigned = branchId
    ? getAdminAssignedBranchRateGroup(groups, branchId)
    : undefined;

  return groups.find(g => {
    if (!g.customerIds?.includes(customerId)) return false;
    if (adminAssigned && g.id === adminAssigned.id) return false;
    return true;
  });
}

/** Only the branch-manager rate assigned to this customer — never HQ admin branch rates. */
export function filterRateGroupsForCustomerPortal(
  groups: ICRateGroup[],
  customerId: string,
  branchId?: string,
): ICRateGroup[] {
  const managerRate = resolveCustomerPortalRateGroup(groups, customerId, branchId);
  return managerRate ? [managerRate] : [];
}

/** Sub-customer display name on customer portal order rows. */
export function getCustomerPortalSubCustomerName(sale: ICSale): string {
  return sale.subCustomerName?.trim() || '—';
}
