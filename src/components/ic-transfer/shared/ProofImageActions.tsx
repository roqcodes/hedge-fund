'use client';

import React, { useState } from 'react';
import { IconCheck, IconDownload, IconLink } from './orderWorkflow/icons';

type Props = {
  imageUrl: string;
  downloadFilename?: string;
  onCopySuccess?: () => void;
  onCopyError?: (message: string) => void;
  onDownloadError?: (message: string) => void;
};

export default function ProofImageActions({
  imageUrl,
  downloadFilename = 'delivery-proof',
  onCopySuccess,
  onCopyError,
  onDownloadError,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      onCopySuccess?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopyError?.('Could not copy link to clipboard');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${downloadFilename}.${ext}`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      onDownloadError?.('Could not download image — opening in a new tab instead');
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  const btnClass =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50';

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" className={btnClass} onClick={handleCopyLink}>
        {copied ? <IconCheck /> : <IconLink />}
        {copied ? 'Copied' : 'Copy Link'}
      </button>
      <button type="button" className={btnClass} onClick={handleDownload} disabled={downloading}>
        <IconDownload />
        {downloading ? 'Downloading…' : 'Download'}
      </button>
    </div>
  );
}
