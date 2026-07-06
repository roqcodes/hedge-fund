import type { ICSale, ICWarehouse } from '@/types';
import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';

export function matchesSelectedRegions(
  regionId: string | undefined | null,
  selectedRegionIds: string[],
): boolean {
  if (selectedRegionIds.length === 0) return true;
  if (!regionId) return false;
  return selectedRegionIds.includes(regionId);
}

/** Region filter for sales — pending orders without a warehouse stay visible for admin review. */
export function matchesSaleRegionFilter(
  sale: ICSale,
  warehouses: ICWarehouse[],
  selectedRegionIds: string[],
): boolean {
  if (selectedRegionIds.length === 0) return true;

  const regionId = getWarehouseRegionId(sale.warehouseId, warehouses);
  if (!regionId && normalizeOrderStatus(sale.orderStatus) === 'pending') {
    return true;
  }

  return matchesSelectedRegions(regionId, selectedRegionIds);
}

export function getWarehouseRegionId(
  warehouseId: string | undefined | null,
  warehouses: ICWarehouse[],
): string | undefined {
  if (!warehouseId) return undefined;
  return warehouses.find(w => w.id === warehouseId)?.regionId;
}
