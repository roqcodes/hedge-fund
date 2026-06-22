'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDateTime } from '@/data/mockData';
import { Branch, Transaction, Deal } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import { TransactionNotesCell } from '@/components/funds/TransactionNotesCell';
import { txnTd, txnTdFromTo, txnTh } from '@/lib/transactionTableStyles';
import { fetchCognitoUsersAction, createCognitoUserAction, updateCognitoUserAttributesAction, CognitoUser } from '@/app/actions/cognitoActions';
import { validatePassword, PasswordRequirements } from '@/components/users/UserModals';
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
  const { branches, selectBranch, selectedBranchId, transactions, addBranch, updateBranch, deleteBranch, showToast, deals, investors } = useApp();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<CognitoUser | null>(null);
  
  const [branchUsers, setBranchUsers] = useState<CognitoUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const branchDeals = React.useMemo(() => {
    if (!selectedBranchId) return [];
    return deals.filter((d: Deal) => 
      d.managingBranchId === selectedBranchId ||
      d.investors.some(di => {
        const inv = investors.find(i => i.id === di.investorId);
        return inv && inv.assignedBranchId === selectedBranchId;
      })
    );
  }, [deals, investors, selectedBranchId]);

  const filteredAndSortedBranches = React.useMemo(() => {
    let result = branches.filter((b: Branch) => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.managerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      let aVal = a[sortField as keyof Branch];
      let bVal = b[sortField as keyof Branch];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
         return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
         return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return result;
  }, [branches, searchTerm, sortField, sortDirection]);

  React.useEffect(() => {
    if (selectedBranchId) {
      setLoadingUsers(true);
      fetchCognitoUsersAction().then(res => {
        if (res.success && res.data) {
          setBranchUsers(res.data.filter(u => u.branchId === selectedBranchId));
        }
        setLoadingUsers(false);
      });
    } else {
      setBranchUsers([]);
    }
  }, [selectedBranchId]);

  const handleAddBranchUser = async (email: string, name: string, passwordRaw: string) => {
    if (!selectedBranchId) return;
    const res = await createCognitoUserAction(email, name, 'branch_manager', selectedBranchId, passwordRaw);
    if (res.success) {
      setBranchUsers([{
        username: email,
        email,
        name,
        role: 'branch_manager',
        branchId: selectedBranchId,
        status: 'CONFIRMED',
        created: new Date().toISOString()
      }, ...branchUsers]);
      showToast('User added successfully to Cognito!');
      setShowAddUser(false);
    } else {
      showToast(res.error || 'Failed to add user', 'error');
    }
  };

  const handleEditBranchUser = async (email: string, newName: string) => {
    const res = await updateCognitoUserAttributesAction(email, newName);
    if (res.success) {
      setBranchUsers(prev => prev.map(u => u.email === email ? { ...u, name: newName } : u));
      showToast('User updated successfully!');
      setEditingUser(null);
    } else {
      showToast(res.error || 'Failed to update user', 'error');
    }
  };

  const totalBalance = branches.reduce((acc: number, b: Branch) => acc + b.currentBalance, 0);
  const totalPL = branches.reduce((acc: number, b: Branch) => acc + b.dailyPL, 0);
  const activeCount = branches.filter((b: Branch) => b.status === 'active').length;
  const avgEfficiency = 94.2;

  if (selectedBranchId) {
    const b = branches.find((br: Branch) => br.id === selectedBranchId);
    if (!b) return null;
    const branchTxns = transactions.filter((t: Transaction) => t.from === b.name || t.to === b.name).slice(0, 8);
    const branchSlug = b.slug;
    const branchUrl = typeof window !== 'undefined' ? `${window.location.origin}/${branchSlug}` : `/${branchSlug}`;

    return (
      <>
        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="mb-5 flex flex-col items-start justify-between border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end gap-4">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <button
                  onClick={() => selectBranch(null)}
                  className="group flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Back to Branches"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className={pageTitle}>{b.name}</h2>
                <span className={badgeClass(b.status)}>{b.status.toUpperCase()}</span>
              </div>
              <p className={pageSubtitle}>
                {b.location} · Managed by {b.managerName}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5 border border-slate-200/60 shadow-sm w-full sm:w-auto">
              <div className="px-3 py-1.5 text-xs font-mono text-slate-500 truncate max-w-[200px] sm:max-w-xs select-all">
                {branchUrl}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(branchUrl);
                    showToast('Branch URL copied to clipboard');
                  }}
                  className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition-all hover:text-accent hover:shadow-md border border-slate-200/80"
                  title="Copy Link"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <a
                  href={`/${branchSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition-all hover:text-accent hover:shadow-md border border-slate-200/80"
                  title="Open in New Tab"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
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
              value={formatAED(b.dailyPL, true)}
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

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="pb-4 px-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:px-8 sm:py-6">
            <h3 className="text-lg font-extrabold text-slate-900">Recent Transactions</h3>
            </div>
            <div className="p-0">
              <div className={tableWrap}>
                <table className={`${dataTable} hidden md:table`}>
                  <thead>
                    <tr>
                      <th className={txnTh}>Date</th>
                      <th className={txnTh}>From</th>
                      <th className={txnTh}>To</th>
                      <th className={txnTh}>Notes</th>
                      <th className={txnTh}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchTxns.map((t: Transaction) => (
                      <tr key={t.id} data-interactive-row>
                        <td className="border-y border-l border-black/5 bg-white px-2 py-2.5 text-xs first:rounded-l-2xl sm:text-sm">
                          {formatDateTime(t.date)}
                        </td>
                        <td className={`${txnTdFromTo} first:rounded-none`}>{t.from}</td>
                        <td className={txnTdFromTo}>{t.to}</td>
                        <td className={txnTd}>
                          <TransactionNotesCell transaction={t} />
                        </td>
                        <td className={`${txnTd} border-r font-mono text-sm font-bold last:rounded-r-2xl sm:text-base`}>
                          {formatAED(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile View */}
                <div className="flex md:hidden flex-col gap-4 py-4">
                  {branchTxns.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-500">No recent transactions.</div>
                  ) : branchTxns.map((t: Transaction) => (
                    <div key={t.id} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{formatDateTime(t.date)}</span>
                      </div>
                      <TransactionNotesCell transaction={t} className="max-w-none" />
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</span>
                          <span className="text-sm font-medium text-slate-900">{t.from} &rarr; {t.to}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount</span>
                          <span className="font-mono text-sm font-bold text-slate-900">{formatAED(t.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        {/* Groups & Deals Section */}
        <div className="mt-8 md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="pb-4 px-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:px-8 sm:py-6">
            <h3 className="text-lg font-extrabold text-slate-900">Groups & Deals</h3>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} hidden md:table`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Name</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Capital</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchDeals.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-sm text-slate-500">No deals found for this branch.</td></tr>
                  ) : branchDeals.map((d: Deal) => (
                    <tr key={d.id} data-interactive-row onClick={() => router.push(`/group/${d.id}`)} className="cursor-pointer">
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-slate-900 first:rounded-l-2xl sm:px-5 sm:py-4">
                        {d.name}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(d.status)}>{d.status}</span>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(d.amount)}
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                        <button type="button" className={`${btnGhost} ${btnSm} !font-bold`}>
                          View Details &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile View */}
              <div className="flex md:hidden flex-col gap-4 py-4">
                {branchDeals.length === 0 ? (
                  <div className="text-center py-4 text-sm text-slate-500">No deals found.</div>
                ) : branchDeals.map((d: Deal) => (
                  <div key={d.id} onClick={() => router.push(`/group/${d.id}`)} className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{d.name}</span>
                      <span className={badgeClass(d.status)}>{d.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capital</span>
                        <span className="font-mono text-sm font-bold text-slate-900">{formatAED(d.amount)}</span>
                      </div>
                      <button type="button" className="text-xs font-bold text-accent hover:text-accent-hover flex items-center gap-1">
                        View &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-1 pb-4 px-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-extrabold text-slate-900">Branch Users</h3>
              <button onClick={() => setShowAddUser(true)} className={`${btnPrimary} ${btnSm}`}>
                Add User
              </button>
            </div>
            <div className="p-0">
              <div className={tableWrap}>
                <table className={`${dataTable} hidden md:table`}>
                  <thead>
                    <tr>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Name & Email</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Role</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Created</th>
                      <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr><td colSpan={5} className="text-center py-4 text-sm text-slate-500">Loading users...</td></tr>
                    ) : branchUsers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4 text-sm text-slate-500">No users found for this branch.</td></tr>
                    ) : branchUsers.map(u => (
                      <tr key={u.email} data-interactive-row>
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 first:rounded-l-2xl sm:px-5 sm:py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{u.name}</span>
                            <span className="text-xs text-slate-500">{u.email}</span>
                          </div>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4">
                          <span className={badgeClass(u.role === 'branch_manager' ? 'active' : 'pending')}>{u.role}</span>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                          <span className={badgeClass(u.status === 'CONFIRMED' ? 'completed' : 'processing')}>{u.status}</span>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                          {formatDateTime(u.created)}
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                          <button type="button" className={`${btnGhost} ${btnSm} !font-bold`} onClick={() => setEditingUser(u)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Mobile View */}
                <div className="flex md:hidden flex-col gap-4 py-4">
                  {loadingUsers ? (
                    <div className="text-center py-4 text-sm text-slate-500">Loading users...</div>
                  ) : branchUsers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-500">No users found for this branch.</div>
                  ) : branchUsers.map(u => (
                    <div key={u.email} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={badgeClass(u.role === 'branch_manager' ? 'active' : 'pending')}>{u.role}</span>
                          <span className={badgeClass(u.status === 'CONFIRMED' ? 'completed' : 'processing')}>{u.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                        <span className="text-xs text-slate-500">Created: {formatDateTime(u.created)}</span>
                        <button type="button" className={`${btnGhost} ${btnSm} !font-bold`} onClick={() => setEditingUser(u)}>
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <CreateBranchUserModal 
          open={showAddUser} 
          onClose={() => setShowAddUser(false)} 
          onAdd={handleAddBranchUser}
          branchName={b.name}
        />
        {editingUser && (
          <EditBranchUserModal
            open={!!editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleEditBranchUser}
            user={editingUser}
          />
        )}
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
            value={formatAED(totalPL, true)}
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

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-bold text-slate-900">Branch Directory</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm`}
                />
              </div>
              <div className="flex md:hidden items-center gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className={`${formInput} !py-2 !text-sm flex-1 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
                >
                  <option value="name">Sort by: Name</option>
                  <option value="location">Sort by: Location</option>
                  <option value="managerName">Sort by: Manager</option>
                  <option value="currentBalance">Sort by: Balance</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex size-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[800px] hidden md:table`}>
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
                  {filteredAndSortedBranches.map((b: Branch) => (
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
                        <div className="flex items-center gap-2">
                          <button type="button" className={`${btnGhost} ${btnSm} !font-bold`} onClick={(e) => { e.stopPropagation(); selectBranch(b.id); }}>
                            Manage
                          </button>
                          <button type="button" className="text-slate-400 hover:text-accent transition-colors" title="Edit Branch" onClick={(e) => { e.stopPropagation(); setEditingBranch(b); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button type="button" className="text-slate-400 hover:text-red-500 transition-colors" title="Delete Branch" onClick={async (e) => { e.stopPropagation(); if(window.confirm('Are you sure you want to delete this branch?')) { await deleteBranch(b.id); } }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile View */}
              <div className="flex md:hidden flex-col gap-4 py-4">
                {filteredAndSortedBranches.map((b: Branch) => (
                  <div 
                    key={b.id} 
                    onClick={() => selectBranch(b.id)}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 uppercase">{b.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 border-y border-slate-50 py-4 mt-1">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Capital</span>
                        <span className="font-mono text-sm font-bold text-slate-900">{formatAED(b.currentBalance)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</span>
                        <span className="font-mono text-sm font-bold text-emerald-600">{b.location}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manager</span>
                        <span className="font-mono text-sm font-bold text-slate-900">{b.managerName}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Activity</span>
                        <span className="font-mono text-sm font-bold text-slate-900">{formatDateTime(b.lastActivity)}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button type="button" className="text-slate-400 hover:text-accent transition-colors" title="Edit Branch" onClick={(e) => { e.stopPropagation(); setEditingBranch(b); }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" className="text-slate-400 hover:text-red-500 transition-colors" title="Delete Branch" onClick={async (e) => { e.stopPropagation(); if(window.confirm('Are you sure you want to delete this branch?')) { await deleteBranch(b.id); } }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                      <button 
                        type="button" 
                        className="text-xs font-bold text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
                      >
                        Manage Branch &rarr;
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAndSortedBranches.length === 0 && (
                  <div className="text-center py-8 text-sm text-slate-500">
                    No branches found matching your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <CreateBranchModal open={showCreate} onClose={() => setShowCreate(false)} addBranch={addBranch} />
      {editingBranch && (
        <EditBranchModal open={!!editingBranch} onClose={() => setEditingBranch(null)} updateBranch={updateBranch} branch={editingBranch} />
      )}
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
  addBranch: (b: Omit<Branch, 'id' | 'status' | 'lastActivity' | 'createdAt' | 'closingBalance' | 'dailyPL' | 'cashBalance' | 'goldBalance' | 'currentBalance' | 'timezone'> & { openingBalance: number; timezone?: string }, slug: string) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [capital, setCapital] = useState('');

  const handleSubmit = () => {
    if (!name || !slug || !location || !manager || !capital) return;
    addBranch({
      name,
      slug,
      location,
      managerName: manager,
      openingBalance: Number(capital),
      openingGoldBalance: 0,
    }, slug);
    setName('');
    setSlug('');
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
        <input className={formInput} placeholder="e.g. Fujairah West" value={name} onChange={e => {
          setName(e.target.value);
          if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, -1)) {
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
          }
        }} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Branch Slug (URL)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-mono bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">/</span>
          <input className={formInput} placeholder="e.g. fujairah-west" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
        </div>
        <p className={formHint}>This will be the URL for the branch portal.</p>
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

function EditBranchModal({
  open,
  onClose,
  updateBranch,
  branch,
}: {
  open: boolean;
  onClose: () => void;
  updateBranch: (b: Branch, slug: string) => Promise<boolean>;
  branch: Branch;
}) {
  const [name, setName] = useState(branch.name);
  const [slug, setSlug] = useState(branch.slug);
  const [location, setLocation] = useState(branch.location);
  const [manager, setManager] = useState(branch.managerName);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setName(branch.name);
    setSlug(branch.slug);
    setLocation(branch.location);
    setManager(branch.managerName);
  }, [branch]);

  const handleSubmit = async () => {
    if (!name || !slug || !location || !manager) return;
    setLoading(true);
    await updateBranch({
      ...branch,
      slug,
      name,
      location,
      managerName: manager,
    }, slug);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Branch"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Branch Name</label>
        <input className={formInput} placeholder="e.g. Fujairah West" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Branch Slug (URL)</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-mono bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">/</span>
          <input className={formInput} placeholder="e.g. fujairah-west" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} disabled={loading} />
        </div>
      </div>

      <div className={formGroup}>
        <label className={formLabel}>Location</label>
        <input className={formInput} placeholder="e.g. Fujairah, UAE" value={location} onChange={e => setLocation(e.target.value)} disabled={loading} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Manager Name</label>
        <input className={formInput} placeholder="e.g. Hassan Al Marzouqi" value={manager} onChange={e => setManager(e.target.value)} disabled={loading} />
      </div>
    </Modal>
  );
}

function CreateBranchUserModal({
  open,
  onClose,
  onAdd,
  branchName
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (email: string, name: string, passwordRaw: string) => Promise<void>;
  branchName: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !name || !validatePassword(password).isValid) return;
    setLoading(true);
    await onAdd(email, name, password);
    setLoading(false);
    setEmail('');
    setName('');
    setPassword('');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add Manager to ${branchName}`}
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit} disabled={loading || !validatePassword(password).isValid}>
            {loading ? 'Adding...' : 'Create User'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Email / Username</label>
        <input className={formInput} placeholder="e.g. manager@aibak.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Full Name</label>
        <input className={formInput} placeholder="e.g. Ahmed Ali" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Permanent Password</label>
        <input type="password" className={formInput} placeholder="Enter secure password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
        <PasswordRequirements pw={password} />
      </div>
    </Modal>
  );
}

function EditBranchUserModal({
  open,
  onClose,
  onSave,
  user
}: {
  open: boolean;
  onClose: () => void;
  onSave: (email: string, newName: string) => Promise<void>;
  user: CognitoUser;
}) {
  const [name, setName] = useState(user.name);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onSave(user.email, name);
    setLoading(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Branch Manager"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Email / Username</label>
        <input className={formInput} value={user.email} disabled={true} />
        <p className={formHint}>Emails cannot be changed once created.</p>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Full Name</label>
        <input className={formInput} value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
    </Modal>
  );
}

