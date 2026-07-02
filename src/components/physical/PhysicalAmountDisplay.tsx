'use client';

import React from 'react';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';

type ProfitTone = 'positive' | 'negative' | 'neutral' | 'auto';

interface PhysicalAmountDisplayProps {
  /** Backend-standardized AED amount. */
  aedAmount: number;
  showPlus?: boolean;
  /** Color profit/loss values automatically from sign. */
  profitTone?: ProfitTone;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
  className?: string;
  /** Render the inline "USDT" unit suffix. Disable when the unit lives in a column header. */
  showUnit?: boolean;
}

const alignClass = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
} as const;

const primarySizeClass = {
  sm: 'text-xs font-bold',
  md: 'text-sm font-extrabold',
  lg: 'text-base font-extrabold sm:text-lg',
} as const;

function resolveTone(aedAmount: number, profitTone: ProfitTone): string | undefined {
  if (profitTone === 'neutral') return undefined;
  if (profitTone === 'positive') return 'text-emerald-600';
  if (profitTone === 'negative') return 'text-red-600';
  if (aedAmount > 0) return 'text-emerald-600';
  if (aedAmount < 0) return 'text-red-600';
  return undefined;
}

export default function PhysicalAmountDisplay({
  aedAmount,
  showPlus = false,
  profitTone = 'neutral',
  size = 'md',
  align = 'center',
  className = '',
  showUnit = true,
}: PhysicalAmountDisplayProps) {
  const { fmtUsdt } = usePhysicalCurrency();
  const toneClass = resolveTone(aedAmount, profitTone);

  return (
    <div className={`flex flex-col gap-0.5 font-mono tabular-nums ${alignClass[align]} ${className}`}>
      <span className={`${primarySizeClass[size]} ${toneClass ?? 'text-slate-900'}`}>
        {fmtUsdt(aedAmount, showPlus)}
        {showUnit && (
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
        )}
      </span>
    </div>
  );
}

/** Compact inline variant for KPI cards. */
export function PhysicalAmountKpiValue({
  aedAmount,
  showPlus = false,
  profitTone = 'neutral',
  valueClassName,
}: Pick<PhysicalAmountDisplayProps, 'aedAmount' | 'showPlus' | 'profitTone'> & {
  valueClassName?: string;
}) {
  const { fmtUsdt } = usePhysicalCurrency();
  const toneClass = resolveTone(aedAmount, profitTone);

  return (
    <div className="flex flex-col gap-0.5 font-mono tabular-nums">
      <span className={`truncate text-base font-extrabold tracking-tight sm:text-lg ${toneClass ?? valueClassName ?? 'text-slate-900'}`}>
        {fmtUsdt(aedAmount, showPlus)}
        <span className="ml-1 text-[10px] font-bold uppercase text-slate-400">USDT</span>
      </span>
    </div>
  );
}
