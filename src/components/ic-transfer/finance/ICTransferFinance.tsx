'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import KPICard from '@/components/ui/KPICard';
import { btnPrimary, kpiGrid } from '@/lib/ui';
import { PageHeader, PageShell, SectionCard } from '../ui';

export default function ICTransferFinance() {
  const { currentSlug } = useApp();
  const fundsHref = currentSlug ? `/${currentSlug}/ic-funds/reports` : '/ic-funds/reports';

  return (
    <PageShell>
      <PageHeader
        title="Finance & Report"
        subtitle="IC Transfer money lives in IC Funds — a separate book from gold Funds."
        actions={
          <Link href={fundsHref} className={`${btnPrimary} no-underline`}>
            Open IC Funds
          </Link>
        }
      />

      <div className={kpiGrid}>
        {['Total Revenue', 'Total Expenses', 'Net Profit', 'Outstanding Due'].map((label, i) => (
          <KPICard
            key={label}
            label={label}
            value="—"
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
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          Payments, receipts, journal, contra, cash &amp; bank, and P&amp;L are in IC Funds.
        </div>
      </SectionCard>
    </PageShell>
  );
}
