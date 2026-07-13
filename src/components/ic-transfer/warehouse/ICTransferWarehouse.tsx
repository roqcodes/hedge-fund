'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { resolveDateFilterRange, getDateFilterLabel } from '@/lib/dateFilterRange';
import {
  computeWarehouseMatrix,
  matrixRowToCells,
  WAREHOUSE_MATRIX_COLUMNS,
} from '@/lib/icTransfer/warehouseMatrixMetrics';
import {
  filterSalesForBranchPortal,
  filterWarehousesForBranchPortal,
  filterWarehousesForAdminPortal,
  type ICTransferPortalMode,
} from '@/lib/icTransfer/branchPortalScope';
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

type Props = {
  portalMode?: ICTransferPortalMode;
  branchId?: string;
  branchName?: string;
  branchCustomerIds?: string[];
};

export default function ICTransferWarehouse({
  portalMode = 'admin',
  branchId,
  branchName,
  branchCustomerIds = [],
}: Props) {
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

  const isBranchPortal = portalMode === 'branch' && !!branchId;

  const scopedWarehouses = useMemo(() => {
    if (!isBranchPortal) return filterWarehousesForAdminPortal(icWarehouses);
    return filterWarehousesForBranchPortal(icWarehouses, branchId!);
  }, [icWarehouses, isBranchPortal, branchId]);

  const branchCustomerIdSet = useMemo(
    () => new Set(branchCustomerIds),
    [branchCustomerIds],
  );

  const scopedSales = useMemo(() => {
    if (!isBranchPortal || !branchName) return icSales;
    return filterSalesForBranchPortal(icSales, branchName, branchCustomerIdSet);
  }, [icSales, isBranchPortal, branchName, branchCustomerIdSet]);

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
        warehouses: scopedWarehouses,
        regions: icRegions,
        sales: scopedSales,
        range,
        regionIds: selectedRegionIds.length > 0 ? selectedRegionIds : undefined,
      }),
    [scopedWarehouses, icRegions, scopedSales, range, selectedRegionIds],
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
        subtitle={
          isBranchPortal
            ? 'Branch warehouses, stock, and delivery performance'
            : 'Stock, orders, and delivery performance by warehouse'
        }
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
          emptyMessage={
            isBranchPortal
              ? 'No branch warehouses yet. Add one from Manage Warehouses.'
              : 'No warehouses match the selected regions.'
          }
          minWidth="960px"
        />
      </div>

      <ManageWarehousesModal
        open={warehouseModalOpen}
        onClose={() => setWarehouseModalOpen(false)}
        portalMode={portalMode}
        branchId={isBranchPortal ? branchId : undefined}
        warehouses={scopedWarehouses}
      />
    </PageShell>
  );
}
