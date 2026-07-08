'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PageShell, SectionCard } from '@/components/ic-transfer/ui';
import { notFound } from 'next/navigation';
import WarehouseUsersManagement from '@/components/ic-transfer/settings/WarehouseUsersManagement';
import { CognitoUser } from '@/app/actions/cognitoActions';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import { getICTransferWarehouseBase, type ICTransferPortalMode } from '@/lib/icTransfer/branchPortalScope';

interface Props {
  branchSlug: string;
  warehouseId: string;
  initialUsers: CognitoUser[];
  usersError?: string;
  portalMode?: ICTransferPortalMode;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export default function WarehouseDetailsClient({
  branchSlug,
  warehouseId,
  initialUsers,
  usersError,
  portalMode = 'admin',
}: Props) {
  const { icWarehouses, icRegions } = useApp();

  const warehouse = icWarehouses.find(w => w.id === warehouseId);

  if (!warehouse && icWarehouses.length > 0) {
    return notFound();
  }

  if (!warehouse) return null;

  const regionName = icRegions.find(r => r.id === warehouse.regionId)?.name || '—';
  const subtitleParts = [regionName, warehouse.phone, warehouse.email].filter(Boolean);

  const warehouseListHref = getICTransferWarehouseBase(branchSlug, portalMode);

  return (
    <PageShell>
      <div className={pageHeader}>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <Link
              href={warehouseListHref}
              className="group flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label="Back to warehouse"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className={`${pageTitle} truncate`}>{warehouse.name}</h2>
          </div>
          <p className={pageSubtitle}>
            {subtitleParts.length > 0 ? subtitleParts.join(' · ') : 'Warehouse profile & users'}
          </p>
        </div>
      </div>

      <SectionCard className="mb-6">
        <div className="border-b border-slate-100 px-4 py-4 md:px-6 md:py-5">
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">Warehouse Information</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 lg:grid-cols-3 md:px-6 md:py-5">
          <DetailRow label="Name" value={warehouse.name} />
          <DetailRow label="Region" value={regionName} />
          <DetailRow label="Phone" value={warehouse.phone || '—'} />
          <DetailRow label="Email" value={warehouse.email || '—'} />
          <DetailRow
            label="Address"
            value={
              warehouse.address ? (
                <span className="line-clamp-2" title={warehouse.address}>
                  {warehouse.address}
                </span>
              ) : (
                '—'
              )
            }
          />
          <DetailRow
            label="Commission"
            value={warehouse.commission != null ? `${warehouse.commission}%` : '—'}
          />
          <DetailRow
            label="Current stock"
            value={(warehouse.currentStock ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}
          />
        </div>
      </SectionCard>

      <WarehouseUsersManagement
        embedded
        initialUsers={initialUsers}
        error={usersError}
        warehouseId={warehouseId}
        branchSlug={branchSlug}
      />
    </PageShell>
  );
}
