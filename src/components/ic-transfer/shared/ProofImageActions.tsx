'use client';

import React, { useState } from 'react';
import { IconCheck, IconDownload, IconLink, IconShare, IconWhatsApp } from './orderWorkflow/icons';

type Props = {
  imageUrl: string;
  downloadFilename?: string;
  /** Show a native share button (Web Share API) for the proof image. */
  enableShare?: boolean;
  /** Optional title/text used when sharing. */
  shareTitle?: string;
  shareText?: string;
  /** Render the WhatsApp affordance. Shows a button when a phone is present,
   * otherwise a "phone number not added" note. */
  enableWhatsApp?: boolean;
  /** When provided, the WhatsApp button messages this number. */
  whatsappPhone?: string;
  /** Message prefilled in the WhatsApp chat. */
  whatsappMessage?: string;
  onCopySuccess?: () => void;
  onCopyError?: (message: string) => void;
  onDownloadError?: (message: string) => void;
  onShareError?: (message: string) => void;
};

/** Strip everything except digits so wa.me receives an international number. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export default function ProofImageActions({
  imageUrl,
  downloadFilename = 'delivery-proof',
  enableShare = false,
  shareTitle = 'Payment proof',
  shareText,
  enableWhatsApp = false,
  whatsappPhone,
  whatsappMessage,
  onCopySuccess,
  onCopyError,
  onDownloadError,
  onShareError,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  const handleShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      onShareError?.('Sharing is not supported on this device');
      return;
    }
    setSharing(true);
    try {
      // Prefer sharing the actual image file when the platform supports it.
      try {
        const res = await fetch(imageUrl);
        if (res.ok) {
          const blob = await res.blob();
          const ext = blob.type.split('/')[1]?.split('+')[0] || 'jpg';
          const file = new File([blob], `${downloadFilename}.${ext}`, { type: blob.type });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: shareTitle, text: shareText });
            return;
          }
        }
      } catch {
        // Fall through to URL sharing below.
      }
      await navigator.share({ title: shareTitle, text: shareText, url: imageUrl });
    } catch (err) {
      // Ignore user-cancelled shares; surface everything else.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      onShareError?.('Could not share the image');
    } finally {
      setSharing(false);
    }
  };

  const handleWhatsApp = () => {
    const digits = whatsappPhone ? normalizePhone(whatsappPhone) : '';
    if (!digits) return;
    const text = whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : '';
    window.open(`https://wa.me/${digits}${text}`, '_blank', 'noopener,noreferrer');
  };

  const btnClass =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50';

  const whatsappBtnClass =
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-100 disabled:opacity-50';

  const whatsappDigits = whatsappPhone ? normalizePhone(whatsappPhone) : '';

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
      {enableShare ? (
        <button type="button" className={btnClass} onClick={handleShare} disabled={sharing}>
          <IconShare />
          {sharing ? 'Sharing…' : 'Share'}
        </button>
      ) : null}
      {enableWhatsApp ? (
        whatsappDigits ? (
          <button type="button" className={whatsappBtnClass} onClick={handleWhatsApp}>
            <IconWhatsApp />
            WhatsApp
          </button>
        ) : (
          <span
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-400"
            title="No phone number on record for this customer"
          >
            <IconWhatsApp />
            Phone number not added
          </span>
        )
      ) : null}
    </div>
  );
}
