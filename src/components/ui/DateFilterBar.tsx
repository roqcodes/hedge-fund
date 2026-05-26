import React, { useState } from 'react';
import { filterSelect } from '@/lib/ui';

interface DateFilterBarProps {
  dateFilter: string;
  setDateFilter: (val: string) => void;
  customStartDate: string;
  setCustomStartDate: (val: string) => void;
  customEndDate: string;
  setCustomEndDate: (val: string) => void;
  children?: React.ReactNode;
}

export default function DateFilterBar({
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  children
}: DateFilterBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);

  return (
    <div className="mb-4">
      {/* Mobile View */}
      <div className="flex sm:hidden flex-col gap-3">
        <div className="flex w-full items-center gap-4">
          <div className="relative flex-1 min-w-0">
            <select
              value={dateFilter === 'custom' ? 'custom' : dateFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setShowDropdown(true);
                } else {
                  setDateFilter(val);
                  setShowDropdown(false);
                }
              }}
              className={`${filterSelect} w-full`}
              aria-label="Select Time Range"
            >
              <option value="all-time">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="custom">
                {dateFilter === 'custom' && (customStartDate || customEndDate)
                  ? `${customStartDate || '...'} to ${customEndDate || '...'}`
                  : 'Custom Range...'}
              </option>
            </select>

            {/* Floating Dropdown for Custom Range (Mobile) */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl z-40 animate-[fade-in_0.15s_ease-out] flex flex-col gap-1">
                  <div className="px-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Custom Date Range</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                        <input
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStartDate(tempStartDate);
                          setCustomEndDate(tempEndDate);
                          setDateFilter('custom');
                          setShowDropdown(false);
                        }}
                        className="mt-2 w-full rounded-xl bg-accent py-2 text-center text-xs font-bold text-white shadow-md shadow-accent/15 transition-all hover:bg-accent/90 active:scale-95"
                      >
                        Apply Custom Range
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>

        {/* Custom Date Inputs Summary (appears below if active) */}
        {dateFilter === 'custom' && (customStartDate || customEndDate) && (
          <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/10 px-3 py-1 text-xs font-bold text-accent animate-[fade-in_0.25s_ease-out] w-fit">
            <span className="font-semibold text-slate-600 mr-1">Active Range:</span>
            <span className="font-mono">{customStartDate || '...'}</span>
            <span className="text-[10px] text-slate-400 font-normal">to</span>
            <span className="font-mono">{customEndDate || '...'}</span>
            <button
              type="button"
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setTempStartDate('');
                setTempEndDate('');
                setDateFilter('all-time');
              }}
              className="ml-1 flex size-4 items-center justify-center rounded-full bg-accent/20 text-[10px] font-black text-accent hover:bg-accent hover:text-white transition-colors"
              aria-label="Clear filter"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 py-2.5 px-4 border border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all-time', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this-week', label: 'This Week' },
              { id: 'last-week', label: 'Last Week' },
              { id: 'this-month', label: 'This Month' },
              { id: 'last-month', label: 'Last Month' },
            ] as const
          ).map(opt => {
            const isActive = dateFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setDateFilter(opt.id);
                  setShowDropdown(false);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}

          {/* Custom Range Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 outline-none transition-all hover:text-slate-900 focus:border-accent ${dateFilter === 'custom'
                ? 'border-accent bg-accent/5 text-accent font-black'
                : ''
                }`}
            >
              <span>
                {dateFilter === 'custom' && (customStartDate || customEndDate)
                  ? `${customStartDate || '...'} to ${customEndDate || '...'}`
                  : 'Custom Range'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Floating Dropdown for Custom Range (Desktop) */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)}></div>
                <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl z-40 animate-[fade-in_0.15s_ease-out] flex flex-col gap-1">
                  <div className="px-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Custom Date Range</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:bg-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                        <input
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-accent focus:bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStartDate(tempStartDate);
                          setCustomEndDate(tempEndDate);
                          setDateFilter('custom');
                          setShowDropdown(false);
                        }}
                        className="mt-2 w-full rounded-xl bg-accent py-2 text-center text-xs font-bold text-white shadow-md shadow-accent/15 transition-all hover:bg-accent/90 active:scale-95"
                      >
                        Apply Custom Range
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Custom Date Inputs Summary */}
          {dateFilter === 'custom' && (customStartDate || customEndDate) && (
            <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/10 px-3 py-1 text-xs font-bold text-accent animate-[fade-in_0.25s_ease-out]">
              <span className="font-semibold text-slate-600 mr-1">Active Range:</span>
              <span className="font-mono">{customStartDate || '...'}</span>
              <span className="text-[10px] text-slate-400 font-normal">to</span>
              <span className="font-mono">{customEndDate || '...'}</span>
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setTempStartDate('');
                  setTempEndDate('');
                  setDateFilter('all-time');
                }}
                className="ml-1 flex size-4 items-center justify-center rounded-full bg-accent/20 text-[10px] font-black text-accent hover:bg-accent hover:text-white transition-colors"
                aria-label="Clear filter"
              >
                &times;
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
