'use client';

import React, { useState, useMemo, useRef } from 'react';
import type { FundEntityLedgerEntry, FundEntityBalance, Customer } from '@/types';

type SortField = 'entryDate' | 'debit' | 'credit';
type SortDir = 'asc' | 'desc';

interface EntryTableProps {
  entries: FundEntityLedgerEntry[];
  balances: FundEntityBalance[];
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onView: (entry: FundEntityLedgerEntry) => void;
  onDelete: (entry: FundEntityLedgerEntry) => void;
  onRecordPayment: (customerId?: string, amount?: number) => void;
  canWrite: boolean;
}

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function EntryTable({
  entries,
  balances,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onView,
  onDelete,
  onRecordPayment,
  canWrite,
}: EntryTableProps) {
  const [entitySearch, setEntitySearch] = useState('');
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField>('entryDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refTypeFilter, setRefTypeFilter] = useState('all');
  const [descSearch, setDescSearch] = useState('');

  const selectedBalance = selectedCustomerId
    ? balances.find(b => b.customerId === selectedCustomerId)
    : null;

  const sortedEntries = useMemo(() => {
    const sorted = [...entries];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'entryDate') {
        cmp = new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      } else if (sortField === 'debit') {
        cmp = a.debit - b.debit;
      } else if (sortField === 'credit') {
        cmp = a.credit - b.credit;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [entries, sortField, sortDir]);

  const filteredEntries = useMemo(() => {
    return sortedEntries.filter(entry => {
      if (dateFrom && entry.entryDate.slice(0, 10) < dateFrom) return false;
      if (dateTo && entry.entryDate.slice(0, 10) > dateTo) return false;
      if (refTypeFilter !== 'all' && entry.referenceType !== refTypeFilter) return false;
      if (descSearch && !entry.description?.toLowerCase().includes(descSearch.toLowerCase())) return false;
      return true;
    });
  }, [sortedEntries, dateFrom, dateTo, refTypeFilter, descSearch]);

  const showAll = !selectedCustomerId;
  const hasFilters = dateFrom || dateTo || refTypeFilter !== 'all' || descSearch;
  const hasAnyFilter = hasFilters || !!selectedCustomerId;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="ml-1 inline-block text-[9px]">
        {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  const getCustomerName = (cid: string) =>
    customers.find(c => c.id === cid)?.name ?? cid.slice(0, 8);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setRefTypeFilter('all');
    setDescSearch('');
  };

  const filterInputClass = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none transition-colors';

  const entityOptions = useMemo(() => {
    return balances
      .filter(b => b.customerName.toLowerCase().includes(entitySearch.toLowerCase()))
      .map(b => ({
        id: b.customerId,
        name: b.customerName,
        net: b.net,
        totalDebit: b.totalDebit,
        totalCredit: b.totalCredit,
      }));
  }, [balances, entitySearch]);

  const renderTable = (showEntityCol: boolean) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {showEntityCol && (
              <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Entity
              </th>
            )}
            <th className="px-3 py-2.5 text-left">
              <button
                type="button"
                onClick={() => toggleSort('entryDate')}
                className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Date<SortArrow field="entryDate" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Description</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Currency</th>
            <th className="px-3 py-2.5 text-right">
              <button
                type="button"
                onClick={() => toggleSort('debit')}
                className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Debit<SortArrow field="debit" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-right">
              <button
                type="button"
                onClick={() => toggleSort('credit')}
                className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Credit<SortArrow field="credit" />
              </button>
            </th>
            <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Ref</th>
            {canWrite && <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredEntries.map(entry => (
            <tr
              key={entry.id}
              className="cursor-pointer transition-colors hover:bg-slate-50/60"
              onClick={() => onView(entry)}
              data-interactive-row
            >
              {showEntityCol && (
                <td className="border-y border-l border-black/5 bg-white px-3 py-2.5 first:rounded-l-2xl">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${getAvatarColor(entry.customerId)}`}>
                      {getCustomerName(entry.customerId).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
                      {getCustomerName(entry.customerId)}
                    </span>
                  </div>
                </td>
              )}
              <td className={`whitespace-nowrap bg-white px-3 py-2.5 ${showEntityCol ? 'border-y border-black/5' : 'border-y border-l border-black/5 first:rounded-l-2xl'}`}>
                <span className="font-semibold text-slate-900">
                  {new Date(entry.entryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </td>
              <td className="border-y border-black/5 bg-white px-3 py-2.5">
                <span className="max-w-[200px] truncate text-slate-700 block">
                  {entry.description || <span className="text-slate-300">—</span>}
                </span>
              </td>
              <td className="border-y border-black/5 bg-white px-3 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  {entry.customerCurrency || 'USDT'}
                </span>
              </td>
              <td className="border-y border-black/5 bg-white px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                {entry.debit > 0 ? (
                  <>
                    <span>{entry.debit.toFixed(2)}</span>
                    {entry.customerCurrencyRate && entry.settlementCurrency && (
                      <span className="block text-[9px] font-semibold text-slate-400">
                        ≈ {(entry.debit / entry.customerCurrencyRate).toFixed(2)} {entry.settlementCurrency}
                      </span>
                    )}
                  </>
                ) : <span className="text-slate-300">—</span>}
              </td>
              <td className="border-y border-black/5 bg-white px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                {entry.credit > 0 ? (
                  <>
                    <span>{entry.credit.toFixed(2)}</span>
                    {entry.customerCurrencyRate && entry.settlementCurrency && (
                      <span className="block text-[9px] font-semibold text-slate-400">
                        ≈ {(entry.credit / entry.customerCurrencyRate).toFixed(2)} {entry.settlementCurrency}
                      </span>
                    )}
                  </>
                ) : <span className="text-slate-300">—</span>}
              </td>
              <td className="border-y border-black/5 bg-white px-3 py-2.5 text-right text-slate-400 font-mono text-[10px]">
                {entry.referenceType !== 'manual' ? (
                  <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                    entry.referenceType === 'settlement'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {entry.referenceType.replace('_', ' ')}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              {canWrite && (
                <td className="border-y border-r border-black/5 bg-white px-3 py-2.5 last:rounded-r-2xl">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="View"
                      onClick={e => { e.stopPropagation(); onView(entry); }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-accent hover:text-accent active:scale-95"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={e => { e.stopPropagation(); onDelete(entry); }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const selectedEntity = selectedCustomerId
    ? balances.find(b => b.customerId === selectedCustomerId)
    : null;

  return (
    <>
      {/* Top filter bar with entity combo */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-surface-xs">
        {/* Entity combo */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-1.5">
            {selectedEntity ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${getAvatarColor(selectedEntity.customerId)}`}>
                  {selectedEntity.customerName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800">{selectedEntity.customerName}</span>
                <button
                  type="button"
                  onClick={() => { onSelectCustomer(null); setEntitySearch(''); }}
                  className="ml-0.5 rounded p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={entitySearch}
                  onChange={e => { setEntitySearch(e.target.value); setEntityDropdownOpen(true); }}
                  onFocus={() => setEntityDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setEntityDropdownOpen(false), 180)}
                  placeholder="Filter by entity..."
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none transition-colors w-44"
                />
                {entityDropdownOpen && entityOptions.length > 0 && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {entityOptions.map(opt => {
                      const isReceivable = opt.net > 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onMouseDown={() => { onSelectCustomer(opt.id); setEntitySearch(''); setEntityDropdownOpen(false); }}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        >
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${getAvatarColor(opt.id)}`}>
                            {opt.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 truncate">{opt.name}</p>
                            <p className="text-[10px] text-slate-400">
                              D: {opt.totalDebit.toFixed(2)} | C: {opt.totalCredit.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-bold font-mono tabular-nums ${isReceivable ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isReceivable ? '' : '-'}{Math.abs(opt.net).toFixed(2)}
                            </p>
                            <p className={`text-[9px] font-extrabold uppercase ${isReceivable ? 'text-emerald-500' : 'text-red-400'}`}>
                              {isReceivable ? 'Owes' : 'Owe'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={filterInputClass} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={filterInputClass} />
        </div>
        <select
          value={refTypeFilter}
          onChange={e => setRefTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-slate-900 focus:outline-none"
        >
          <option value="all">All refs</option>
          <option value="manual">Manual</option>
          <option value="settlement">Settlement</option>
        </select>
        <input
          type="text"
          value={descSearch}
          onChange={e => setDescSearch(e.target.value)}
          placeholder="Search entries..."
          className={`${filterInputClass} min-w-[160px]`}
        />
        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => { clearFilters(); if (selectedCustomerId) onSelectCustomer(null); }}
            className="ml-auto whitespace-nowrap text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Entity balance chips row */}
      {!selectedEntity && balances.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {balances.slice(0, 20).map(b => {
            const isReceivable = b.net > 0;
            return (
              <button
                key={b.customerId}
                type="button"
                onClick={() => onSelectCustomer(b.customerId)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left shadow-surface-xs hover:border-slate-200 hover:shadow-sm transition-all active:scale-[0.98]"
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold ${getAvatarColor(b.customerId)}`}>
                  {b.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight truncate max-w-[100px]">{b.customerName}</p>
                  <p className={`text-[10px] font-bold font-mono tabular-nums ${isReceivable ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isReceivable ? '' : '-'}{Math.abs(b.net).toFixed(0)}
                  </p>
                </div>
              </button>
            );
          })}
          {balances.length > 20 && (
            <div className="flex shrink-0 items-center px-2 text-[11px] font-semibold text-slate-400">
              +{balances.length - 20} more
            </div>
          )}
        </div>
      )}

      {/* Selected entity quick-settle card */}
      {selectedEntity && canWrite && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${getAvatarColor(selectedEntity.customerId)}`}>
              {selectedEntity.customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{selectedEntity.customerName}</p>
              <p className={`text-xs font-bold font-mono ${selectedEntity.net > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {selectedEntity.net > 0 ? 'Owes ' : 'Owe '}
                {Math.abs(selectedEntity.net).toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRecordPayment(selectedEntity.customerId, Math.abs(selectedEntity.net))}
            className="rounded-lg bg-slate-900 px-4 py-2 text-[11px] font-bold text-white hover:bg-slate-800 transition-all active:scale-[0.97]"
          >
            Settle
          </button>
        </div>
      )}

      {/* Full width entries area */}
      {(() => {
        const hasEntries = entries.length > 0;
        const hasFiltered = filteredEntries.length > 0;

        if (!selectedCustomerId && !hasEntries) {
          return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-16 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-slate-300">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <p className="text-base font-bold text-slate-400">No entries yet</p>
              <p className="mt-1 text-sm text-slate-300">Post entries or record payments to get started</p>
            </div>
          );
        }

        if (selectedCustomerId && !hasEntries) {
          return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
              <p className="text-sm font-semibold text-slate-400">No entries for this entity</p>
            </div>
          );
        }

        if (hasEntries && !hasFiltered) {
          return (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center">
              <p className="text-sm font-semibold text-slate-400">No entries match your filters</p>
              {(hasFilters || selectedCustomerId) && (
                <button
                  type="button"
                  onClick={() => { clearFilters(); if (selectedCustomerId) onSelectCustomer(null); }}
                  className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2"
                >
                  Clear all filters
                </button>
              )}
            </div>
          );
        }

        return (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                {filteredEntries.length}
                {hasFilters && entries.length !== filteredEntries.length
                  ? ` / ${entries.length}`
                  : ''}{' '}
                entr{filteredEntries.length === 1 ? 'y' : 'ies'}
                {hasAnyFilter && ' (filtered)'}
              </p>
              <div className="flex items-center gap-2">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear entity filter
                  </button>
                )}
              </div>
            </div>
            {renderTable(showAll)}
          </>
        );
      })()}
    </>
  );
}