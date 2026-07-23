'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { btnDangerSolid, btnSecondary } from '@/lib/ui';

export type ConfirmModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  mode?: 'confirm' | 'alert';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  zIndexClass?: string;
}

const variantBtn: Record<ConfirmModalVariant, string> = {
  danger: btnDangerSolid,
  warning:
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
  info:
    'inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
};

export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  mode = 'confirm',
  loading = false,
  onConfirm,
  onCancel,
  zIndexClass,
}: ConfirmModalProps) {
  const isAlert = mode === 'alert';

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="max-w-sm"
      zIndexClass={zIndexClass}
      footer={
        <div className="flex w-full justify-end gap-3">
          {!isAlert && (
            <button type="button" className={btnSecondary} onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={variantBtn[variant]}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : isAlert ? 'OK' : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}
