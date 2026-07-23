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
