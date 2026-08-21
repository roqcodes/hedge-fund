import { isDateInRange, type DateFilterRange } from '@/lib/dateFilterRange';
import { isByHandSale } from '@/lib/icTransfer/byHand';
import { isWarehouseRejected } from '@/lib/icTransfer/orderStatus';
import { getDeliveredUnits, getRemainingUnits, isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import type { WarehouseKpiMetrics } from '@/lib/warehouse/kpiMetrics';
import type { ICRegion, ICSale, ICWarehouse } from '@/types';

export type WarehouseMatrixRow = {
  warehouseId: string;
  warehouseName: string;
  regionName: string;
  currentStock: number;
  reserved: number;
  available: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredUnits: number;
  remainingUnits: number;
};

export type RegionSummaryRow = {
  regionId: string;
  regionName: string;
  warehouseCount: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredUnits: number;
  remainingUnits: number;
};

export type WarehouseMatrixResult = {
  rows: WarehouseMatrixRow[];
  totals: WarehouseKpiMetrics & {
    deliveredUnits: number;
    remainingUnits: number;
  };
  regionRows: RegionSummaryRow[];
};

function isActiveOrder(sale: ICSale): boolean {
  if (isByHandSale(sale)) return false;
  const status = sale.orderStatus || 'pending';
  return !isSaleCompleted(status)
    && status !== 'delivery_pending_admin'
    && !isWarehouseRejected(status);
}

function saleInRange(sale: ICSale, range: DateFilterRange): boolean {
  return isDateInRange((sale.createdAt || '').slice(0, 10), range);
}

function sumUnits(sales: ICSale[]): number {
  return sales.reduce((sum, sale) => sum + Number(sale.units || 0), 0);
}

function computeDeliveredUnits(sales: ICSale[]): number {
  return sales.reduce(
    (sum, sale) => sum + getDeliveredUnits(sale.units, sale.collectedUnits, sale.orderStatus),
    0,
  );
}

function computeRemainingUnits(sales: ICSale[]): number {
  return sales.reduce(
    (sum, sale) => sum + getRemainingUnits(sale.units, sale.collectedUnits, sale.orderStatus),
    0,
  );
}

function computeRow(
  warehouse: ICWarehouse,
  regionName: string,
  sales: ICSale[],
  range: DateFilterRange,
): WarehouseMatrixRow {
  const warehouseSales = sales.filter(s => s.warehouseId === warehouse.id);
  const inRangeSales = warehouseSales.filter(s => saleInRange(s, range));
  const activeSales = warehouseSales.filter(isActiveOrder);
  const currentStock = Number(warehouse.currentStock ?? 0);
  const reserved = sumUnits(activeSales);

  return {
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    regionName,
    currentStock,
    reserved,
    available: currentStock - reserved,
    totalOrders: inRangeSales.length,
    pendingOrders: inRangeSales.filter(isActiveOrder).length,
    deliveredUnits: computeDeliveredUnits(inRangeSales),
    remainingUnits: computeRemainingUnits(inRangeSales),
  };
}

export function computeWarehouseMatrix(options: {
  warehouses: ICWarehouse[];
  regions: ICRegion[];
  sales: ICSale[];
  range: DateFilterRange;
  /** When empty or omitted, includes all regions. */
  regionIds?: string[];
}): WarehouseMatrixResult {
  const { warehouses, regions, sales, range, regionIds } = options;

  const regionNameById = new Map(regions.map(r => [r.id, r.name]));
  const regionFilter = regionIds && regionIds.length > 0 ? new Set(regionIds) : null;
  const filteredWarehouses = regionFilter
    ? warehouses.filter(w => w.regionId && regionFilter.has(w.regionId))
    : warehouses;

  const rows = filteredWarehouses
    .map(warehouse =>
      computeRow(warehouse, regionNameById.get(warehouse.regionId || '') || '—', sales, range),
    )
    .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName));

  const warehouseIds = new Set(filteredWarehouses.map(w => w.id));
  const scopedSales = sales.filter(s => s.warehouseId && warehouseIds.has(s.warehouseId));
  const inRangeSales = scopedSales.filter(s => saleInRange(s, range));
  const activeSales = scopedSales.filter(isActiveOrder);

  const currentStock = filteredWarehouses.reduce((sum, w) => sum + Number(w.currentStock ?? 0), 0);
  const reserved = sumUnits(activeSales);

  const totals: WarehouseMatrixResult['totals'] = {
    currentStock,
    reserved,
    remaining: currentStock - reserved,
    totalOrders: inRangeSales.length,
    totalPending: inRangeSales.filter(isActiveOrder).length,
    totalCompleted: inRangeSales.filter(s => isSaleCompleted(s.orderStatus)).length,
    splitOrders: inRangeSales.filter(s => !!s.derivedFromSaleId).length,
    deliveredUnits: computeDeliveredUnits(inRangeSales),
    remainingUnits: computeRemainingUnits(inRangeSales),
  };

  const regionRows = regions
    .map(region => {
      if (regionFilter && !regionFilter.has(region.id)) return null;

      const regionWarehouses = filteredWarehouses.filter(w => w.regionId === region.id);
      if (regionWarehouses.length === 0) return null;

      const regionWarehouseIds = new Set(regionWarehouses.map(w => w.id));
      const regionSales = sales.filter(s => s.warehouseId && regionWarehouseIds.has(s.warehouseId));
      const regionInRange = regionSales.filter(s => saleInRange(s, range));

      return {
        regionId: region.id,
        regionName: region.name,
        warehouseCount: regionWarehouses.length,
        totalOrders: regionInRange.length,
        pendingOrders: regionInRange.filter(isActiveOrder).length,
        deliveredUnits: computeDeliveredUnits(regionInRange),
        remainingUnits: computeRemainingUnits(regionInRange),
      } satisfies RegionSummaryRow;
    })
    .filter((row): row is RegionSummaryRow => row !== null && row.warehouseCount > 0)
    .sort((a, b) => a.regionName.localeCompare(b.regionName));

  return { rows, totals, regionRows };
}

export const WAREHOUSE_MATRIX_COLUMNS = [
  'Stock',
  'Reserved',
  'Available',
  'Orders',
  'Pending',
  'Delivered',
  'Remaining',
] as const;

function formatMatrixValue(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function matrixRowToCells(row: WarehouseMatrixRow): string[] {
  return [
    formatMatrixValue(row.currentStock),
    formatMatrixValue(row.reserved),
    formatMatrixValue(row.available),
    formatMatrixValue(row.totalOrders),
    formatMatrixValue(row.pendingOrders),
    formatMatrixValue(row.deliveredUnits),
    formatMatrixValue(row.remainingUnits),
  ];
}
