'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, dataTable, formHint, tableWrap } from '@/lib/ui';
import { Branch, Entity, Ledger, Transaction, TransactionTag } from '@/types';
import {
  appendBackupHistory,
  buildTransactionsPageBackup,
  clearBackupHistoryEntry,
  downloadBackupJson,
  readBackupHistory,
  validateTransactionsPageBackup,
  type BackupHistoryEntry,
  type TransactionsPageBackup,
} from '@/lib/transactionsBackup';
import { getDateFilterLabel } from '@/lib/dateFilterRange';
import { restoreTransactionsBackupAction } from '@/app/actions/dbActions';
import { generateId } from '@/data/mockData';
import { formatDateTime } from '@/data/mockData';

type Props = {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  branches: Branch[];
  entities: Entity[];
  ledgers: Ledger[];
  transactionTags: TransactionTag[];
  transactions: Transaction[];
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
  branchId?: string;
  branchFilter: string;
};

export default function TransactionsBackupModal({
  open,
  onClose,
  onRestored,
  showToast,
  branches,
  entities,
  ledgers,
  transactionTags,
  transactions,
  dateFilter,
  customStartDate,
  customEndDate,
  branchId,
  branchFilter,
}: Props) {
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<TransactionsPageBackup | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');

  const dateRangeLabel = getDateFilterLabel(dateFilter, customStartDate, customEndDate);

  const previewBackup = buildTransactionsPageBackup({
    branches,
    entities,
    ledgers,
    transactionTags,
    transactions,
    dateFilter,
    customStartDate,
    customEndDate,
    branchId,
    branchFilter,
  });

  useEffect(() => {
    if (open) {
      setHistory(readBackupHistory());
      setRestoreFile(null);
      setRestoreFileName('');
    }
  }, [open]);

  const handleCreateBackup = useCallback(async () => {
    setIsCreating(true);
    try {
      const backup = buildTransactionsPageBackup({
        branches,
        entities,
        ledgers,
        transactionTags,
        transactions,
        dateFilter,
        customStartDate,
        customEndDate,
        branchId,
        branchFilter,
      });

      if (backup.tables.transactions.length === 0) {
        showToast('No transactions in the current date range to backup.', 'error');
        return;
      }

      const { filename, size } = downloadBackupJson(backup);
      const entry: BackupHistoryEntry = {
        id: generateId('BKP'),
        createdAt: backup.createdAt,
        dateRangeLabel: backup.scope.dateRangeLabel,
        startDate: backup.scope.startDate,
        endDate: backup.scope.endDate,
        branchNames: backup.scope.branchNames,
        transactionCount: backup.counts.transactions,
        filename,
        fileSizeBytes: size,
      };
      setHistory(appendBackupHistory(entry));
      showToast(`Backup saved (${backup.counts.transactions} transactions).`, 'success');
    } finally {
      setIsCreating(false);
    }
  }, [
    branches,
    entities,
    ledgers,
    transactionTags,
    transactions,
    dateFilter,
    customStartDate,
    customEndDate,
    branchId,
    branchFilter,
    showToast,
  ]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!validateTransactionsPageBackup(parsed)) {
        showToast('Invalid backup file. Expected a transactions page backup JSON.', 'error');
        return;
      }
      setRestoreFile(parsed);
      setRestoreFileName(file.name);
    } catch {
      showToast('Could not read backup file.', 'error');
    }
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    const confirmed = window.confirm(
      `Restore ${restoreFile.counts.transactions} transactions for "${restoreFile.scope.dateRangeLabel}"?\n\nThis replaces transactions in that scope. Reference data (entities, ledgers, tags) will be upserted.`,
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const res = await restoreTransactionsBackupAction(restoreFile);
      if (!res.success) {
        showToast(res.error || 'Restore failed.', 'error');
        return;
      }
      showToast('Backup restored successfully.', 'success');
      onRestored();
      onClose();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Backup & Restore"
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={isCreating || previewBackup.counts.transactions === 0}
            onClick={handleCreateBackup}
          >
            {isCreating ? 'Creating…' : 'Download Backup'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <section>
          <h4 className="text-sm font-bold text-slate-900 mb-2">Current scope</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date range</dt>
              <dd className="font-semibold text-slate-800">{dateRangeLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transactions</dt>
              <dd className="font-semibold text-slate-800">{previewBackup.counts.transactions}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included tables</dt>
              <dd className="text-xs text-slate-600 mt-0.5">
                transactions ({previewBackup.counts.transactions}), entities ({previewBackup.counts.entities}),
                ledgers ({previewBackup.counts.ledgers}), tags ({previewBackup.counts.transaction_tags}),
                tag links ({previewBackup.counts.transaction_tag_links})
              </dd>
            </div>
          </dl>
          <p className={formHint + ' mt-3'}>
            Backup JSON includes all reference data needed to restore transactions in this date range.
          </p>
        </section>

        <section>
          <h4 className="text-sm font-bold text-slate-900 mb-3">Restore from file</h4>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className={`${btnSecondary} cursor-pointer w-full sm:w-auto text-center`}>
              Choose backup file
              <input type="file" accept="application/json,.json" className="sr-only" onChange={handleFilePick} />
            </label>
            {restoreFile && (
              <button
                type="button"
                className={`${btnPrimary} w-full sm:w-auto`}
                disabled={isRestoring}
                onClick={handleRestore}
              >
                {isRestoring ? 'Restoring…' : 'Restore backup'}
              </button>
            )}
          </div>
          {restoreFileName && (
            <p className="mt-2 text-xs text-slate-600">
              Selected: <span className="font-mono">{restoreFileName}</span>
              {restoreFile && (
                <span className="text-slate-400"> · {restoreFile.counts.transactions} transactions</span>
              )}
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900">Backup history</h4>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This browser</span>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center rounded-xl border border-dashed border-slate-200">
              No backups created yet on this device.
            </p>
          ) : (
            <div className={tableWrap}>
              <table className={dataTable}>
                <thead>
                  <tr>
                    <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Created</th>
                    <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Range</th>
                    <th className="px-2 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Txns</th>
                    <th className="px-2 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => (
                    <tr key={entry.id}>
                      <td className="border-y border-l border-black/5 bg-white px-2 py-2 text-xs text-slate-600 first:rounded-l-xl">
                        {formatDateTime(entry.createdAt).split(',')[0]}
                      </td>
                      <td className="border-y border-black/5 bg-white px-2 py-2 text-xs text-slate-700">
                        {entry.dateRangeLabel}
                        {entry.branchNames.length > 0 && (
                          <span className="block text-[10px] text-slate-400">{entry.branchNames.join(', ')}</span>
                        )}
                      </td>
                      <td className="border-y border-black/5 bg-white px-2 py-2 text-xs font-mono font-bold text-slate-900">
                        {entry.transactionCount}
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-2 py-2 text-right last:rounded-r-xl">
                        <button
                          type="button"
                          className="text-[10px] font-bold text-red-500 hover:text-red-700"
                          onClick={() => setHistory(clearBackupHistoryEntry(entry.id))}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
