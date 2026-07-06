import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import WarehouseDetailsClient from '@/components/ic-transfer/warehouse/WarehouseDetailsClient';
import { isBranchPortalRole } from '@/lib/rbac';

export default async function WarehouseDetailsPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id: warehouseId } = await params;

  const user = await getSessionUser(slug);
  if (!user || !isBranchPortalRole(user.role)) {
    redirect(`/${slug}`);
  }

  const canManage = user.role === 'branch_manager' || user.role === 'admin';
  if (!canManage) {
    redirect(`/${slug}/ic-transfer-admin/warehouse`);
  }

  const shortWarehouseId = warehouseId.slice(0, 8);
  const { success, data, error } = await fetchCognitoUsersAction(slug);
  const warehouseUsers =
    success && data
      ? data.filter(u => u.role === `warehouse_${shortWarehouseId}` || u.role === `delivery_${shortWarehouseId}`)
      : [];

  return (
    <WarehouseDetailsClient
      branchSlug={slug}
      warehouseId={warehouseId}
      initialUsers={warehouseUsers}
      usersError={error}
    />
  );
}
