'use client';

import React from 'react';

export type WorkflowNoticeVariant = 'danger' | 'warning' | 'info';

const VARIANT_STYLES: Record<WorkflowNoticeVariant, { box: string; title: string; body: string }> = {
  danger: {
    box: 'border-red-100 bg-red-50/90',
    title: 'text-red-600',
    body: 'text-red-800',
  },
  warning: {
    box: 'border-orange-100 bg-orange-50/90',
    title: 'text-orange-600',
    body: 'text-orange-800',
  },
  info: {
    box: 'border-slate-200 bg-slate-50/90',
    title: 'text-slate-500',
    body: 'text-slate-700',
  },
};

type Props = {
  variant?: WorkflowNoticeVariant;
  title?: string;
  children: React.ReactNode;
  compact?: boolean;
};

export function WorkflowNotice({ variant = 'danger', title, children, compact = false }: Props) {
  const styles = VARIANT_STYLES[variant];
  return (
    <div
      className={[
        'rounded-lg border px-2 py-1.5',
        compact ? 'text-[10px] leading-snug' : 'text-xs leading-relaxed',
        styles.box,
      ].join(' ')}
    >
      {title && (
        <p className={`font-bold uppercase tracking-wide ${compact ? 'text-[9px]' : 'text-[10px]'} ${styles.title}`}>
          {title}
        </p>
      )}
      <p className={`${title ? 'mt-0.5' : ''} ${styles.body}`}>{children}</p>
    </div>
  );
}
