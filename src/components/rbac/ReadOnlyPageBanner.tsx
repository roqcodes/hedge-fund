'use client';

import React from 'react';
import { useWriteAccess } from '@/context/RbacWriteContext';

export default function ReadOnlyPageBanner() {
  const { isReadOnly, writeBlockedReason } = useWriteAccess();

  if (!isReadOnly) return null;

  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-amber-600"
        aria-hidden
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
      <div>
        <p className="font-semibold">View-only mode</p>
        <p className="mt-0.5 text-amber-800/90">{writeBlockedReason}</p>
      </div>
    </div>
  );
}
