'use client';

import React from 'react';

/** Primary amount block — top of every deal/entry detail view */
export function DetailHero({
  eyebrow,
  title,
  subtitle,
  badge,
  accent = 'slate',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  accent?: 'slate' | 'emerald' | 'red' | 'amber' | 'indigo';
}) {
  const accentBg: Record<string, string> = {
    slate: 'from-slate-50 to-white border-slate-200',
    emerald: 'from-emerald-50/80 to-white border-emerald-200',
    red: 'from-red-50/80 to-white border-red-200',
    amber: 'from-amber-50/80 to-white border-amber-200',
    indigo: 'from-indigo-50/80 to-white border-indigo-200',
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${accentBg[accent]}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          )}
          <div className="mt-1 font-mono text-2xl font-black tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </div>
          {subtitle && (
            <div className="mt-1.5 text-sm font-semibold text-slate-600">{subtitle}</div>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
    </div>
  );
}

export function DetailBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'danger' | 'warning' | 'info';
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-indigo-100 text-indigo-800',
  };
  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function DetailSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      {children}
    </section>
  );
}

export function DetailField({
  label,
  value,
  className = '',
  mono,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <div className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  );
}

export function DetailMetaRow({
  items,
}: {
  items: { label: string; value: React.ReactNode; mono?: boolean }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className={`mt-0.5 truncate text-xs font-bold text-slate-800 ${item.mono ? 'font-mono' : ''}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DetailPartyCard({
  label,
  name,
  sub,
  href,
}: {
  label: string;
  name: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-base font-bold text-slate-900">{name}</p>
      {sub && <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>}
    </>
  );
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {href ? (
        <a href={href} className="block hover:text-accent">{inner}</a>
      ) : (
        inner
      )}
    </div>
  );
}

export function DetailFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

/* ── Compact summary layout (PhysicalKpiGrid-style) ── */

export type DetailPillTone =
  | 'buy'
  | 'sell'
  | 'bulk'
  | 'fix'
  | 'unfix'
  | 'closed'
  | 'pending'
  | 'profit'
  | 'loss'
  | 'neutral'
  | 'usdt'
  | 'info';

const pillToneClass: Record<DetailPillTone, string> = {
  buy: 'bg-sky-50 text-sky-700 ring-sky-100',
  sell: 'bg-amber-50 text-amber-700 ring-amber-100',
  bulk: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  fix: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  unfix: 'bg-violet-50 text-violet-700 ring-violet-100',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  profit: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  loss: 'bg-red-50 text-red-700 ring-red-100',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  usdt: 'bg-teal-50 text-teal-700 ring-teal-100',
  info: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
};

export function DetailPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: DetailPillTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${pillToneClass[tone]}`}
    >
      {children}
    </span>
  );
}

export function DetailSummaryStack({
  children,
  className = 'mb-5 space-y-4',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function DetailSummaryCard({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white"
      aria-label={ariaLabel}
    >
      {children}
    </section>
  );
}

export function DetailSummaryHeader({
  badges,
  meta,
}: {
  badges?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
      {badges ? <div className="flex min-w-0 flex-wrap items-center gap-2">{badges}</div> : <div />}
      {meta ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">{meta}</div>
      ) : null}
    </div>
  );
}

export function DetailSummarySplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid divide-slate-100 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:divide-x">
      {children}
    </div>
  );
}

export function DetailSummaryPanel({
  children,
  side = 'left',
}: {
  children: React.ReactNode;
  side?: 'left' | 'right';
}) {
  return (
    <div className={`p-4 sm:p-5 ${side === 'left' ? 'border-b border-slate-100 md:border-b-0' : ''}`}>
      {children}
    </div>
  );
}

export function DetailSummarySectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{children}</p>
  );
}

export function DetailUsdtMetric({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'neutral' | 'profit' | 'loss';
}) {
  const toneClass =
    tone === 'profit' ? 'text-emerald-600' : tone === 'loss' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1.5 font-mono text-base font-bold tabular-nums leading-tight sm:text-lg ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function DetailMetricHighlight({
  label,
  value,
  unit,
  valueClassName = 'text-slate-900',
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${valueClassName}`}>
          {value}
        </span>
        {unit ? <span className="text-sm font-medium text-slate-500">{unit}</span> : null}
      </div>
    </div>
  );
}

export function DetailMiniMetric({
  label,
  value,
  valueClassName = 'text-slate-900',
  align = 'left',
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'sm:text-right' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${valueClassName}`}>{value}</p>
    </div>
  );
}

export function DetailProgressBar({
  label,
  pct,
  hint,
  ariaLabel,
}: {
  label: string;
  pct: number;
  hint?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel ?? label}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function DetailCustomerChip({
  initials,
  label = 'Customer',
  name,
  sub,
}: {
  initials: string;
  label?: string;
  name: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold uppercase text-slate-500 ring-1 ring-slate-100">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <div className="truncate text-sm font-bold">{name}</div>
      </div>
      {sub ? <div className="hidden max-w-[140px] truncate text-xs text-slate-500 sm:block">{sub}</div> : null}
    </div>
  );
}

export function DetailSpecCard({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white"
      aria-label={ariaLabel}
    >
      <div className="grid divide-slate-100 md:grid-cols-2 md:divide-x">{children}</div>
    </section>
  );
}

export function DetailSpecPanel({
  title,
  children,
  bordered = true,
}: {
  title: string;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  return (
    <div className={`p-4 sm:p-5 ${bordered ? 'border-b border-slate-100 md:border-b-0' : ''}`}>
      <DetailSummarySectionTitle>{title}</DetailSummarySectionTitle>
      {children}
    </div>
  );
}

export function DetailSpecGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const colClass =
    cols === 4
      ? 'sm:grid-cols-4'
      : cols === 3
        ? 'sm:grid-cols-3'
        : '';
  return <div className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-4 ${colClass}`}>{children}</div>;
}

export function DetailSpecCell({
  label,
  value,
  mono,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <div className={`mt-1 text-sm font-bold text-slate-900 ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value}
      </div>
    </div>
  );
}

export function DetailMetaInline({
  txnId,
  date,
}: {
  txnId?: React.ReactNode;
  date?: React.ReactNode;
}) {
  return (
    <>
      {txnId ? <span className="font-mono font-semibold text-slate-700">{txnId}</span> : null}
      {date ? <span>{date}</span> : null}
    </>
  );
}
