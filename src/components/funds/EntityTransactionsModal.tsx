'use client';

import React, { useMemo, useState } from 'react';
import { Branch, Entity, Transaction } from '@/types';
import { formatAED, formatAEDStr, formatDateTime } from '@/data/mockData';
import { btnSecondary } from '@/lib/ui';
import { getTransactionTagNames } from '@/lib/transactionTags';
import { TransactionNotesCell } from '@/components/funds/TransactionNotesCell';
import { TransactionTagsCell } from '@/components/funds/TransactionTagsCell';
import LedgerTabSummaryBar from '@/components/funds/LedgerTabSummaryBar';
import { txnModalFromTo, txnModalTd, txnModalTh } from '@/lib/transactionTableStyles';
import {
  CUSTOMER_ACCOUNTS_NAME,
  TEMPORARY_CREDITS_NAME,
  computeEntityLedgerTabTotals,
  entityInvolvesLedger,
  entityLedgerHintClass,
  entityLedgerInAmount,
  entityLedgerOutAmount,
  getEntityLedgerHint,
  isEntityReceivedAmount,
  isEntitySentAmount,
  type EntityLedgerTabTotals,
} from '@/lib/ledgers';

type EntityTab = 'all' | 'temporary-credits' | 'customer-accounts';

type Props = {
  entity: Entity;
  transactions: Transaction[];
  onClose: () => void;
  isBranchView: boolean;
  branches: Branch[];
  setEditingTxn: (txn: Transaction | null) => void;
  setDeletingTxn: (txn: Transaction | null) => void;
  /** When set, per-row edit/delete follows daily-ledger lock rules. */
  canEditTxn?: (txn: Transaction) => boolean;
  writeBlockedReason?: string;
};

function formatTxnAmount(t: Transaction) {
  return t.assetType === 'gold' ? `${t.amount.toFixed(2)}g` : formatAED(t.amount);
}

function AllTabSummary({
  tcTotals,
  caTotals,
  hasTc,
  hasCa,
}: {
  tcTotals: EntityLedgerTabTotals;
  caTotals: EntityLedgerTabTotals;
  hasTc: boolean;
  hasCa: boolean;
}) {
  if (!hasTc && !hasCa) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ledger summary</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {hasTc && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <p className="mb-2 text-xs font-bold text-amber-900">Temperory Credits</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">{tcTotals.outLabel}</span>
                <p className="font-mono font-bold text-slate-900">{formatAEDStr(tcTotals.outTotal)}</p>
              </div>
              <div>
                <span className="text-slate-500">{tcTotals.inLabel}</span>
                <p className="font-mono font-bold text-slate-900">{formatAEDStr(tcTotals.inTotal)}</p>
              </div>
              <div className="col-span-2 border-t border-amber-100 pt-2">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {tcTotals.netLabel}
                  <span
                    className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500"
                    title={tcTotals.netHint}
                    aria-label={tcTotals.netHint}
                  >
                    i
                  </span>
                </span>
                <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(tcTotals.net)}</p>
              </div>
            </div>
          </div>
        )}
        {hasCa && (
          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
            <p className="mb-2 text-xs font-bold text-sky-900">Customer Accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">{caTotals.outLabel}</span>
                <p className="font-mono font-bold text-slate-900">{formatAEDStr(caTotals.outTotal)}</p>
              </div>
              <div>
                <span className="text-slate-500">{caTotals.inLabel}</span>
                <p className="font-mono font-bold text-slate-900">{formatAEDStr(caTotals.inTotal)}</p>
              </div>
              <div className="col-span-2 border-t border-sky-100 pt-2">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {caTotals.netLabel}
                  <span
                    className="inline-flex size-3.5 cursor-help items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-500"
                    title={caTotals.netHint}
                    aria-label={caTotals.netHint}
                  >
                    i
                  </span>
                </span>
                <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(caTotals.net)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EntityTransactionsModal({
  entity,
  transactions,
  onClose,
  isBranchView,
  branches,
  setEditingTxn,
  setDeletingTxn,
  canEditTxn,
  writeBlockedReason,
}: Props) {
  const [activeTab, setActiveTab] = useState<EntityTab>('all');

  const entityTxns = useMemo(
    () =>
      transactions
        .filter(t => t.from === entity.name || t.to === entity.name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, entity.name],
  );

  const tcTxns = useMemo(
    () => entityTxns.filter(t => entityInvolvesLedger(t, entity.name, TEMPORARY_CREDITS_NAME)),
    [entityTxns, entity.name],
  );

  const caTxns = useMemo(
    () => entityTxns.filter(t => entityInvolvesLedger(t, entity.name, CUSTOMER_ACCOUNTS_NAME)),
    [entityTxns, entity.name],
  );

  const tcTotals = useMemo(
    () => computeEntityLedgerTabTotals(tcTxns, entity.name, TEMPORARY_CREDITS_NAME),
    [tcTxns, entity.name],
  );

  const caTotals = useMemo(
    () => computeEntityLedgerTabTotals(caTxns, entity.name, CUSTOMER_ACCOUNTS_NAME),
    [caTxns, entity.name],
  );

  const displayedTxns =
    activeTab === 'temporary-credits' ? tcTxns : activeTab === 'customer-accounts' ? caTxns : entityTxns;

  const isLedgerTab = activeTab !== 'all';
  const ledgerName =
    activeTab === 'temporary-credits' ? TEMPORARY_CREDITS_NAME : CUSTOMER_ACCOUNTS_NAME;
  const ledgerTotals = activeTab === 'temporary-credits' ? tcTotals : caTotals;

  const outColLabel = isLedgerTab ? ledgerTotals.outLabel : 'Sent';
  const inColLabel = isLedgerTab ? ledgerTotals.inLabel : 'Received';

  const tabs: { id: EntityTab; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: entityTxns.length },
    { id: 'temporary-credits', label: 'Temperory Credits', count: tcTxns.length },
    { id: 'customer-accounts', label: 'Customer Accounts', count: caTxns.length },
  ];

  const showActionsColumn = isBranchView && branches.length === 1;
  const isTxnEditable = (t: Transaction) =>
    showActionsColumn && (canEditTxn ? canEditTxn(t) : true);
  const colSpan = showActionsColumn ? 9 : 8;

  const renderOutCell = (t: Transaction) => {
    if (isLedgerTab) {
      const amt = entityLedgerOutAmount(t, entity.name, ledgerName);
      if (amt == null) return <span className="text-slate-300">—</span>;
      return (
        <div className="flex flex-col gap-1">
          <span>{formatTxnAmount(t)}</span>
          {(() => {
            const hint = getEntityLedgerHint(t, entity.name);
            return hint ? (
              <span
                className={`inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${entityLedgerHintClass(hint.tone)}`}
              >
                {hint.label}
              </span>
            ) : null;
          })()}
        </div>
      );
    }
    if (!isEntitySentAmount(t, entity.name)) return <span className="text-slate-300">—</span>;
    return (
      <div className="flex flex-col gap-1">
        <span>{formatTxnAmount(t)}</span>
        {(() => {
          const hint = getEntityLedgerHint(t, entity.name);
          return hint ? (
            <span
              className={`inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${entityLedgerHintClass(hint.tone)}`}
            >
              {hint.label}
            </span>
          ) : null;
        })()}
      </div>
    );
  };

  const renderInCell = (t: Transaction) => {
    if (isLedgerTab) {
      const amt = entityLedgerInAmount(t, entity.name, ledgerName);
      if (amt == null) return <span className="text-slate-300">—</span>;
      return (
        <div className="flex flex-col gap-1">
          <span>{formatTxnAmount(t)}</span>
          {(() => {
            const hint = getEntityLedgerHint(t, entity.name);
            return hint ? (
              <span
                className={`inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${entityLedgerHintClass(hint.tone)}`}
              >
                {hint.label}
              </span>
            ) : null;
          })()}
        </div>
      );
    }
    if (!isEntityReceivedAmount(t, entity.name)) return <span className="text-slate-300">—</span>;
    return (
      <div className="flex flex-col gap-1">
        <span>{formatTxnAmount(t)}</span>
        {(() => {
          const hint = getEntityLedgerHint(t, entity.name);
          return hint ? (
            <span
              className={`inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${entityLedgerHintClass(hint.tone)}`}
            >
              {hint.label}
            </span>
          ) : null;
        })()}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-white/30 backdrop-blur-sm transition-[opacity,visibility] duration-300 ease-out sm:items-center sm:p-4 visible opacity-100"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="flex max-h-[min(90dvh,100%)] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-modal transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-h-[90vh] sm:rounded-[1.75rem] translate-y-0 scale-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h3 id="modal-title" className="text-base font-bold text-slate-900">
              {entity.name} — Transactions History
            </h3>
            <button
              type="button"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-base text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 ${activeTab === tab.id ? 'text-slate-300' : 'text-slate-400'}`}>
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className={txnModalTh}>Date &amp; Time</th>
                  <th className={txnModalTh}>From</th>
                  <th className={txnModalTh}>To</th>
                  <th className={txnModalTh}>Notes</th>
                  <th className={txnModalTh}>{outColLabel}</th>
                  <th className={txnModalTh}>{inColLabel}</th>
                  <th className={txnModalTh}>Tags</th>
                  {showActionsColumn && <th className={`${txnModalTh} text-right`}>Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {displayedTxns.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="py-8 text-center text-slate-400">
                      No transactions in this tab.
                    </td>
                  </tr>
                ) : (
                  displayedTxns.map(t => (
                    <tr key={t.id} className="transition-colors hover:bg-slate-50">
                      <td className={`${txnModalTd} text-[11px] leading-tight text-slate-600`}>
                        {formatDateTime(t.date).split(',').map((part, i) => (
                          <div key={i} className={i === 0 ? 'font-semibold text-slate-900' : 'mt-0.5'}>
                            {part.trim()}
                          </div>
                        ))}
                      </td>
                      <td className={txnModalFromTo}>{t.from}</td>
                      <td className={txnModalFromTo}>{t.to}</td>
                      <td className={txnModalTd}>
                        <TransactionNotesCell transaction={t} />
                      </td>
                      <td className={`${txnModalTd} font-mono font-bold text-slate-900`}>{renderOutCell(t)}</td>
                      <td className={`${txnModalTd} font-mono font-bold text-slate-900`}>{renderInCell(t)}</td>
                      <td className={txnModalTd}>
                        <TransactionTagsCell transaction={t} />
                      </td>
                      {showActionsColumn && (
                        <td className={`${txnModalTd} text-right`}>
                          {isTxnEditable(t) ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Edit transaction"
                              onClick={() => {
                                onClose();
                                setEditingTxn({ ...t });
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Delete transaction"
                              onClick={() => {
                                onClose();
                                setDeletingTxn(t);
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
                          </div>
                          ) : (
                            <span
                              className="block text-right text-[10px] font-semibold text-slate-400"
                              title={writeBlockedReason}
                            >
                              {writeBlockedReason ? 'Read only' : 'Locked'}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {displayedTxns.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">No transactions in this tab.</div>
            ) : (
              displayedTxns.map(t => (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800">
                      {formatDateTime(t.date).split(',')[0]}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(t.date).split(',')[1]?.trim()}
                    </span>
                  </div>
                  <TransactionNotesCell transaction={t} className="max-w-none" />
                  {getTransactionTagNames(t).length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tags</span>
                      <TransactionTagsCell transaction={t} />
                    </div>
                  )}
                  <div className="border-y border-slate-50 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-slate-800">
                      {t.from} → {t.to}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{outColLabel}</span>
                      <div className="font-mono text-xs font-bold text-slate-900">{renderOutCell(t)}</div>
                    </div>
                    <div className="flex flex-col gap-0.5 items-end text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{inColLabel}</span>
                      <div className="font-mono text-xs font-bold text-slate-900">{renderInCell(t)}</div>
                    </div>
                  </div>
                  {showActionsColumn && (
                    <div className="flex justify-end gap-1.5">
                      {isTxnEditable(t) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setEditingTxn({ ...t });
                            }}
                            className="rounded border border-slate-200 p-1 text-xs text-slate-500 hover:border-accent hover:text-accent"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setDeletingTxn(t);
                            }}
                            className="rounded border border-slate-200 p-1 text-xs text-slate-500 hover:border-red-400 hover:text-red-600"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {writeBlockedReason ? 'Read only' : 'Locked'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {activeTab === 'all' && (
            <AllTabSummary
              tcTotals={tcTotals}
              caTotals={caTotals}
              hasTc={tcTxns.length > 0}
              hasCa={caTxns.length > 0}
            />
          )}
          {isLedgerTab && displayedTxns.length > 0 && <LedgerTabSummaryBar totals={ledgerTotals} />}
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end border-t border-slate-100 bg-slate-50/90 p-4">
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
