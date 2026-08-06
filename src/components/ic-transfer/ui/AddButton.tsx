'use client';

import React from 'react';

type Props = {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

/** Primary add action — matches Groups & Deals header button */
export default function AddButton({ label, onClick, ariaLabel, icon, disabled = false }: Props) {
  const defaultIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="sm:h-[18px] sm:w-[18px]">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );

  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex size-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors sm:h-auto sm:w-auto sm:rounded-lg sm:px-4 sm:py-2 ${
        disabled
          ? 'cursor-not-allowed bg-slate-100 text-slate-400 sm:bg-slate-100 sm:text-slate-400'
          : 'bg-accent/10 text-accent hover:bg-accent hover:text-white sm:bg-accent sm:text-white sm:hover:bg-accent/90'
      }`}
      onClick={onClick}
      aria-label={ariaLabel || label}
    >
      {icon || defaultIcon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
