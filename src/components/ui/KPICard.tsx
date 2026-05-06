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
      className={`group relative flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-3 shadow-surface transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(0)] sm:p-3.5 [&_svg]:size-4 ${
        onClick
          ? 'cursor-pointer motion-safe:hover:-translate-y-px motion-safe:hover:border-accent/20 motion-safe:hover:shadow-surface-hover motion-safe:active:translate-y-0 motion-safe:active:scale-[0.995] motion-safe:active:transition-[transform,box-shadow] motion-safe:active:duration-150'
          : 'motion-safe:hover:-translate-y-px motion-safe:hover:border-black/10 motion-safe:hover:shadow-surface-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover:scale-[1.03] motion-safe:group-hover:shadow-surface-xs sm:size-9"
          style={{ backgroundColor: bgColor, color }}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none sm:text-[11px] ${
              trend.isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="sm:size-3" aria-hidden>
              <path d={trend.isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-[11px]">{label}</span>
        <h3
          className="truncate text-base font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums sm:text-lg"
          style={plColor ? { color: plColor } : undefined}
          title={String(value)}
        >
          {value}
        </h3>
        {subValue && <p className="text-[11px] font-medium leading-snug text-slate-500 sm:text-xs">{subValue}</p>}
      </div>
    </div>
  );
}
