'use client';

import React from 'react';
import { chartArea, kpiCard } from '@/lib/ui';

type Props = {
  title: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
};

export default function ChartCard({ title, legend, children }: Props) {
  return (
    <div className={`${kpiCard} !p-4 sm:!p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {legend}
      </div>
      <div className={chartArea}>{children}</div>
    </div>
  );
}
