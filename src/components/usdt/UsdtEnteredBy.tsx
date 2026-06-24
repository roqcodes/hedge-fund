import React from 'react';
import type { UsdtBuy, UsdtSell } from '@/types';

type UsdtDeal = UsdtBuy | UsdtSell;

export default function UsdtEnteredBy({
  deal,
  className = '',
}: {
  deal: UsdtDeal;
  className?: string;
}) {
  if (!deal.enteredByUsername) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const username = deal.enteredByUsername;
  const name = deal.enteredByName?.trim() || username.split('@')[0];

  return (
    <div className={`w-[88px] min-w-0 ${className}`.trim()}>
      <div className="truncate text-xs font-semibold leading-tight text-slate-800" title={name}>
        {name}
      </div>
      <div className="truncate text-[11px] leading-tight text-slate-400" title={username}>
        {username}
      </div>
    </div>
  );
}
