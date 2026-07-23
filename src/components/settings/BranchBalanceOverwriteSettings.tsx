'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { overwriteBranchCashBalancesAction } from '@/app/actions/branchActions';
import { getBranchUsdtBalanceAction } from '@/app/actions/usdtActions';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useApp } from '@/context/AppContext';
import { btnDangerOutline, btnDangerSolid, btnSecondary, formInput } from '@/lib/ui';

function fmt(n: number, decimals = 4) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

interface Props {
  branchId: string;
  branchSlug: string;
}

export default function BranchBalanceOverwriteSettings({ branchId, branchSlug }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/60 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-red-900">Critical: Cash balance override</h3>
              <p className="mt-1 text-sm text-red-800/80">
                Directly overwrite USDT, AED, and IDR wallet balances. For data corrections only — does not adjust transaction history.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`${btnDangerOutline} shrink-0 rounded-xl px-4 py-2.5 text-xs sm:w-auto w-full`}
          >
            Override balances…
          </button>
        </div>
      </div>

      <BranchBalanceOverwriteModal
        open={open}
        branchId={branchId}
        branchSlug={branchSlug}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function BranchBalanceOverwriteModal({
  open,
  branchId,
  branchSlug,
  onClose,
}: {
  open: boolean;
  branchId: string;
  branchSlug: string;
  onClose: () => void;
}) {
  const { refetchData } = useApp();
  const { confirm, alert, setLoading, Dialog } = useConfirmDialog();

  const [loading, setLocalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<{ usdt: number; aed: number; idr: number } | null>(null);
  const [usdt, setUsdt] = useState('');
  const [aed, setAed] = useState('');
  const [idr, setIdr] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const loadBalances = useCallback(async () => {
    setLocalLoading(true);
    const bal = await getBranchUsdtBalanceAction(branchId);
    if (bal) {
      const next = { usdt: bal.availableFund, aed: bal.aedBalance, idr: bal.idrBalance };
      setCurrent(next);
      setUsdt(String(next.usdt));
      setAed(String(next.aed));
      setIdr(String(next.idr));
    } else {
      setCurrent({ usdt: 0, aed: 0, idr: 0 });
      setUsdt('0');
      setAed('0');
      setIdr('0');
    }
    setLocalLoading(false);
  }, [branchId]);

  useEffect(() => {
    if (!open) return;
    setConfirmText('');
    void loadBalances();
  }, [open, loadBalances]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'OVERWRITE') {
      await alert({
        title: 'Confirmation required',
        message: 'Type OVERWRITE in the confirmation field to proceed.',
      });
      return;
    }

    const usdtVal = parseFloat(usdt);
    const aedVal = parseFloat(aed);
    const idrVal = parseFloat(idr);
    if (![usdtVal, aedVal, idrVal].every(Number.isFinite)) {
      await alert({ title: 'Invalid values', message: 'Enter valid numbers for all three balances.' });
      return;
    }

    const ok = await confirm({
      title: 'Overwrite branch cash balances?',
      message:
        'This replaces USDT, AED, and IDR wallet balances immediately. It does not replay or adjust past transactions. Use only for corrections.',
      confirmLabel: 'Overwrite balances',
      variant: 'danger',
    });
    if (!ok) return;

    setSaving(true);
    setLoading(true);
    const res = await overwriteBranchCashBalancesAction(
      branchId,
      { usdt: usdtVal, aed: aedVal, idr: idrVal },
      branchSlug,
    );
    setLoading(false);
    setSaving(false);

    if (res.success) {
      if (refetchData) await refetchData();
      onClose();
      await alert({
        title: 'Balances updated',
        message: `USDT ${fmt(res.data.usdt)} · AED ${fmt(res.data.aed, 2)} · IDR ${fmt(res.data.idr, 0)}`,
      });
    } else {
      await alert({ title: 'Overwrite failed', message: res.error ?? 'Could not update balances.' });
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight text-slate-900">Cash balance override</p>
              <p className="text-[10px] font-medium leading-tight text-red-600">Critical action — use with caution</p>
            </div>
          </div>
        }
        maxWidth="max-w-xl w-[95vw]"
        footer={
          <>
            <button type="button" onClick={handleClose} disabled={saving} className={btnSecondary}>
              Cancel
            </button>
            <button
              type="submit"
              form="branch-balance-overwrite-form"
              disabled={saving || loading || confirmText.trim().toUpperCase() !== 'OVERWRITE'}
              className={`${btnDangerSolid} rounded-xl`}
            >
              {saving ? 'Overwriting…' : 'Overwrite balances'}
            </button>
          </>
        }
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading current balances…</p>
        ) : (
          <form id="branch-balance-overwrite-form" onSubmit={e => void handleSubmit(e)} className="space-y-5">
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
              This directly sets wallet balances. Past deals and ledger entries are not changed.
            </p>

            {current && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current USDT</p>
                  <p className="mt-0.5 font-mono text-base font-black text-slate-900">{fmt(current.usdt)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current AED</p>
                  <p className="mt-0.5 font-mono text-base font-black text-slate-900">{fmt(current.aed, 2)}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current IDR</p>
                  <p className="mt-0.5 font-mono text-base font-black text-slate-900">{fmt(current.idr, 0)}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  New USDT balance
                </label>
                <input
                  type="number"
                  step="any"
                  className={formInput}
                  value={usdt}
                  onChange={e => setUsdt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  New AED balance
                </label>
                <input
                  type="number"
                  step="any"
                  className={formInput}
                  value={aed}
                  onChange={e => setAed(e.target.value)}
                  required
                />
                <p className="mt-1 text-[10px] text-slate-500">Also updates branch current &amp; cash balance.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  New IDR balance
                </label>
                <input
                  type="number"
                  step="any"
                  className={formInput}
                  value={idr}
                  onChange={e => setIdr(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-red-700">
                Type OVERWRITE to confirm
              </label>
              <input
                type="text"
                className={`${formInput} border-red-200 focus:border-red-500 focus:ring-red-500/20`}
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="OVERWRITE"
                autoComplete="off"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void loadBalances()}
                disabled={saving}
                className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:opacity-50"
              >
                Reset to current values
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Dialog />
    </>
  );
}
