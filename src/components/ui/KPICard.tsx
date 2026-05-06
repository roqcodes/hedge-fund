'use client';
import React from 'react';

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
  onClick,
}: KPICardProps) {
  const plColor =
    label.toLowerCase().includes('p&l') && typeof value === 'string'
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
      className={`group relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-surface transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(0)] sm:p-6 ${
        onClick
          ? 'cursor-pointer motion-safe:hover:-translate-y-1 motion-safe:hover:border-slate-200/90 motion-safe:hover:shadow-surface-hover motion-safe:active:translate-y-0 motion-safe:active:scale-[0.995] motion-safe:active:duration-150'
          : 'motion-safe:hover:-translate-y-1 motion-safe:hover:border-slate-200/90 motion-safe:hover:shadow-surface-hover'
      }`}
    >
      <div
        className="absolute right-5 top-5 flex size-11 items-center justify-center rounded-2xl transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:scale-[1.04] sm:right-6 sm:top-6 [&_svg]:size-[18px]"
        style={{ backgroundColor: bgColor, color }}
      >
        {icon}
      </div>

      <div className="flex min-w-0 items-center gap-2 pr-14 sm:pr-16">
        <span className="size-2 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[11px] sm:tracking-[0.16em]">{label}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
        <h3
          className="min-w-0 max-w-full truncate text-2xl font-bold leading-none tracking-tight text-slate-900 tabular-nums sm:text-[1.75rem]"
          style={plColor ? { color: plColor } : undefined}
          title={String(value)}
        >
          {value}
        </h3>
        {trend && (
          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${
              trend.isUp ? 'bg-emerald-500/[0.1] text-emerald-700' : 'bg-red-500/[0.1] text-red-700'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d={trend.isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
            {trend.value}
          </div>
        )}
      </div>

      {subValue && (
        <p className="mt-3 text-sm font-medium leading-snug text-slate-500">{subValue}</p>
      )}
    </div>
  );
}
