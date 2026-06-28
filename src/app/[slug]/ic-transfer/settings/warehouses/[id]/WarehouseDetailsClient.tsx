'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell, PageHeader } from '@/components/ic-transfer/ui';
import { notFound, useRouter } from 'next/navigation';
import WarehouseUsersManagement from '@/components/ic-transfer/settings/WarehouseUsersManagement';
import Card from '@/components/ui/Card';
import { CognitoUser } from '@/app/actions/cognitoActions';

interface Props {
  branchSlug: string;
  warehouseId: string;
  initialUsers: CognitoUser[];
  usersError?: string;
}

export default function WarehouseDetailsClient({ branchSlug, warehouseId, initialUsers, usersError }: Props) {
  const { icWarehouses, icRegions } = useApp();
  const router = useRouter();

  const warehouse = icWarehouses.find((w: any) => w.id === warehouseId);

  if (!warehouse && icWarehouses.length > 0) {
    return notFound();
  }

  if (!warehouse) return null; // Still loading context

  const regionName = icRegions.find((r: any) => r.id === warehouse.regionId)?.name || 'Unknown';

  return (
    <PageShell>
      <PageHeader 
        title={`${warehouse.name} Details`}
        subtitle={`Manage settings and users for ${warehouse.name}`}
      />
      <div className="mb-6 flex gap-2">
        <button 
          onClick={() => router.push(`/${branchSlug}/ic-transfer/settings/warehouses`)}
          className="text-sm font-semibold text-accent hover:underline flex items-center gap-1"
        >
          &larr; Back to Warehouses
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card title="Warehouse Information">
          <div className="space-y-3 mt-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Name</span>
              <span className="text-sm font-semibold text-slate-900">{warehouse.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Region</span>
              <span className="text-sm font-semibold text-slate-900">{regionName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Phone</span>
              <span className="text-sm font-semibold text-slate-900">{warehouse.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Email</span>
              <span className="text-sm font-semibold text-slate-900">{warehouse.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Address</span>
              <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px]" title={warehouse.address || ''}>
                {warehouse.address || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Commission</span>
              <span className="text-sm font-semibold text-slate-900">{warehouse.commission}%</span>
            </div>
          </div>
        </Card>
      </div>

      <WarehouseUsersManagement 
        initialUsers={initialUsers}
        error={usersError}
        warehouseId={warehouseId}
        branchSlug={branchSlug}
      />
    </PageShell>
  );
}
