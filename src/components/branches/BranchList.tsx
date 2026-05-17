'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { Branch, Transaction } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  btnSm,
  formGroup,
  formInput,
  formLabel,
  formHint,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function BranchList() {
  const { branches, selectBranch, selectedBranchId, transactions, addBranch } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  const totalBalance = branches.reduce((acc: number, b: Branch) => acc + b.currentBalance, 0);
  const totalPL = branches.reduce((acc: number, b: Branch) => acc + b.dailyPL, 0);
  const activeCount = branches.filter((b: Branch) => b.status === 'active').length;
  const avgEfficiency = 94.2;

  if (selectedBranchId) {
    const b = branches.find((br: Branch) => br.id === selectedBranchId);
    if (!b) return null;
    const branchTxns = transactions.filter((t: Transaction) => t.from === b.name || t.to === b.name).slice(0, 8);
    return (
      <>
        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-surface-xs transition hover:bg-slate-50 sm:w-auto"
              onClick={() => selectBranch(null)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M19 12H5m0 0l7-7m-7 7l7 7" />
              </svg>
              Back to Branches
            </button>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{b.name}</h2>
              <p className={pageSubtitle}>
                {b.location} · Managed by {b.managerName}
              </p>
            </div>
          </div>

          <div className={kpiGrid}>
            <KPICard
              label="Opening Balance"
              value={formatAED(b.openingBalance)}
              subValue="Initial capital"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
                </svg>
              }
              color="var(--info)"
              bgColor="var(--info-light)"
            />
            <KPICard
              label="Daily P&L"
              value={`${b.dailyPL >= 0 ? '+' : ''}${formatAED(b.dailyPL)}`}
              trend={{ value: `${((b.dailyPL / b.openingBalance) * 100).toFixed(1)}%`, isUp: b.dailyPL >= 0 }}
              subValue="Today's performance"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M23 6l-9.5 9.5-5-5L1 18m22-12h-6m6 0v6" />
                </svg>
              }
              color={b.dailyPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
              bgColor={b.dailyPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
            />
            <KPICard
              label="Current Balance"
              value={formatAED(b.currentBalance)}
              subValue="Total liquid capital"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              }
              color="var(--accent)"
              bgColor="var(--accent-light)"
            />
            <KPICard
              label="End Day projection"
              value={formatAED(b.closingBalance)}
              subValue="Est. final balance"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h7m9-7l-3 3-1-1m4-5v3m-4-3l-4 4" />
                </svg>
              }
              color="var(--purple)"
              bgColor="var(--purple-light)"
            />
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
              <h3 className="text-lg font-extrabold text-slate-900">Recent Transactions</h3>
            </div>
            <div className="p-0">
              <div className={tableWrap}>
                <table className={dataTable}>
                  <thead>
                    <tr>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Date</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">From</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">To</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Amount</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchTxns.map((t: Transaction) => (
                      <tr key={t.id} data-interactive-row>
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                          {formatDateTime(t.date)}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4">{t.from}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4">{t.to}</td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                          {formatAED(t.amount)}
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                          <span className={badgeClass(t.type)}>{t.type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Branch Management</h2>
            <p className={pageSubtitle}>{branches.length} entities in the global branch ledger</p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)} id="btn-create-branch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Create Branch
          </button>
        </div>

        <div className={kpiGrid}>
          <KPICard
            label="Total Network Capital"
            value={formatAED(totalBalance)}
            subValue="Consolidated balance"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Combined P&L"
            value={`${totalPL >= 0 ? '+' : ''}${formatAED(totalPL)}`}
            trend={{ value: '12.4%', isUp: totalPL >= 0 }}
            subValue="All branches performance"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M23 6l-9.5 9.5-5-5L1 18m22-12h-6m6 0v6" />
              </svg>
            }
            color={totalPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
            bgColor={totalPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
          />
          <KPICard
            label="Active Branches"
            value={activeCount}
            subValue="Operating units"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
              </svg>
            }
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <KPICard
            label="Network Efficiency"
            value={`${avgEfficiency}%`}
            subValue="Operating at scale"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-bold text-slate-900">Branch Directory</h3>
            <span className="text-xs font-semibold text-slate-400">{branches.length} TOTAL</span>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[800px]`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Location</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Manager</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Balance</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Last Activity</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b: Branch) => (
                    <tr key={b.id} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-slate-900 first:rounded-l-2xl sm:px-5 sm:py-4">
                        {b.name}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-[13px] text-slate-600 sm:px-5 sm:py-4">{b.location}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4">{b.managerName}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(b.currentBalance)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">{formatDateTime(b.lastActivity)}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass('active')}>Active</span>
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                        <button type="button" className={`${btnGhost} ${btnSm} !font-bold`} onClick={() => selectBranch(b.id)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <CreateBranchModal open={showCreate} onClose={() => setShowCreate(false)} addBranch={addBranch} />
    </>
  );
}

function CreateBranchModal({
  open,
  onClose,
  addBranch,
}: {
  open: boolean;
  onClose: () => void;
  addBranch: (b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance'> & { openingBalance: number }) => void;
}) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [capital, setCapital] = useState('');

  const handleSubmit = () => {
    if (!name || !location || !manager || !capital) return;
    addBranch({
      name,
      location,
      managerName: manager,
      openingBalance: Number(capital),
    });
    setName('');
    setLocation('');
    setManager('');
    setCapital('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create New Branch"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit}>
            Create & Allocate
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Branch Name</label>
        <input className={formInput} placeholder="e.g. Fujairah West" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Location</label>
        <input className={formInput} placeholder="e.g. Fujairah, UAE" value={location} onChange={e => setLocation(e.target.value)} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Manager Name</label>
        <input className={formInput} placeholder="e.g. Hassan Al Marzouqi" value={manager} onChange={e => setManager(e.target.value)} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Initial Capital (AED)</label>
        <input className={formInput} type="number" placeholder="e.g. 250000" value={capital} onChange={e => setCapital(e.target.value)} />
        <p className={formHint}>This amount will be allocated from HQ Treasury</p>
      </div>
    </Modal>
  );
}
