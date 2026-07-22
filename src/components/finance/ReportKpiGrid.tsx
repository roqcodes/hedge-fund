'use client';

import React from 'react';
import KPICard from '@/components/ui/KPICard';
import { kpiGrid } from '@/lib/ui';

type KpiItem = {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  color?: string;
  bgColor?: string;
};

export default function ReportKpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className={kpiGrid}>
      {items.map(item => (
        <KPICard
          key={item.label}
          label={item.label}
          value={item.value}
          subValue={item.subValue}
          color={item.color ?? 'var(--accent)'}
          bgColor={item.bgColor ?? 'var(--accent-light)'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        />
      ))}
    </div>
  );
}
