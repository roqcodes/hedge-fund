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
  remarks?: string | null;
  remarksTitle?: string;
  remarksVariant?: WorkflowNoticeVariant;
  compact?: boolean;
  className?: string;
};

/** Unified status + remarks card for table status columns and detail modals. */
export function OrderStatusCard({
  label,
  statusStyle,
  remarks,
  remarksTitle = 'Remarks',
  remarksVariant = 'danger',
  compact = true,
  className = '',
}: Props) {
  const remarkStyles = REMARKS_STYLES[remarksVariant];
  const trimmedRemarks = remarks?.trim();

  return (
    <div
      className={[
        'overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm',
        compact ? 'mx-auto w-[7.5rem]' : 'w-full',
        className,
      ].join(' ')}
      onClick={e => e.stopPropagation()}
    >
      <div
        className={[
          compact ? 'px-2 py-1.5 text-center text-[10px]' : 'px-3 py-2 text-center text-xs',
          'font-bold tracking-wide',
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
  );
}
