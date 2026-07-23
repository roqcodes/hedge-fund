'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  canConvertLedgerEntry,
  getEntryWalletDisplay,
  isPendingLedgerEntry,
  fmtFundAmount,
} from '@/lib/fundLedgerCurrency';
import { getLinkedSourceDeleteMessage, isAutoLinkedLedgerEntry } from '@/lib/fundLedgerDelete';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { DeleteButton } from '@/components/ui/DeleteActions';
import {
  DetailHero,
  DetailBadge,
  DetailSection,
  DetailMetaRow,
  DetailPartyCard,
  DetailFooter,
} from '@/components/ui/DealDetailLayout';
import type { FundEntityLedgerEntry, Customer } from '@/types';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all';

interface EntryDetailModalProps {
  open: boolean;
  entry: FundEntityLedgerEntry | null;
  customers: Customer[];
  onClose: () => void;
  onDelete?: (entry: FundEntityLedgerEntry) => void;
  onConvert?: (entryId: string, rate: number) => Promise<{ success: boolean; error?: string }>;
  canWrite: boolean;
}

export default function EntryDetailModal({
  open,
  entry,
  customers,
  onClose,
  onDelete,
  onConvert,
  canWrite,
}: EntryDetailModalProps) {
  const [rate, setRate] = useState('');
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const { confirm, alert, Dialog } = useConfirmDialog();

  if (!entry) return null;

  const customer = customers.find(c => c.id === entry.customerId);
  const profileCurrency = customer?.currency;
  const isDebit = entry.debit > 0;
  const wallet = getEntryWalletDisplay(entry);
  const pending = isPendingLedgerEntry(entry, profileCurrency);
  const canConvert = canConvertLedgerEntry(entry, profileCurrency) && canWrite && !!onConvert;
  const hasSettlement = entry.referenceType === 'settlement' && entry.settlementAmount != null && entry.settlementAmount > 0;
  const numRate = parseFloat(rate) || 0;
  const convertedPreview = numRate > 0 ? wallet.usdtAmount * numRate : 0;

  const statusLabel = pending ? 'Pending' : isDebit ? 'Receivable' : 'Payable';
  const statusTone = pending ? 'warning' : isDebit ? 'success' : 'danger';
  const heroAccent = pending ? 'amber' : isDebit ? 'emerald' : 'red';

  const walletPrimary = fmtFundAmount(wallet.walletAmount, wallet.walletCurrency);
  const usdtSecondary =
    wallet.walletCurrency !== 'USDT'
      ? fmtFundAmount(wallet.usdtAmount, 'USDT')
      : wallet.bookAmount != null && wallet.bookCurrency !== 'USDT'
        ? fmtFundAmount(wallet.bookAmount, wallet.bookCurrency)
        : null;

  const handleDelete = async () => {
    if (isAutoLinkedLedgerEntry(entry)) {
      await alert({
        title: 'Delete source deal first',
        message: getLinkedSourceDeleteMessage(entry.referenceType) ?? 'Delete the linked deal first.',
      });
      return;
    }
    const ok = await confirm({
      title: 'Delete ledger entry?',
      message: entry.referenceType === 'settlement'
        ? 'This will reverse the branch cash movement and remove the ledger line.'
        : entry.referenceType === 'entity_transfer'
          ? 'This will remove both legs of the entity transfer.'
          : 'This cannot be undone.',
      confirmLabel: 'Delete entry',
    });
    if (ok) onDelete?.(entry);
  };

  const handleConvert = async () => {
    if (!onConvert || numRate <= 0) return;
    setConvertError(null);
    setConverting(true);
    const result = await onConvert(entry.id, numRate);
    setConverting(false);
    if (result.success) {
      setRate('');
      onClose();
    } else {
      setConvertError(result.error ?? 'Conversion failed');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              pending ? 'bg-amber-100 text-amber-600' : isDebit ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
            }`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight text-slate-900">Ledger Entry</p>
              <p className="font-mono text-[10px] leading-tight text-slate-400">{entry.id}</p>
            </div>
          </div>
        }
        maxWidth="max-w-xl w-[95vw]"
      >
        <div className="space-y-5 pb-4">
          <DetailHero
            eyebrow={wallet.walletCurrency !== 'USDT' ? 'Wallet amount' : 'USDT amount'}
            title={walletPrimary}
            subtitle={usdtSecondary ? `≈ ${usdtSecondary}` : undefined}
            badge={<DetailBadge tone={statusTone}>{statusLabel}</DetailBadge>}
            accent={heroAccent}
          />

          <DetailPartyCard
            label="Entity"
            name={customer?.name ?? entry.customerId}
            sub={profileCurrency ? `Profile currency: ${profileCurrency}${pending ? ' · awaiting conversion' : ''}` : undefined}
          />

          {pending && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Stored in USDT — not counted in receivables/payables until converted to {profileCurrency}.
            </div>
          )}

          {canConvert && (
            <DetailSection title={`Convert to ${profileCurrency}`}>
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 space-y-4">
                <p className="text-xs text-slate-600">
                  Enter rate to book in customer currency. After convert, entry joins tally and you can settle in {profileCurrency}.
                </p>
                <div>
                  <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Rate <span className="font-normal normal-case tracking-normal text-slate-400">(1 USDT = ? {profileCurrency})</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    className={inputClass}
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                    placeholder={profileCurrency === 'AED' ? 'e.g. 3.67' : 'Enter rate'}
                  />
                </div>
                {numRate > 0 && (
                  <p className="text-sm font-bold font-mono text-indigo-800">
                    = {fmtFundAmount(convertedPreview, profileCurrency ?? 'AED')}
                  </p>
                )}
                {convertError && (
                  <p className="text-xs font-semibold text-red-600">{convertError}</p>
                )}
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={converting || numRate <= 0}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  {converting ? 'Converting…' : `Convert to ${profileCurrency}`}
                </button>
              </div>
            </DetailSection>
          )}

          {hasSettlement && (
            <DetailSection title="Branch settlement">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">Cash moved</p>
                  <p className="mt-1 font-mono text-xl font-black text-indigo-700">
                    {fmtFundAmount(entry.settlementAmount!, entry.settlementCurrency || 'USDT')}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">Ledger (USDT)</p>
                  <p className="mt-1 font-mono text-xl font-black text-indigo-700">
                    {fmtFundAmount(wallet.usdtAmount, 'USDT')}
                  </p>
                </div>
              </div>
              {entry.customerCurrencyRate && entry.customerCurrency && entry.customerCurrency !== 'USDT' && (
                <p className="mt-3 text-xs font-mono text-indigo-700">
                  1 USDT = {entry.customerCurrencyRate} {entry.customerCurrency}
                </p>
              )}
            </DetailSection>
          )}

          <DetailSection title="Record info">
            <DetailMetaRow
              items={[
                {
                  label: 'Date',
                  value: new Date(entry.entryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                },
                {
                  label: 'Created by',
                  value: entry.createdByName || entry.createdBy || '—',
                },
                {
                  label: 'Reference',
                  value: entry.referenceType !== 'manual' ? entry.referenceType.replace(/_/g, ' ') : 'Manual',
                },
                {
                  label: 'Ref ID',
                  value: entry.referenceId || '—',
                  mono: true,
                },
              ]}
            />
          </DetailSection>

          {entry.description && (
            <DetailSection title="Description">
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {entry.description}
              </p>
            </DetailSection>
          )}

          <DetailFooter>
            <div />
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canWrite && !pending && (
                <DeleteButton onClick={() => void handleDelete()} label="Delete entry" />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </DetailFooter>
        </div>
      </Modal>
      <Dialog />
    </>
  );
}
