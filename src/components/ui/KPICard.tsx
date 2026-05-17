'use client';
import React from 'react';
import { kpiCard } from '@/lib/ui';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isUp: boolean;
  };
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export default function KPICard({
  label,
  value,
  subValue,
  trend,
  icon,
  color = 'var(--accent)',
  bgColor = 'var(--accent-light)',
  valueClassName,
  onClick,
}: KPICardProps) {
  const plColor =
    !valueClassName && label.toLowerCase().includes('p&l') && typeof value === 'string'
      ? value.startsWith('+')
        ? 'var(--profit)'
        : value.startsWith('-')
          ? 'var(--loss)'
          : undefined
      : undefined;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={e => onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      className={`${kpiCard} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">{label}</div>
      <div
        className={`mt-1 truncate text-base font-extrabold tabular-nums tracking-tight sm:text-lg ${
          valueClassName ?? (plColor ? '' : 'text-slate-900')
        }`}
        style={plColor ? { color: plColor } : undefined}
        title={String(value)}
      >
        {value}
      </div>
      {trend && (
        <div
          className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold sm:text-xs ${
            trend.isUp ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d={trend.isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
          {trend.value}
        </div>
      )}
      {subValue && <div className="mt-1 text-[11px] font-medium text-slate-500">{subValue}</div>}
      <div
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl text-base sm:right-3.5 sm:top-3.5 [&_svg]:size-4"
        style={{ backgroundColor: bgColor, color }}
      >
        {icon}
      </div>
    </div>
  );
}
