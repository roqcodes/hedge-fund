'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

/** Consistent container for status badge, notices, and action buttons in table cells & modals. */
export function OrderWorkflowShell({ children, compact = false, className = '', onClick }: Props) {
  return (
    <div
      className={[
        compact
          ? 'flex w-[7.5rem] flex-col items-stretch gap-1.5'
          : 'flex w-full max-w-sm flex-col items-stretch gap-3',
        className,
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function OrderWorkflowBadgeRow({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-center">{children}</div>;
}

export function OrderWorkflowActionStack({
  children,
  compact = true,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'mx-auto flex w-[7.5rem] flex-col items-stretch gap-1.5'
          : 'grid w-full grid-cols-1 gap-2 sm:grid-cols-2'
      }
    >
      {children}
    </div>
  );
}
