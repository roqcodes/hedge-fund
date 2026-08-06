import type { ICSale, ICRateGroup } from '@/types';
import {
  getAdminAssignedBranchRateGroup,
  resolveBranchCustomerOrderRate,
} from '@/lib/icTransfer/branchRateScope';
import { getBranchPortalDisplayName } from '@/lib/icTransfer/branchPortalScope';

/** Page header on customer IC Transfer — name first, branch second. */
export function getCustomerPortalDisplayName(
  customerName: string | null | undefined,
  branch: { name?: string | null; country?: string | null; location?: string | null } | null | undefined,
): { title: string; subtitle?: string } {
  const name = customerName?.trim();
  const branchName = branch?.name?.trim();
  if (name) {
    return {
      title: name,
      subtitle: branchName || undefined,
    };
  }
  return getBranchPortalDisplayName(branch);
}

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
