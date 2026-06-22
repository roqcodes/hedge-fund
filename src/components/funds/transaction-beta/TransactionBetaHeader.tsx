'use client';

import React from 'react';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import {
  TRANSACTION_BETA_PAGE_SUBTITLE,
  TRANSACTION_BETA_PAGE_TITLE,
} from '@/lib/transaction-beta/constants';
import { resolveBranchTimeZone } from '@/lib/businessTime';

type Props = {
  branchName?: string;
  branchTimezone: string;
  canPostEntries: boolean;
  onPostEntry: () => void;
  onEditCapital: () => void;
  onBackup: () => void;
  onManageLedgers: () => void;
};

export default function TransactionBetaHeader({
  branchName,
  branchTimezone,
  canPostEntries,
  onPostEntry,
  onEditCapital,
  onBackup,
  onManageLedgers,
}: Props) {
  const tz = resolveBranchTimeZone(branchTimezone);

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/90 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Branch operations</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {TRANSACTION_BETA_PAGE_TITLE}
          </h1>
          {branchName && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {branchName}
            </span>
          )}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{TRANSACTION_BETA_PAGE_SUBTITLE}</p>
        <p className="text-[11px] font-medium text-slate-400">
          Business calendar · <span className="font-mono text-slate-500">{tz}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onEditCapital}>
            Edit capital
          </button>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onBackup}>
            Backup
          </button>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onManageLedgers}>
            Ledgers
          </button>
        </div>
        <button
          type="button"
          className={`${btnPrimary} w-full sm:w-auto ${!canPostEntries ? 'pointer-events-none opacity-50' : ''}`}
          onClick={() => canPostEntries && onPostEntry()}
          disabled={!canPostEntries}
          title={!canPostEntries ? 'Select the active open business day to post entries' : 'Post a journal entry'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Post entry
        </button>
      </div>
    </header>
  );
}
