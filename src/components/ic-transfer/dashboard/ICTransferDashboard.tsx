'use client';

import React from 'react';
import KPICard from '@/components/ui/KPICard';
import { kpiGrid } from '@/lib/ui';
import { IC_CHART_DATA } from '@/lib/icTransfer/mockData';
import { ChartCard, PageHeader, PageShell } from '../ui';

function WarehouseChart() {
  const maxY = 5;
  const w = 480;
  const h = 160;
  const pad = { t: 12, r: 12, b: 28, l: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const points = IC_CHART_DATA.map((d, i) => {
    const x = pad.l + (i / (IC_CHART_DATA.length - 1)) * innerW;
    const y = pad.t + innerH - (d.assigned / maxY) * innerH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <ChartCard
      title="Warehouse Performance"
      legend={
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="size-2.5 rounded-full bg-accent" /> Assigned
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="size-2.5 rounded-full bg-slate-300" /> Not Assigned
          </span>
        </div>
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map(v => {
          const y = pad.t + innerH - (v / maxY) * innerH;
          return (
            <g key={v}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{v}</text>
            </g>
          );
        })}
        {IC_CHART_DATA.map((d, i) => {
          const x = pad.l + (i / (IC_CHART_DATA.length - 1)) * innerW;
          return (
            <text key={d.month} x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">{d.month}</text>
          );
        })}
        <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" points={points} />
      </svg>
    </ChartCard>
  );
}

export default function ICTransferDashboard() {
  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle="IC Transfer overview and warehouse performance"
      />

      <div className={kpiGrid}>
        <KPICard
          label="Today's Orders"
          value="0"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h7" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard
          label="Total Amount (AED)"
          value="0"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard
          label="Supplier Payable"
          value="0"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 3h15v13H1zM16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          }
          color="var(--purple)"
          bgColor="var(--purple-light)"
        />
        <KPICard
          label="Total Commission"
          value="0"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          }
          color="var(--profit)"
          bgColor="var(--profit-light)"
        />
      </div>

      <WarehouseChart />
    </PageShell>
  );
}
