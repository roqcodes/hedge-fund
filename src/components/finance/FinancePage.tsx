'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import ReadOnlyPill from '@/components/rbac/ReadOnlyPill';

type ModuleCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  icon: React.ReactNode;
  reportCount?: string;
};

export default function FinancePage() {
  const { currentSlug, branches } = useApp();

  const branch = branches.find(b => b.slug === currentSlug) ?? branches[0] ?? null;
  const branchName = branch?.name ?? currentSlug ?? '';
  const basePath = currentSlug ? `/${currentSlug}` : '';

  const showPhysical = isBranchPageEnabled('physical', branch?.hiddenPages);
  const showCurrency = isBranchPageEnabled('usdt', branch?.hiddenPages);
  const showFunds = isBranchPageEnabled('funds', branch?.hiddenPages);

  const modules: ModuleCard[] = [
    {
      id: 'physical-deals',
      title: 'Physical Deals',
      description: 'Unfixed/fixed sales & purchases, metal receipts/payments, currency flows, journal entries',
      href: `${basePath}/finance/physical-deals`,
      enabled: showPhysical,
      reportCount: '10 reports',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      id: 'currency',
      title: 'Currency',
      description: 'USDT buys, sells, conversions, and cash balance trends',
      href: `${basePath}/finance/currency`,
      enabled: showCurrency,
      reportCount: 'Summary + ledger',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      ),
    },
    {
      id: 'transactions',
      title: 'Transaction',
      description: 'Trial balance, P&L, general ledger, AR/AP aging, journal entries',
      href: `${basePath}/finance/transactions`,
      enabled: showFunds,
      reportCount: '9 reports',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      ),
    },
  ];

  const enabledModules = modules.filter(m => m.enabled);

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] space-y-6">
      <header className={pageHeader}>
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Branch finance</p>
          <div className="flex items-center justify-between gap-3">
            <h1 className={pageTitle}>Finance Reports</h1>
            <ReadOnlyPill />
          </div>
          <p className={pageSubtitle}>
            Select a module to view and export reports for {branchName}
          </p>
        </div>
      </header>

      {enabledModules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
          No report modules enabled. Enable Physical Deals, Currency, or Transaction in branch settings.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(mod => (
            mod.enabled ? (
              <Link
                key={mod.id}
                href={mod.href}
                className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-surface no-underline transition-[box-shadow,border-color] hover:border-accent/30 hover:shadow-surface-hover"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-light text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  {mod.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-900">{mod.title}</h2>
                <p className="mt-2 flex-1 text-sm text-slate-500">{mod.description}</p>
                {mod.reportCount && (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent">
                    {mod.reportCount}
                  </p>
                )}
              </Link>
            ) : (
              <div
                key={mod.id}
                className="flex flex-col rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 opacity-60"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
                  {mod.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-400">{mod.title}</h2>
                <p className="mt-2 text-sm text-slate-400">Module disabled for this branch</p>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
