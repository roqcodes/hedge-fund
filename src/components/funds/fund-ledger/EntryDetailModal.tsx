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
import { btnSecondary } from '@/lib/ui';
import {
  DetailSummaryStack,
  DetailSummaryCard,
  DetailSummaryHeader,
  DetailSummarySplit,
  DetailSummaryPanel,
  DetailSummarySectionTitle,
  DetailPill,
  DetailMetricHighlight,
  DetailUsdtMetric,
  DetailCustomerChip,
  DetailSpecCard,
  DetailSpecPanel,
  DetailSpecGrid,
  DetailSpecCell,
  DetailMetaInline,
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
  const pillTone = pending ? 'pending' : isDebit ? 'profit' : 'loss';

  const usdtSecondary =
    wallet.walletCurrency !== 'USDT'
      ? fmtFundAmount(wallet.usdtAmount, 'USDT')
      : wallet.bookAmount != null && wallet.bookCurrency !== 'USDT'
        ? fmtFundAmount(wallet.bookAmount, wallet.bookCurrency)
        : null;

  const dateStr = new Date(entry.entryDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
      <Modal open={open} onClose={onClose} title="Ledger Entry" maxWidth="max-w-xl w-[95vw]">
        <DetailSummaryStack className="space-y-4 pb-2">
          <DetailSummaryCard ariaLabel="Ledger entry summary">
            <DetailSummaryHeader
              badges={<DetailPill tone={pillTone}>{statusLabel}</DetailPill>}
              meta={
                <DetailMetaInline
                  txnId={entry.id.split('-').pop()?.toUpperCase() ?? entry.id}
                  date={dateStr}
                />
              }
            />

            <DetailSummarySplit>
              <DetailSummaryPanel side="left">
                <DetailMetricHighlight
                  label={wallet.walletCurrency !== 'USDT' ? 'Wallet amount' : 'USDT amount'}
                  value={wallet.walletAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  unit={wallet.walletCurrency}
                  valueClassName={pending ? 'text-amber-700' : isDebit ? 'text-emerald-700' : 'text-red-700'}
                />
                {usdtSecondary ? (
                  <p className="mt-3 text-sm font-semibold text-slate-600">≈ {usdtSecondary}</p>
                ) : null}
                {pending && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                    Stored in USDT — not in receivables/payables until converted to {profileCurrency}.
                  </p>
                )}
              </DetailSummaryPanel>

              <DetailSummaryPanel side="right">
                <DetailSummarySectionTitle>Entry details</DetailSummarySectionTitle>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                  <DetailUsdtMetric label="Reference" value={entry.referenceType !== 'manual' ? entry.referenceType.replace(/_/g, ' ') : 'Manual'} />
                  <DetailUsdtMetric label="USDT book" value={fmtFundAmount(wallet.usdtAmount, 'USDT')} />
                  {hasSettlement ? (
                    <DetailUsdtMetric
                      label="Cash moved"
                      value={fmtFundAmount(entry.settlementAmount!, entry.settlementCurrency || 'USDT')}
                    />
                  ) : null}
                </div>
                <DetailCustomerChip
                  initials={(customer?.name ?? entry.customerId ?? '?').slice(0, 2)}
                  label="Entity"
                  name={customer?.name ?? entry.customerId}
                  sub={profileCurrency ? `Profile: ${profileCurrency}` : undefined}
                />
              </DetailSummaryPanel>
            </DetailSummarySplit>
          </DetailSummaryCard>

          {canConvert && (
            <DetailSummaryCard ariaLabel="Convert entry">
              <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                <DetailSummarySectionTitle>Convert to {profileCurrency}</DetailSummarySectionTitle>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
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
            </DetailSummaryCard>
          )}

          <DetailSpecCard ariaLabel="Ledger record info">
            <DetailSpecPanel title="Record info">
              <DetailSpecGrid cols={2}>
                <DetailSpecCell label="Date" value={dateStr} />
                <DetailSpecCell label="Created by" value={entry.createdByName || entry.createdBy || '—'} />
                <DetailSpecCell label="Reference" value={entry.referenceType !== 'manual' ? entry.referenceType.replace(/_/g, ' ') : 'Manual'} />
                <DetailSpecCell label="Ref ID" value={entry.referenceId || '—'} mono />
                {entry.customerCurrencyRate && entry.customerCurrency && entry.customerCurrency !== 'USDT' ? (
                  <DetailSpecCell
                    label="Conversion rate"
                    value={`1 USDT = ${entry.customerCurrencyRate} ${entry.customerCurrency}`}
                    mono
                  />
                ) : null}
              </DetailSpecGrid>
            </DetailSpecPanel>

            {entry.description ? (
              <DetailSpecPanel title="Description" bordered={false}>
                <p className="mt-2 text-sm text-slate-600">{entry.description}</p>
              </DetailSpecPanel>
            ) : null}
          </DetailSpecCard>

          <DetailFooter>
            <div>
              {canWrite && !pending && (
                <DeleteButton onClick={() => void handleDelete()} label="Delete entry" />
              )}
            </div>
            <button type="button" onClick={onClose} className={btnSecondary}>
              Close
            </button>
          </DetailFooter>
        </DetailSummaryStack>
      </Modal>
      <Dialog />
    </>
  );
}
