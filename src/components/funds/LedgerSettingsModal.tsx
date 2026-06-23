'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formHint,
  formInput,
  formLabel,
  formRow,
} from '@/lib/ui';
import { accountNameUsedInTransactions } from '@/lib/accountTransactions';
import { isGlobalLedger, ledgerScopeLabel } from '@/lib/ledgers';
import type { Ledger, Transaction } from '@/types';
import { generateId } from '@/data/mockData';

type DraftLedger = {
  id: string;
  branchId?: string;
  name: string;
  impact: Ledger['impact'];
  isKpi: boolean;
  kpiInvert: boolean;
  sortOrder: number;
};

type SavedSnapshot = {
  ledgers: Array<{
    id: string;
    name: string;
    impact: Ledger['impact'];
    isKpi: boolean;
    kpiInvert: boolean;
    sortOrder: number;
  }>;
  order: string[];
};

function buildDraftLedgers(ledgers: Ledger[]): DraftLedger[] {
  return [...ledgers]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    .map((l, index) => ({
      id: l.id,
      branchId: l.branchId,
      name: l.name,
      impact: l.impact,
      isKpi: l.isKpi,
      kpiInvert: Boolean(l.kpiInvert),
      sortOrder: index,
    }));
}

function buildSnapshot(draft: DraftLedger[]): SavedSnapshot {
  return {
    order: draft.map(l => l.id),
    ledgers: draft.map((l, index) => ({
      id: l.id,
      name: l.name.trim(),
      impact: l.impact,
      isKpi: l.isKpi,
      kpiInvert: l.isKpi ? l.kpiInvert : false,
      sortOrder: index,
    })),
  };
}

function snapshotsEqual(a: SavedSnapshot, b: SavedSnapshot): boolean {
  if (a.order.join('|') !== b.order.join('|')) return false;
  if (a.ledgers.length !== b.ledgers.length) return false;
  const byId = new Map(b.ledgers.map(l => [l.id, l]));
  return a.ledgers.every(l => {
    const other = byId.get(l.id);
    if (!other) return false;
    return (
      l.name === other.name &&
      l.impact === other.impact &&
      l.isKpi === other.isKpi &&
      l.kpiInvert === other.kpiInvert &&
      l.sortOrder === other.sortOrder
    );
  });
}

const impactOptions: { value: Ledger['impact']; label: string; short: string }[] = [
  { value: 'positive', label: 'Positive', short: '+' },
  { value: 'negative', label: 'Negative', short: '−' },
  { value: 'neutral', label: 'Neutral', short: '○' },
];

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  hint,
  tone = 'accent',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
  tone?: 'accent' | 'amber';
}) {
  const trackOn = tone === 'amber' ? 'bg-amber-500' : 'bg-accent';
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 ${
        disabled ? 'opacity-45' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-slate-800">{label}</p>
        {hint ? <p className="truncate text-[10px] leading-snug text-slate-400">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? trackOn : 'bg-slate-200'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function ImpactPills({
  value,
  onChange,
  disabled = false,
}: {
  value: Ledger['impact'];
  onChange: (impact: Ledger['impact']) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`inline-flex w-full rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      {impactOptions.map(opt => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(opt.value)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all duration-200 ${
            value === opt.value
              ? opt.value === 'positive'
                ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                : opt.value === 'negative'
                  ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-100'
                  : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LedgerCard({
  row,
  index,
  total,
  draft,
  transactions,
  onPatch,
  onMove,
  onDelete,
}: {
  row: DraftLedger;
  index: number;
  total: number;
  draft: DraftLedger[];
  transactions: Transaction[];
  onPatch: (id: string, patch: Partial<DraftLedger>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDelete: (row: DraftLedger) => void;
}) {
  const global = isGlobalLedger(row);
  const nameLocked = accountNameUsedInTransactions(row.name, transactions);
  const canMoveUp = !global && index > 0 && !isGlobalLedger(draft[index - 1]);
  const canMoveDown = !global && index < total - 1 && !isGlobalLedger(draft[index + 1]);

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border transition-shadow duration-200 ${
        global
          ? 'border-indigo-100/80 bg-gradient-to-br from-indigo-50/40 to-white'
          : 'border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_14px_-6px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div className="flex gap-2 p-3 sm:gap-3">
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <span className="flex size-6 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold tabular-nums text-slate-500">
            {index + 1}
          </span>
          {!global ? (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                title="Move up"
                disabled={!canMoveUp}
                onClick={() => onMove(index, -1)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                title="Move down"
                disabled={!canMoveDown}
                onClick={() => onMove(index, 1)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          ) : (
            <span className="px-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-400">Fix</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {global ? (
                <div>
                  <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
                  <p className="text-[11px] text-slate-500">System ledger</p>
                </div>
              ) : (
                <input
                  type="text"
                  className={`${formInput} !py-2 !text-sm${nameLocked ? ' cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                  value={row.name}
                  onChange={e => onPatch(row.id, { name: e.target.value })}
                  disabled={nameLocked}
                  readOnly={nameLocked}
                  title={nameLocked ? 'Name locked — ledger has transactions' : undefined}
                />
              )}
            </div>
            <span
              className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                global ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {ledgerScopeLabel(row)}
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash impact</p>
            {global ? (
              <p className="text-xs font-semibold capitalize text-slate-600">{row.impact}</p>
            ) : (
              <ImpactPills value={row.impact} onChange={impact => onPatch(row.id, { impact })} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {!global ? (
              <ToggleSwitch
                checked={row.isKpi}
                onChange={next => onPatch(row.id, { isKpi: next })}
                label="Show on dashboard"
                hint="Appears in KPI row"
              />
            ) : (
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-700">Dashboard KPI</p>
                  <p className="truncate text-[10px] text-slate-400">{row.isKpi ? 'Visible' : 'Hidden'}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    row.isKpi ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {row.isKpi ? 'On' : 'Off'}
                </span>
              </div>
            )}

            <ToggleSwitch
              checked={row.kpiInvert}
              onChange={next => onPatch(row.id, { kpiInvert: next })}
              disabled={!row.isKpi}
              tone="amber"
              label="Flip display sign"
              hint="Display only · negates KPI value"
            />
          </div>
        </div>

        {!global && (
          <button
            type="button"
            title="Delete ledger"
            onClick={() => onDelete(row)}
            className="flex size-8 shrink-0 items-center justify-center self-start rounded-xl text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

interface LedgerSettingsModalProps {
  open: boolean;
  branchId: string | undefined;
  branchLedgers: Ledger[];
  transactions: Transaction[];
  onClose: () => void;
  onAddLedger: (ledger: Ledger) => Promise<boolean>;
  onUpdateLedger: (ledger: Ledger) => Promise<boolean>;
  onDeleteLedger: (id: string, name: string) => Promise<boolean>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function LedgerSettingsModal({
  open,
  branchId,
  branchLedgers,
  transactions,
  onClose,
  onAddLedger,
  onUpdateLedger,
  onDeleteLedger,
  showToast,
}: LedgerSettingsModalProps) {
  const [draft, setDraft] = useState<DraftLedger[]>([]);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerImpact, setNewLedgerImpact] = useState<Ledger['impact']>('neutral');
  const [newLedgerIsKpi, setNewLedgerIsKpi] = useState(true);

  const resetDraft = useCallback(() => {
    const next = buildDraftLedgers(branchLedgers);
    setDraft(next);
    setSavedSnapshot(buildSnapshot(next));
  }, [branchLedgers]);

  useEffect(() => {
    if (!open) return;
    resetDraft();
    setNewLedgerName('');
    setNewLedgerImpact('neutral');
    setNewLedgerIsKpi(true);
  }, [open, resetDraft]);

  useEffect(() => {
    if (!open || !savedSnapshot) return;
    setDraft(prev => {
      const ids = new Set(prev.map(l => l.id));
      const additions = branchLedgers.filter(l => !ids.has(l.id));
      if (additions.length === 0) return prev;
      return [
        ...prev,
        ...additions.map((l, i) => ({
          id: l.id,
          branchId: l.branchId,
          name: l.name,
          impact: l.impact,
          isKpi: l.isKpi,
          kpiInvert: Boolean(l.kpiInvert),
          sortOrder: prev.length + i,
        })),
      ];
    });
  }, [branchLedgers, open, savedSnapshot]);

  const currentSnapshot = useMemo(() => buildSnapshot(draft), [draft]);
  const isDirty = savedSnapshot ? !snapshotsEqual(currentSnapshot, savedSnapshot) : false;

  const patchLedger = (id: string, patch: Partial<DraftLedger>) => {
    setDraft(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        if (patch.isKpi === false) next.kpiInvert = false;
        return next;
      }),
    );
  };

  const moveLedger = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    if (isGlobalLedger(draft[index]) || isGlobalLedger(draft[target])) return;
    setDraft(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((l, i) => ({ ...l, sortOrder: i }));
    });
  };

  const handleClose = () => {
    if (isDirty && !confirm('Discard unsaved ledger changes?')) return;
    onClose();
  };

  const handleSave = async () => {
    if (!isDirty || !savedSnapshot) return;
    setIsSaving(true);

    const savedById = new Map(savedSnapshot.ledgers.map(l => [l.id, l]));
    let ok = true;

    for (const row of currentSnapshot.ledgers) {
      const prev = savedById.get(row.id);
      if (!prev) continue;
      const source = draft.find(l => l.id === row.id);
      if (!source) continue;

      const changed =
        prev.name !== row.name ||
        prev.impact !== row.impact ||
        prev.isKpi !== row.isKpi ||
        prev.kpiInvert !== row.kpiInvert ||
        prev.sortOrder !== row.sortOrder;

      if (!changed) continue;

      if (isGlobalLedger(source)) {
        const result = await onUpdateLedger({
          id: row.id,
          branchId: source.branchId,
          name: source.name,
          impact: source.impact,
          isKpi: row.isKpi,
          kpiInvert: row.kpiInvert,
          sortOrder: source.sortOrder,
        });
        if (!result) {
          ok = false;
          break;
        }
        continue;
      }

      const nameLocked = accountNameUsedInTransactions(prev.name, transactions);
      if (nameLocked && row.name !== prev.name) {
        showToast(`"${prev.name}" name is locked — it has transactions.`, 'error');
        ok = false;
        break;
      }

      const result = await onUpdateLedger({
        id: row.id,
        branchId: source.branchId,
        name: row.name,
        impact: row.impact,
        isKpi: row.isKpi,
        kpiInvert: row.kpiInvert,
        sortOrder: row.sortOrder,
      });
      if (!result) {
        ok = false;
        break;
      }
    }

    if (ok) {
      setSavedSnapshot(currentSnapshot);
      setDraft(prev =>
        prev.map(l => {
          const row = currentSnapshot.ledgers.find(r => r.id === l.id);
          return row
            ? {
                ...l,
                kpiInvert: row.kpiInvert,
                sortOrder: row.sortOrder,
              }
            : l;
        }),
      );
      showToast('Ledger settings saved.', 'success');
    }

    setIsSaving(false);
  };

  const handleCreate = async () => {
    const name = newLedgerName.trim();
    if (!name || !branchId) return;
    setIsCreating(true);
    const ok = await onAddLedger({
      id: generateId('LDG'),
      branchId,
      name,
      impact: newLedgerImpact,
      isKpi: newLedgerIsKpi,
    });
    if (ok) {
      setNewLedgerName('');
      setNewLedgerImpact('neutral');
      setNewLedgerIsKpi(true);
      showToast(`Ledger "${name}" created.`, 'success');
    }
    setIsCreating(false);
  };

  const handleDelete = async (row: DraftLedger) => {
    if (isGlobalLedger(row)) return;
    if (!confirm(`Delete ledger "${row.name}"? This cannot be undone.`)) return;
    const ok = await onDeleteLedger(row.id, row.name);
    if (ok) {
      setDraft(prev => prev.filter(l => l.id !== row.id).map((l, i) => ({ ...l, sortOrder: i })));
      if (savedSnapshot) {
        setSavedSnapshot(prev => {
          if (!prev) return prev;
          const nextLedgers = prev.ledgers.filter(l => l.id !== row.id);
          const nextOrder = prev.order.filter(id => id !== row.id);
          return { ...prev, ledgers: nextLedgers, order: nextOrder };
        });
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Ledger settings"
      maxWidth="max-w-3xl w-[96vw]"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={handleClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto ${!isDirty || isSaving ? 'opacity-50' : ''}`}
            disabled={!isDirty || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <p className={formHint}>
        Reorder and edit ledgers below. Changes apply when you save — balances always use real values.
      </p>

      <div className={`${formGroup} rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 sm:p-4`}>
        <p className="mb-3 text-xs font-bold text-slate-800">New ledger</p>
        <div className={formRow}>
          <div className="sm:col-span-2">
            <label className={formLabel}>Name</label>
            <input
              type="text"
              className={formInput}
              value={newLedgerName}
              onChange={e => setNewLedgerName(e.target.value)}
              placeholder="Marketing expense"
            />
          </div>
          <div>
            <label className={formLabel}>Impact</label>
            <ImpactPills value={newLedgerImpact} onChange={setNewLedgerImpact} />
          </div>
        </div>
        <div className="mt-3 flex flex-row flex-wrap items-end justify-between gap-3">
          <div className="min-w-[min(100%,220px)] flex-1">
            <ToggleSwitch
              checked={newLedgerIsKpi}
              onChange={setNewLedgerIsKpi}
              label="Show on dashboard"
              hint="Include in KPI row"
            />
          </div>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto`}
            disabled={isCreating || !newLedgerName.trim() || !branchId}
            onClick={handleCreate}
          >
            {isCreating ? 'Creating…' : 'Add ledger'}
          </button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-800">
          {draft.length} ledger{draft.length === 1 ? '' : 's'}
        </p>
        {isDirty && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200/80">
            Unsaved
          </span>
        )}
      </div>

      {draft.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">No ledgers yet.</p>
          <p className="mt-1 text-xs text-slate-400">Add one above to get started.</p>
        </div>
      ) : (
        <div className="max-h-[min(50vh,420px)] space-y-2 overflow-y-auto pr-0.5">
          {draft.map((row, index) => (
            <LedgerCard
              key={row.id}
              row={row}
              index={index}
              total={draft.length}
              draft={draft}
              transactions={transactions}
              onPatch={patchLedger}
              onMove={moveLedger}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
