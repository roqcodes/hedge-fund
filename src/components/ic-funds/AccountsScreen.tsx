'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  createICFundAccountAction,
  listICFundAccountsAction,
  seedICFundStarterAccountsAction,
  updateICFundAccountAction,
} from '@/app/actions/icFundsActions';
import { IC_FUND_ACCOUNT_TYPE_OPTIONS, accountTypeLabel } from '@/lib/icFunds/constants';
import { fmtICAmount } from '@/lib/icFunds/format';
import { icfBtnGhost, icfBtnOutline, icfBtnPrimary, icfCard, icfInput, icfLabel, icfTableWrap, icfTd, icfTh } from '@/components/ic-funds/ui';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useApp } from '@/context/AppContext';
import type { ICFundAccount } from '@/types';
import type { ICFundAccountType } from '@/lib/icFunds/constants';

export default function AccountsScreen({ branchId }: { branchId: string }) {
  const { showToast } = useApp();
  const { canWrite, buttonProps } = useWriteAccess();
  const [accounts, setAccounts] = useState<ICFundAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<ICFundAccountType>('personal');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleCreate = async () => {
    setSaving(true);
    const result = await createICFundAccountAction({
      branchId,
      name,
      accountType,
      openingBalance: Number(openingBalance) || 0,
      notes,
    });
    setSaving(false);
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Account created', 'success');
    setName('');
    setNotes('');
    setOpeningBalance('0');
    await load();
  };

  const handleSeed = async () => {
    const result = await seedICFundStarterAccountsAction(branchId);
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast(
      result.data.created === 0 ? 'Starter tills already exist' : `Created ${result.data.created} bank tills`,
      'success',
    );
    await load();
  };

  const toggleStatus = async (account: ICFundAccount) => {
    const result = await updateICFundAccountAction({
      branchId,
      id: account.id,
      status: account.status === 'active' ? 'inactive' : 'active',
    });
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    await load();
  };

  return (
    <div className={icfCard}>
      <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3 md:grid-cols-6">
        <div className="col-span-2">
          <label className={icfLabel} htmlFor="icfa-name">Name</label>
          <input id="icfa-name" className={icfInput} value={name} onChange={e => setName(e.target.value)} placeholder="Account name" />
        </div>
        <div>
          <label className={icfLabel} htmlFor="icfa-type">Type</label>
          <select
            id="icfa-type"
            className={icfInput}
            value={accountType}
            onChange={e => setAccountType(e.target.value as ICFundAccountType)}
          >
            {IC_FUND_ACCOUNT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={icfLabel} htmlFor="icfa-ob">Opening</label>
          <input
            id="icfa-ob"
            className={`${icfInput} font-mono tabular-nums`}
            inputMode="decimal"
            value={openingBalance}
            onChange={e => setOpeningBalance(e.target.value)}
          />
          <p className="mt-0.5 text-[10px] text-slate-400">Locked after the first entry on this account.</p>
        </div>
        <div>
          <label className={icfLabel} htmlFor="icfa-notes">Notes</label>
          <input id="icfa-notes" className={icfInput} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <button type="button" className={icfBtnPrimary} {...buttonProps({ disabled: saving || !name.trim() })} onClick={() => void handleCreate()}>
            {saving ? 'Saving…' : 'Add'}
          </button>
          <button type="button" className={icfBtnOutline} {...buttonProps()} onClick={() => void handleSeed()}>
            Seed tills
          </button>
        </div>
      </div>

      <div className={icfTableWrap}>
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={icfTh}>Name</th>
              <th className={icfTh}>Type</th>
              <th className={`${icfTh} text-right`}>Opening</th>
              <th className={`${icfTh} text-right`}>Balance</th>
              <th className={icfTh}>Status</th>
              <th className={icfTh}>Notes</th>
              <th className={icfTh} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={`${icfTd} py-6 text-center text-slate-500`}>Loading…</td></tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={7} className={`${icfTd} py-6 text-center text-slate-500`}>
                  No accounts yet. Add one or seed Collection / Fund / Cashier.
                </td>
              </tr>
            ) : (
              accounts.map(account => (
                <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={`${icfTd} font-medium`}>{account.name}</td>
                  <td className={`${icfTd} text-slate-500`}>{accountTypeLabel(account.accountType)}</td>
                  <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(account.openingBalance)}</td>
                  <td className={`${icfTd} text-right font-mono tabular-nums ${account.balance < 0 ? 'text-red-600' : ''}`}>
                    {fmtICAmount(account.balance)}
                  </td>
                  <td className={`${icfTd} capitalize text-slate-500`}>{account.status}</td>
                  <td className={`${icfTd} max-w-[12rem] truncate text-slate-500`}>{account.notes || '—'}</td>
                  <td className={`${icfTd} text-right`}>
                    {canWrite ? (
                      <button type="button" className={icfBtnGhost} onClick={() => void toggleStatus(account)}>
                        {account.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
