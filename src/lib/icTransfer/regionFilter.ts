import type { ICWarehouse } from '@/types';

export function matchesSelectedRegions(
  regionId: string | undefined | null,
  selectedRegionIds: string[],
): boolean {
  if (selectedRegionIds.length === 0) return true;
  if (!regionId) return false;
  return selectedRegionIds.includes(regionId);
}

export function getWarehouseRegionId(
  warehouseId: string | undefined | null,
  warehouses: ICWarehouse[],
): string | undefined {
  if (!warehouseId) return undefined;
  return warehouses.find(w => w.id === warehouseId)?.regionId;
}
