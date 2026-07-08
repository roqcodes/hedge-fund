'use client';

import React, { useState } from 'react';
import { IconCheck, IconCopy } from './orderWorkflow/icons';
import { formatOrderPaymentCopyText } from '@/lib/icTransfer/orderCopyDetails';

type Props = {
  address?: string;
  units: number;
  disabled?: boolean;
  onCopySuccess?: () => void;
  onCopyError?: (message: string) => void;
};

export default function CopyOrderDetailsButton({
  address,
  units,
  disabled = false,
  onCopySuccess,
  onCopyError,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!units || units <= 0) {
      onCopyError?.('Enter units before copying details');
      return;
    }

    setCopying(true);
    try {
      const text = formatOrderPaymentCopyText(address, units);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopySuccess?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyError?.('Could not copy details to clipboard');
    } finally {
      setCopying(false);
    }
  };

  const btnClass =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50';

  return (
    <button
      type="button"
      className={btnClass}
      onClick={handleCopy}
      disabled={disabled || copying || !units}
    >
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copied' : copying ? 'Copying…' : 'Copy Details'}
    </button>
  );
}
