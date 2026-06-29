'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBranchFundKpis } from '@/hooks/useBranchFundKpis';
import { formatAED, formatAEDStr, formatDateTime } from '@/data/mockData';
import Card from '@/components/ui/Card';
import BranchFundKpiSection from '@/components/funds/BranchFundKpiSection';
import { TransactionNotesCell } from '@/components/funds/TransactionNotesCell';
import { txnTd, txnTdFromTo, txnTh } from '@/lib/transactionTableStyles';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnGhost,
  btnSm,
  dataTable,
  pageHeader,
  pageSubtitle,
  pageTitle,
  sectionEyebrow,
  tableWrap,
} from '@/lib/ui';

export default function BranchDashboard() {
  const { branches, deals, entities, currentSlug } = useApp();
  const branch = branches.length === 1 ? branches[0] : undefined;
  const basePath = currentSlug ? `/${currentSlug}` : '';

  const {
    filteredTransactions,
    branchLedgers,
    ledgerBalances,
    availableBranchFund,
    branchGoldVolume,
    totalCashInLocker,
    totalVolume,
    transferCount,
    pendingCount,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useBranchFundKpis(branch);

  const branchDeals = useMemo(
    () => deals.filter(d => d.managingBranchId === branch?.id),
    [deals, branch?.id],
  );

  const branchEntities = useMemo(
    () => entities.filter(e => e.branchId === branch?.id),
    [entities, branch?.id],
  );

  const recentTransactions = useMemo(
    () =>
      [...filteredTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [filteredTransactions],
  );

  if (!branch) {
    return (
      <div className="py-16 text-center text-sm text-slate-400">
        Branch data is not available.
      </div>
    );
  }

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={pageTitle}>{branch.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(15,169,88,0.45)] animate-[pulse-green_2s_infinite]"
                aria-hidden
              />
              <p className={`${pageSubtitle} !mt-0`}>
                {branch.location || 'Branch dashboard'} ·{' '}
                {new Date().toLocaleDateString('en-AE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <div>
        <p className={sectionEyebrow}>Fund position</p>
        <BranchFundKpiSection
          branch={branch}
          availableBranchFund={availableBranchFund}
          branchGoldVolume={branchGoldVolume}
          branchLedgers={branchLedgers}
          ledgerBalances={ledgerBalances}
          totalCashInLocker={totalCashInLocker}
          totalVolume={totalVolume}
          transferCount={transferCount}
          pendingCount={pendingCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6">
        <Card
          title="Recent Transactions"
          extra={
            <Link href={`${basePath}/funds`} className={`${btnGhost} ${btnSm} no-underline`}>
              View all →
            </Link>
          }
          noPadding
        >
          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th className={txnTh}>Date</th>
                  <th className={txnTh}>From</th>
                  <th className={txnTh}>To</th>
                  <th className={txnTh}>Notes</th>
                  <th className={txnTh}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                      No transactions in this period.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map(t => (
                    <tr key={t.id} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-2 py-2 text-[11px] text-slate-600 first:rounded-xl">
                        {formatDateTime(t.date).split(',')[0]}
                      </td>
                      <td className={txnTdFromTo}>{t.from}</td>
                      <td className={txnTdFromTo}>{t.to}</td>
                      <td className={txnTd}>
                        <TransactionNotesCell transaction={t} />
                      </td>
                      <td className={`${txnTd} border-r font-mono text-sm font-bold text-slate-900 last:rounded-xl`}>
                        {t.assetType === 'gold' ? `${t.amount.toFixed(2)}g` : formatAEDStr(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Branch Snapshot">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening Balance</dt>
                <dd className="mt-1 font-mono font-bold text-slate-900">{formatAED(branch.openingBalance)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Balance</dt>
                <dd className="mt-1 font-mono font-bold text-slate-900">{formatAED(branch.currentBalance)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily P&amp;L</dt>
                <dd className={`mt-1 font-mono font-bold ${branch.dailyPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatAED(branch.dailyPL, true)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Closing Projection</dt>
                <dd className="mt-1 font-mono font-bold text-slate-900">{formatAED(branch.closingBalance)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gold Balance</dt>
                <dd className="mt-1 font-mono font-bold text-slate-900">{branchGoldVolume.toFixed(2)}g</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entities</dt>
                <dd className="mt-1 font-mono font-bold text-slate-900">{branchEntities.length}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</dt>
                <dd className="mt-1">
                  <span className={badgeClass(branch.status === 'active' ? 'profit' : 'loss')}>
                    {branch.status}
                  </span>
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Quick Access">
            <div className="flex flex-col gap-2">
              {[
                { href: `${basePath}/funds`, label: 'Transactions', desc: 'Manage funds & entities' },
                { href: `${basePath}/group`, label: 'Deals', desc: `${branchDeals.length} active groups` },
                { href: `${basePath}/physical`, label: 'Physical', desc: 'Tax invoices & trade' },
                { href: `${basePath}/physical-deals`, label: 'Physical Deals', desc: 'Gold buys & bullion' },
                { href: `${basePath}/finance`, label: 'Finance', desc: 'Expenses & invoices' },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition-colors hover:border-accent/20 hover:bg-white no-underline"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">{link.label}</div>
                    <div className="text-xs text-slate-500">{link.desc}</div>
                  </div>
                  <span className="text-slate-400" aria-hidden>→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
