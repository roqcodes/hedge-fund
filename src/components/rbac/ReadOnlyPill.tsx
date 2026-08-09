'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useDealWriteAccess } from '@/hooks/useDealWriteAccess';

type ReadOnlyPillProps = {
  className?: string;
  /** When set, also shows for staff with read-only access to this specific group. */
  dealId?: string;
};

export default function ReadOnlyPill({ className = '', dealId }: ReadOnlyPillProps) {
  const { isReadOnly, writeBlockedReason } = useWriteAccess();
  const { canWrite: dealCanWrite, writeBlockedReason: dealBlockedReason } = useDealWriteAccess(dealId);
  const { user } = useApp();

  if (user?.role !== 'staff') return null;

  const showPageReadOnly = isReadOnly;
  const showDealReadOnly = Boolean(dealId && !dealCanWrite);
  if (!showPageReadOnly && !showDealReadOnly) return null;

  const tooltip = showDealReadOnly ? dealBlockedReason : writeBlockedReason;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ${className}`}
      title={tooltip}
      role="status"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-amber-600"
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      View only
    </span>
  );
}
