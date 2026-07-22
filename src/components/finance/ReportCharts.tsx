'use client';

import React from 'react';
import ChartCard from '@/components/ic-transfer/ui/ChartCard';
import { formatAEDStr } from '@/data/mockData';

type TrendPoint = { label: string; buy: number; sell: number; profit?: number };

export function ReportTrendChart({ data, title }: { data: TrendPoint[]; title: string }) {
  const maxVal = Math.max(...data.flatMap(d => [d.buy, d.sell, d.profit ?? 0]), 1);

  return (
    <ChartCard
      title={title}
      legend={
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-accent" />
            Buys / Inflow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-400" />
            Sells / Outflow
          </span>
          {data.some(d => (d.profit ?? 0) !== 0) && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-violet-400" />
              P&amp;L
            </span>
          )}
        </div>
      }
    >
      <div className="relative flex h-48 items-end gap-1.5 px-2 pb-6 sm:gap-3">
        {data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No data in selected period
          </div>
        ) : (
          data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="flex h-full w-full items-end justify-center gap-[1px] sm:gap-1">
                <div
                  className="w-1/3 max-w-[20px] rounded-t-[3px] bg-accent transition-all group-hover:opacity-80"
                  style={{ height: `${Math.max((d.buy / maxVal) * 100, 2)}%` }}
                  title={`Inflow: ${formatAEDStr(d.buy)}`}
                />
                <div
                  className="w-1/3 max-w-[20px] rounded-t-[3px] bg-emerald-400 transition-all group-hover:opacity-80"
                  style={{ height: `${Math.max((d.sell / maxVal) * 100, 2)}%` }}
                  title={`Outflow: ${formatAEDStr(d.sell)}`}
                />
                {(d.profit ?? 0) !== 0 && (
                  <div
                    className="w-1/3 max-w-[20px] rounded-t-[3px] bg-violet-400 transition-all group-hover:opacity-80"
                    style={{ height: `${Math.max(((d.profit ?? 0) / maxVal) * 100, 2)}%` }}
                    title={`P&L: ${formatAEDStr(d.profit ?? 0)}`}
                  />
                )}
              </div>
              <span className="absolute -bottom-5 max-w-[120%] truncate text-center text-[10px] font-medium text-slate-400">
                {d.label}
              </span>
            </div>
          ))
        )}
      </div>
    </ChartCard>
  );
}

type SinglePoint = { label: string; value: number };

export function ReportSingleBarChart({
  data,
  title,
  colorClass = 'bg-accent',
  formatValue = formatAEDStr,
}: {
  data: SinglePoint[];
  title: string;
  colorClass?: string;
  formatValue?: (n: number) => string;
}) {
  const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1);

  return (
    <ChartCard title={title}>
      <div className="flex h-48 items-end gap-2 px-2 pb-6">
        {data.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No data in selected period
          </div>
        ) : (
          data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div
                className={`w-full max-w-[32px] rounded-t-md ${colorClass} transition-all group-hover:opacity-80`}
                style={{ height: `${Math.max((Math.abs(d.value) / maxVal) * 100, 2)}%` }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
              <span className="absolute -bottom-5 max-w-full truncate text-center text-[10px] text-slate-400">
                {d.label}
              </span>
            </div>
          ))
        )}
      </div>
    </ChartCard>
  );
}

type RankItem = { name: string; volume: number; percentage: number };

export function ReportRankingList({
  title,
  data,
  colorClass = 'bg-accent',
  formatValue = formatAEDStr,
}: {
  title: string;
  data: RankItem[];
  colorClass?: string;
  formatValue?: (n: number) => string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-surface-xs">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <div className="mt-4 flex flex-col gap-4">
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No data</p>
        ) : (
          data.slice(0, 8).map((d, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between text-xs font-bold text-slate-700">
                <span className="truncate pr-2">{d.name}</span>
                <span className="font-mono text-slate-900">{formatValue(d.volume)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${colorClass}`}
                  style={{ width: `${Math.max(d.percentage, 1)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
