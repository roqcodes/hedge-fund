'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { btnSecondary } from '@/lib/ui';
import type { ICRateGroup } from '@/types';
import type { Branch } from '@/types';
import { formatRateGroupUpdatedAt, isRateGroupUpdatedToday } from '@/lib/icTransfer/rateGroupUtils';

type CustomerOption = { id: string; name: string };

type Props = {
  group: ICRateGroup | null;
  branches: Branch[];
  customers: CustomerOption[];
  onClose: () => void;
  onEdit: (group: ICRateGroup) => void;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ChipList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-sm text-slate-400">{emptyLabel}</span>;
  }
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item}
          className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function RateGroupViewModal({ group, branches, customers, onClose, onEdit }: Props) {
  if (!group) return null;

  const branchNames = (group.branchIds ?? [])
    .map(id => branches.find(b => b.id === id)?.name || id);
  const customerNames = (group.customerIds ?? [])
    .map(id => customers.find(c => c.id === id)?.name || id);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Rate Group Details"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-primary transition-colors hover:bg-accent/90"
            onClick={() => onEdit(group)}
          >
            Edit Group
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailRow label="Group Name" value={group.name} />
          <DetailRow label="Currency" value={group.currency} />
          <DetailRow label="Country" value={group.country} />
          <DetailRow label="Region" value={group.region} />
          <DetailRow label="Sale Rate (AED)" value={group.saleRate.toLocaleString()} />
          <DetailRow
            label={`Conversion (AED → ${group.currency})`}
            value={(group.conversionRate ?? 1).toLocaleString()}
          />
          <DetailRow
            label="Last updated"
            value={
              <span className={!isRateGroupUpdatedToday(group.updatedAt) ? 'text-orange-700' : undefined}>
                {formatRateGroupUpdatedAt(group.updatedAt)}
              </span>
            }
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Branches</p>
          <ChipList items={branchNames} emptyLabel="No branches assigned" />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Customers</p>
          <ChipList items={customerNames} emptyLabel="No customers assigned" />
        </div>
      </div>
    </Modal>
  );
}
