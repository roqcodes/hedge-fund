'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DealTransactionExpense } from '@/types';
import {
  dbAddDealExpensesAction,
  dbFetchDealExpensesAction,
  dbDeleteDealExpenseAction,
} from '@/app/actions/dbActions';

// ─── helpers ────────────────────────────────────────────────────────────────

function nanoid(): string {
  return `dte-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatAED(v: number) {
  return v.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface Row {
  localId: string;     // stable React key
  dbId: string | null; // null = not yet saved
  key: string;
  value: string;       // raw string while editing
  saved: boolean;
}

function makeBlankRow(): Row {
  return { localId: nanoid(), dbId: null, key: '', value: '', saved: false };
}

// ─── main component ──────────────────────────────────────────────────────────

interface ExpensesModalProps {
  open: boolean;
  onClose: () => void;
  dealTransactionId: string;
  /** Human-readable label shown in the header, e.g. "Deal #3" */
  dealLabel: string;
}

export default function ExpensesModal({
  open,
  onClose,
  dealTransactionId,
  dealLabel,
}: ExpensesModalProps) {
  const [rows, setRows] = useState<Row[]>([makeBlankRow()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // ── fetch existing expenses when modal opens ──────────────────────────────
  const fetchExisting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dbFetchDealExpensesAction(dealTransactionId);
      if (res.success && res.data && res.data.length > 0) {
        const loaded: Row[] = res.data.map((e) => ({
          localId: nanoid(),
          dbId: e.id,
          key: e.key,
          value: String(e.value),
          saved: true,
        }));
        setRows([...loaded, makeBlankRow()]);
      } else {
        setRows([makeBlankRow()]);
      }
    } catch {
      setRows([makeBlankRow()]);
    } finally {
      setLoading(false);
    }
  }, [dealTransactionId]);

  useEffect(() => {
    if (open) {
      fetchExisting();
      setSuccess(false);
      setError(null);
    }
  }, [open, fetchExisting]);

  // ── keyboard close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  // ── row ops ───────────────────────────────────────────────────────────────

  const updateRow = (localId: string, field: 'key' | 'value', val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.localId !== localId) return r;
        const updated = { ...r, [field]: val, saved: false };
        return updated;
      })
    );
  };

  const addRow = () => setRows((prev) => [...prev, makeBlankRow()]);

  const removeRow = async (localId: string, dbId: string | null) => {
    if (dbId) {
      // soft-delete from DB
      await dbDeleteDealExpenseAction(dbId);
    }
    setRows((prev) => {
      const next = prev.filter((r) => r.localId !== localId);
      return next.length === 0 ? [makeBlankRow()] : next;
    });
  };

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    setSuccess(false);

    const valid = rows.filter((r) => r.key.trim() !== '' && r.value.trim() !== '');
    if (!valid.length) {
      setError('Please add at least one expense with a label and amount.');
      setSaving(false);
      return;
    }

    const invalidAmount = valid.find((r) => isNaN(parseFloat(r.value)) || parseFloat(r.value) < 0);
    if (invalidAmount) {
      setError(`Invalid amount for "${invalidAmount.key}". Please enter a positive number.`);
      setSaving(false);
      return;
    }

    const payload: DealTransactionExpense[] = valid.map((r) => ({
      id: r.dbId ?? nanoid(),
      dealTransactionId,
      key: r.key.trim(),
      value: parseFloat(r.value),
    }));

    const res = await dbAddDealExpensesAction(payload);
    setSaving(false);

    if (res.success) {
      setSuccess(true);
      // Mark rows as saved and update their dbIds
      setRows((prev) =>
        prev.map((r) => {
          if (r.key.trim() === '' && r.value.trim() === '') return r;
          const saved = payload.find((p) => p.key === r.key.trim() && p.value === parseFloat(r.value));
          return saved ? { ...r, dbId: saved.id, saved: true } : r;
        })
      );
      setTimeout(() => setSuccess(false), 2500);
    } else {
      setError(res.error ?? 'Failed to save expenses.');
    }
  };

  // ── totals ────────────────────────────────────────────────────────────────

  const totalAed = rows.reduce((acc, r) => {
    const v = parseFloat(r.value);
    return acc + (isNaN(v) ? 0 : v);
  }, 0);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-white/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col"
        style={{ maxHeight: '90dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Add Expenses</h2>
              <p className="text-xs text-slate-400">{dealLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex h-24 items-center justify-center text-slate-400 text-sm">
              Loading existing expenses…
            </div>
          ) : (
            <>
              {/* column headers */}
              <div className="mb-2 grid grid-cols-[1fr_140px_36px] gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expense Label</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (AED)</span>
                <span />
              </div>

              <div className="flex flex-col gap-2">
                {rows.map((row, idx) => (
                  <div key={row.localId} className="grid grid-cols-[1fr_140px_36px] gap-2 items-center">
                    {/* key */}
                    <input
                      type="text"
                      placeholder={`e.g. Freight, Insurance…`}
                      value={row.key}
                      onChange={(e) => updateRow(row.localId, 'key', e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 placeholder:text-slate-300 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all"
                    />
                    {/* value */}
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">AED</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.value}
                        onChange={(e) => updateRow(row.localId, 'value', e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-300 focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                    </div>
                    {/* delete */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.localId, row.dbId)}
                      disabled={rows.length === 1 && idx === 0}
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-300 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Remove row"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* add row */}
              <button
                type="button"
                onClick={addRow}
                className="mt-3 flex items-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 transition-all w-full justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Another Expense
              </button>

              {/* total */}
              {totalAed > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                  <span className="text-sm font-bold text-slate-700">Total Expenses</span>
                  <span className="font-mono text-lg font-black text-rose-600">AED {formatAED(totalAed)}</span>
                </div>
              )}

              {/* error / success */}
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs font-semibold text-red-600">{error}</p>
                </div>
              )}
              {success && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-xs font-semibold text-emerald-700">Expenses saved successfully!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── footer ── */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60 transition-all"
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save Expenses
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
