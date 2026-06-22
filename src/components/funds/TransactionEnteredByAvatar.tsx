import React from 'react';
import type { Transaction } from '@/types';

export default function TransactionEnteredByAvatar({
  transaction: t,
  className = '',
  compact = true,
}: {
  transaction: Transaction;
  className?: string;
  compact?: boolean;
}) {
  if (!t.enteredByUsername) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const username = t.enteredByUsername;
  const name = t.enteredByName?.trim() || username.split('@')[0];

  return (
    <div className={`${compact ? 'w-[88px]' : 'min-w-0'} ${className}`.trim()}>
      <div className="truncate text-xs font-semibold leading-tight text-slate-800" title={name}>
        {name}
      </div>
      <div className="truncate text-[11px] leading-tight text-slate-400" title={username}>
        {username}
      </div>
    </div>
  );
}
