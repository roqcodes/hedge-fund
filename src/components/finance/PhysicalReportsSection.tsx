'use client';

import React, { useMemo } from 'react';
import ReportSection from './ReportSection';
import ReportKpiGrid from './ReportKpiGrid';
import ReportExportButtons from './ReportExportButtons';
import { ReportTrendChart, ReportRankingList } from './ReportCharts';
import { buildPhysicalReport, matchesSearch } from '@/lib/finance/reportCalculations';
import { formatAEDStr, formatDate } from '@/data/mockData';
import { fmtNum } from '@/lib/physicalCalculations';
import type { PhysicalBuy, PhysicalSell, PhysicalBalance } from '@/types';
import { dataTable, tableWrap } from '@/lib/ui';

type Props = {
  buys: PhysicalBuy[];
  sells: PhysicalSell[];
  balance: PhysicalBalance | null;
  range: { startDate: string | null; endDate: string | null };
  search: string;
  branchName: string;
  rates?: Record<string, number>;
  variant?: 'collapsible' | 'flat';
};

export default function PhysicalReportsSection({
  buys,
  sells,
  balance,
  range,
  search,
  branchName,
  rates,
  variant = 'flat',
}: Props) {
  const report = useMemo(
    () => buildPhysicalReport(buys, sells, balance, range, rates),
    [buys, sells, balance, range, rates],
  );

  const plRows = useMemo(
    () =>
      report.plByDeal.filter(
        d =>
          matchesSearch(d.particulars, search) ||
          matchesSearch(d.customerName, search) ||
          matchesSearch(d.txnId, search),
      ),
    [report.plByDeal, search],
  );

  const exportRows = plRows.map(d => ({
    date: d.date,
    txnId: d.txnId ?? '',
    particulars: d.particulars,
    customer: d.customerName ?? '',
    buyValue: d.buyValue.toFixed(2),
    sellValue: d.sellValue.toFixed(2),
    profit: d.profit.toFixed(2),
    remainingGram: d.remainingWeight.toFixed(3),
    position: d.fixOrUnfix,
    deal: d.deal ?? '',
  }));

  const paymentRanking = report.paymentBreakdown
    .filter(p => p.buyValue + p.sellValue > 0)
    .map(p => ({
      name: p.mode.replace(/_/g, ' '),
      volume: p.buyValue + p.sellValue,
      percentage: 0,
    }))
    .sort((a, b) => b.volume - a.volume);
  const maxPay = paymentRanking[0]?.volume ?? 1;
  paymentRanking.forEach(p => {
    p.percentage = (p.volume / maxPay) * 100;
  });

  return (
    <ReportSection
      id="physical-reports"
      variant={variant}
      title="Physical Deals Reports"
      subtitle="Gold purchases, sales, positions, margins, and P&amp;L"
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      }
      exportSlot={
        <ReportExportButtons
          filename={`physical-report-${branchName}`}
          pdfTitle="Physical Deals Report"
          pdfSubtitle={branchName}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'txnId', label: 'Txn ID' },
            { key: 'particulars', label: 'Particulars' },
            { key: 'customer', label: 'Customer' },
            { key: 'buyValue', label: 'Buy Value', align: 'right' },
            { key: 'sellValue', label: 'Sell Value', align: 'right' },
            { key: 'profit', label: 'P&L', align: 'right' },
            { key: 'remainingGram', label: 'Remaining (g)', align: 'right' },
            { key: 'position', label: 'Position' },
          ]}
          rows={exportRows}
          kpiItems={[
            { label: 'Buy Value', value: formatAEDStr(report.kpi.buyValue.aed) },
            { label: 'Sell Value', value: formatAEDStr(report.kpi.sellValue.aed) },
            { label: 'P&L', value: formatAEDStr(report.kpi.pl.aed) },
            { label: 'Remaining (g)', value: fmtNum(report.kpi.remainingGram) },
            { label: 'Fix Volume (g)', value: fmtNum(report.kpi.fixVolumeGram) },
            { label: 'Unfix Volume (g)', value: fmtNum(report.kpi.unfixVolumeGram) },
            { label: 'Fix Positions', value: String(report.kpi.fixCount) },
            { label: 'Unfix Positions', value: String(report.kpi.unfixCount) },
          ]}
        />
      }
    >
      <ReportKpiGrid
        items={[
          { label: 'Buy Value (AED)', value: formatAEDStr(report.kpi.buyValue.aed), subValue: 'Purchase total' },
          { label: 'Sell Value (AED)', value: formatAEDStr(report.kpi.sellValue.aed), subValue: 'Sales total' },
          {
            label: 'Selling Profit',
            value: formatAEDStr(report.kpi.pl.aed),
            subValue: 'Net P&L on sales',
            color: report.kpi.pl.aed >= 0 ? 'var(--profit)' : 'var(--loss)',
            bgColor: report.kpi.pl.aed >= 0 ? 'var(--profit-light)' : 'var(--loss-light)',
          },
          {
            label: 'Gold Holdings',
            value: `${fmtNum(report.kpi.remainingGram)} g`,
            subValue: `${report.kpi.soldPct}% sold of purchased`,
          },
          {
            label: 'Fix Volume',
            value: `${fmtNum(report.kpi.fixVolumeGram)} g`,
            subValue: `${report.kpi.fixCount} deals · fixed rate`,
          },
          {
            label: 'Unfix Volume',
            value: `${fmtNum(report.kpi.unfixVolumeGram)} g`,
            subValue: `${report.kpi.unfixCount} deals · open rate exposure`,
          },
          { label: 'Margin on Purchase', value: formatAEDStr(report.avgBuyMargin), subValue: 'Avg deal margin' },
          { label: 'Avg Sell Margin %', value: `${report.avgSellMargin.toFixed(2)}%`, subValue: 'Selling margin' },
          {
            label: 'Reverse Loss',
            value: formatAEDStr(report.reverseLoss),
            subValue: 'Loss on negative trades',
            color: 'var(--loss)',
            bgColor: 'var(--loss-light)',
          },
          { label: 'Purity Loss', value: fmtNum(report.totalPurityLoss), subValue: 'Touch loss (g)' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportTrendChart data={report.monthlyTrend} title="Monthly Buy vs Sell (AED)" />
        <ReportRankingList title="Payment Mode Volume" data={paymentRanking} colorClass="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Capital Balance</p>
          <p className="mt-1 font-mono text-xl font-black text-slate-900">{formatAEDStr(report.holdings.availableFund)}</p>
          <p className="mt-1 text-xs text-slate-500">Initial: {formatAEDStr(report.holdings.initialCapital)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Volume Balance</p>
          <p className="mt-1 font-mono text-xl font-black text-slate-900">{fmtNum(report.holdings.remainingGram)} g</p>
          <p className="mt-1 text-xs text-slate-500">Initial: {fmtNum(report.holdings.initialVolume)} g</p>
        </div>
      </div>

      {report.unfixPositions.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">Unfix Positions &amp; Rates</h4>
          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Particulars</th>
                  <th>Remaining (g)</th>
                  <th>IDR Rate</th>
                  <th>Buy Value</th>
                </tr>
              </thead>
              <tbody>
                {report.unfixPositions
                  .filter(b => matchesSearch(b.particulars, search) || matchesSearch(b.customerName, search))
                  .slice(0, 20)
                  .map(b => (
                    <tr key={b.id}>
                      <td>{formatDate(b.date)}</td>
                      <td>{b.particulars}</td>
                      <td className="font-mono">{fmtNum(b.remainingWeight)}</td>
                      <td className="font-mono">{b.idrRate?.toFixed(2) ?? '—'}</td>
                      <td className="font-mono">{formatAEDStr(b.buyValue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-900">P&amp;L by Purchase / Deal</h4>
        <div className={tableWrap}>
          <table className={dataTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Txn</th>
                <th>Particulars</th>
                <th>Customer</th>
                <th>Buy</th>
                <th>Sell</th>
                <th>P&amp;L</th>
                <th>Remaining</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {plRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No deals match filters
                  </td>
                </tr>
              ) : (
                plRows.slice(0, 50).map(d => (
                  <tr key={d.id}>
                    <td>{formatDate(d.date)}</td>
                    <td className="font-mono text-xs">{d.txnId ?? '—'}</td>
                    <td>{d.particulars}</td>
                    <td>{d.customerName ?? '—'}</td>
                    <td className="font-mono">{formatAEDStr(d.buyValue)}</td>
                    <td className="font-mono">{formatAEDStr(d.sellValue)}</td>
                    <td className={`font-mono font-bold ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatAEDStr(d.profit)}
                    </td>
                    <td className="font-mono">{fmtNum(d.remainingWeight)} g</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          d.fixOrUnfix === 'fixed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {d.fixOrUnfix}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ReportSection>
  );
}
