'use client';

import React, { useMemo } from 'react';
import ReportSection from './ReportSection';
import ReportKpiGrid from './ReportKpiGrid';
import ReportExportButtons from './ReportExportButtons';
import { ReportSingleBarChart, ReportRankingList } from './ReportCharts';
import { buildFundsReport, matchesSearch } from '@/lib/finance/reportCalculations';
import { formatAEDStr, formatDate } from '@/data/mockData';
import type { FundEntityLedgerEntry, FundEntityBalance } from '@/types';
import { dataTable, tableWrap } from '@/lib/ui';

type Props = {
  entries: FundEntityLedgerEntry[];
  balances: FundEntityBalance[];
  range: { startDate: string | null; endDate: string | null };
  search: string;
  branchName: string;
  variant?: 'collapsible' | 'flat';
};

export default function FundsReportsSection({
  entries,
  balances,
  range,
  search,
  branchName,
  variant = 'flat',
}: Props) {
  const report = useMemo(
    () => buildFundsReport(entries, balances, range),
    [entries, balances, range],
  );

  const filteredEntries = useMemo(
    () =>
      report.filteredEntries.filter(
        e => matchesSearch(e.description, search) || matchesSearch(e.referenceType, search),
      ),
    [report.filteredEntries, search],
  );

  const exportRows = filteredEntries.map(e => ({
    date: e.entryDate.slice(0, 10),
    description: e.description,
    debit: e.debit.toFixed(2),
    credit: e.credit.toFixed(2),
    net: (e.debit - e.credit).toFixed(2),
    reference: e.referenceType,
    currency: e.settlementCurrency ?? e.customerCurrency ?? 'AED',
  }));

  const receivableRanking = report.receivables.map(r => ({
    name: r.customerName,
    volume: r.net,
    percentage: report.kpi.totalReceivable > 0 ? (r.net / report.kpi.totalReceivable) * 100 : 0,
  }));

  const liabilityRanking = report.liabilities.map(l => ({
    name: l.customerName,
    volume: Math.abs(l.net),
    percentage: report.kpi.totalPayable > 0 ? (Math.abs(l.net) / report.kpi.totalPayable) * 100 : 0,
  }));

  return (
    <ReportSection
      id="funds-reports"
      variant={variant}
      title="Transaction / Entity Ledger Reports"
      subtitle="Receivables, payables, trial balance, credits &amp; debits"
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
      }
      exportSlot={
        <ReportExportButtons
          filename={`funds-report-${branchName}`}
          pdfTitle="Entity Ledger Report"
          pdfSubtitle={branchName}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'description', label: 'Description' },
            { key: 'debit', label: 'Debit', align: 'right' },
            { key: 'credit', label: 'Credit', align: 'right' },
            { key: 'net', label: 'Net', align: 'right' },
            { key: 'reference', label: 'Reference' },
            { key: 'currency', label: 'Currency' },
          ]}
          rows={exportRows}
          kpiItems={[
            { label: 'Receivable', value: formatAEDStr(report.kpi.totalReceivable) },
            { label: 'Payable', value: formatAEDStr(report.kpi.totalPayable) },
            { label: 'Net Position', value: formatAEDStr(report.kpi.netPosition) },
          ]}
        />
      }
    >
      <ReportKpiGrid
        items={[
          {
            label: 'Total Receivable',
            value: formatAEDStr(report.kpi.totalReceivable),
            subValue: 'Payment due from entities',
            color: 'var(--profit)',
            bgColor: 'var(--profit-light)',
          },
          {
            label: 'Total Payable',
            value: formatAEDStr(report.kpi.totalPayable),
            subValue: 'Liabilities to entities',
            color: 'var(--loss)',
            bgColor: 'var(--loss-light)',
          },
          {
            label: 'Net Position',
            value: formatAEDStr(report.kpi.netPosition),
            subValue: 'Receivable − payable',
          },
          {
            label: 'Period Debits',
            value: formatAEDStr(report.totalDebits),
            subValue: 'Credits & debits (period)',
          },
          {
            label: 'Period Credits',
            value: formatAEDStr(report.totalCredits),
            subValue: 'Credits & debits (period)',
          },
          {
            label: 'Margin Call Alerts',
            value: report.marginCallEntities.length,
            subValue: 'Entities with payable &gt; 10k',
            color: report.marginCallEntities.length > 0 ? 'var(--loss)' : undefined,
            bgColor: report.marginCallEntities.length > 0 ? 'var(--loss-light)' : undefined,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportSingleBarChart
          data={report.monthlyTrend}
          title="Net Ledger Movement by Month"
          colorClass="bg-sky-500"
        />
        <ReportRankingList
          title="Top Receivables"
          data={receivableRanking}
          colorClass="bg-emerald-500"
        />
      </div>

      {liabilityRanking.length > 0 && (
        <ReportRankingList
          title="Liabilities (Payables)"
          data={liabilityRanking}
          colorClass="bg-red-500"
        />
      )}

      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-900">Trial Balance by Entity</h4>
        <div className={tableWrap}>
          <table className={dataTable}>
            <thead>
              <tr>
                <th>Entity</th>
                <th>Total Debit</th>
                <th>Total Credit</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {report.trialBalance
                .filter(b => matchesSearch(b.customerName, search))
                .length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No entities match filters
                  </td>
                </tr>
              ) : (
                report.trialBalance
                  .filter(b => matchesSearch(b.customerName, search))
                  .slice(0, 50)
                  .map(b => (
                    <tr key={b.customerId}>
                      <td className="font-medium">{b.customerName}</td>
                      <td className="font-mono">{formatAEDStr(b.debit)}</td>
                      <td className="font-mono">{formatAEDStr(b.credit)}</td>
                      <td
                        className={`font-mono font-bold ${b.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {formatAEDStr(b.net)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-900">Payment &amp; Receivable Entries</h4>
        <div className={tableWrap}>
          <table className={dataTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Reference</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No entries match filters
                  </td>
                </tr>
              ) : (
                filteredEntries.slice(0, 50).map(e => (
                  <tr key={e.id}>
                    <td>{formatDate(e.entryDate)}</td>
                    <td>{e.description}</td>
                    <td className="font-mono">{e.debit > 0 ? formatAEDStr(e.debit) : '—'}</td>
                    <td className="font-mono">{e.credit > 0 ? formatAEDStr(e.credit) : '—'}</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {e.referenceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{e.settlementCurrency ?? e.customerCurrency ?? 'AED'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-900">Reference Type Breakdown</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {report.byReference.map(ref => (
            <div key={ref.referenceType} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {ref.referenceType.replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-lg font-black text-slate-900">{ref.count}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                D: {formatAEDStr(ref.debits)} · C: {formatAEDStr(ref.credits)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ReportSection>
  );
}
