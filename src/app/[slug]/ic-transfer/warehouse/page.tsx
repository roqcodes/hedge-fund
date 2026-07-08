import React from 'react';
import { query } from '@/lib/db';
import { requireICTransferBranchManager } from '@/lib/icTransfer/requireBranchPortalManager';
import ICTransferWarehouse from '@/components/ic-transfer/warehouse/ICTransferWarehouse';

export default async function ICTransferBranchWarehousePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { branchId, branchName } = await requireICTransferBranchManager(slug);

  const custRes = await query(
    `SELECT id FROM customers WHERE branch_id = $1 ORDER BY name`,
    [branchId],
  );
  const branchCustomerIds = custRes.rows.map((r: { id: string }) => r.id);

  return (
    <ICTransferWarehouse
      portalMode="branch"
      branchId={branchId}
      branchName={branchName}
      branchCustomerIds={branchCustomerIds}
    />
  );
}
