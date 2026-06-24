'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { dbUpdateUsdtSettingsAction } from '@/app/actions/usdtActions';

interface USDTSettingsModalProps {
  open: boolean;
  branchId: string;
  presetMargin: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function USDTSettingsModal({
  open,
  branchId,
  presetMargin,
  onClose,
  onSuccess,
}: USDTSettingsModalProps) {
  const [marginStr, setMarginStr] = useState(String(presetMargin));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setMarginStr(String(presetMargin));
  }, [open, presetMargin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const presetMarginVal = parseFloat(marginStr);
    if (!Number.isFinite(presetMarginVal) || presetMarginVal < 0) {
      alert('Enter a valid margin');
      return;
    }
    setIsSaving(true);
    const res = await dbUpdateUsdtSettingsAction(branchId, presetMarginVal);
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="USDT Settings"
      maxWidth="max-w-md w-[96vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" form="usdt-settings-form" disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50' : ''}`}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </>
      }
    >
      <form id="usdt-settings-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Preset margin is applied when opening the sell modal. Sell rate = cost + margin; profit = margin × USDT amount.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Preset Margin</label>
          <input
            type="number"
            step="any"
            className={formInput}
            value={marginStr}
            onChange={e => setMarginStr(e.target.value)}
            placeholder="0.002"
          />
          <p className="text-xs text-slate-400">Example: 0.002 on 100,000 USDT → 200 AED profit</p>
        </div>
      </form>
    </Modal>
  );
}
