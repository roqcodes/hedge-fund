'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { Expense, FundEntityBalance, FundEntityLedgerEntry, Customer } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import { btnPrimary, dataTable, formInput, tableWrap } from '@/lib/ui';
import { txnTd, txnTdFromTo, txnTh, txnThSortable } from '@/lib/transactionTableStyles';

export type FundLedgerTab = 'all' | 'entries' | 'expenses' | 'entities';

type SortField = 'date' | 'debit' | 'credit';
type SortDir = 'asc' | 'desc';

interface JournalRow {
  id: string;
  date: string;
  kind: 'entry' | 'expense';
  typeLabel: string;
  badgeKind: string;
  counterparty: string;
  description: string;
  currency: string;
  debit: number;
  credit: number;
  ref: string;
  entry?: FundEntityLedgerEntry;
}

interface FundLedgerTableProps {
  entries: FundEntityLedgerEntry[];
  expenses: Expense[];
  balances: FundEntityBalance[];
  customers: Customer[];
  selectedCustomerId: string | null;
  loading: boolean;
  onSelectCustomer: (customerId: string | null) => void;
  onViewEntry: (entry: FundEntityLedgerEntry) => void;
  onDeleteEntry: (entry: FundEntityLedgerEntry) => void;
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
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmtAmount(n: number, currency: string) {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function entryToRow(entry: FundEntityLedgerEntry, getCustomerName: (id: string) => string): JournalRow {
  const isDebit = entry.debit > 0;
  return {
    id: entry.id,
    date: entry.entryDate.slice(0, 10),
    kind: 'entry',
    typeLabel: isDebit ? 'Receivable' : 'Payable',
    badgeKind: isDebit ? 'profit' : 'loss',
    counterparty: getCustomerName(entry.customerId),
    description: entry.description,
    currency: entry.settlementCurrency || entry.customerCurrency || 'AED',
    debit: entry.debit,
    credit: entry.credit,
    ref: entry.referenceType,
    entry,
  };
}

function expenseToRow(expense: Expense): JournalRow {
  return {
    id: expense.id,
    date: expense.date,
    kind: 'expense',
    typeLabel: expense.type.toUpperCase(),
    badgeKind: expense.type,
    counterparty: expense.category,
    description: expense.description,
    currency: expense.paymentMethod ?? 'AED',
    debit: expense.amount,
    credit: 0,
    ref: 'expense',
  };
}

const TABS: { id: FundLedgerTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'entries', label: 'Entries' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'entities', label: 'Entities' },
];

export default function FundLedgerTable({
  entries,
  expenses,
  balances,
  customers,
  selectedCustomerId,
  loading,
  onSelectCustomer,
  onViewEntry,
  onDeleteEntry,
  onRecordPayment,
  canWrite,
}: FundLedgerTableProps) {
  const [activeTab, setActiveTab] = useState<FundLedgerTab>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [refFilter, setRefFilter] = useState('all');
  const [entitySearch, setEntitySearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const tableRef = useRef<HTMLDivElement>(null);

  const getCustomerName = (cid: string) =>
    customers.find(c => c.id === cid)?.name ?? cid.slice(0, 8);

  const tabCounts = useMemo(() => ({
    all: entries.length + expenses.length,
    entries: entries.length,
    expenses: expenses.length,
    entities: balances.length,
  }), [entries.length, expenses.length, balances.length]);

  const journalRows = useMemo(() => {
    const getName = (id: string) => customers.find(c => c.id === id)?.name ?? id.slice(0, 8);
    let rows: JournalRow[] = [];

    if (activeTab === 'all' || activeTab === 'entries') {
      const filteredEntries = selectedCustomerId
        ? entries.filter(e => e.customerId === selectedCustomerId)
        : entries;
      rows = rows.concat(filteredEntries.map(e => entryToRow(e, getName)));
    }
    if (activeTab === 'all' || activeTab === 'expenses') {
      rows = rows.concat(expenses.map(expenseToRow));
    }

    rows = rows.filter(row => {
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (refFilter !== 'all' && row.ref !== refFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !row.description.toLowerCase().includes(q) &&
          !row.counterparty.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'debit') cmp = a.debit - b.debit;
      else cmp = a.credit - b.credit;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [activeTab, entries, expenses, selectedCustomerId, customers, dateFrom, dateTo, refFilter, search, sortField, sortDir]);

  const totals = useMemo(() => {
    const debit = journalRows.reduce((s, r) => s + r.debit, 0);
    const credit = journalRows.reduce((s, r) => s + r.credit, 0);
    return { debit, credit, net: debit - credit };
  }, [journalRows]);

  const filteredEntities = useMemo(() => {
    if (!entitySearch.trim()) return balances;
    const q = entitySearch.toLowerCase();
    return balances.filter(b => b.customerName.toLowerCase().includes(q));
  }, [balances, entitySearch]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortArrow = ({ field }: { field: SortField }) =>
    sortField === field ? (
      <span className="ml-1 inline-block text-[9px]">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
    ) : null;

  const hasFilters = search || dateFrom || dateTo || refFilter !== 'all' || selectedCustomerId;

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setRefFilter('all');
    onSelectCustomer(null);
  };

  const selectedBalance = selectedCustomerId
    ? balances.find(b => b.customerId === selectedCustomerId)
    : null;

  return (
    <>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Fund ledger</p>

      <div className="mb-4 flex w-fit flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
              activeTab === tab.id ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/60 text-slate-400'
            }`}>
              {tabCounts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      <div
        ref={tableRef}
        className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover"
      >
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
            {activeTab === 'entities' ? 'Entity balances' : 'General journal'}
          </h3>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-48">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder={activeTab === 'entities' ? 'Search entities…' : 'Search journal…'}
                value={activeTab === 'entities' ? entitySearch : search}
                onChange={e => activeTab === 'entities' ? setEntitySearch(e.target.value) : setSearch(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
            {activeTab !== 'entities' && (
              <>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" title="From" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" title="To" />
                <select
                  value={refFilter}
                  onChange={e => setRefFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <option value="all">All refs</option>
                  <option value="manual">Manual</option>
                  <option value="settlement">Settlement</option>
                  <option value="expense">Expense</option>
                </select>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected entity banner */}
        {activeTab !== 'entities' && selectedBalance && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 md:px-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${getAvatarColor(selectedBalance.customerId)}`}>
                {selectedBalance.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedBalance.customerName}</p>
                <p className={`text-xs font-bold font-mono ${selectedBalance.net > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {selectedBalance.net > 0 ? 'Owes ' : 'Owe '}{Math.abs(selectedBalance.net).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canWrite && (
                <button
                  type="button"
                  onClick={() => onRecordPayment(selectedBalance.customerId, Math.abs(selectedBalance.net))}
                  className={`${btnPrimary} !py-1.5 !px-3 !text-xs`}
                >
                  Settle
                </button>
              )}
              <button type="button" onClick={() => onSelectCustomer(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="p-0">
          {activeTab === 'entities' ? (
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[640px]`}>
                <thead>
                  <tr>
                    <th className={txnTh}>Entity</th>
                    <th className={`${txnTh} text-right`}>Receivable</th>
                    <th className={`${txnTh} text-right`}>Payable</th>
                    <th className={`${txnTh} text-right`}>Net</th>
                    {canWrite && <th className={`${txnTh} text-right`}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={canWrite ? 5 : 4} className="px-4 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
                  ) : filteredEntities.length === 0 ? (
                    <tr><td colSpan={canWrite ? 5 : 4} className="px-4 py-12 text-center text-sm text-slate-400">No entities with balances</td></tr>
                  ) : (
                    filteredEntities.map(b => {
                      const isReceivable = b.net > 0;
                      return (
                        <tr key={b.customerId} className="group">
                          <td className={`${txnTdFromTo} first:rounded-l-2xl`}>
                            <div className="flex items-center gap-2">
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${getAvatarColor(b.customerId)}`}>
                                {b.customerName.charAt(0).toUpperCase()}
                              </div>
                              <button
                                type="button"
                                onClick={() => { onSelectCustomer(b.customerId); setActiveTab('entries'); }}
                                className="text-left font-semibold text-slate-900 hover:text-accent transition-colors"
                              >
                                {b.customerName}
                              </button>
                            </div>
                          </td>
                          <td className={`${txnTd} text-right font-mono text-xs font-bold text-emerald-700`}>
                            {b.totalDebit > 0 ? b.totalDebit.toFixed(2) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className={`${txnTd} text-right font-mono text-xs font-bold text-red-600`}>
                            {b.totalCredit > 0 ? b.totalCredit.toFixed(2) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className={`${txnTd} text-right font-mono text-xs font-bold ${isReceivable ? 'text-emerald-700' : 'text-red-600'}`}>
                            {isReceivable ? '' : '−'}{Math.abs(b.net).toFixed(2)}
                          </td>
                          {canWrite && (
                            <td className={`${txnTd} last:rounded-r-2xl text-right`}>
                              {b.net !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => onRecordPayment(b.customerId, Math.abs(b.net))}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:border-accent hover:text-accent transition-all"
                                >
                                  Settle
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[860px]`}>
                <thead>
                  <tr>
                    <th className={txnThSortable} onClick={() => toggleSort('date')}>
                      <span className="inline-flex items-center">Date<SortArrow field="date" /></span>
                    </th>
                    <th className={txnTh}>Type</th>
                    <th className={txnTh}>Counterparty</th>
                    <th className={txnTh}>Description</th>
                    <th className={txnTh}>Currency</th>
                    <th className={txnThSortable} onClick={() => toggleSort('debit')}>
                      <span className="inline-flex items-center justify-end w-full">Debit<SortArrow field="debit" /></span>
                    </th>
                    <th className={txnThSortable} onClick={() => toggleSort('credit')}>
                      <span className="inline-flex items-center justify-end w-full">Credit<SortArrow field="credit" /></span>
                    </th>
                    <th className={txnTh}>Ref</th>
                    {canWrite && <th className={`${txnTh} text-right`}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={canWrite ? 9 : 8} className="px-4 py-12 text-center text-sm text-slate-400">Loading journal…</td></tr>
                  ) : journalRows.length === 0 ? (
                    <tr>
                      <td colSpan={canWrite ? 9 : 8} className="px-4 py-12 text-center">
                        <p className="text-sm font-semibold text-slate-500">
                          {hasFilters ? 'No rows match your filters' : 'No journal entries yet'}
                        </p>
                        {hasFilters && (
                          <button type="button" onClick={clearFilters} className="mt-2 text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-2">
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    journalRows.map(row => (
                      <tr
                        key={`${row.kind}-${row.id}`}
                        className={`group ${row.kind === 'entry' ? 'cursor-pointer' : ''}`}
                        onClick={() => row.entry && onViewEntry(row.entry)}
                        data-interactive-row={row.kind === 'entry' ? true : undefined}
                      >
                        <td className={`${txnTd} first:rounded-l-2xl font-mono text-xs text-slate-600 whitespace-nowrap`}>
                          {row.date}
                        </td>
                        <td className={txnTd}>
                          <span className={badgeClass(row.badgeKind)}>{row.typeLabel}</span>
                        </td>
                        <td className={txnTdFromTo}>{row.counterparty}</td>
                        <td className={`${txnTd} max-w-[200px] truncate text-xs text-slate-600`} title={row.description}>
                          {row.description}
                        </td>
                        <td className={txnTd}>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                            {row.currency}
                          </span>
                        </td>
                        <td className={`${txnTd} text-right font-mono text-xs font-bold`}>
                          {row.debit > 0
                            ? <span className={row.kind === 'expense' ? 'text-red-600' : 'text-slate-900'}>{fmtAmount(row.debit, row.currency)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`${txnTd} text-right font-mono text-xs font-bold text-slate-900`}>
                          {row.credit > 0 ? fmtAmount(row.credit, row.currency) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={txnTd}>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">{row.ref}</span>
                        </td>
                        {canWrite && (
                          <td className={`${txnTd} last:rounded-r-2xl text-right`}>
                            {row.entry && (
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  title="View"
                                  onClick={e => { e.stopPropagation(); onViewEntry(row.entry!); }}
                                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:border-accent hover:text-accent"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={e => { e.stopPropagation(); onDeleteEntry(row.entry!); }}
                                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary bar */}
        {activeTab !== 'entities' && journalRows.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 md:px-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total debit</p>
                <p className="font-mono text-sm font-bold text-slate-900">{totals.debit.toFixed(2)}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total credit</p>
                <p className="font-mono text-sm font-bold text-slate-900">{totals.credit.toFixed(2)}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net movement</p>
                <p className={`font-mono text-sm font-bold ${totals.net >= 0 ? 'text-slate-900' : 'text-amber-700'}`}>
                  {totals.net.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
