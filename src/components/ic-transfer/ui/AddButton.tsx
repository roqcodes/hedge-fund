'use client';

import React from 'react';

type Props = {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
  icon?: React.ReactNode;
};

/** Primary add action — matches Groups & Deals header button */
export default function AddButton({ label, onClick, ariaLabel, icon }: Props) {
  const defaultIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="sm:h-[18px] sm:w-[18px]">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );

  return (
    <button
      type="button"
      className="flex size-10 items-center justify-center gap-2 rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:h-auto sm:w-auto sm:rounded-lg sm:bg-accent sm:px-4 sm:py-2 sm:text-white sm:hover:bg-accent/90 text-sm font-semibold"
      onClick={onClick}
      aria-label={ariaLabel || label}
    >
      {icon || defaultIcon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
