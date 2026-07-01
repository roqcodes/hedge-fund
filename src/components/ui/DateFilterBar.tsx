'use client';

import React, { useMemo, useState } from 'react';
import DateRangeField from '@/components/ui/DateRangeField';
import {
  ALL_TIME_START,
  resolveDisplayDates,
  todayISO,
  type DateStepUnit,
} from '@/lib/dateFilterPresets';

interface DateFilterBarProps {
  dateFilter: string;
  setDateFilter: (val: string) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  children?: React.ReactNode;
}

const presetClass = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
    active
      ? 'bg-red-600 text-white shadow-md'
      : 'bg-transparent text-slate-500 hover:bg-red-50 hover:text-red-600'
  }`;

const stepUnitClass = (active: boolean) =>
  `flex size-7 items-center justify-center rounded-md text-[11px] font-bold transition-colors ${
    active
      ? 'bg-accent text-white shadow-sm'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
  }`;

const STEP_UNITS: DateStepUnit[] = ['Y', 'M', 'D'];

export default function DateFilterBar({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  children,
}: DateFilterBarProps) {
  const today = useMemo(() => todayISO(), []);
  const [stepUnit, setStepUnit] = useState<DateStepUnit>('D');

  const { from, to } = useMemo(
    () => resolveDisplayDates(dateFilter, customStartDate, customEndDate, today),
    [dateFilter, customStartDate, customEndDate, today],
  );

  const applyCustomRange = (nextFrom: string, nextTo: string) => {
    const start = nextFrom || today;
    const end = nextTo || start;
    setDateFilter('custom');
    setCustomStartDate(start <= end ? start : end);
    setCustomEndDate(start <= end ? end : start);
  };

  const handleAllTime = () => {
    setDateFilter('all-time');
    setCustomStartDate(ALL_TIME_START);
    setCustomEndDate(today);
  };

  const handleToday = () => {
    setDateFilter('today');
    setCustomStartDate(today);
    setCustomEndDate(today);
  };

  const handleFromChange = (value: string) => {
    if (!value) return;
    applyCustomRange(value, to);
  };

  const handleToChange = (value: string) => {
    if (!value) return;
    applyCustomRange(from, value);
  };

  return (
    <div className="mb-4 max-sm:rounded-2xl max-sm:border max-sm:border-slate-200/90 max-sm:bg-white max-sm:p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap items-center justify-between gap-2 max-sm:w-full sm:contents">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={handleAllTime} className={presetClass(dateFilter === 'all-time')}>
                All Time
              </button>
              <button type="button" onClick={handleToday} className={presetClass(dateFilter === 'today')}>
                Today
              </button>
            </div>

            <div
              className="flex w-fit shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50/80 p-0.5"
              role="group"
              aria-label="Date step unit"
            >
              {STEP_UNITS.map(unit => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setStepUnit(unit)}
                  className={stepUnitClass(stepUnit === unit)}
                  aria-pressed={stepUnit === unit}
                  title={unit === 'D' ? 'Day' : unit === 'M' ? 'Month' : 'Year'}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-sm:min-w-0 sm:flex sm:flex-row sm:items-center sm:gap-3">
            <DateRangeField label="From" value={from} stepUnit={stepUnit} onChange={handleFromChange} />
            <DateRangeField label="To" value={to} stepUnit={stepUnit} onChange={handleToChange} />
          </div>
        </div>

        {children ? (
          <div className="flex w-full min-w-0 shrink-0 items-center lg:ml-auto lg:w-auto lg:min-w-[200px] lg:max-w-[280px]">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
