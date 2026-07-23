'use client';

import React from 'react';
import { btnDangerOutline } from '@/lib/ui';

export function TrashIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

export function DeleteIconButton({
  onClick,
  title = 'Delete',
  disabled,
  className = '',
  showOnRowHover = false,
}: {
  onClick: (e: React.MouseEvent) => void;
  title?: string;
  disabled?: boolean;
  className?: string;
  showOnRowHover?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        showOnRowHover ? 'opacity-0 group-hover:opacity-100' : ''
      } ${className}`}
    >
      <TrashIcon />
    </button>
  );
}

export function DeleteButton({
  onClick,
  label = 'Delete',
  loading = false,
  disabled = false,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  onClick: () => void;
  label?: string;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${btnDangerOutline} ${className}`}
      {...rest}
    >
      {loading ? 'Deleting…' : label}
    </button>
  );
}
