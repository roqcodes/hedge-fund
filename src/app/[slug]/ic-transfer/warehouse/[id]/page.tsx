import React from 'react';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import WarehouseDetailsClient from '@/components/ic-transfer/warehouse/WarehouseDetailsClient';
import { requireICTransferBranchManager } from '@/lib/icTransfer/requireBranchPortalManager';
import { mapICWarehouseRow } from '@/lib/icTransferMappers';

export default async function ICTransferBranchWarehouseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id: warehouseId } = await params;
  const { branchId } = await requireICTransferBranchManager(slug);

  const whRes = await query(`SELECT * FROM ic_warehouses WHERE id = $1 LIMIT 1`, [warehouseId]);
  const warehouse = whRes.rows[0] ? mapICWarehouseRow(whRes.rows[0]) : null;

  if (!warehouse || warehouse.branchId !== branchId) {
    redirect(`/${slug}/ic-transfer/warehouse`);
  }

  const shortWarehouseId = warehouseId.slice(0, 8);
  const { success, data, error } = await fetchCognitoUsersAction(slug);
  const warehouseUsers =
    success && data
      ? data.filter(
          u =>
            u.role === `warehouse_${shortWarehouseId}` ||
            u.role === `delivery_${shortWarehouseId}`,
        )
      : [];

  return (
    <WarehouseDetailsClient
      branchSlug={slug}
      warehouseId={warehouseId}
      initialUsers={warehouseUsers}
      usersError={error}
      portalMode="branch"
    />
  );
}
