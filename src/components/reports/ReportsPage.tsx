'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import { formatAED } from '@/data/mockData';
import { dailyReports } from '@/data/mockData';
import { btnSecondary, btnSm, filtersBar, filterChip, filterChipActive, kpiGrid5, pageHeader, pageSubtitle, pageTitle, tableWrap, dataTable } from '@/lib/ui';

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

  return (
    <div>
      <div className={pageHeader}>
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className={pageTitle}>Financial Reports</h2>
            <p className={pageSubtitle}>Consolidated branch performance reporting</p>
          </div>

          <div className="flex self-start rounded-2xl border border-slate-100 bg-slate-50/50 p-1 shadow-surface-xs sm:self-center">
            {(['daily', 'weekly', 'monthly'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setReportType(t)}
                className={`rounded-[14px] px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                  reportType === t
                    ? 'bg-white text-accent shadow-surface ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={kpiGrid5}>
        <KPICard
          label="Opening Balance"
          value={formatAED(totalOpening)}
          subValue="Start of period"
          icon={<span aria-hidden>🏦</span>}
          color="#2563eb"
          bgColor="rgba(37, 99, 235, 0.1)"
        />
        <KPICard
          label="Total Profit"
          value={formatAED(totalProfit)}
          subValue="Gross profit"
          valueClassName="text-emerald-600"
          icon={<span aria-hidden>📈</span>}
          color="#059669"
          bgColor="rgba(5, 150, 105, 0.1)"
        />
        <KPICard
          label="Total Expense"
          value={formatAED(totalExpense)}
          subValue="Total outflows"
          valueClassName="text-red-600"
          icon={<span aria-hidden>📉</span>}
          color="#dc2626"
          bgColor="rgba(220, 38, 38, 0.1)"
        />
        <KPICard
          label="Closing Balance"
          value={formatAED(totalClosing)}
          subValue="End of period"
          icon={<span aria-hidden>💰</span>}
          color="#2563eb"
          bgColor="rgba(37, 99, 235, 0.1)"
        />
        <KPICard
          label="Net P&L"
          value={`${netPL >= 0 ? '+' : ''}${formatAED(netPL)}`}
          subValue="Realized profit/loss"
          valueClassName={netPL >= 0 ? 'text-emerald-600' : 'text-red-600'}
          icon={<span aria-hidden>📊</span>}
          color={netPL >= 0 ? '#059669' : '#dc2626'}
          bgColor={netPL >= 0 ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)'}
        />
      </div>

      <div className="mb-10 animate-[fade-in-up_0.55s_0.2s_cubic-bezier(0.16,1,0.3,1)_both]">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Available Reports</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: 'daily', title: 'Daily Performance', desc: 'Detailed branch operations for today.', icon: '📅' },
            { id: 'pnl', title: 'Monthly P&L', desc: 'Consolidated profit/loss statement.', icon: '📊' },
            { id: 'expense', title: 'Expense Analysis', desc: 'In-depth spend categorization.', icon: '💸' },
            { id: 'capital', title: 'Capital Summary', desc: 'Liquidity and fund distribution.', icon: '🏦' },
            { id: 'audit', title: 'Transaction Audit', desc: 'Full historical movement logs.', icon: '📝' },
          ].map((report) => (
            <div
              key={report.id}
              className="group flex items-start gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-surface-xs transition-all duration-300 hover:border-accent/15 hover:shadow-surface sm:p-6"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:bg-accent/5">
                {report.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-bold text-slate-900">{report.title}</h4>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{report.desc}</p>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="mt-4 flex items-center gap-1.5 text-xs font-bold text-accent transition-all hover:gap-2 active:scale-95"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                  Export Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="animate-[fade-in-up_0.55s_0.3s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 motion-safe:hover:shadow-surface-hover">
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
                        {formatAED(r.openingBalance)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold text-emerald-600 sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(r.profit)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold text-red-600 sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(r.expense)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(r.closingBalance)}
                      </td>
                      <td
                        className={`border-y border-r border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold last:rounded-r-2xl sm:px-5 sm:py-4 sm:text-base ${
                          pl >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {pl >= 0 ? '+' : ''}
                        {formatAED(pl)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50 font-bold">
                  <td className="border-y border-l border-black/5 px-3 py-3.5 text-sm first:rounded-l-2xl sm:px-5 sm:py-4">TOTAL</td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm sm:px-5 sm:py-4 sm:text-base">{formatAED(totalOpening)}</td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm text-emerald-600 sm:px-5 sm:py-4 sm:text-base">
                    {formatAED(totalProfit)}
                  </td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm text-red-600 sm:px-5 sm:py-4 sm:text-base">
                    {formatAED(totalExpense)}
                  </td>
                  <td className="border-y border-black/5 px-3 py-3.5 font-mono text-sm sm:px-5 sm:py-4 sm:text-base">{formatAED(totalClosing)}</td>
                  <td
                    className={`border-y border-r border-black/5 px-3 py-3.5 font-mono text-sm last:rounded-r-2xl sm:px-5 sm:py-4 sm:text-base ${
                      netPL >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {netPL >= 0 ? '+' : ''}
                    {formatAED(netPL)}
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
