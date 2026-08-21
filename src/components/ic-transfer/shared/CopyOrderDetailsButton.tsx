'use client';

import React, { useState } from 'react';
import { IconCheck, IconCopy, IconShare } from './orderWorkflow/icons';
import { formatOrderPaymentCopyText } from '@/lib/icTransfer/orderCopyDetails';

type Props = {
  address?: string;
  units: number;
  disabled?: boolean;
  enableShare?: boolean;
  onCopySuccess?: () => void;
  onCopyError?: (message: string) => void;
  onShareError?: (message: string) => void;
};

export default function CopyOrderDetailsButton({
  address,
  units,
  disabled = false,
  enableShare = false,
  onCopySuccess,
  onCopyError,
  onShareError,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  const handleShare = async () => {
    if (!units || units <= 0) {
      onShareError?.('Enter units before sharing details');
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.share) {
      onShareError?.('Sharing is not supported on this device');
      return;
    }
    setSharing(true);
    try {
      const text = formatOrderPaymentCopyText(address, units);
      await navigator.share({ title: 'Order details', text });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onShareError?.('Could not share details');
    } finally {
      setSharing(false);
    }
  };

  const btnClass =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={btnClass}
        onClick={handleCopy}
        disabled={disabled || copying || !units}
      >
        {copied ? <IconCheck /> : <IconCopy />}
        {copied ? 'Copied' : copying ? 'Copying…' : 'Copy Details'}
      </button>
      {enableShare ? (
        <button
          type="button"
          className={btnClass}
          onClick={() => void handleShare()}
          disabled={disabled || sharing || !units}
        >
          <IconShare />
          {sharing ? 'Sharing…' : 'Share'}
        </button>
      ) : null}
    </div>
  );
}
