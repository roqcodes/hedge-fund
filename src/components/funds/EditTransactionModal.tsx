'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import TagMultiSelect from '@/components/ui/TagMultiSelect';
import { formatAED } from '@/data/mockData';
import { Transaction, TransactionTag } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import { getTransactionTagIds } from '@/lib/transactionTags';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formTextarea,
} from '@/lib/ui';

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function LockedField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={formGroup}>
      <label className={formLabel}>{label}</label>
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
        {children}
      </div>
    </div>
  );
}

export default function EditTransactionModal({
  txn,
  branchTags,
  isSaving,
  onClose,
  onSave,
  onCreateTag,
}: {
  txn: Transaction;
  branchTags: TransactionTag[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: { date: string; notes: string; tagIds: string[] }) => void;
  onCreateTag: (name: string) => Promise<TransactionTag | null>;
}) {
  const initialTagIds = useMemo(
    () => getTransactionTagIds(txn, branchTags),
    [txn, branchTags],
  );

  const [date, setDate] = useState(() => toDatetimeLocalValue(txn.date));
  const [notes, setNotes] = useState(txn.notes || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);

  const handleSave = () => {
    onSave({
      date: new Date(date).toISOString(),
      notes: notes.trim(),
      tagIds: selectedTagIds,
    });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Edit Transaction"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className={formGroup}>
          <label className={formLabel}>Date &amp; Time</label>
          <input
            type="datetime-local"
            className={formInput}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LockedField label="From">{txn.from}</LockedField>
          <LockedField label="To">{txn.to}</LockedField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LockedField label="Amount">
            {txn.assetType === 'gold' ? `${txn.amount.toFixed(2)}g` : formatAED(txn.amount)}
          </LockedField>
          <LockedField label="Asset">
            {txn.assetType === 'gold' ? 'Gold' : 'AED'}
          </LockedField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LockedField label="Type">
            <span className={badgeClass(txn.type)}>{txn.type.toUpperCase()}</span>
          </LockedField>
          <LockedField label="Status">{txn.status}</LockedField>
        </div>

        <TagMultiSelect
          label="Tags"
          tags={branchTags}
          selectedIds={selectedTagIds}
          onChange={setSelectedTagIds}
          onCreateTag={onCreateTag}
          placeholder="Search or add tags..."
        />

        <div className={formGroup}>
          <label className={formLabel}>Notes &amp; Particulars</label>
          <textarea
            className={formTextarea}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Add context for this transaction..."
          />
        </div>
      </div>
    </Modal>
  );
}
