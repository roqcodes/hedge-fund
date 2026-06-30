'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary } from '@/lib/ui';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: (remarks: string) => void;
  onCancel: () => void;
};

export default function RejectRemarkModal({
  open,
  title = 'Reject Order',
  description = 'Please provide a reason for rejection. This will be visible to the admin team.',
  confirmLabel = 'Reject Order',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (open) setRemarks('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) return;
    onConfirm(remarks.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-md"
      footer={
        <div className="flex w-full justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="reject-remark-form"
            disabled={loading || !remarks.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      }
    >
      <form id="reject-remark-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        <div>
          <label htmlFor="rejection-remarks" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Reason for rejection
          </label>
          <textarea
            id="rejection-remarks"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={4}
            required
            placeholder="Enter rejection reason..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
