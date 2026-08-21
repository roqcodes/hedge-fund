'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listICFundAccountsAction,
  updateICFundAccountAction,
} from '@/app/actions/icFundsActions';
import ICFundAccountModal from '@/components/ic-funds/ICFundAccountModal';
import {
  icfBtnGhost,
  icfBtnPrimary,
  icfCard,
  icfInput,
  icfLabel,
  icfTableWrap,
  icfTd,
  icfTh,
} from '@/components/ic-funds/ui';
import { accountTypeLabel } from '@/lib/icFunds/constants';
import { resolveAccountDetailHref } from '@/lib/icFunds/accountNavigation';
import { fmtICAmount } from '@/lib/icFunds/format';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useApp } from '@/context/AppContext';
import type { ICFundAccount } from '@/types';

type SortField = 'name' | 'accountType' | 'phone' | 'email' | 'openingBalance' | 'balance' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AccountsScreen({ branchId }: { branchId: string }) {
  const { showToast, currentSlug } = useApp();
  const { canWrite, buttonProps } = useWriteAccess();
  const router = useRouter();

  const [accounts, setAccounts] = useState<ICFundAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ICFundAccount | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts(await listICFundAccountsAction(branchId));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleEdit = (account: ICFundAccount) => {
    if (!canWrite) return;
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const toggleStatus = async (account: ICFundAccount) => {
    if (!canWrite) return;
    const result = await updateICFundAccountAction({
      branchId,
      id: account.id,
      status: account.status === 'active' ? 'inactive' : 'active',
    });
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast(account.status === 'active' ? 'Account deactivated' : 'Account activated', 'success');
    await load();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleSave = () => {
    const wasEdit = Boolean(editingAccount);
    void load();
    handleModalClose();
    showToast(wasEdit ? 'Account updated' : 'Account created', 'success');
  };

  const openAccountDetail = (account: ICFundAccount) => {
    if (!currentSlug) return;
    router.push(resolveAccountDetailHref(currentSlug, account));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortMark = (field: SortField) => (sortField === field ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : '');

  const filteredAndSorted = useMemo(() => {
    let result = [...accounts];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          (a.phone && a.phone.includes(q)) ||
          (a.email && a.email.toLowerCase().includes(q)) ||
          (a.notes && a.notes.toLowerCase().includes(q)),
      );
    }

    if (filterStatus) {
      result = result.filter(a => a.status === filterStatus);
    }

    if (filterType) {
      result = result.filter(a => a.accountType === filterType);
    }

    result.sort((a, b) => {
      let valA: string | number = a[sortField] ?? '';
      let valB: string | number = b[sortField] ?? '';

      if (sortField === 'balance' || sortField === 'openingBalance') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (sortField === 'accountType') {
        valA = accountTypeLabel(a.accountType).toLowerCase();
        valB = accountTypeLabel(b.accountType).toLowerCase();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [accounts, searchTerm, filterStatus, filterType, sortField, sortDirection]);

  return (
    <>
      <div className={icfCard}>
        <div className="border-b border-slate-200 px-3 pt-2">
          <div className="flex flex-wrap items-end gap-2 pb-2">
            <div className="min-w-[10rem] flex-1">
              <label className={icfLabel} htmlFor="icf-accounts-search">
                Find
              </label>
              <input
                id="icf-accounts-search"
                className={icfInput}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Name, phone, email, notes"
              />
            </div>
            <div className="w-full sm:w-36">
              <label className={icfLabel} htmlFor="icf-accounts-type">
                Type
              </label>
              <select
                id="icf-accounts-type"
                className={icfInput}
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="">All types</option>
                <option value="bank">Bank</option>
                <option value="personal">Personal</option>
                <option value="income">Income</option>
                <option value="profit">Profit</option>
                <option value="expense">Expense</option>
                <option value="d_expense">D-Expense</option>
              </select>
            </div>
            <div className="w-full sm:w-32">
              <label className={icfLabel} htmlFor="icf-accounts-status">
                Status
              </label>
              <select
                id="icf-accounts-status"
                className={icfInput}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <span className="pb-1 text-[11px] text-slate-500">{filteredAndSorted.length} accounts</span>
            <div className="w-full sm:w-auto sm:pb-0">
              <button
                type="button"
                className={`${icfBtnPrimary} w-full sm:w-auto`}
                {...buttonProps()}
                onClick={() => {
                  if (!canWrite) return;
                  setEditingAccount(null);
                  setIsModalOpen(true);
                }}
              >
                New account
              </button>
            </div>
          </div>
        </div>

        <div className={icfTableWrap}>
          <table className="w-full min-w-[880px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={`${icfTh} cursor-pointer select-none`} onClick={() => handleSort('name')}>
                  Name{sortMark('name')}
                </th>
                <th className={`${icfTh} cursor-pointer select-none`} onClick={() => handleSort('accountType')}>
                  Type{sortMark('accountType')}
                </th>
                <th className={`${icfTh} cursor-pointer select-none`} onClick={() => handleSort('phone')}>
                  Phone{sortMark('phone')}
                </th>
                <th className={`${icfTh} cursor-pointer select-none`} onClick={() => handleSort('email')}>
                  Email{sortMark('email')}
                </th>
                <th
                  className={`${icfTh} cursor-pointer select-none text-right`}
                  onClick={() => handleSort('openingBalance')}
                >
                  Opening{sortMark('openingBalance')}
                </th>
                <th className={`${icfTh} cursor-pointer select-none text-right`} onClick={() => handleSort('balance')}>
                  Balance{sortMark('balance')}
                </th>
                <th className={`${icfTh} cursor-pointer select-none`} onClick={() => handleSort('status')}>
                  Status{sortMark('status')}
                </th>
                <th className={icfTh} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={`${icfTd} py-6 text-center text-slate-500`}>
                    Loading…
                  </td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className={`${icfTd} py-6 text-center text-slate-500`}>
                    {accounts.length === 0 ? 'No accounts yet.' : 'No rows match the filters.'}
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map(account => (
                  <tr
                    key={account.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => openAccountDetail(account)}
                  >
                    <td className={`${icfTd} font-medium text-sky-700 hover:underline`}>{account.name}</td>
                    <td className={`${icfTd} text-slate-500`}>{accountTypeLabel(account.accountType)}</td>
                    <td className={`${icfTd} text-slate-500`}>{account.phone || '—'}</td>
                    <td className={`${icfTd} max-w-[12rem] truncate text-slate-500`}>{account.email || '—'}</td>
                    <td className={`${icfTd} text-right font-mono tabular-nums`}>
                      {fmtICAmount(account.openingBalance)}
                    </td>
                    <td
                      className={`${icfTd} text-right font-mono tabular-nums ${account.balance < 0 ? 'text-red-600' : ''}`}
                    >
                      {fmtICAmount(account.balance)}
                    </td>
                    <td className={`${icfTd} capitalize text-slate-500`}>{account.status}</td>
                    <td className={`${icfTd} text-right`} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canWrite ? (
                          <>
                            <button type="button" className={icfBtnGhost} onClick={() => handleEdit(account)}>
                              Edit
                            </button>
                            <button type="button" className={icfBtnGhost} onClick={() => void toggleStatus(account)}>
                              {account.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <ICFundAccountModal
          branchId={branchId}
          open={isModalOpen}
          account={editingAccount}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      ) : null}
    </>
  );
}
