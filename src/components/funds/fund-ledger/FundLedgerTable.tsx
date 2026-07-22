'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { Expense, FundEntityBalance, FundEntityLedgerEntry, Customer } from '@/types';
import { parseCalendarDate } from '@/lib/businessTime';
import { getEntryUsdtAmount, getEntryCustomerAmount, getEntryWalletDisplay, isPendingLedgerEntry, fmtFundAmount } from '@/lib/fundLedgerCurrency';
import { badgeClass } from '@/lib/badgeClass';
import { isDateInRange, resolveDateFilterRange } from '@/lib/dateFilterRange';
import { btnPrimary, dataTable, formInput, tableWrap } from '@/lib/ui';
import { txnTd, txnTdFromTo, txnTh, txnThSortable } from '@/lib/transactionTableStyles';

export type FundLedgerTab = 'all' | 'entries' | 'expenses' | 'transfers' | 'entities';

type EntitySubTab = 'active' | 'all';

type SortField = 'date' | 'debit' | 'credit';
type SortDir = 'asc' | 'desc';

interface TransferRow {
  id: string;
  date: string;
  fromName: string;
  toName: string;
  fromCustomerId: string;
  toCustomerId: string;
  usdtAmount: number;
  fromWalletAmount: number;
  fromWalletCurrency: string;
  toWalletAmount: number;
  toWalletCurrency: string;
  description: string;
  fromEntry: FundEntityLedgerEntry;
}

interface JournalRow {
  id: string;
  date: string;
  kind: 'entry' | 'expense';
  typeLabel: string;
  badgeKind: string;
  counterparty: string;
  description: string;
  currency: string;
  walletAmount: number;
  walletCurrency: string;
  ledgerUsdt: number;
  bookAmount: number | null;
  bookCurrency: string;
  customerAmount: number | null;
  customerCurrency: string;
  debit: number;
  credit: number;
  ref: string;
  entry?: FundEntityLedgerEntry;
  expense?: Expense;
}

interface FundLedgerTableProps {
  entries: FundEntityLedgerEntry[];
  expenses: Expense[];
  balances: FundEntityBalance[];
  customers: Customer[];
  selectedCustomerId: string | null;
  loading: boolean;
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
  onSelectCustomer: (customerId: string | null) => void;
  onViewEntry: (entry: FundEntityLedgerEntry) => void;
  onDeleteEntry: (entry: FundEntityLedgerEntry) => void;
  onDeleteExpense: (expense: Expense) => void;
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

function DualAmount({
  usdt,
  customerAmount,
  customerCurrency,
}: {
  usdt: number;
  customerAmount?: number | null;
  customerCurrency?: string;
}) {
  if (usdt <= 0) return <span className="text-slate-300">—</span>;
  return (
    <div>
      <div>{fmtFundAmount(usdt, 'USDT')}</div>
      {customerAmount != null && customerCurrency && customerCurrency !== 'USDT' && (
        <div className="text-[10px] font-semibold text-indigo-600">
          {fmtFundAmount(customerAmount, customerCurrency)}
        </div>
      )}
    </div>
  );
}

function WalletAmountCell({
  walletAmount,
  walletCurrency,
  ledgerUsdt,
  bookAmount,
  bookCurrency,
  tone = 'neutral',
}: {
  walletAmount: number;
  walletCurrency: string;
  ledgerUsdt: number;
  bookAmount?: number | null;
  bookCurrency?: string;
  tone?: 'neutral' | 'debit' | 'credit' | 'expense';
}) {
  if (walletAmount <= 0) return <span className="text-slate-300">—</span>;

  const toneClass =
    tone === 'expense' || tone === 'credit' ? 'text-red-600'
      : tone === 'debit' ? 'text-slate-900'
        : 'text-slate-900';

  return (
    <div>
      <div className={`font-mono text-xs font-bold ${toneClass}`}>
        {fmtFundAmount(walletAmount, walletCurrency)}
      </div>
      {walletCurrency === 'USDT' && bookAmount != null && bookCurrency && bookCurrency !== 'USDT' && (
        <p className="text-[10px] font-semibold text-indigo-600">
          = {fmtFundAmount(bookAmount, bookCurrency)}
        </p>
      )}
      {walletCurrency !== 'USDT' && (
        <p className="text-[10px] font-semibold text-slate-400">
          = {fmtFundAmount(ledgerUsdt, 'USDT')}
        </p>
      )}
    </div>
  );
}

function customerEquivalent(usdt: number, netUsdt: number, netCustomer?: number): number | null {
  if (netCustomer == null || Math.abs(netUsdt) < 0.0001) return null;
  return usdt * (Math.abs(netCustomer) / Math.abs(netUsdt));
}

function entryToRow(
  entry: FundEntityLedgerEntry,
  getCustomerName: (id: string) => string,
  getProfileCurrency: (id: string) => string | undefined,
  transferLegsByRef?: Map<string, FundEntityLedgerEntry[]>,
): JournalRow {
  const isDebit = entry.debit > 0;
  const profileCurrency = getProfileCurrency(entry.customerId);
  const pending = isPendingLedgerEntry(entry, profileCurrency);
  const usdtAmt = getEntryUsdtAmount(entry);
  const custAmt = getEntryCustomerAmount(entry);
  const wallet = getEntryWalletDisplay(entry);
  const customerCurrencyLabel = wallet.walletCurrency;

  const baseRow = {
    walletAmount: wallet.walletAmount,
    walletCurrency: wallet.walletCurrency,
    ledgerUsdt: wallet.usdtAmount,
    bookAmount: wallet.bookAmount,
    bookCurrency: wallet.bookCurrency,
    customerAmount: custAmt,
    customerCurrency: customerCurrencyLabel,
    debit: isDebit ? usdtAmt : 0,
    credit: !isDebit ? usdtAmt : 0,
  };

  if (entry.referenceType === 'entity_transfer' && entry.referenceId && transferLegsByRef) {
    const legs = transferLegsByRef.get(entry.referenceId) ?? [];
    const otherLeg = legs.find(l => l.id !== entry.id);
    const isOut = entry.credit > 0;
    const desc = entry.description.replace(/\s*\((out|in)\)\s*$/, '').trim();
    return {
      id: entry.id,
      date: parseCalendarDate(entry.entryDate),
      kind: 'entry',
      typeLabel: isOut ? 'Transfer out' : 'Transfer in',
      badgeKind: isOut ? 'loss' : 'profit',
      counterparty: otherLeg ? getCustomerName(otherLeg.customerId) : 'Entity transfer',
      description: desc || `Transfer ${isOut ? 'to' : 'from'} ${otherLeg ? getCustomerName(otherLeg.customerId) : 'entity'}`,
      currency: customerCurrencyLabel,
      ref: 'entity_transfer',
      entry,
      ...baseRow,
    };
  }

  return {
    id: entry.id,
    date: parseCalendarDate(entry.entryDate),
    kind: 'entry',
    typeLabel: pending ? 'Pending' : isDebit ? 'Receivable' : 'Payable',
    badgeKind: pending ? 'pending' : isDebit ? 'profit' : 'loss',
    counterparty: getCustomerName(entry.customerId),
    description: entry.description,
    currency: customerCurrencyLabel,
    ref: entry.referenceType,
    entry,
    ...baseRow,
  };
}

function expenseToRow(expense: Expense): JournalRow {
  const currency = expense.paymentMethod ?? 'AED';
  return {
    id: expense.id,
    date: parseCalendarDate(expense.date),
    kind: 'expense',
    typeLabel: expense.type.toUpperCase(),
    badgeKind: expense.type,
    counterparty: expense.category,
    description: expense.description,
    currency,
    walletAmount: expense.amount,
    walletCurrency: currency,
    ledgerUsdt: expense.amount,
    bookAmount: null,
    bookCurrency: currency,
    customerAmount: null,
    customerCurrency: currency,
    debit: expense.amount,
    credit: 0,
    ref: 'expense',
    expense,
  };
}

const TABS: { id: FundLedgerTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'entries', label: 'Entries' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'entities', label: 'Entities' },
];

export default function FundLedgerTable({
  entries,
  expenses,
  balances,
  customers,
  selectedCustomerId,
  loading,
  dateFilter,
  customStartDate,
  customEndDate,
  onSelectCustomer,
  onViewEntry,
  onDeleteEntry,
  onDeleteExpense,
  onRecordPayment,
  canWrite,
}: FundLedgerTableProps) {
  const [activeTab, setActiveTab] = useState<FundLedgerTab>('all');
  const [entitySubTab, setEntitySubTab] = useState<EntitySubTab>('active');
  const [search, setSearch] = useState('');
  const [refFilter, setRefFilter] = useState('all');
  const [entitySearch, setEntitySearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const tableRef = useRef<HTMLDivElement>(null);

  const getCustomerName = (cid: string) =>
    customers.find(c => c.id === cid)?.name ?? cid.slice(0, 8);

  const dateRange = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const tabCounts = useMemo(() => {
    const datedEntries = entries.filter(e => isDateInRange(parseCalendarDate(e.entryDate), dateRange));
    const journalEntries = datedEntries.filter(e => e.referenceType !== 'entity_transfer');
    const datedExpenses = expenses.filter(e => isDateInRange(parseCalendarDate(e.date), dateRange));
    const transferIds = new Set(
      datedEntries
        .filter(e => e.referenceType === 'entity_transfer' && e.referenceId)
        .map(e => e.referenceId!),
    );
    return {
      all: journalEntries.length + datedExpenses.length,
      entries: journalEntries.length,
      expenses: datedExpenses.length,
      transfers: transferIds.size,
      entities: balances.length,
    };
  }, [entries, expenses, balances.length, dateRange]);

  const transferRows = useMemo(() => {
    const getName = (id: string) => customers.find(c => c.id === id)?.name ?? id.slice(0, 8);
    const groups = new Map<string, FundEntityLedgerEntry[]>();
    for (const e of entries) {
      if (e.referenceType !== 'entity_transfer' || !e.referenceId) continue;
      const list = groups.get(e.referenceId) ?? [];
      list.push(e);
      groups.set(e.referenceId, list);
    }

    const rows: TransferRow[] = [];
    for (const [refId, legs] of groups) {
      const fromLeg = legs.find(e => e.credit > 0);
      const toLeg = legs.find(e => e.debit > 0);
      if (!fromLeg || !toLeg) continue;

      const date = parseCalendarDate(fromLeg.entryDate);
      if (!isDateInRange(date, dateRange)) continue;

      const desc = fromLeg.description.replace(/\s*\(out\)\s*$/, '');
      const fromWallet = getEntryWalletDisplay(fromLeg);
      const toWallet = getEntryWalletDisplay(toLeg);
      rows.push({
        id: refId,
        date,
        fromName: getName(fromLeg.customerId),
        toName: getName(toLeg.customerId),
        fromCustomerId: fromLeg.customerId,
        toCustomerId: toLeg.customerId,
        usdtAmount: getEntryUsdtAmount(fromLeg),
        fromWalletAmount: fromWallet.walletAmount,
        fromWalletCurrency: fromWallet.walletCurrency,
        toWalletAmount: toWallet.walletAmount,
        toWalletCurrency: toWallet.walletCurrency,
        description: desc,
        fromEntry: fromLeg,
      });
    }

    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter(r =>
          r.fromName.toLowerCase().includes(q) ||
          r.toName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q),
        )
      : rows;

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, customers, dateRange, search]);

  const transferLegsByRef = useMemo(() => {
    const map = new Map<string, FundEntityLedgerEntry[]>();
    for (const e of entries) {
      if (e.referenceType !== 'entity_transfer' || !e.referenceId) continue;
      const list = map.get(e.referenceId) ?? [];
      list.push(e);
      map.set(e.referenceId, list);
    }
    return map;
  }, [entries]);

  const journalRows = useMemo(() => {
    const getName = (id: string) => customers.find(c => c.id === id)?.name ?? id.slice(0, 8);
    const getProfileCurrency = (id: string) => customers.find(c => c.id === id)?.currency;
    let rows: JournalRow[] = [];

    if (activeTab === 'all' || activeTab === 'entries') {
      const filteredEntries = entries.filter(e => {
        if (e.referenceType !== 'entity_transfer') return true;
        return Boolean(selectedCustomerId && e.customerId === selectedCustomerId);
      });
      const scoped = selectedCustomerId
        ? filteredEntries.filter(e => e.customerId === selectedCustomerId)
        : filteredEntries;
      rows = rows.concat(scoped.map(e => entryToRow(e, getName, getProfileCurrency, transferLegsByRef)));
    }
    if (activeTab === 'all' || activeTab === 'expenses') {
      rows = rows.concat(expenses.map(expenseToRow));
    }

    rows = rows.filter(row => {
      if (!isDateInRange(row.date, dateRange)) return false;
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
  }, [activeTab, entries, expenses, selectedCustomerId, customers, dateRange, refFilter, search, sortField, sortDir, transferLegsByRef]);

  const totals = useMemo(() => {
    const entryRows = journalRows.filter(r => r.kind === 'entry');
    const debit = entryRows.reduce((s, r) => s + r.debit, 0);
    const credit = entryRows.reduce((s, r) => s + r.credit, 0);
    return { debit, credit, net: debit - credit };
  }, [journalRows]);

  const filteredEntities = useMemo(() => {
    const balanceMap = new Map(balances.map(b => [b.customerId, b]));
    const allRows: FundEntityBalance[] = customers
      .map(c => {
        const existing = balanceMap.get(c.id);
        if (existing) return existing;
        return {
          customerId: c.id,
          customerName: c.name,
          totalDebit: 0,
          totalCredit: 0,
          net: 0,
          netUsdt: 0,
          netCustomer: 0,
          customerCurrency: c.currency ?? 'AED',
        };
      })
      .sort((a, b) => a.customerName.localeCompare(b.customerName));

    const source = entitySubTab === 'active' ? balances : allRows;
    if (!entitySearch.trim()) return source;
    const q = entitySearch.toLowerCase();
    return source.filter(b => b.customerName.toLowerCase().includes(q));
  }, [balances, customers, entitySearch, entitySubTab]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortArrow = ({ field }: { field: SortField }) =>
    sortField === field ? (
      <span className="ml-1 inline-block text-[9px]">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
    ) : null;

  const hasFilters = search || dateFilter !== 'all-time' || refFilter !== 'all' || selectedCustomerId;

  const clearFilters = () => {
    setSearch('');
    setRefFilter('all');
    onSelectCustomer(null);
  };

  const selectedBalance = selectedCustomerId
    ? balances.find(b => b.customerId === selectedCustomerId)
    : null;

  const selectedCustomer = selectedCustomerId
    ? customers.find(c => c.id === selectedCustomerId)
    : null;

  const settlePrefillAmount = (b: FundEntityBalance) => {
    if (b.netCustomer != null && b.customerCurrency && b.customerCurrency !== 'USDT') {
      return Math.abs(b.netCustomer);
    }
    return Math.abs(b.netUsdt ?? b.net);
  };

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
            {activeTab === 'entities'
              ? 'Entity balances'
              : activeTab === 'transfers'
                ? 'Entity transfers'
                : selectedCustomerId
                  ? 'Entity history'
                  : 'General journal'}
          </h3>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-48">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder={
                  activeTab === 'entities'
                    ? 'Search entities…'
                    : activeTab === 'transfers'
                      ? 'Search transfers…'
                      : 'Search journal…'
                }
                value={activeTab === 'entities' ? entitySearch : search}
                onChange={e => activeTab === 'entities' ? setEntitySearch(e.target.value) : setSearch(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
            {activeTab !== 'entities' && activeTab !== 'transfers' && (
              <>
                <select
                  value={refFilter}
                  onChange={e => setRefFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <option value="all">All refs</option>
                  <option value="manual">Manual</option>
                  <option value="settlement">Settlement</option>
                  <option value="entity_transfer">Transfer</option>
                  <option value="expense">Expense</option>
                </select>
                {(search || refFilter !== 'all' || selectedCustomerId) && (
                  <button type="button" onClick={clearFilters} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Selected entity banner */}
        {activeTab !== 'entities' && activeTab !== 'transfers' && selectedCustomerId && selectedCustomer && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 md:px-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${getAvatarColor(selectedCustomerId)}`}>
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
                {selectedBalance && Math.abs(selectedBalance.net) > 0.0001 ? (
                  <>
                    <p className={`text-xs font-bold font-mono ${selectedBalance.net > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {selectedBalance.net > 0 ? 'Owes ' : 'Owe '}
                      {fmtFundAmount(Math.abs(selectedBalance.netUsdt ?? selectedBalance.net), 'USDT')}
                    </p>
                    {selectedBalance.netCustomer != null && selectedBalance.customerCurrency !== 'USDT' && (
                      <p className="text-xs font-bold font-mono text-indigo-600">
                        = {fmtFundAmount(Math.abs(selectedBalance.netCustomer), selectedBalance.customerCurrency!)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-semibold text-slate-400">No open balance</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canWrite && selectedBalance && selectedBalance.net !== 0 && (
                <button
                  type="button"
                  onClick={() => onRecordPayment(selectedBalance.customerId, settlePrefillAmount(selectedBalance))}
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
            <>
              <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-3 md:px-5">
                {(['active', 'all'] as const).map(sub => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setEntitySubTab(sub)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      entitySubTab === sub
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    {sub === 'active' ? 'Active' : 'All entities'}
                  </button>
                ))}
              </div>
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
                    <tr><td colSpan={canWrite ? 5 : 4} className="px-4 py-12 text-center text-sm text-slate-400">
                      {entitySubTab === 'active' ? 'No entities with balances' : 'No entities found'}
                    </td></tr>
                  ) : (
                    filteredEntities.map(b => {
                      const isReceivable = b.net > 0;
                      const netUsdt = b.netUsdt ?? b.net;
                      const custCurr = b.customerCurrency;
                      const debitCust = customerEquivalent(b.totalDebit, netUsdt, b.netCustomer);
                      const creditCust = customerEquivalent(b.totalCredit, netUsdt, b.netCustomer);
                      const netCust = b.netCustomer != null ? Math.abs(b.netCustomer) : null;
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
                            <DualAmount usdt={b.totalDebit} customerAmount={debitCust} customerCurrency={custCurr} />
                          </td>
                          <td className={`${txnTd} text-right font-mono text-xs font-bold text-red-600`}>
                            <DualAmount usdt={b.totalCredit} customerAmount={creditCust} customerCurrency={custCurr} />
                          </td>
                          <td className={`${txnTd} text-right font-mono text-xs font-bold ${isReceivable ? 'text-emerald-700' : 'text-red-600'}`}>
                            <DualAmount usdt={Math.abs(netUsdt)} customerAmount={netCust} customerCurrency={custCurr} />
                          </td>
                          {canWrite && (
                            <td className={`${txnTd} last:rounded-r-2xl text-right`}>
                              {b.net !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => onRecordPayment(b.customerId, settlePrefillAmount(b))}
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
            </>
          ) : activeTab === 'transfers' ? (
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[760px]`}>
                <thead>
                  <tr>
                    <th className={txnTh}>Date</th>
                    <th className={txnTh}>From → To</th>
                    <th className={txnTh}>Description</th>
                    <th className={`${txnTh} text-right`}>Sent</th>
                    <th className={`${txnTh} text-right`}>Received</th>
                    <th className={txnTh}>Ref</th>
                    {canWrite && <th className={`${txnTh} text-right`}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={canWrite ? 7 : 6} className="px-4 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
                  ) : transferRows.length === 0 ? (
                    <tr><td colSpan={canWrite ? 7 : 6} className="px-4 py-12 text-center text-sm text-slate-400">No entity transfers yet</td></tr>
                  ) : (
                    transferRows.map(row => (
                      <tr key={row.id} className="group">
                        <td className={`${txnTd} first:rounded-l-2xl font-mono text-xs text-slate-600 whitespace-nowrap`}>
                          {row.date}
                        </td>
                        <td className={txnTdFromTo}>
                          <span className="font-semibold text-slate-900">{row.fromName}</span>
                          <span className="mx-1.5 text-slate-300">→</span>
                          <span className="font-semibold text-slate-900">{row.toName}</span>
                        </td>
                        <td className={`${txnTd} max-w-[200px] truncate text-xs text-slate-600`} title={row.description}>
                          {row.description}
                        </td>
                        <td className={`${txnTd} text-right`}>
                          <WalletAmountCell
                            walletAmount={row.fromWalletAmount}
                            walletCurrency={row.fromWalletCurrency}
                            ledgerUsdt={row.usdtAmount}
                            tone="credit"
                          />
                        </td>
                        <td className={`${txnTd} text-right`}>
                          <WalletAmountCell
                            walletAmount={row.toWalletAmount}
                            walletCurrency={row.toWalletCurrency}
                            ledgerUsdt={row.usdtAmount}
                            tone="debit"
                          />
                        </td>
                        <td className={txnTd}>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">{row.id}</span>
                        </td>
                        {canWrite && (
                          <td className={`${txnTd} last:rounded-r-2xl text-right`}>
                            <button
                              type="button"
                              title="Delete transfer"
                              onClick={() => {
                                if (!confirm(`Delete transfer ${row.fromName} → ${row.toName}? Both legs will be removed.`)) return;
                                onDeleteEntry(row.fromEntry);
                              }}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
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
                    <th className={txnTh}>Wallet</th>
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
                            {row.walletCurrency}
                          </span>
                        </td>
                        <td className={`${txnTd} text-right font-mono text-xs font-bold`}>
                          {row.debit > 0 ? (
                            <WalletAmountCell
                              walletAmount={row.walletAmount}
                              walletCurrency={row.walletCurrency}
                              ledgerUsdt={row.ledgerUsdt}
                              bookAmount={row.bookAmount}
                              bookCurrency={row.bookCurrency}
                              tone={row.kind === 'expense' ? 'expense' : 'debit'}
                            />
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`${txnTd} text-right font-mono text-xs font-bold text-slate-900`}>
                          {row.credit > 0 ? (
                            <WalletAmountCell
                              walletAmount={row.walletAmount}
                              walletCurrency={row.walletCurrency}
                              ledgerUsdt={row.ledgerUsdt}
                              bookAmount={row.bookAmount}
                              bookCurrency={row.bookCurrency}
                              tone="credit"
                            />
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className={txnTd}>
                          <span className="text-[10px] font-semibold uppercase text-slate-400">{row.ref}</span>
                        </td>
                        {canWrite && (
                          <td className={`${txnTd} last:rounded-r-2xl text-right`}>
                            {(row.entry || row.expense) && (
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {row.entry && (
                                  <button
                                    type="button"
                                    title="View"
                                    onClick={e => { e.stopPropagation(); onViewEntry(row.entry!); }}
                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:border-accent hover:text-accent"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="Delete"
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (!confirm(`Delete this ${row.kind === 'expense' ? 'expense' : 'entry'}? This cannot be undone.`)) return;
                                    if (row.entry) onDeleteEntry(row.entry);
                                    else if (row.expense) onDeleteExpense(row.expense);
                                  }}
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
        {(activeTab === 'all' || activeTab === 'entries' || activeTab === 'expenses') && journalRows.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 md:px-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total debit</p>
                <p className="font-mono text-sm font-bold text-slate-900">{fmtFundAmount(totals.debit, 'USDT')}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total credit</p>
                <p className="font-mono text-sm font-bold text-slate-900">{fmtFundAmount(totals.credit, 'USDT')}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net movement</p>
                <p className={`font-mono text-sm font-bold ${totals.net >= 0 ? 'text-slate-900' : 'text-amber-700'}`}>
                  {fmtFundAmount(totals.net, 'USDT')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
