'use client';

import React from 'react';
import SectionCard from './SectionCard';
import BalanceList, { BalanceItem } from './BalanceList';

type Props = {
  matrix: React.ReactNode;
  balances: BalanceItem[];
  sidebarExtra?: React.ReactNode;
  className?: string;
};

/** Unified summary card — matrix + balances in one surface, content-height */
export default function SummaryPanel({ matrix, balances, sidebarExtra, className = '' }: Props) {
  const sidebarWidth = sidebarExtra
    ? 'lg:grid-cols-[minmax(0,1fr)_14rem] xl:grid-cols-[minmax(0,1fr)_15rem]'
    : 'lg:grid-cols-[minmax(0,1fr)_11rem] xl:grid-cols-[minmax(0,1fr)_12.5rem]';

  return (
    <SectionCard className={`mb-5 overflow-hidden ${className}`}>
      <div className={`grid ${sidebarWidth}`}>
        <div className="min-w-0 border-b border-slate-100 lg:border-b-0 lg:border-r">{matrix}</div>
        <div className="flex flex-col">
          <BalanceList items={balances} />
          {sidebarExtra && (
            <>
              <div className="mx-4 border-t border-slate-100 lg:mx-3" />
              {sidebarExtra}
            </>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export type { BalanceItem };
