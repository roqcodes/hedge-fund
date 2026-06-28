'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary } from '@/lib/ui';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dangerBtn =
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const warningBtn =
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-sm"
      footer={
        <div className="flex w-full justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={variant === 'danger' ? dangerBtn : warningBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
}
