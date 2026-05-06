'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/mockData';
import { dailyReports } from '@/data/mockData';

export default function ReportsPage() {
  const { branches } = useApp();
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
      <div className="page-header">
        <div><h2>Financial Reports</h2><p>Consolidated branch performance reporting</p></div>
        <div className="export-bar">
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('pdf')} id="export-pdf">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            Export PDF
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleExport('excel')} id="export-excel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Controls */}
      <div className="filters-bar">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Report Type:</span>
        {(['daily', 'weekly', 'monthly'] as const).map(t => (
          <button key={t} className={`filter-chip ${reportType === t ? 'active' : ''}`} onClick={() => setReportType(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Summary Section */}
      <div className="kpi-grid" style={{ marginBottom: 32 }}>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Opening Balance</div>
          <div className="kpi-value">{formatINR(totalOpening)}</div>
          <div className="kpi-sub" style={{ color: 'var(--text-secondary)' }}>Start of period</div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>🏦</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Total Profit</div>
          <div className="kpi-value" style={{ color: 'var(--profit)' }}>{formatINR(totalProfit)}</div>
          <div className="kpi-sub up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 15l7-7 7 7"/></svg>
            Gross profit
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--profit-light)', color: 'var(--profit)' }}>📈</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Total Expense</div>
          <div className="kpi-value" style={{ color: 'var(--loss)' }}>{formatINR(totalExpense)}</div>
          <div className="kpi-sub down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
            Total outflows
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--loss-light)', color: 'var(--loss)' }}>📉</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Closing Balance</div>
          <div className="kpi-value">{formatINR(totalClosing)}</div>
          <div className="kpi-sub" style={{ color: 'var(--text-secondary)' }}>End of period</div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>💰</div>
        </div>
        <div className="kpi-card animate-in">
          <div className="kpi-label">Net P&L</div>
          <div className="kpi-value" style={{ color: netPL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            {netPL >= 0 ? '+' : ''}{formatINR(netPL)}
          </div>
          <div className={`kpi-sub ${netPL >= 0 ? 'up' : 'down'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={netPL >= 0 ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/></svg>
            Realized profit/loss
          </div>
          <div className="kpi-icon-wrap" style={{ background: netPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)', color: netPL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>📊</div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>Branch-wise Breakdown — {reportType === 'daily' ? '03 May 2026' : reportType === 'weekly' ? 'Week 18, 2026' : 'May 2026'}</h3>
        </div>
        <div className="card-body">
          <div className="table-responsive">
          <table className="data-table">
            <thead><tr><th>Branch</th><th>Opening Balance</th><th>Profit</th><th>Expense</th><th>Closing Balance</th><th>Net P&L</th></tr></thead>
            <tbody>
              {todayReports.map(r => {
                const pl = r.closingBalance - r.openingBalance;
                return (
                  <tr key={r.branchId}>
                    <td style={{ fontWeight: 600 }}>{r.branchName}</td>
                    <td className="amount">{formatINR(r.openingBalance)}</td>
                    <td className="amount profit">{formatINR(r.profit)}</td>
                    <td className="amount loss">{formatINR(r.expense)}</td>
                    <td className="amount">{formatINR(r.closingBalance)}</td>
                    <td className={`amount ${pl >= 0 ? 'profit' : 'loss'}`}>{pl >= 0 ? '+' : ''}{formatINR(pl)}</td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td className="amount">{formatINR(totalOpening)}</td>
                <td className="amount profit">{formatINR(totalProfit)}</td>
                <td className="amount loss">{formatINR(totalExpense)}</td>
                <td className="amount">{formatINR(totalClosing)}</td>
                <td className={`amount ${netPL >= 0 ? 'profit' : 'loss'}`}>{netPL >= 0 ? '+' : ''}{formatINR(netPL)}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
