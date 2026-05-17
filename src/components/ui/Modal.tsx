'use client';
import React from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center bg-white/30 backdrop-blur-sm transition-[opacity,visibility] duration-300 ease-out sm:items-center sm:p-4 ${
        open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[min(90dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-modal transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-h-[90vh] sm:rounded-[1.75rem] ${
          open ? 'translate-y-0 scale-100 sm:translate-y-0' : 'translate-y-full scale-100 sm:translate-y-5 sm:scale-[0.98]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
          <h3 id="modal-title" className="text-base font-bold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-base text-slate-600 transition-[transform,colors,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:scale-[1.04] motion-safe:hover:bg-red-50 motion-safe:hover:text-red-600 motion-safe:active:scale-[0.97] motion-safe:active:duration-150"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">{children}</div>
        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/90 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4 [&>button]:w-full sm:[&>button]:w-auto">
          {footer}
        </div>
      </div>
    </div>
  );
}
