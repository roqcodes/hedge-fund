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
import AddRegionModal from '@/components/ic-transfer/settings/AddRegionModal';
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
  const { icRegions, icWarehouses, icSales, addICRegion } = useApp();
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const { selectedRegionIds } = useICTransferRegionFilter();

  const handleAddRegion = async (name: string, country: string) => {
    await addICRegion(name, country);
  };

  const range = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const rangeLabel = useMemo(
    () => getDateFilterLabel(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const { rows, totals, regionRows } = useMemo(
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
        actions={
          <div className="flex gap-2">
            <AddButton
              label="Manage Regions"
              onClick={() => setRegionModalOpen(true)}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm:h-[18px] sm:w-[18px]">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              }
            />
            <AddButton label="Manage Warehouses" onClick={() => setWarehouseModalOpen(true)} />
          </div>
        }
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
          columns={['Warehouse', 'Region', ...WAREHOUSE_MATRIX_COLUMNS]}
          data={
            rows.length
              ? rows.map(row => [row.warehouseName, row.regionName, ...matrixRowToCells(row)])
              : [['No warehouses', '—', ...WAREHOUSE_MATRIX_COLUMNS.map(() => '—')]]
          }
          emptyMessage="No warehouses match the selected regions."
          minWidth="960px"
        />
      </div>

      <div className="mb-5">
        <DataTableSection
          title={`Region Summary · ${rangeLabel}`}
          columns={['Region', 'Warehouses', 'Orders', 'Pending', 'Delivered', 'Remaining']}
          data={
            regionRows.length
              ? regionRows.map(row => [
                  row.regionName,
                  row.warehouseCount.toLocaleString(),
                  row.totalOrders.toLocaleString(),
                  row.pendingOrders.toLocaleString(),
                  row.deliveredUnits.toLocaleString('en-US', { maximumFractionDigits: 4 }),
                  row.remainingUnits.toLocaleString('en-US', { maximumFractionDigits: 4 }),
                ])
              : [['No regions', '0', '0', '0', '0', '0']]
          }
          emptyMessage="No region data for the selected filters."
          minWidth="720px"
        />
      </div>

      <AddRegionModal open={regionModalOpen} onClose={() => setRegionModalOpen(false)} onAdd={handleAddRegion} />
      <ManageWarehousesModal open={warehouseModalOpen} onClose={() => setWarehouseModalOpen(false)} />
    </PageShell>
  );
}
