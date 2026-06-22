'use client';

import React from 'react';
import KPICard from '@/components/ui/KPICard';
import { kpiGrid } from '@/lib/ui';
import { PageHeader, PageShell, SectionCard } from '../ui';

export default function ICTransferFinance() {
  return (
    <PageShell>
      <PageHeader
        title="Finance & Report"
        subtitle="Financial summaries and reporting for IC Transfer"
      />

      <div className={kpiGrid}>
        {['Total Revenue', 'Total Expenses', 'Net Profit', 'Outstanding Due'].map((label, i) => (
          <KPICard
            key={label}
            label={label}
            value="0"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color={['var(--accent)', 'var(--info)', 'var(--profit)', 'var(--purple)'][i]}
            bgColor={['var(--accent-light)', 'var(--info-light)', 'var(--profit-light)', 'var(--purple-light)'][i]}
          />
        ))}
      </div>

      <SectionCard>
        <div className="px-6 py-12 text-center text-sm text-slate-400">
          Reports will appear here once transactions are recorded.
        </div>
      </SectionCard>
    </PageShell>
  );
}
