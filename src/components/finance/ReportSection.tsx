'use client';

import React, { useState } from 'react';

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  variant?: 'collapsible' | 'flat';
  exportSlot?: React.ReactNode;
  children: React.ReactNode;
};

export default function ReportSection({
  id,
  title,
  subtitle,
  icon,
  defaultOpen = true,
  variant = 'collapsible',
  exportSlot,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const isFlat = variant === 'flat';

  if (isFlat) {
    return (
      <section
        id={id}
        className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface"
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {exportSlot && <div className="shrink-0">{exportSlot}</div>}
        </div>
        <div className="space-y-6 px-5 py-5 sm:px-8 sm:pb-8">{children}</div>
      </section>
    );
  }

  return (
    <section
      id={id}
      className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300"
    >
      <div className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-light text-accent">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          {exportSlot && open && <div className="hidden sm:block">{exportSlot}</div>}
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Collapse section' : 'Expand section'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-6 px-5 py-5 sm:px-8 sm:pb-8">
          {exportSlot && <div className="sm:hidden">{exportSlot}</div>}
          {children}
        </div>
      )}
    </section>
  );
}
