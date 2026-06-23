'use client';

import React from 'react';
import { kpiCard } from '@/lib/ui';

interface SplitMetric {
  label: string;
  value: React.ReactNode;
}

interface PhysicalSplitKPICardProps {
  top: SplitMetric;
  bottom: SplitMetric;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  bottomValueClassName?: string;
}

export default function PhysicalSplitKPICard({
  top,
  bottom,
  icon,
  color = 'var(--accent)',
  bgColor = 'var(--accent-light)',
  bottomValueClassName,
}: PhysicalSplitKPICardProps) {
  return (
    <div className={`${kpiCard} flex flex-col justify-between gap-0 !pb-4`}>
      <div className="flex flex-col gap-0.5 pr-10">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{top.label}</div>
        <div className="truncate text-base font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-lg">
          {top.value}
        </div>
      </div>

      <div className="my-3 border-t border-dashed border-slate-200" />

      <div className="flex flex-col gap-0.5 pr-10">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{bottom.label}</div>
        <div
          className={`truncate text-base font-extrabold tabular-nums tracking-tight sm:text-lg ${
            bottomValueClassName ?? 'text-slate-900'
          }`}
        >
          {bottom.value}
        </div>
      </div>

      <div
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl sm:right-3.5 sm:top-3.5 [&_svg]:size-4"
        style={{ backgroundColor: bgColor, color }}
      >
        {icon}
      </div>
    </div>
  );
}

interface PhysicalSingleKPICardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  valueClassName?: string;
}

export function PhysicalSingleKPICard({
  label,
  value,
  icon,
  color = 'var(--accent)',
  bgColor = 'var(--accent-light)',
  valueClassName,
}: PhysicalSingleKPICardProps) {
  return (
    <div className={`${kpiCard} flex flex-col justify-center`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div
        className={`mt-1 truncate text-base font-extrabold tabular-nums tracking-tight sm:text-lg ${
          valueClassName ?? 'text-slate-900'
        }`}
      >
        {value}
      </div>
      <div
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl sm:right-3.5 sm:top-3.5 [&_svg]:size-4"
        style={{ backgroundColor: bgColor, color }}
      >
        {icon}
      </div>
    </div>
  );
}
