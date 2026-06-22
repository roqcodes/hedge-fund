'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { filterSelect } from '@/lib/ui';
import {
  BRANCH_RANGE_PRESETS,
  buildSingleDayPresets,
  formatDayPresetLabel,
  getBranchPresetRangeLabel,
  resolveBranchPresetRange,
  resolveBranchTimeZone,
  todayInTimeZone,
} from '@/lib/businessTime';

type Props = {
  viewStartDate: string;
  viewEndDate: string;
  isAllTime?: boolean;
  onApply: (start: string, end: string) => void;
  workingDate: string;
  branchTimezone?: string;
};

function formatShort(dateStr: string) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function presetBtnClass(active: boolean) {
  return `rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
    active
      ? 'bg-slate-900 text-white ring-1 ring-slate-900'
      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
  }`;
}

export default function DayDateFilterBar({
  viewStartDate,
  viewEndDate,
  isAllTime = false,
  onApply,
  workingDate,
  branchTimezone,
}: Props) {
  const timeZone = resolveBranchTimeZone(branchTimezone);
  const branchToday = todayInTimeZone(timeZone);

  const [mode, setMode] = useState<'single' | 'range'>(() =>
    isAllTime ? 'single' : viewStartDate && viewEndDate && viewStartDate !== viewEndDate ? 'range' : 'single',
  );
  const [singleDate, setSingleDate] = useState(viewStartDate || workingDate);
  const [rangeStart, setRangeStart] = useState(viewStartDate || workingDate);
  const [rangeEnd, setRangeEnd] = useState(viewEndDate || workingDate);

  useEffect(() => {
    if (isAllTime) return;
    if (viewStartDate) setSingleDate(viewStartDate);
    if (viewStartDate) setRangeStart(viewStartDate);
    if (viewEndDate) setRangeEnd(viewEndDate);
    if (viewStartDate && viewEndDate && viewStartDate !== viewEndDate) setMode('range');
    else if (viewStartDate && viewEndDate) setMode('single');
  }, [viewStartDate, viewEndDate, isAllTime]);

  const singleDayPresets = useMemo(() => buildSingleDayPresets(branchToday, 6), [branchToday]);
  const priorDayPresets = useMemo(() => singleDayPresets.slice(2), [singleDayPresets]);

  const applySingle = (d: string) => {
    setMode('single');
    setSingleDate(d);
    onApply(d, d);
  };

  const applyRange = (start: string, end: string) => {
    setMode('range');
    setRangeStart(start);
    setRangeEnd(end);
    onApply(start, end);
  };

  const activeRangePreset = useMemo(() => {
    if (!viewStartDate || !viewEndDate || viewStartDate === viewEndDate) return null;
    for (const preset of BRANCH_RANGE_PRESETS) {
      const r = resolveBranchPresetRange(preset, branchToday);
      if (r.startDate === viewStartDate && r.endDate === viewEndDate) return preset;
    }
    return null;
  }, [viewStartDate, viewEndDate, branchToday]);

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white shadow-surface-xs">
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Reporting period</span>
            <select
              className={filterSelect}
              value={mode}
              onChange={e => {
                const m = e.target.value as 'single' | 'range';
                setMode(m);
                if (m === 'single') applySingle(singleDate || workingDate);
                else applyRange(rangeStart || workingDate, rangeEnd || workingDate);
              }}
              aria-label="View mode"
            >
              <option value="single">Single day</option>
              <option value="range">Date range</option>
            </select>
            {mode === 'single' ? (
              <input
                type="date"
                value={isAllTime ? '' : singleDate}
                onChange={e => applySingle(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={isAllTime ? '' : rangeStart}
                  onChange={e => applyRange(e.target.value, rangeEnd)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={isAllTime ? '' : rangeEnd}
                  onChange={e => applyRange(rangeStart, e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => applySingle(workingDate)}
              className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-accent ring-1 ring-accent/20 hover:bg-accent/5"
            >
              Active day ({formatShort(workingDate)})
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('single');
                onApply('', '');
              }}
              className={presetBtnClass(isAllTime)}
            >
              All time
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {isAllTime
              ? 'Showing all branch transactions (no date filter)'
              : viewStartDate === viewEndDate
                ? `Showing ${formatShort(viewStartDate)}`
                : `${formatShort(viewStartDate)} → ${formatShort(viewEndDate)} · opening of first day, closing of last`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Quick select</span>
          {mode === 'single' ? (
            <>
              <button
                type="button"
                className={presetBtnClass(viewStartDate === branchToday && viewEndDate === branchToday)}
                onClick={() => applySingle(branchToday)}
              >
                Today
              </button>
              <button
                type="button"
                className={presetBtnClass(
                  viewStartDate === singleDayPresets[1] && viewEndDate === singleDayPresets[1],
                )}
                onClick={() => applySingle(singleDayPresets[1])}
              >
                Yesterday
              </button>
              {priorDayPresets.map(d => (
                <button
                  key={d}
                  type="button"
                  className={presetBtnClass(viewStartDate === d && viewEndDate === d)}
                  onClick={() => applySingle(d)}
                >
                  {formatDayPresetLabel(d, timeZone)}
                </button>
              ))}
            </>
          ) : (
            BRANCH_RANGE_PRESETS.map(preset => {
              const r = resolveBranchPresetRange(preset, branchToday);
              return (
                <button
                  key={preset}
                  type="button"
                  className={presetBtnClass(activeRangePreset === preset)}
                  onClick={() => applyRange(r.startDate, r.endDate)}
                >
                  {getBranchPresetRangeLabel(preset)}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
