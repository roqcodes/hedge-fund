'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { resolveDateFilterRange, getDateFilterLabel } from '@/lib/dateFilterRange';
import {
  computeWarehouseMatrix,
  matrixRowToCells,
  WAREHOUSE_MATRIX_COLUMNS,
} from '@/lib/icTransfer/warehouseMatrixMetrics';
import WarehouseKpiGrid from '@/components/warehouse/WarehouseKpiGrid';
import ManageWarehousesModal from '@/components/ic-transfer/warehouse/ManageWarehousesModal';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { useICTransferRegionFilter } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import {
  DataTableSection,
  PageHeader,
  PageShell,
  useICTransferFilters,
  AddButton,
} from '../ui';

export default function ICTransferWarehouse() {
  const { icRegions, icWarehouses, icSales } = useApp();
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const { selectedRegionIds } = useICTransferRegionFilter();

  const range = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const rangeLabel = useMemo(
    () => getDateFilterLabel(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const { rows, totals } = useMemo(
    () =>
      computeWarehouseMatrix({
        warehouses: icWarehouses,
        regions: icRegions,
        sales: icSales,
        range,
        regionIds: selectedRegionIds.length > 0 ? selectedRegionIds : undefined,
      }),
    [icWarehouses, icRegions, icSales, range, selectedRegionIds],
  );

  const kpiMetrics = useMemo(
    () => ({
      currentStock: totals.currentStock,
      reserved: totals.reserved,
      remaining: totals.remaining,
      totalOrders: totals.totalOrders,
      totalCompleted: totals.totalCompleted,
      totalPending: totals.totalPending,
      splitOrders: totals.splitOrders,
    }),
    [totals],
  );

  return (
    <PageShell>
      <PageHeader
        title="Warehouse"
        subtitle="Stock, orders, and delivery performance by warehouse"
        actions={<AddButton label="Manage Warehouses" onClick={() => setWarehouseModalOpen(true)} />}
      />

      <ICTransferDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <WarehouseKpiGrid
        metrics={kpiMetrics}
        showSplit={false}
        showCompleted={false}
        deliveredUnits={totals.deliveredUnits}
        remainingUnits={totals.remainingUnits}
      />

      <div className="mb-5">
        <DataTableSection
          title={`Warehouse Matrix · ${rangeLabel}`}
          columns={['Warehouse', ...WAREHOUSE_MATRIX_COLUMNS]}
          data={
            rows.length
              ? rows.map(row => [row.warehouseName, ...matrixRowToCells(row)])
              : [['No warehouses', ...WAREHOUSE_MATRIX_COLUMNS.map(() => '—')]]
          }
          emptyMessage="No warehouses match the selected regions."
          minWidth="960px"
        />
      </div>

      <ManageWarehousesModal open={warehouseModalOpen} onClose={() => setWarehouseModalOpen(false)} />
    </PageShell>
  );
}
