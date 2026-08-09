'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { DealStaffAssignment } from '@/types';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import DealStaffAssignmentSection from './DealStaffAssignmentSection';

type Props = {
  open: boolean;
  onClose: () => void;
  branchSlug?: string;
  assignments: DealStaffAssignment[];
  onChange: (assignments: DealStaffAssignment[]) => void;
  onSave?: (assignments: DealStaffAssignment[]) => void | Promise<void>;
  disabled?: boolean;
};

export default function DealStaffAssignmentModal({
  open,
  onClose,
  branchSlug,
  assignments,
  onChange,
  onSave,
  disabled = false,
}: Props) {
  const [draft, setDraft] = useState<DealStaffAssignment[]>(assignments);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(assignments);
  }, [open, assignments]);

  const handleDone = () => {
    onChange(draft);
    onClose();
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      onChange(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assigned Staff"
      maxWidth="max-w-2xl"
      zIndexClass="z-[500]"
      footer={
        onSave ? (
          <>
            <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={handleSave} disabled={disabled || saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <button type="button" className={btnPrimary} onClick={handleDone}>
            Done
          </button>
        )
      }
    >
      {open && branchSlug ? (
        <DealStaffAssignmentSection
          embedded
          branchSlug={branchSlug}
          assignments={draft}
          onChange={setDraft}
          disabled={disabled}
        />
      ) : null}
    </Modal>
  );
}
