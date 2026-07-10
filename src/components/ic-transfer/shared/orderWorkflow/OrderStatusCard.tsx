'use client';

import React from 'react';
import type { WorkflowNoticeVariant } from './WorkflowNotice';

const REMARKS_STYLES: Record<WorkflowNoticeVariant, { body: string; title: string }> = {
  danger: { body: 'bg-red-50/95 text-red-800', title: 'text-red-600' },
  warning: { body: 'bg-orange-50/95 text-orange-800', title: 'text-orange-600' },
  info: { body: 'bg-slate-50/95 text-slate-700', title: 'text-slate-500' },
};

type Props = {
  label: string;
  statusStyle: string;
  flowDescription?: string | null;
  remarks?: string | null;
  remarksTitle?: string;
  remarksVariant?: WorkflowNoticeVariant;
  compact?: boolean;
  className?: string;
};

/** Unified status + remarks card with hover flow description. */
export function OrderStatusCard({
  label,
  statusStyle,
  flowDescription,
  remarks,
  remarksTitle = 'Remarks',
  remarksVariant = 'danger',
  compact = true,
  className = '',
}: Props) {
  const remarkStyles = REMARKS_STYLES[remarksVariant];
  const trimmedRemarks = remarks?.trim();
  const trimmedFlow = flowDescription?.trim();

  return (
    <div
      className={[
        'group relative',
        compact ? 'mx-auto w-[7.5rem]' : 'w-full',
        className,
      ].join(' ')}
      onClick={e => e.stopPropagation()}
    >
      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm">
        <div
          className={[
            compact ? 'px-2 py-1.5 text-center text-[10px]' : 'px-3 py-2 text-center text-xs',
            'font-bold tracking-wide cursor-help',
            trimmedRemarks ? 'border-b border-slate-200/60' : '',
            statusStyle,
          ].join(' ')}
        >
          {label}
        </div>

        {trimmedRemarks && (
          <div className={`px-3 py-2 ${remarkStyles.body}`}>
            <p
              className={`font-bold uppercase tracking-wide ${compact ? 'text-[9px]' : 'text-[10px]'} ${remarkStyles.title}`}
            >
              {remarksTitle}
            </p>
            <p className={`mt-0.5 leading-snug ${compact ? 'text-[10px]' : 'text-sm'}`}>{trimmedRemarks}</p>
          </div>
        )}
      </div>

      {trimmedFlow && (
        <div
          role="tooltip"
          className={[
            'pointer-events-none absolute left-1/2 z-50 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg',
            'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
            compact ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">What&apos;s happening</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{trimmedFlow}</p>
        </div>
      )}
    </div>
  );
}
