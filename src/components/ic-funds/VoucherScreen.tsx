'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AccountPicker from '@/components/ic-funds/AccountPicker';
import {
  deleteICFundVoucherAction,
  listICFundAccountsAction,
  listICFundVouchersAction,
  postICFundVoucherAction,
} from '@/app/actions/icFundsActions';
import { IC_FUND_VOUCHER_LABELS, type ICFundVoucherType } from '@/lib/icFunds/constants';
import { allowedAccountTypesForVoucher, voucherFieldLabels } from '@/lib/icFunds/voucherRules';
import { fmtICAmount, fmtICDate } from '@/lib/icFunds/format';
import { icfBtnGhost, icfBtnPrimary, icfCard, icfInput, icfLabel, icfTableWrap, icfTd, icfTh } from '@/components/ic-funds/ui';
import ICFundsDateFilterBar from '@/components/ic-funds/ICFundsDateFilterBar';
import { useICFundsDateFilter } from '@/components/ic-funds/useICFundsDateFilter';
import VoucherUserCell from '@/components/ic-funds/VoucherUserCell';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useApp } from '@/context/AppContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { ICFundAccount, ICFundVoucher } from '@/types';

export default function VoucherScreen({
  branchId,
  voucherType,
}: {
  branchId: string;
  voucherType: ICFundVoucherType;
}) {
  const { showToast, currentSlug, branches } = useApp();
  const { canWrite, buttonProps } = useWriteAccess();
  const { confirm, Dialog } = useConfirmDialog();
  const labels = voucherFieldLabels(voucherType);

  const [accounts, setAccounts] = useState<ICFundAccount[]>([]);
  const [vouchers, setVouchers] = useState<ICFundVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const branch = branches.find(b => b.slug === currentSlug);

  const [voucherDate, setVoucherDate] = useState('');
  const [debitId, setDebitId] = useState('');
  const [creditId, setCreditId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    startDate,
    endDate,
    defaultVoucherDate,
  } = useICFundsDateFilter(branch?.timezone);

  useEffect(() => {
    if (!voucherDate) setVoucherDate(defaultVoucherDate);
  }, [defaultVoucherDate, voucherDate]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextAccounts, nextVouchers] = await Promise.all([
        listICFundAccountsAction(branchId),
        listICFundVouchersAction({ branchId, voucherType, startDate, endDate }),
      ]);
      setAccounts(nextAccounts);
      setVouchers(nextVouchers);
    } finally {
      setLoading(false);
    }
  }, [branchId, voucherType, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setDebitId('');
    setCreditId('');
    setAmount('');
    setNotes('');
    setVoucherDate(defaultVoucherDate);
  };

  const handleSave = async () => {
    if (!canWrite) return;
    setSaving(true);
    const result = await postICFundVoucherAction({
      branchId,
      voucherType,
      voucherDate,
      debitAccountId: debitId,
      creditAccountId: creditId,
      amount: Number(amount),
      notes,
    });
    setSaving(false);
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${IC_FUND_VOUCHER_LABELS[voucherType].slice(0, -1)} saved`, 'success');
    resetForm();
    await load();
  };

  const handleVoid = async (voucher: ICFundVoucher) => {
    const ok = await confirm({
      title: `Void voucher #${voucher.voucherNo}?`,
      message: 'The entry stays in the audit log but is excluded from balances and reports.',
    });
    if (!ok) return;
    const result = await deleteICFundVoucherAction(branchId, voucher.id);
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Voucher voided', 'success');
    await load();
  };

  const q = search.trim().toLowerCase();
  const visible = q
    ? vouchers.filter(v =>
        v.debitAccountName.toLowerCase().includes(q) ||
        v.creditAccountName.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q) ||
        String(v.voucherNo).includes(q),
      )
    : vouchers;
  const bankCol = voucherType === 'receipt' ? 'debit' : 'credit';
  const partyCol = voucherType === 'receipt' ? 'credit' : 'debit';

  return (
    <div className={icfCard}>
      <Dialog />
      <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3 md:grid-cols-4 xl:grid-cols-8">
        <div>
          <label className={icfLabel} htmlFor={`${voucherType}-date`}>Date</label>
          <input id={`${voucherType}-date`} type="date" className={icfInput} value={voucherDate} onChange={e => setVoucherDate(e.target.value)} />
        </div>
        <div className="col-span-2">
          <AccountPicker
            label={labels.credit}
            accounts={accounts}
            allowedTypes={allowedAccountTypesForVoucher(voucherType, 'credit')}
            value={creditId}
            excludeId={debitId}
            onChange={setCreditId}
          />
        </div>
        <div className="col-span-2">
          <AccountPicker
            label={labels.debit}
            accounts={accounts}
            allowedTypes={allowedAccountTypesForVoucher(voucherType, 'debit')}
            value={debitId}
            excludeId={creditId}
            onChange={setDebitId}
          />
        </div>
        <div>
          <label className={icfLabel} htmlFor={`${voucherType}-amount`}>Amount</label>
          <input
            id={`${voucherType}-amount`}
            className={`${icfInput} font-mono tabular-nums`}
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="col-span-2 md:col-span-2 xl:col-span-1">
          <label className={icfLabel} htmlFor={`${voucherType}-notes`}>Notes</label>
          <input id={`${voucherType}-notes`} className={icfInput} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Narration" />
        </div>
        <div className="flex items-end">
          <button type="button" className={`${icfBtnPrimary} w-full`} {...buttonProps({ disabled: saving })} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 px-3 pt-2">
        <ICFundsDateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />
        <div className="flex flex-wrap items-end gap-2 pb-2">
          <div className="min-w-[10rem] flex-1">
            <label className={icfLabel} htmlFor={`${voucherType}-search`}>Find</label>
            <input
              id={`${voucherType}-search`}
              className={icfInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Account, notes, #"
            />
          </div>
          <span className="pb-1 text-[11px] text-slate-500">{visible.length} entries</span>
        </div>
      </div>

      <div className={icfTableWrap}>
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={icfTh}>#</th>
              <th className={icfTh}>Date</th>
              {voucherType === 'journal' ? (
                <>
                  <th className={icfTh}>Debit</th>
                  <th className={icfTh}>Credit</th>
                </>
              ) : (
                <>
                  <th className={icfTh}>{voucherType === 'contra' ? 'To bank' : 'Cash / bank'}</th>
                  <th className={icfTh}>{voucherType === 'contra' ? 'From bank' : 'Account'}</th>
                </>
              )}
              <th className={`${icfTh} text-right`}>Amount</th>
              <th className={icfTh}>User</th>
              <th className={icfTh}>Notes</th>
              <th className={icfTh} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className={`${icfTd} py-6 text-center text-slate-500`}>Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className={`${icfTd} py-6 text-center text-slate-500`}>
                  {vouchers.length === 0
                    ? 'No entries in this range. Add accounts first if pickers are empty.'
                    : 'No rows match the search.'}
                </td>
              </tr>
            ) : (
              visible.map(row => {
                const cashOrBank = bankCol === 'debit' ? row.debitAccountName : row.creditAccountName;
                const party = partyCol === 'debit' ? row.debitAccountName : row.creditAccountName;
                const isVoid = row.status === 'void';
                return (
                  <tr key={row.id} className={`border-b border-slate-100 ${isVoid ? 'bg-slate-50/80 text-slate-400' : 'hover:bg-slate-50'}`}>
                    <td className={`${icfTd} font-mono tabular-nums text-slate-500`}>
                      {row.voucherNo}
                      {isVoid ? <span className="ml-1 text-[10px] font-semibold uppercase text-red-500">VOID</span> : null}
                    </td>
                    <td className={`${icfTd} tabular-nums`}>{fmtICDate(row.voucherDate)}</td>
                    {voucherType === 'journal' ? (
                      <>
                        <td className={`${icfTd} font-medium`}>{row.debitAccountName}</td>
                        <td className={icfTd}>{row.creditAccountName}</td>
                      </>
                    ) : (
                      <>
                        <td className={`${icfTd} font-medium`}>{voucherType === 'contra' ? row.debitAccountName : cashOrBank}</td>
                        <td className={icfTd}>{voucherType === 'contra' ? row.creditAccountName : party}</td>
                      </>
                    )}
                    <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(row.amount)}</td>
                    <td className={icfTd}><VoucherUserCell voucher={row} /></td>
                    <td className={`${icfTd} max-w-[14rem] truncate text-slate-500`}>{row.notes || '—'}</td>
                    <td className={`${icfTd} text-right`}>
                      {canWrite && !isVoid ? (
                        <button type="button" className={icfBtnGhost} onClick={() => void handleVoid(row)}>
                          Void
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
