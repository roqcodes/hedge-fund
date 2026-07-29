'use client';

import React, { useEffect, useRef, useState } from 'react';

type Props = {
  text: string;
  label?: string;
};

export default function ReportInfoTip({ text, label = 'More information' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[9px] font-bold leading-none text-slate-400 transition-colors hover:border-accent/40 hover:text-accent"
        aria-label={label}
        aria-expanded={open}
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-slate-600 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
