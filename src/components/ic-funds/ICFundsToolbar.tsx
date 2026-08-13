'use client';

import React from 'react';
import Link from 'next/link';
import { IC_FUNDS_NAV, type ICFundsSectionId, icFundsPath } from '@/lib/icFunds/nav';

export default function ICFundsToolbar({
  slug,
  section,
}: {
  slug: string;
  section: ICFundsSectionId;
}) {
  return (
    <nav className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none" aria-label="IC Funds">
      {IC_FUNDS_NAV.map(item => {
        const active = item.id === section;
        return (
          <Link
            key={item.id}
            href={icFundsPath(slug, item.id)}
            className={`shrink-0 border-b-2 px-2.5 py-1.5 text-sm no-underline transition-colors ${
              active
                ? '-mb-px border-slate-900 font-medium text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
