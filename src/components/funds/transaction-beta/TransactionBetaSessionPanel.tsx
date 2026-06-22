'use client';

import React, { useState } from 'react';
import type { DailyCloseContext } from '@/types';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { closeBranchDayAction } from '@/app/actions/dailyCloseActions';
import { resolveBranchTimeZone } from '@/lib/businessTime';

type Props = {
  branchId: string;
  branchSlug?: string;
  branchTimezone: string;
  context: DailyCloseContext;
  onClosed: () => void | Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  syncError?: string | null;
  loading?: boolean;
};

function formatDisplayDate(dateStr: string, timeZone: string) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: resolveBranchTimeZone(timeZone),
  });
}

const STEPS = [
  { id: 'open', label: 'Open day' },
  { id: 'post', label: 'Post entries' },
  { id: 'close', label: 'Close day' },
] as const;

export default function TransactionBetaSessionPanel({
  branchId,
  branchSlug,
  branchTimezone,
  context,
  onClosed,
  showToast,
  syncError,
  loading,
}: Props) {
  const [closing, setClosing] = useState(false);
  const tz = resolveBranchTimeZone(branchTimezone);
  const activeStep = context.isWorkingDayClosed ? 2 : 1;

  const handleClose = async () => {
    if (!confirm(`Close ${formatDisplayDate(context.workingDate, tz)}? All entries will be locked.`)) return;
    setClosing(true);
    const res = await closeBranchDayAction(branchId, context.workingDate, branchSlug);
    setClosing(false);
    if (!res.success) {
      showToast(res.error || 'Failed to close day', 'error');
      return;
    }
    showToast(`Day closed — ${formatDisplayDate(context.workingDate, tz)}`, 'success');
    await onClosed();
  };

  return (
    <section className="mb-5 space-y-3" aria-label="Business day session">
      {syncError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950"
        >
          <span className="font-semibold">Session sync issue:</span> {syncError}. Viewing cached data — close day may
          not persist until connection is restored.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-surface-xs">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Day-close workflow</p>
            <ol className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-500">
              {STEPS.map((step, i) => (
                <li key={step.id} className="flex items-center gap-1">
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      i <= activeStep ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1}. {step.label}
                  </span>
                  {i < STEPS.length - 1 && <span className="text-slate-300">→</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active business day</p>
            <div className="flex flex-wrap items-center gap-2">
              <time
                dateTime={context.workingDate}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold tabular-nums text-white"
              >
                {formatDisplayDate(context.workingDate, tz)}
              </time>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  context.isWorkingDayClosed
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                }`}
              >
                {loading ? 'Syncing…' : context.isWorkingDayClosed ? 'Closed · locked' : 'Open · entries allowed'}
              </span>
            </div>
            {context.todayDue ? (
              <p className="max-w-xl text-xs leading-relaxed text-amber-900">
                <span className="font-semibold">Action required:</span> {formatDisplayDate(context.yesterdayDate, tz)}{' '}
                is still open. Close it before finalizing {formatDisplayDate(context.todayDate, tz)}. New entries post
                to {formatDisplayDate(context.workingDate, tz)}.
              </p>
            ) : !context.isWorkingDayClosed ? (
              <p className="text-xs text-slate-500">
                Calendar today: {formatDisplayDate(context.todayDate, tz)} — post all journal entries, then close when
                balances reconcile.
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {!context.isWorkingDayClosed ? (
              <button
                type="button"
                className={`${btnPrimary} w-full lg:w-auto`}
                disabled={closing || loading}
                onClick={handleClose}
              >
                {closing ? 'Closing…' : `Close ${formatDisplayDate(context.workingDate, tz)}`}
              </button>
            ) : (
              <span className={`${btnSecondary} pointer-events-none w-full text-center opacity-70 lg:w-auto`}>
                Day locked
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
