'use client';
import React, { useState } from 'react';
import { formatINR } from '@/data/mockData';
import { dailyReports } from '@/data/mockData';
import { btnSecondary, btnSm, filtersBar, filterChip, filterChipActive, pageHeader, pageSubtitle, pageTitle, tableWrap, dataTable } from '@/lib/ui';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const todayReports = dailyReports.filter(r => r.date === '2026-05-03');
  const totalOpening = todayReports.reduce((s, r) => s + r.openingBalance, 0);
  const totalClosing = todayReports.reduce((s, r) => s + r.closingBalance, 0);
  const totalProfit = todayReports.reduce((s, r) => s + r.profit, 0);
  const totalExpense = todayReports.reduce((s, r) => s + r.expense, 0);
  const netPL = totalClosing - totalOpening;

  const handleExport = (type: 'pdf' | 'excel') => {
    alert(`Export to ${type.toUpperCase()} — In production, this would generate a ${type.toUpperCase()} file with the current report data.`);
  };

  const kpiCard =
    'relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-surface backdrop-blur-sm transition-[box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:border-slate-200/90 motion-safe:hover:shadow-surface-hover sm:p-5 animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]';

  return (
    <div>
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Financial Reports</h2>
          <p className={pageSubtitle}>Consolidated branch performance reporting</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" className={`${btnSecondary} ${btnSm} w-full sm:w-auto`} onClick={() => handleExport('pdf')} id="export-pdf">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            Export PDF
          </button>
          <button type="button" className={`${btnSecondary} ${btnSm} w-full sm:w-auto`} onClick={() => handleExport('excel')} id="export-excel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      <div className={filtersBar}>
        <span className="text-xs font-semibold text-slate-500 sm:text-[13px]">Report Type:</span>
        {(['daily', 'weekly', 'monthly'] as const).map(t => (
          <button
            key={t}
            type="button"
            className={`capitalize ${reportType === t ? filterChipActive : filterChip}`}
            onClick={() => setReportType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className={kpiCard}>
          <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Opening Balance</div>
          <div className="mt-1 truncate text-base font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-lg" title={formatINR(totalOpening)}>
            {formatINR(totalOpening)}
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">Start of period</div>
          <div className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-base text-blue-600 sm:right-3.5 sm:top-3.5">
            🏦
          </div>
        </div>
        <div className={kpiCard}>
          <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Total Profit</div>
          <div className="mt-1 truncate text-base font-extrabold tabular-nums tracking-tight text-emerald-600 sm:text-lg">{formatINR(totalProfit)}</div>
          <div className="mt-1 flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 sm:text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 15l7-7 7 7" />
            </svg>
            Gross profit
          </div>
          <div className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-base text-emerald-600 sm:right-3.5 sm:top-3.5">
            📈
          </div>
        </div>
        <div className={kpiCard}>
          <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Total Expense</div>
          <div className="mt-1 truncate text-base font-extrabold tabular-nums tracking-tight text-red-600 sm:text-lg">{formatINR(totalExpense)}</div>
          <div className="mt-1 flex items-center gap-0.5 text-[11px] font-semibold text-red-600 sm:text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 9l-7 7-7-7" />
            </svg>
            Total outflows
          </div>
          <div className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl bg-red-500/10 text-base text-red-600 sm:right-3.5 sm:top-3.5">
            📉
          </div>
        </div>
        <div className={kpiCard}>
          <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Closing Balance</div>
          <div className="mt-1 truncate text-base font-extrabold tabular-nums tracking-tight text-slate-900 sm:text-lg">{formatINR(totalClosing)}</div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">End of period</div>
          <div className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-base text-blue-600 sm:right-3.5 sm:top-3.5">
            💰
          </div>
        </div>
        <div className={`${kpiCard} sm:col-span-2 lg:col-span-1 xl:col-span-1`}>
          <div className="text-[11px] font-semibold text-slate-600 sm:text-xs">Net P&L</div>
          <div className={`mt-1 truncate text-base font-extrabold tabular-nums tracking-tight sm:text-lg ${netPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {netPL >= 0 ? '+' : ''}
            {formatINR(netPL)}
          </div>
          <div className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold sm:text-xs ${netPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d={netPL >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
            Realized profit/loss
          </div>
          <div
            className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-xl text-base shadow-inner sm:right-3.5 sm:top-3.5 ${
              netPL >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
            }`}
          >
            📊
          </div>
        </div>
      </div>

      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 motion-safe:hover:shadow-surface-hover">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">
            Branch-wise Breakdown —{' '}
            {reportType === 'daily' ? '03 May 2026' : reportType === 'weekly' ? 'Week 18, 2026' : 'May 2026'}
          </h3>
        </div>
        <div className="p-3 sm:p-4 lg:p-5">
          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch</th>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Opening Balance</th>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Profit</th>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Expense</th>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Closing Balance</th>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {todayReports.map(r => {
                  const pl = r.closingBalance - r.openingBalance;
                  return (
                    <tr key={r.branchId} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4 first:rounded-l-2xl">
                        {r.branchName}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatINR(r.openingBalance)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold text-emerald-600 sm:px-5 sm:py-4 sm:text-base">
                        {formatINR(r.profit)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold text-red-600 sm:px-5 sm:py-4 sm:text-base">
                        {formatINR(r.expense)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatINR(r.closingBalance)}
                      </td>
                      <td
                        className={`border-y border-r border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold last:rounded-r-2xl sm:px-5 sm:py-4 sm:text-base ${
                          pl >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {pl >= 0 ? '+' : ''}
                        {formatINR(pl)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold">
                  <td className="border-y border-l border-black/5 px-3 py-3.5 text-sm first:rounded-l-2xl sm:px-5 sm:py-4">TOTAL</td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm sm:px-5 sm:py-4 sm:text-base">{formatINR(totalOpening)}</td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm text-emerald-600 sm:px-5 sm:py-4 sm:text-base">
                    {formatINR(totalProfit)}
                  </td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm text-red-600 sm:px-5 sm:py-4 sm:text-base">
                    {formatINR(totalExpense)}
                  </td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm sm:px-5 sm:py-4 sm:text-base">{formatINR(totalClosing)}</td>
                  <td
                    className={`border-y border-r border-black/5 px-3 py-3.5 font-mono text-sm last:rounded-r-2xl sm:px-5 sm:py-4 sm:text-base ${
                      netPL >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {netPL >= 0 ? '+' : ''}
                    {formatINR(netPL)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
