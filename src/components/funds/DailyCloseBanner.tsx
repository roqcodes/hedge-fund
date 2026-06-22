'use client';

import React, { useState } from 'react';
import type { DailyCloseContext } from '@/types';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { closeBranchDayAction } from '@/app/actions/dailyCloseActions';

type Props = {
  branchId: string;
  branchSlug?: string;
  context: DailyCloseContext;
  onClosed: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
};

function formatDisplayDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function DailyCloseBanner({ branchId, branchSlug, context, onClosed, showToast }: Props) {
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!confirm(`Close ${formatDisplayDate(context.workingDate)}? All entries will be locked.`)) return;
    setClosing(true);
    const res = await closeBranchDayAction(branchId, context.workingDate, branchSlug);
    setClosing(false);
    if (!res.success) {
      showToast(res.error || 'Failed to close day', 'error');
      return;
    }
    showToast(`Day closed — ${formatDisplayDate(context.workingDate)}`, 'success');
    onClosed();
  };

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-surface-xs">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active business day</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">
              {formatDisplayDate(context.workingDate)}
            </span>
            <span
              className={`rounded-lg px-2 py-1 text-xs font-bold ${
                context.isWorkingDayClosed
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
              }`}
            >
              {context.isWorkingDayClosed ? 'Closed' : 'Open — entries editable'}
            </span>
          </div>
          {context.todayDue && (
            <p className="text-xs leading-relaxed text-amber-800">
              <span className="font-bold">Due:</span> {formatDisplayDate(context.yesterdayDate)} is still open.
              Close it before today ({formatDisplayDate(context.todayDate)}) can be finalized.
              New entries post to the open day ({formatDisplayDate(context.workingDate)}).
            </p>
          )}
          {!context.todayDue && !context.isWorkingDayClosed && (
            <p className="text-xs text-slate-500">
              Today: {formatDisplayDate(context.todayDate)} — post transactions, then close when done.
            </p>
          )}
        </div>
        {!context.isWorkingDayClosed && (
          <button
            type="button"
            className={`${btnPrimary} w-full shrink-0 lg:w-auto`}
            disabled={closing}
            onClick={handleClose}
          >
            {closing ? 'Closing…' : `Close ${formatDisplayDate(context.workingDate)}`}
          </button>
        )}
        {context.isWorkingDayClosed && (
          <span className={`${btnSecondary} pointer-events-none w-full text-center opacity-60 lg:w-auto`}>
            Day locked
          </span>
        )}
      </div>
    </div>
  );
}
