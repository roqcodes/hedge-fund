'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { DealInvestor, Investor } from '@/types';
import { btnPrimary, btnSecondary, formError } from '@/lib/ui';
import {
  dealInvestorsToRows,
  parseDealInvestorRows,
  type DealInvestorRow,
} from '@/lib/dealInvestorAssignment';
import DealInvestorAssignmentSection from './DealInvestorAssignmentSection';

type Props = {
  open: boolean;
  onClose: () => void;
  dealAmount: number;
  investors: Investor[];
  dealInvestors: DealInvestor[];
  onSave: (investors: DealInvestor[]) => void | Promise<void>;
  disabled?: boolean;
};

export default function DealInvestorAssignmentModal({
  open,
  onClose,
  dealAmount,
  investors,
  dealInvestors,
  onSave,
  disabled = false,
}: Props) {
  const [rows, setRows] = useState<DealInvestorRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setError('');
      return;
    }
    const nextRows = dealInvestorsToRows(dealInvestors, dealAmount);
    setRows(nextRows.length > 0 ? nextRows : [{ investorId: '', percentageStr: '', amountStr: '', inputMode: 'amount' }]);
  }, [open, dealInvestors, dealAmount]);

  const handleSave = async () => {
    setError('');
    const parsed = parseDealInvestorRows(rows, dealAmount, investors);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed.validInvestors);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Group Investors"
      maxWidth="max-w-2xl"
      zIndexClass="z-[500]"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={handleSave}
            disabled={disabled || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {open && (
        <>
          <DealInvestorAssignmentSection
            embedded
            dealAmount={dealAmount}
            investors={investors}
            rows={rows}
            onChange={setRows}
            disabled={disabled}
            allowPendingIds={dealInvestors.map(i => i.investorId)}
          />
          {error ? <p className={`${formError} mt-4`}>{error}</p> : null}
        </>
      )}
    </Modal>
  );
}
