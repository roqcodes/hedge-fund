import type { ICPurchase, ICRateGroup, ICSale, ICSupplier, ICWarehouse } from '@/types';
import { saleBelongsToBranchPortal } from '@/lib/icTransfer/branchOrderOwnership';

export type ICTransferPortalMode = 'admin' | 'branch';

export function getICTransferPortalBase(slug: string, mode: ICTransferPortalMode): string {
  return mode === 'branch' ? `/${slug}/ic-transfer` : `/${slug}/ic-transfer-admin`;
}

export function getICTransferWarehouseBase(slug: string, mode: ICTransferPortalMode): string {
  return `${getICTransferPortalBase(slug, mode)}/warehouse`;
}

/** Map IC Transfer admin URLs to branch-manager portal URLs (Orders / Warehouse / Rates). */
export function mapBranchManagerAdminRouteToPortal(slug: string, pathname: string): string {
  const adminPrefix = `/${slug}/ic-transfer-admin`;
  const portalBase = `/${slug}/ic-transfer`;

  if (!pathname.startsWith(adminPrefix)) return portalBase;

  const suffix = pathname.slice(adminPrefix.length).replace(/\/$/, '') || '';

  if (suffix === '' || suffix === '/') return portalBase;
  if (suffix === '/warehouse' || suffix.startsWith('/warehouse/')) {
    return `${portalBase}${suffix}`;
  }
  if (suffix === '/purchase' || suffix.startsWith('/purchase/')) {
    return `${portalBase}${suffix}`;
  }
  if (suffix === '/settings/suppliers' || suffix.startsWith('/settings/suppliers')) {
    return `${portalBase}/suppliers`;
  }
  if (suffix === '/settings/rates' || suffix.startsWith('/settings/rates/')) {
    return `${portalBase}/rates`;
  }

  return portalBase;
}

export function filterWarehousesForBranchPortal(
  warehouses: ICWarehouse[],
  branchId: string,
): ICWarehouse[] {
  return warehouses.filter(w => w.branchId === branchId);
}

/** HQ admin warehouses only — excludes branch-owned warehouses. */
export function filterWarehousesForAdminPortal(
  warehouses: ICWarehouse[],
): ICWarehouse[] {
  return warehouses.filter(w => !w.branchId);
}

type AssignableWarehouseUser = {
  role?: string;
  branchId?: string;
};

/** Warehouses available when assigning on admin workflows (accept / reassign / edit sale). */
export function filterWarehousesForAssignableUser(
  warehouses: ICWarehouse[],
  user?: AssignableWarehouseUser | null,
): ICWarehouse[] {
  if (user?.role === 'branch_manager' && user.branchId) {
    return filterWarehousesForBranchPortal(warehouses, user.branchId);
  }
  return filterWarehousesForAdminPortal(warehouses);
}

export function filterSuppliersForBranchPortal(
  suppliers: ICSupplier[],
  branchId: string,
): ICSupplier[] {
  return suppliers.filter(s => s.branchId === branchId);
}

/** HQ admin suppliers only — excludes branch-owned suppliers. */
export function filterSuppliersForAdminPortal(suppliers: ICSupplier[]): ICSupplier[] {
  return suppliers.filter(s => !s.branchId);
}

/** Purchases restocking branch-owned warehouses only. */
export function filterPurchasesForBranchPortal(
  purchases: ICPurchase[],
  warehouses: ICWarehouse[],
  branchId: string,
): ICPurchase[] {
  const branchWarehouseIds = new Set(
    filterWarehousesForBranchPortal(warehouses, branchId).map(w => w.id),
  );
  return purchases.filter(
    p => !!p.warehouseId && branchWarehouseIds.has(p.warehouseId),
  );
}

export function filterRateGroupsForBranchPortal(
  groups: ICRateGroup[],
  _branchId: string,
  branchCustomerIds: Set<string>,
): ICRateGroup[] {
  return groups.filter(
    group => group.customerIds?.some(id => branchCustomerIds.has(id)) ?? false,
  );
}

export function mergeBranchPortalCustomerAssignments(
  existingCustomerIds: string[] | undefined,
  branchCustomerIds: Set<string>,
  assignedBranchCustomerIds: string[],
): string[] {
  const preserved =
    existingCustomerIds?.filter(id => !branchCustomerIds.has(id)) ?? [];
  return [...new Set([...preserved, ...assignedBranchCustomerIds])];
}

export function filterSalesForBranchPortal(
  sales: ICSale[],
  branchName: string,
  branchCustomerIds: Set<string>,
  branchCustomerNames?: Set<string>,
): ICSale[] {
  return sales.filter(sale =>
    saleBelongsToBranchPortal(sale, branchName, branchCustomerIds, branchCustomerNames),
  );
}

export function warehouseBelongsToBranch(
  warehouse: ICWarehouse | undefined,
  branchId: string,
): boolean {
  return !!warehouse && warehouse.branchId === branchId;
}

/** Country shown on the branch IC Transfer portal (falls back to location). */
export function resolveBranchPortalCountry(
  branch: { country?: string | null; location?: string | null } | null | undefined,
): string | undefined {
  const country = branch?.country?.trim();
  if (country) return country;
  const location = branch?.location?.trim();
  return location || undefined;
}

export function getBranchPortalDisplayName(
  branch: { name?: string | null; country?: string | null; location?: string | null } | null | undefined,
  fallback = 'IC Transfer',
): { title: string; subtitle?: string } {
  const name = branch?.name?.trim();
  if (!name) return { title: fallback };
  const country = resolveBranchPortalCountry(branch);
  return country ? { title: name, subtitle: country } : { title: name };
}
