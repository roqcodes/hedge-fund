'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/mockData';
import KPICard from '@/components/ui/KPICard';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import { plTrendData, fundDistribution, revenueExpenseData, recentActivities, dailyReports } from '@/data/mockData';

import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const { branches, getTotalCapital, getNetPL, selectBranch, setPage, sidebarOpen } = useApp();
  const totalCapital = getTotalCapital();
  const netPL = getNetPL();
  const cashInBank = Math.round(totalCapital * 0.656);
  const cashInHand = totalCapital - cashInBank;
  const activeBranches = branches.filter(b => b.status === 'active').length;
  const plPct = ((netPL / (totalCapital - netPL)) * 100).toFixed(1);

  const [isLoading, setIsLoading] = useState(true);

  const plChartRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const revExpRef = useRef<HTMLCanvasElement>(null);
  const incomePieRef = useRef<HTMLCanvasElement>(null);

  const incomeData = dailyReports.slice(0, 5).map((r, i) => ({
    branch: r.branchName,
    amount: Math.max(0, r.profit),
    color: fundDistribution[i]?.color || '#000'
  }));

  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        drawPLChart();
        drawDonut();
        drawRevExpChart();
        drawIncomePieChart();
      }, 50);
    };

    // Simulate loading for 2026 UI effect
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        drawPLChart();
        drawDonut();
        drawRevExpChart();
        drawIncomePieChart();
      }, 50);
    }, 800);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Redraw when sidebar toggles
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        drawPLChart();
        drawDonut();
        drawRevExpChart();
        drawIncomePieChart();
      }, 350); // wait for CSS layout transition
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen, isLoading]);

  function drawPLChart() {
    const c = plChartRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const vals = plTrendData.values;
    const maxV = Math.max(...vals.map(Math.abs)) * 1.3;
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const zeroY = pad.top + (maxV / (2 * maxV)) * chartH;

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }

    // Zero line
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(w - pad.right, zeroY); ctx.stroke();
    ctx.setLineDash([]);

    // Smooth Area Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, 'rgba(15, 169, 88, 0.25)');
    grad.addColorStop(0.4, 'rgba(15, 169, 88, 0.05)');
    grad.addColorStop(0.6, 'rgba(229, 57, 53, 0.05)');
    grad.addColorStop(1, 'rgba(229, 57, 53, 0.25)');

    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    vals.forEach((v, i) => {
      const x = pad.left + (i / (vals.length - 1)) * chartW;
      const y = zeroY - (v / maxV) * (chartH / 2);
      ctx.lineTo(x, y); // For perfectly smooth we'd use bezier, but this works
    });
    ctx.lineTo(pad.left + chartW, zeroY);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = pad.left + (i / (vals.length - 1)) * chartW;
      const y = zeroY - (v / maxV) * (chartH / 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0FA958'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // Add shadow to line
    ctx.shadowColor = 'rgba(15, 169, 88, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    // X labels
    ctx.fillStyle = '#94A3B8'; ctx.font = '500 11px Outfit, sans-serif'; ctx.textAlign = 'center';
    plTrendData.labels.forEach((label, i) => {
      if (i % 2 === 0) { // skip some labels for clean look
        const x = pad.left + (i / (vals.length - 1)) * chartW;
        ctx.fillText(label, x, h - pad.bottom + 20);
      }
    });

    // Y labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      const val = maxV - (i / 4) * 2 * maxV;
      ctx.fillText(`₹${(val / 1000).toFixed(0)}K`, pad.left - 12, y + 4);
    }
  }

  function drawDonut() {
    const c = donutRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2 - 20;
    const radius = Math.min(w, h) / 2 - 40;
    const innerR = radius * 0.7;
    const total = fundDistribution.reduce((s, d) => s + d.amount, 0);
    let startAngle = -Math.PI / 2;

    fundDistribution.forEach(d => {
      const sliceAngle = (d.amount / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = d.color;
      // Shadow for depth
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowColor = 'transparent';

      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#0F172A'; ctx.font = '800 20px Outfit, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(formatINR(total), cx, cy - 2);
    ctx.fillStyle = '#64748B'; ctx.font = '500 12px Outfit, sans-serif';
    ctx.fillText('Total Deployed', cx, cy + 18);

    // Legend
    const legendY = h - 30;
    const legendStartX = 15;
    ctx.font = '600 11px Outfit, sans-serif'; ctx.textAlign = 'left';
    fundDistribution.forEach((d, i) => {
      const x = legendStartX + (i % 3) * (w / 3);
      const y = legendY + Math.floor(i / 3) * 18;
      ctx.beginPath();
      ctx.arc(x + 4, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillText(`${d.branch.split(' ')[0]}`, x + 16, y + 4);
    });
  }

  function drawIncomePieChart() {
    const c = incomePieRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2 - 20;
    const radius = Math.min(w, h) / 2 - 40;
    const total = incomeData.reduce((s, d) => s + d.amount, 0);
    let startAngle = -Math.PI / 2;

    incomeData.forEach(d => {
      const sliceAngle = (d.amount / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      ctx.fillStyle = d.color;
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      
      // Separator lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Legend
    const legendY = h - 30;
    const legendStartX = 15;
    ctx.font = '600 11px Outfit, sans-serif'; ctx.textAlign = 'left';
    incomeData.forEach((d, i) => {
      const x = legendStartX + (i % 3) * (w / 3);
      const y = legendY + Math.floor(i / 3) * 18;
      ctx.beginPath();
      ctx.arc(x + 4, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = d.color;
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillText(`${d.branch.split(' ')[0]}`, x + 16, y + 4);
    });
  }

  function drawRevExpChart() {
    const c = revExpRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };

    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const maxV = Math.max(...revenueExpenseData.revenue, ...revenueExpenseData.expense) * 1.1;

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    }

    const barW = chartW / revenueExpenseData.labels.length * 0.3;
    const gap = barW * 0.2;

    revenueExpenseData.labels.forEach((label, i) => {
      const centerX = pad.left + (i + 0.5) * (chartW / revenueExpenseData.labels.length);
      const revH = (revenueExpenseData.revenue[i] / maxV) * chartH;
      const expH = (revenueExpenseData.expense[i] / maxV) * chartH;

      // Revenue Bar (Green)
      const revGrad = ctx.createLinearGradient(0, h - pad.bottom - revH, 0, h - pad.bottom);
      revGrad.addColorStop(0, '#0FA958'); revGrad.addColorStop(1, '#059669');
      ctx.fillStyle = revGrad;
      ctx.beginPath();
      ctx.roundRect(centerX - barW - gap / 2, h - pad.bottom - revH, barW, revH, [4, 4, 0, 0]);
      ctx.fill();

      // Expense Bar (Orange)
      const expGrad = ctx.createLinearGradient(0, h - pad.bottom - expH, 0, h - pad.bottom);
      expGrad.addColorStop(0, '#F57C00'); expGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = expGrad;
      ctx.beginPath();
      ctx.roundRect(centerX + gap / 2, h - pad.bottom - expH, barW, expH, [4, 4, 0, 0]);
      ctx.fill();

      // X Label
      ctx.fillStyle = '#94A3B8'; ctx.font = '500 11px Outfit, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, centerX, h - pad.bottom + 20);
    });

    // Y labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      const val = maxV - (i / 4) * maxV;
      ctx.fillText(`₹${(val / 1000).toFixed(0)}K`, pad.left - 12, y + 4);
    }
  }

  const handleBranchClick = (branchId: string) => {
    selectBranch(branchId);
    router.push('/branches');
  };

  // Sparkline generator for KPI cards
  const generateSparkline = (color: string) => {
    return `url("data:image/svg+xml,%3Csvg width='100' height='40' viewBox='0 0 100 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 35 Q 10 20, 20 25 T 40 15 T 60 20 T 80 5 T 100 10' stroke='${encodeURIComponent(color)}' stroke-width='3' stroke-linecap='round' fill='none'/%3E%3C/svg%3E")`;
  };

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <div><div className="skeleton" style={{ width: 200, height: 32, marginBottom: 8 }}></div><div className="skeleton" style={{ width: 300, height: 16 }}></div></div>
        </div>
        <div className="kpi-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 160 }}></div>)}
        </div>
        <div className="charts-grid-3">
          <div className="skeleton" style={{ height: 380 }}></div>
          <div className="skeleton" style={{ height: 380 }}></div>
          <div className="skeleton" style={{ height: 380 }}></div>
        </div>
        <div className="skeleton" style={{ height: 400 }}></div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div className="header-title-group">
          <h2>Executive Dashboard</h2>
          <div className="header-subtitle">

            <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/funds" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>Transfer Funds</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards V2 */}
      <div className="kpi-grid-v2">
        <KPICard
          label="Total Capital"
          value={formatINR(totalCapital)}
          trend={{ value: '+2.4%', isUp: true }}
          subValue="vs last month"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>}
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Net P&L"
          value={`${netPL >= 0 ? '+' : ''}${formatINR(netPL)}`}
          trend={{ value: `${plPct}%`, isUp: netPL >= 0 }}
          subValue="Performance today"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>}
          color={netPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
          bgColor={netPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
        />
        <KPICard
          label="Cash in Bank"
          value={formatINR(cashInBank)}
          subValue="65.6% Liquidity"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6l7-3 7 3" /><path d="M4 10v11" /><path d="M20 10v11" /><path d="M8 14v3" /><path d="M12 14v3" /><path d="M16 14v3" /></svg>}
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard
          label="Active Branches"
          value={`${activeBranches} / ${branches.length}`}
          subValue="All operational"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>}
          color="#8B5CF6"
          bgColor="rgba(139, 92, 246, 0.1)"
          onClick={() => router.push('/branches')}
        />
      </div>

      {/* Charts - 4 Column Grid */}
      <div className="charts-grid-4">
        <Card title="P&L Trend" extra={<span className="badge badge-profit">Live</span>}>
          <div className="chart-container"><canvas ref={plChartRef} /></div>
        </Card>
        <Card title="Revenue vs Expense">
          <div className="chart-container"><canvas ref={revExpRef} /></div>
        </Card>
        <Card title="Capital Distribution">
          <div className="chart-container"><canvas ref={donutRef} /></div>
        </Card>
        <Card title="Branch Income">
          <div className="chart-container"><canvas ref={incomePieRef} /></div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Branch Summary Table */}
        <Card title="Branch Performance Summary" noPadding>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr><th>Branch</th><th>Location</th><th>Opening Bal.</th><th>Closing Bal.</th><th>Daily P&L</th><th>Status</th></tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} onClick={() => handleBranchClick(b.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{b.location}</td>
                    <td className="amount">{formatINR(b.openingBalance)}</td>
                    <td className="amount">{formatINR(b.closingBalance)}</td>
                    <td className={`amount ${b.dailyPL >= 0 ? 'profit' : 'loss'}`}>
                      {b.dailyPL >= 0 ? '+' : ''}{formatINR(b.dailyPL)}
                    </td>
                    <td><span className={`badge ${b.dailyPL >= 0 ? 'badge-profit' : 'badge-loss'}`}>{b.dailyPL >= 0 ? 'Profit' : 'Loss'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Activities Timeline */}
        <Card title="Recent Activity" extra={<Link href="/funds" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View All →</Link>}>
          <div className="timeline">
            {recentActivities.map(act => (
              <div key={act.id} className="timeline-item">
                <div className="timeline-icon" style={{ borderColor: `var(--${act.type === 'profit' ? 'profit' : act.type === 'expense' ? 'action' : act.type === 'transfer' ? 'info' : 'purple'}-light)` }}>
                  {act.icon}
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">{act.title}</div>
                  <div className="timeline-desc">{act.desc}</div>
                  <div className="timeline-time">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
