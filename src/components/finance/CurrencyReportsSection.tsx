'use client';

import React, { useMemo } from 'react';
import ReportSection from './ReportSection';
import ReportKpiGrid from './ReportKpiGrid';
import ReportExportButtons from './ReportExportButtons';
import { ReportTrendChart, ReportSingleBarChart } from './ReportCharts';
import { buildCurrencyReport, matchesSearch } from '@/lib/finance/reportCalculations';
import { formatAEDStr, formatDate, formatMoneyValue } from '@/data/mockData';
import { formatUsdtRateDisplay } from '@/lib/usdtCalculations';
import type { UsdtBuy, UsdtSell, UsdtIdrConversion } from '@/types';
import { dataTable, tableWrap } from '@/lib/ui';

type Props = {
  buys: UsdtBuy[];
  sells: UsdtSell[];
  conversions: UsdtIdrConversion[];
  cashBalances: { usdt: number; aed: number; idr: number } | null;
  range: { startDate: string | null; endDate: string | null };
  search: string;
  branchName: string;
  variant?: 'collapsible' | 'flat';
};

export default function CurrencyReportsSection({
  buys,
  sells,
  conversions,
  cashBalances,
  range,
  search,
  branchName,
  variant = 'flat',
}: Props) {
  const report = useMemo(
    () => buildCurrencyReport(buys, sells, conversions, range, cashBalances),
    [buys, sells, conversions, range, cashBalances],
  );

  const filteredRows = useMemo(
    () =>
      report.buySellRows.filter(
        r =>
          matchesSearch(r.customerName, search) ||
          matchesSearch(r.txnId, search) ||
          matchesSearch(r.type, search),
      ),
    [report.buySellRows, search],
  );

  const exportRows = filteredRows.map(r => ({
    type: r.type,
    date: r.date,
    txnId: r.txnId ?? '',
    customer: r.customerName ?? '',
    usdt: r.usdtAmount.toFixed(4),
    rate: r.rate.toFixed(4),
    margin: r.margin.toFixed(4),
    serviceCharge: r.serviceCharge.toFixed(2),
    total: r.total.toFixed(2),
    profit: r.profit.toFixed(2),
  }));

  return (
    <ReportSection
      id="currency-reports"
      variant={variant}
      title="Currency (USDT) Reports"
      subtitle="USDT buy/sell, margins, cash balances, IDR conversions"
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M8 10h8M8 14h8" />
        </svg>
      }
      exportSlot={
        <ReportExportButtons
          filename={`currency-report-${branchName}`}
          pdfTitle="Currency Report"
          pdfSubtitle={branchName}
          columns={[
            { key: 'type', label: 'Type' },
            { key: 'date', label: 'Date' },
            { key: 'txnId', label: 'Txn ID' },
            { key: 'customer', label: 'Customer' },
            { key: 'usdt', label: 'USDT', align: 'right' },
            { key: 'rate', label: 'Rate', align: 'right' },
            { key: 'margin', label: 'Margin', align: 'right' },
            { key: 'total', label: 'Total AED', align: 'right' },
            { key: 'profit', label: 'Profit', align: 'right' },
          ]}
          rows={exportRows}
          kpiItems={[
            { label: 'USDT Stock', value: report.stats.stockUsdt.toFixed(2) },
            { label: 'Total Profit', value: formatAEDStr(report.stats.totalProfit) },
            { label: 'Avg Cost', value: report.stats.avgCost != null ? formatUsdtRateDisplay(report.stats.avgCost) : '—' },
          ]}
        />
      }
    >
      <ReportKpiGrid
        items={[
          {
            label: 'USDT Capital (Hand)',
            value: report.cashBalances.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            subValue: 'Available USDT stock',
          },
          {
            label: 'AED Balance',
            value: formatMoneyValue(report.cashBalances.aed),
            subValue: 'Cash AED on hand',
          },
          {
            label: 'IDR Balance (Bank)',
            value: report.cashBalances.idr.toLocaleString('en-US', { maximumFractionDigits: 0 }),
            subValue: 'IDR by bank',
          },
          {
            label: 'USDT Buy Volume',
            value: report.stats.totalBuyUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            subValue: formatAEDStr(report.stats.totalBuyAed),
          },
          {
            label: 'USDT Sell Volume',
            value: report.stats.totalSellUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            subValue: formatAEDStr(report.stats.totalSellAed),
          },
          {
            label: 'USDT Margin Profit',
            value: formatAEDStr(report.stats.totalProfit),
            subValue: 'Selling profit',
            color: 'var(--profit)',
            bgColor: 'var(--profit-light)',
          },
          {
            label: 'Premium / Discount',
            value: formatAEDStr(report.premiumDiscount),
            subValue: 'Margin × volume',
          },
          {
            label: 'Service Charges',
            value: formatAEDStr(report.totalServiceCharge),
            subValue: 'Buy + sell fees',
          },
          {
            label: 'Reverse Loss',
            value: formatAEDStr(report.reverseLoss),
            subValue: 'Negative margin trades',
            color: 'var(--loss)',
            bgColor: 'var(--loss-light)',
          },
          {
            label: 'Avg Buy Rate',
            value: report.stats.avgCost != null ? formatUsdtRateDisplay(report.stats.avgCost) : '—',
            subValue: 'Weighted average cost',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ReportTrendChart data={report.monthlyTrend} title="Monthly USDT Buy vs Sell (AED)" />
        <ReportSingleBarChart
          data={report.marginTrend}
          title="Avg Sell Margin by Month"
          colorClass="bg-violet-500"
          formatValue={n => n.toFixed(4)}
        />
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-slate-900">USDT Buy &amp; Sell Report</h4>
        <div className={tableWrap}>
          <table className={dataTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Txn</th>
                <th>Customer</th>
                <th>USDT</th>
                <th>Rate</th>
                <th>Margin</th>
                <th>Charge</th>
                <th>Total AED</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No transactions match filters
                  </td>
                </tr>
              ) : (
                filteredRows.slice(0, 50).map((r, i) => (
                  <tr key={`${r.type}-${r.txnId}-${i}`}>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.type === 'BUY' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td>{formatDate(r.date)}</td>
                    <td className="font-mono text-xs">{r.txnId ?? '—'}</td>
                    <td>{r.customerName ?? '—'}</td>
                    <td className="font-mono">{r.usdtAmount.toFixed(4)}</td>
                    <td className="font-mono">{formatUsdtRateDisplay(r.rate)}</td>
                    <td className="font-mono">{r.type === 'SELL' ? r.margin.toFixed(4) : '—'}</td>
                    <td className="font-mono">{formatAEDStr(r.serviceCharge)}</td>
                    <td className="font-mono">{formatAEDStr(r.total)}</td>
                    <td className={`font-mono font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.type === 'SELL' ? formatAEDStr(r.profit) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {report.filteredConversions.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-bold text-slate-900">USDT → IDR Conversions</h4>
          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>USDT</th>
                  <th>Rate</th>
                  <th>IDR Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {report.filteredConversions.slice(0, 20).map(c => (
                  <tr key={c.id}>
                    <td>{formatDate(c.date)}</td>
                    <td className="font-mono">{c.usdtAmount.toFixed(4)}</td>
                    <td className="font-mono">{c.conversionRate.toLocaleString()}</td>
                    <td className="font-mono">{c.idrAmount.toLocaleString()}</td>
                    <td className="text-slate-500">{c.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportSection>
  );
}
