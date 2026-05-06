'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/data/mockData';
import KPICard from '@/components/ui/KPICard';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import { plTrendData, fundDistribution, revenueExpenseData, recentActivities, dailyReports } from '@/data/mockData';
import { useRouter } from 'next/navigation';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnGhost,
  btnPrimary,
  btnSm,
  chartArea,
  chartGrid,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function AdminDashboard() {
  const router = useRouter();
  const { branches, getTotalCapital, getNetPL, selectBranch, sidebarOpen } = useApp();
  const totalCapital = getTotalCapital();
  const netPL = getNetPL();
  const cashInBank = Math.round(totalCapital * 0.656);
  const activeBranches = branches.filter(b => b.status === 'active').length;
  const plPct = ((netPL / (totalCapital - netPL)) * 100).toFixed(1);

  const [isLoading, setIsLoading] = useState(true);

  const plChartRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const revExpRef = useRef<HTMLCanvasElement>(null);
  const incomePieRef = useRef<HTMLCanvasElement>(null);

  const incomeData = useMemo(
    () =>
      dailyReports.slice(0, 5).map((r, i) => ({
        branch: r.branchName,
        amount: Math.max(0, r.profit),
        color: fundDistribution[i]?.color || '#000',
      })),
    []
  );

  const drawPLChart = useCallback(() => {
    const c = plChartRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width,
      h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const vals = plTrendData.values;
    const maxV = Math.max(...vals.map(Math.abs)) * 1.3;
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const zeroY = pad.top + (maxV / (2 * maxV)) * chartH;

    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(w - pad.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

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
      ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + chartW, zeroY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = pad.left + (i / (vals.length - 1)) * chartW;
      const y = zeroY - (v / maxV) * (chartH / 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0FA958';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(15, 169, 88, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.stroke();
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    plTrendData.labels.forEach((label, i) => {
      if (i % 2 === 0) {
        const x = pad.left + (i / (vals.length - 1)) * chartW;
        ctx.fillText(label, x, h - pad.bottom + 20);
      }
    });

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      const val = maxV - (i / 4) * 2 * maxV;
      ctx.fillText(`₹${(val / 1000).toFixed(0)}K`, pad.left - 12, y + 4);
    }
  }, []);

  const drawDonut = useCallback(() => {
    const c = donutRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width,
      h = rect.height;
    const cx = w / 2,
      cy = h / 2 - 20;
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
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowColor = 'transparent';

      startAngle += sliceAngle;
    });

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatINR(total), cx, cy - 2);
    ctx.fillStyle = '#64748B';
    ctx.font = '500 12px Outfit, sans-serif';
    ctx.fillText('Total Deployed', cx, cy + 18);

    const legendY = h - 30;
    const legendStartX = 15;
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'left';
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
  }, []);

  const drawIncomePieChart = useCallback(() => {
    const c = incomePieRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width,
      h = rect.height;
    const cx = w / 2,
      cy = h / 2 - 20;
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

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    const legendY = h - 30;
    const legendStartX = 15;
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'left';
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
  }, [incomeData]);

  const drawRevExpChart = useCallback(() => {
    const c = revExpRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width,
      h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };

    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const maxV = Math.max(...revenueExpenseData.revenue, ...revenueExpenseData.expense) * 1.1;

    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    const barW = (chartW / revenueExpenseData.labels.length) * 0.3;
    const gap = barW * 0.2;

    revenueExpenseData.labels.forEach((label, i) => {
      const centerX = pad.left + (i + 0.5) * (chartW / revenueExpenseData.labels.length);
      const revH = (revenueExpenseData.revenue[i] / maxV) * chartH;
      const expH = (revenueExpenseData.expense[i] / maxV) * chartH;

      const revGrad = ctx.createLinearGradient(0, h - pad.bottom - revH, 0, h - pad.bottom);
      revGrad.addColorStop(0, '#0FA958');
      revGrad.addColorStop(1, '#059669');
      ctx.fillStyle = revGrad;
      ctx.beginPath();
      ctx.roundRect(centerX - barW - gap / 2, h - pad.bottom - revH, barW, revH, [4, 4, 0, 0]);
      ctx.fill();

      const expGrad = ctx.createLinearGradient(0, h - pad.bottom - expH, 0, h - pad.bottom);
      expGrad.addColorStop(0, '#F57C00');
      expGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = expGrad;
      ctx.beginPath();
      ctx.roundRect(centerX + gap / 2, h - pad.bottom - expH, barW, expH, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, centerX, h - pad.bottom + 20);
    });

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH;
      const val = maxV - (i / 4) * maxV;
      ctx.fillText(`₹${(val / 1000).toFixed(0)}K`, pad.left - 12, y + 4);
    }
  }, []);

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
  }, [drawPLChart, drawDonut, drawRevExpChart, drawIncomePieChart]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        drawPLChart();
        drawDonut();
        drawRevExpChart();
        drawIncomePieChart();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [sidebarOpen, isLoading, drawPLChart, drawDonut, drawRevExpChart, drawIncomePieChart]);

  const handleBranchClick = (branchId: string) => {
    selectBranch(branchId);
    router.push('/branches');
  };

  const skeletonBar = 'rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%] animate-shimmer';

  if (isLoading) {
    return (
      <div>
        <div className={pageHeader}>
          <div className="w-full max-w-md space-y-2">
            <div className={`h-8 ${skeletonBar}`} />
            <div className={`h-4 max-w-xs ${skeletonBar}`} />
          </div>
        </div>
        <div className={kpiGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-28 ${skeletonBar}`} />
          ))}
        </div>
        <div className={chartGrid}>
          <div className={`${chartArea} ${skeletonBar}`} />
          <div className={`${chartArea} ${skeletonBar}`} />
          <div className={`${chartArea} ${skeletonBar}`} />
          <div className={`${chartArea} ${skeletonBar}`} />
        </div>
        <div className={`min-h-[200px] ${skeletonBar}`} />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Executive Dashboard</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(15,169,88,0.5)] animate-[pulse-green_2s_infinite]"
              aria-hidden
            />
            <p className={`${pageSubtitle} !mt-0 !normal-case !tracking-normal`}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/funds" className={`${btnPrimary} w-full text-center no-underline sm:w-auto`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Transfer Funds</span>
          </Link>
        </div>
      </div>

      <div className={kpiGrid}>
        <KPICard
          label="Total Capital"
          value={formatINR(totalCapital)}
          trend={{ value: '+2.4%', isUp: true }}
          subValue="vs last month"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Net P&L"
          value={`${netPL >= 0 ? '+' : ''}${formatINR(netPL)}`}
          trend={{ value: `${plPct}%`, isUp: netPL >= 0 }}
          subValue="Performance today"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
          color={netPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
          bgColor={netPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
        />
        <KPICard
          label="Cash in Bank"
          value={formatINR(cashInBank)}
          subValue="65.6% Liquidity"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 21h18" />
              <path d="M3 10h18" />
              <path d="M5 6l7-3 7 3" />
              <path d="M4 10v11" />
              <path d="M20 10v11" />
              <path d="M8 14v3" />
              <path d="M12 14v3" />
              <path d="M16 14v3" />
            </svg>
          }
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard
          label="Active Branches"
          value={`${activeBranches} / ${branches.length}`}
          subValue="All operational"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          }
          color="#8B5CF6"
          bgColor="rgba(139, 92, 246, 0.1)"
          onClick={() => router.push('/branches')}
        />
      </div>

      <div className={chartGrid}>
        <Card title="P&L Trend" extra={<span className={badgeClass('profit')}>Live</span>}>
          <div className={chartArea}>
            <canvas ref={plChartRef} className="size-full" />
          </div>
        </Card>
        <Card title="Revenue vs Expense">
          <div className={chartArea}>
            <canvas ref={revExpRef} className="size-full" />
          </div>
        </Card>
        <Card title="Capital Distribution">
          <div className={chartArea}>
            <canvas ref={donutRef} className="size-full" />
          </div>
        </Card>
        <Card title="Branch Income">
          <div className={chartArea}>
            <canvas ref={incomePieRef} className="size-full" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
        <Card title="Branch Performance Summary" noPadding>
          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-3">Branch</th>
                  <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-3">Location</th>
                  <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-3">Opening Bal.</th>
                  <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-3">Closing Bal.</th>
                  <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-3">Daily P&L</th>
                  <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(b => (
                  <tr key={b.id} data-interactive-row onClick={() => handleBranchClick(b.id)} className="cursor-pointer">
                    <td className="border-y border-l border-black/5 bg-white px-2 py-2.5 text-xs font-bold text-slate-900 first:rounded-xl sm:px-3 sm:py-3 sm:text-sm">
                      {b.name}
                    </td>
                    <td className="border-y border-black/5 bg-white px-2 py-2.5 text-xs text-slate-600 sm:px-3 sm:py-3 sm:text-sm">{b.location}</td>
                    <td className="border-y border-black/5 bg-white px-2 py-2.5 font-mono text-xs font-bold tabular-nums text-slate-900 sm:px-3 sm:py-3 sm:text-sm">
                      {formatINR(b.openingBalance)}
                    </td>
                    <td className="border-y border-black/5 bg-white px-2 py-2.5 font-mono text-xs font-bold tabular-nums text-slate-900 sm:px-3 sm:py-3 sm:text-sm">
                      {formatINR(b.closingBalance)}
                    </td>
                    <td
                      className={`border-y border-black/5 bg-white px-2 py-2.5 font-mono text-xs font-bold tabular-nums sm:px-3 sm:py-3 sm:text-sm ${
                        b.dailyPL >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {b.dailyPL >= 0 ? '+' : ''}
                      {formatINR(b.dailyPL)}
                    </td>
                    <td className="border-y border-r border-black/5 bg-white px-2 py-2.5 last:rounded-xl sm:px-3 sm:py-3">
                      <span className={badgeClass(b.dailyPL >= 0 ? 'profit' : 'loss')}>{b.dailyPL >= 0 ? 'Profit' : 'Loss'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Recent Activity"
          extra={
            <Link href="/funds" className={`${btnGhost} ${btnSm} no-underline`}>
              View All →
            </Link>
          }
        >
          <div className="flex flex-col gap-3">
            {recentActivities.map((act, idx) => (
              <div key={act.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-[3px] border-[#f4f6f9] bg-white text-sm shadow-sm sm:size-9"
                    style={{
                      borderColor:
                        act.type === 'profit'
                          ? 'var(--profit-light)'
                          : act.type === 'expense'
                            ? 'var(--action-light)'
                            : act.type === 'transfer'
                              ? 'var(--info-light)'
                              : 'var(--purple-light)',
                    }}
                  >
                    {act.icon}
                  </div>
                  {idx < recentActivities.length - 1 && <div className="mt-1 w-0.5 flex-1 min-h-[8px] rounded-full bg-slate-200" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white p-3 text-sm shadow-sm transition hover:border-accent/20 hover:shadow sm:p-3.5">
                  <div className="text-xs font-bold text-slate-900 sm:text-sm">{act.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-600 sm:text-xs">{act.desc}</div>
                  <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
