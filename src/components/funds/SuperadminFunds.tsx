'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr } from '@/data/mockData';
import { Branch, Transaction } from '@/types';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formSelect,
  formTextarea,
  formHint,
  formError,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
} from '@/lib/ui';
import { useDateFilter } from '@/hooks/useDateFilter';
import DateFilterBar from '@/components/ui/DateFilterBar';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useRouter } from 'next/navigation';

export default function SuperadminFunds() {
  const { branches, transactions, transferFunds, hqBalance, updateHqBalance, showToast } = useApp();
  const router = useRouter();
  
  const [showEditHqBalance, setShowEditHqBalance] = useState(false);
  const [editHqBalanceAmount, setEditHqBalanceAmount] = useState('');
  const [isUpdatingHqBalance, setIsUpdatingHqBalance] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  
  const [branchSearchTerm, setBranchSearchTerm] = useState('');
  const [branchSortField, setBranchSortField] = useState<string>('name');
  const [branchSortDirection, setBranchSortDirection] = useState<'asc' | 'desc'>('asc');

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredTransactions
  } = useDateFilter(transactions);


  const enhancedBranches = React.useMemo(() => {
    return branches.map(b => {
      const branchCapital = b.openingBalance;
      const bCustomerTxns = filteredTransactions.filter(t => t.type === 'customer_account' && (t.to === b.name || t.from === b.name));
      const bTempTxns = filteredTransactions.filter(t => t.type === 'temporary_credit' && (t.to === b.name || t.from === b.name));

      const custBal = bCustomerTxns.reduce((acc, t) => acc + (t.to === b.name ? t.amount : -t.amount), 0);
      const tempBal = bTempTxns.reduce((acc, t) => acc + (t.from === b.name ? t.amount : -t.amount), 0);
      const totalCash = branchCapital + custBal - tempBal;

      return {
        ...b,
        branchCapital,
        customerAccountsBalance: custBal,
        temporaryCreditsBalance: tempBal,
        totalCashInLocker: totalCash,
      };
    });
  }, [branches, filteredTransactions]);

  const globalMetrics = React.useMemo(() => {
    let totalBranchCapital = 0;
    let totalNetDeposits = 0;
    let totalCashInLockers = 0;

    enhancedBranches.forEach(b => {
      totalBranchCapital += b.branchCapital;
      totalNetDeposits += b.customerAccountsBalance;
      totalCashInLockers += b.totalCashInLocker;
    });

    const totalSystemLiquidity = hqBalance + totalCashInLockers;

    return {
      totalBranchCapital,
      totalNetDeposits,
      totalCashInLockers,
      totalSystemLiquidity
    };
  }, [enhancedBranches, hqBalance]);

  const filteredAndSortedBranches = React.useMemo(() => {
    let result = enhancedBranches.filter(b => {
      if (branchSearchTerm.trim()) {
        const query = branchSearchTerm.toLowerCase();
        return (
          b.name.toLowerCase().includes(query) ||
          (b.managerName && b.managerName.toLowerCase().includes(query)) ||
          (b.location && b.location.toLowerCase().includes(query))
        );
      }
      return true;
    });

    result.sort((a, b) => {
      let valA: any, valB: any;
      switch (branchSortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'cash':
          valA = a.totalCashInLocker;
          valB = b.totalCashInLocker;
          break;
        case 'capital':
          valA = a.branchCapital;
          valB = b.branchCapital;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }

      if (valA < valB) return branchSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return branchSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [enhancedBranches, branchSearchTerm, branchSortField, branchSortDirection]);

  const sortOptions = [
    { value: 'name', label: 'Branch Name' },
    { value: 'cash', label: 'Total Cash in Locker' },
    { value: 'capital', label: 'Initial Capital' }
  ];

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Global Fund Management</h2>
          <p className={pageSubtitle}>Monitor capital flow across all branches and HQ</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 sm:mt-0">
          <button 
            type="button" 
            className={`${btnSecondary} w-full sm:w-auto`} 
            onClick={() => {
              setEditHqBalanceAmount(hqBalance.toString());
              setShowEditHqBalance(true);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Treasury
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowTransfer(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Execute Transfer
          </button>
        </div>
      </div>

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <div className={kpiGrid}>
        <KPICard
          label="Total System Liquidity"
          value={formatAED(globalMetrics.totalSystemLiquidity)}
          subValue="HQ Treasury + Branch Lockers"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          }
          color="var(--success)"
          bgColor="var(--success-light)"
        />
        <KPICard
          label="Deployed Capital"
          value={formatAED(globalMetrics.totalBranchCapital)}
          subValue="Allocated to branches"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard
          label="Net Client Capital"
          value={formatAED(globalMetrics.totalNetDeposits)}
          subValue="Total net customer deposits"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
          color={globalMetrics.totalNetDeposits >= 0 ? "var(--purple)" : "var(--warning)"}
          bgColor={globalMetrics.totalNetDeposits >= 0 ? "var(--purple-light)" : "var(--warning-light)"}
        />
        <KPICard
          label="Active Branches"
          value={branches.length}
          subValue="Total operating locations"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
      </div>

      <div className="mt-8 mb-6">
        <div className="flex flex-col gap-3 pb-4 md:border-b md:border-slate-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
            Branches Overview
          </h3>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <div className="relative w-full sm:w-44">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search branches..."
                value={branchSearchTerm}
                onChange={e => setBranchSearchTerm(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm w-full`}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <SearchableSelect
                options={sortOptions}
                value={branchSortField}
                onChange={setBranchSortField}
                className="w-full sm:w-48"
              />
              <button
                type="button"
                onClick={() => setBranchSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
                title={branchSortDirection === 'asc' ? "Ascending" : "Descending"}
              >
                {branchSortDirection === 'asc' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 14-5-5-4 4-3-3"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAndSortedBranches.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No branches found.</div>
        ) : (
          filteredAndSortedBranches.map(b => (
            <div
              key={b.id}
              onClick={() => router.push(`/funds/${b.slug}`)}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] transition-all hover:shadow-md hover:border-accent/30 cursor-pointer active:scale-[0.99] group"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h4 className="text-lg font-bold text-slate-900 group-hover:text-accent transition-colors">{b.name}</h4>
                  <p className="text-xs font-semibold text-slate-500">{b.managerName || 'No Manager'}</p>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-accent group-hover:text-white transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="truncate">{b.location || 'Location not set'}</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cash</span>
                  <span className="font-mono text-[15px] font-bold text-info">{formatAED(b.totalCashInLocker)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Initial Capital</span>
                  <span className="font-mono text-[15px] font-bold text-slate-700">{formatAED(b.branchCapital)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Deposits</span>
                  <span className={`font-mono text-sm font-bold ${b.customerAccountsBalance >= 0 ? 'text-success' : 'text-rose-500'}`}>
                    {b.customerAccountsBalance >= 0 ? '+' : ''}{formatAED(b.customerAccountsBalance)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Temp Credits</span>
                  <span className={`font-mono text-sm font-bold ${b.temporaryCreditsBalance >= 0 ? 'text-warning' : 'text-emerald-500'}`}>
                    {b.temporaryCreditsBalance >= 0 ? '-' : '+'}{formatAED(Math.abs(b.temporaryCreditsBalance))}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={showEditHqBalance}
        onClose={() => setShowEditHqBalance(false)}
        title="Edit Treasury Balance"
        footer={
          <>
            <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={() => setShowEditHqBalance(false)}>
              Cancel
            </button>
            <button 
              type="button" 
              className={`${btnPrimary} w-full sm:w-auto`} 
              disabled={isUpdatingHqBalance}
              onClick={async () => {
                const amt = parseFloat(editHqBalanceAmount);
                if (isNaN(amt) || amt < 0) {
                  showToast('Please enter a valid amount', 'error');
                  return;
                }
                setIsUpdatingHqBalance(true);
                const success = await updateHqBalance(amt);
                setIsUpdatingHqBalance(false);
                if (success) {
                  setShowEditHqBalance(false);
                }
              }}
            >
              {isUpdatingHqBalance ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div className={formGroup}>
          <label className={formLabel}>Treasury Balance (AED)</label>
          <input 
            type="number" 
            className={formInput} 
            value={editHqBalanceAmount}
            onChange={(e) => setEditHqBalanceAmount(e.target.value)}
            placeholder="Enter new treasury balance"
            min="0"
            step="any"
            onKeyDown={(e) => {
              if (e.key === '-' || e.key === 'e') {
                e.preventDefault();
              }
            }}
          />
          <p className={formHint}>
            Changing this value will forcibly adjust the HQ global capital treasury.
          </p>
        </div>
      </Modal>

      <TransferFundsModal
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        branches={branches}
        hqBalance={hqBalance}
        transferFunds={transferFunds}
      />
    </div>
  );
}

function TransferFundsModal({
  open,
  onClose,
  branches,
  hqBalance,
  transferFunds,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  hqBalance: number;
  transferFunds: (fromId: string, toId: string, amount: number, notes: string) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!open) {
      setFrom('');
      setTo('');
      setAmount('');
      setNotes('');
      setError('');
    }
  }, [open]);

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
        <input 
          className={formInput} 
          type="number" 
          placeholder="0.00" 
          value={amount} 
          min="0.01"
          step="any"
          onChange={e => setAmount(e.target.value)} 
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'e') {
              e.preventDefault();
            }
          }}
        />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Reference Notes</label>
        <textarea className={formTextarea} placeholder="Describe the purpose of this transfer..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
      </div>
      {error ? <p className={`${formError} mb-4`}>{error}</p> : null}
    </Modal>
  );
}
