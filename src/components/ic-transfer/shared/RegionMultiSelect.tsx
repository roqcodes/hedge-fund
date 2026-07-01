'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formInput, formLabel } from '@/lib/ui';
import type { ICRegion } from '@/types';

type Props = {
  regions: ICRegion[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  /** Smaller trigger for toolbar rows (e.g. date filter bar). */
  inline?: boolean;
};

export default function RegionMultiSelect({
  regions,
  selectedIds,
  onChange,
  label,
  placeholder = 'All regions',
  className = '',
  compact = false,
  inline = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedRegions = useMemo(
    () => selectedIds.map(id => regions.find(r => r.id === id)).filter(Boolean) as ICRegion[],
    [selectedIds, regions],
  );

  const filteredRegions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...regions].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      r => r.name.toLowerCase().includes(q) || r.country.toLowerCase().includes(q),
    );
  }, [regions, search]);

  const toggleRegion = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const triggerLabel =
    selectedRegions.length === 0
      ? placeholder
      : selectedRegions.length === 1
        ? selectedRegions[0].name
        : `${selectedRegions.length} regions selected`;

  const triggerClass = inline
    ? 'flex h-9 min-h-9 w-full cursor-pointer select-none items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-surface-xs transition-[border-color,box-shadow] hover:border-slate-300'
    : `${formInput} flex !cursor-pointer select-none items-center justify-between !py-3 !pr-8 text-sm bg-white sm:!py-3.5`;

  const panelClass = inline
    ? 'absolute right-0 z-50 mt-1 flex max-h-72 w-[min(280px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-[fade-in-up_0.15s_ease-out_both]'
    : 'absolute left-0 z-50 mt-1 flex max-h-72 w-full min-w-[240px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-[fade-in-up_0.15s_ease-out_both]';

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      {label ? <label className={formLabel}>{label}</label> : null}

      {!compact && !inline && selectedRegions.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedRegions.map(region => (
            <span
              key={region.id}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
            >
              {region.name}
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                onClick={() => onChange(selectedIds.filter(id => id !== region.id))}
                aria-label={`Remove ${region.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className={triggerClass}
        onClick={() => {
          setIsOpen(prev => !prev);
          if (!isOpen) setSearch('');
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
            if (!isOpen) setSearch('');
          }
        }}
      >
        <span className={`truncate ${selectedRegions.length === 0 ? 'text-slate-400' : 'font-medium text-slate-900'}`}>
          {triggerLabel}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-2 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen ? (
        <div className={panelClass}>
          <div className="border-b border-slate-100 bg-slate-50/50 p-2">
            <div className="relative">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Search regions…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1 scrollbar-thin">
            {filteredRegions.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-slate-500">No regions found</div>
            ) : (
              filteredRegions.map(region => {
                const checked = selectedIds.includes(region.id);
                return (
                  <button
                    key={region.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      checked ? 'bg-accent/10 font-medium text-accent' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => toggleRegion(region.id)}
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                        checked ? 'border-accent bg-accent text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{region.name}</span>
                      <span className="block truncate text-[11px] text-slate-400">{region.country}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex justify-end border-t border-slate-100 p-2">
              <button
                type="button"
                className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                onClick={() => onChange([])}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
