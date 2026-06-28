import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchCognitoUsersAction } from '@/app/actions/cognitoActions';
import WarehouseDetailsClient from './WarehouseDetailsClient';
import { isBranchPortalRole } from '@/lib/rbac';
import { query } from '@/lib/db';

export default async function WarehouseDetailsPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id: warehouseId } = await params;

  const user = await getSessionUser(slug);
  if (!user || !isBranchPortalRole(user.role)) {
    redirect(`/${slug}`);
  }

  // Branch managers are allowed to manage warehouse users
  const canManage = user.role === 'branch_manager' || user.role === 'admin';
  if (!canManage) {
    redirect(`/${slug}/ic-transfer/settings/warehouses`);
  }

  // Fetch users for this warehouse
  const shortWarehouseId = warehouseId.slice(0, 8);
  const { success, data, error } = await fetchCognitoUsersAction(slug);
  const warehouseUsers = success && data
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
