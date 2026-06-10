'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr, formatDateTime } from '@/data/mockData';
import { Branch, Transaction } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  filterSelect,
  formSelect,
  formTextarea,
  formHint,
  formError,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function FundManagement() {
  const { branches, transactions, transferFunds, hqBalance, isBranchView } = useApp();
  const [showTransfer, setShowTransfer] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const totalVolume = transactions.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  const transferCount = transactions.filter((t: Transaction) => t.type === 'transfer').length;
  const pendingCount = transactions.filter((t: Transaction) => t.status === 'pending').length;

  const filteredTxns = transactions.filter((t: Transaction) => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (branchFilter !== 'all' && t.from !== branchFilter && t.to !== branchFilter) return false;
    return true;
  });

  const typeFilters: { value: string; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'expense', label: 'Expense' },
    { value: 'profit', label: 'Profit' },
    { value: 'allocation', label: 'Allocation' },
  ];

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Fund Management</h2>
            <p className={pageSubtitle}>Monitor capital flow and execute strategic transfers</p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowTransfer(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Execute Transfer
          </button>
        </div>

        <div className={kpiGrid}>
          {isBranchView && branches.length === 1 ? (
            <KPICard
              label="Branch Balance"
              value={formatAED(branches[0].currentBalance)}
              subValue="Current liquid funds"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
                </svg>
              }
              color="var(--accent)"
              bgColor="var(--accent-light)"
            />
          ) : (
            <KPICard
              label="HQ Treasury Balance"
              value={formatAED(hqBalance)}
              subValue="Available for allocation"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
                </svg>
              }
              color="var(--accent)"
              bgColor="var(--accent-light)"
            />
          )}
          <KPICard
            label="Total Fund Volume"
            value={formatAED(totalVolume)}
            subValue="Total transaction throughput"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <KPICard
            label="Inter-branch Transfers"
            value={transferCount}
            subValue="Internal liquidity moves"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Pending Approvals"
            value={pendingCount}
            subValue="Awaiting verification"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
            color="var(--action)"
            bgColor="var(--action-light)"
          />
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">Transaction History</h3>
            <div className="flex w-full min-w-0 flex-row flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <select
                className={`${filterSelect} min-w-0 flex-1 sm:w-44 sm:flex-none`}
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                {typeFilters.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                className={`${filterSelect} min-w-0 flex-1 sm:w-44 sm:flex-none`}
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
              >
                <option value="all">All Branches</option>
                {branches.map((b: Branch) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[900px]`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Date & Time</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">From</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">To</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Amount</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Type</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((t: Transaction) => (
                    <tr key={t.id} data-interactive-row>
                      <td className="whitespace-nowrap border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                        {formatDateTime(t.date)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4">{t.from}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4">{t.to}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(t.amount)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(t.type)}>{t.type.toUpperCase()}</span>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(t.status)}>{t.status.toUpperCase()}</span>
                      </td>
                      <td className="max-w-[250px] border-y border-r border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 last:rounded-r-2xl sm:px-5 sm:py-4 sm:text-sm">
                        <span className="block truncate">{t.notes}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <TransferFundsModal
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        branches={branches}
        hqBalance={hqBalance}
        transferFunds={transferFunds}
        isBranchView={isBranchView}
      />
    </>
  );
}

function TransferFundsModal({
  open,
  onClose,
  branches,
  hqBalance,
  transferFunds,
  isBranchView,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  hqBalance: number;
  transferFunds: (fromId: string, toId: string, amount: number, notes: string) => void;
  isBranchView?: boolean;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (open && isBranchView && branches.length === 1) {
      setFrom(branches[0].id);
    } else if (!open) {
      setFrom('');
    }
  }, [open, isBranchView, branches]);

  const fromBranch = branches.find((b: Branch) => b.id === from);
  const isHqTransfer = from === 'HQ_TREASURY';
  const availableBalance = isHqTransfer ? hqBalance : fromBranch?.currentBalance || 0;

  const handleSubmit = () => {
    setError('');
    if (!from || !to || !amount) {
      setError('All fields are required');
      return;
    }
    if (from === to) {
      setError('Cannot transfer to the same branch');
      return;
    }
    const amt = Number(amount);
    if (amt > availableBalance) {
      setError(`Insufficient balance. Available: ${formatAEDStr(availableBalance)}`);
      return;
    }
    if (amt <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    transferFunds(from, to, amt, notes);
    setFrom('');
    setTo('');
    setAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Execute Capital Movement"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit}>
            Confirm Transfer
          </button>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Source Account</label>
          {isBranchView ? (
            <input className={formInput} value={branches[0]?.name || ''} disabled />
          ) : (
            <select className={formSelect} value={from} onChange={e => setFrom(e.target.value)}>
              <option value="">Select source</option>
              <optgroup label="Central Treasury">
                <option value="HQ_TREASURY">HQ Treasury — {formatAEDStr(hqBalance)}</option>
              </optgroup>
              <optgroup label="Branch Balances">
                {branches.map((b: Branch) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
          {from ? <p className={formHint}>Available: {formatAED(availableBalance)}</p> : null}
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Recipient Branch</label>
          <select className={formSelect} value={to} onChange={e => setTo(e.target.value)}>
            <option value="">Select destination</option>
            {branches
              .filter((b: Branch) => b.id !== from)
              .map((b: Branch) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Amount (AED)</label>
        <input className={formInput} type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Reference Notes</label>
        <textarea className={formTextarea} placeholder="Describe the purpose of this transfer..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>
      {error ? <p className={`${formError} mb-4`}>{error}</p> : null}
    </Modal>
  );
}
