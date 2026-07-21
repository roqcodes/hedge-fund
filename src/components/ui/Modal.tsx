'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  zIndexClass?: string;
};

let openModalsCount = 0;

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
  maxHeight = 'sm:max-h-[min(88dvh,720px)]',
  zIndexClass = 'z-[400]',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    openModalsCount++;
    if (openModalsCount === 1) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      openModalsCount--;
      if (openModalsCount <= 0) {
        openModalsCount = 0;
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] transition-[opacity,visibility] duration-300 ease-out sm:items-center sm:p-4 ${open ? 'visible opacity-100' : 'invisible pointer-events-none opacity-0'
        }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[min(92dvh,100%)] w-full ${maxWidth} flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)] transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${maxHeight} sm:rounded-2xl ${open ? 'translate-y-0 scale-100 sm:translate-y-0' : 'translate-y-full scale-100 sm:translate-y-4 sm:scale-[0.98]'
          }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
          <div id="modal-title" className="text-base font-bold text-slate-900 sm:text-lg flex-1 mr-4">
            {title}
          </div>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-4 [&>div]:!mb-3 [&>div:last-child]:!mb-0">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white p-3 sm:flex-row sm:justify-end sm:gap-3 sm:p-4 [&>button]:w-full sm:[&>button]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
