'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Deal, DealTransaction } from '@/types';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formError,
} from '@/lib/ui';

export default function CreateDealShellModal({
  open,
  onClose,
  deal,
  editTransaction,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  editTransaction?: DealTransaction;
  onDelete?: (txn: DealTransaction) => void;
}) {
  const { addDealTransaction, updateDealTransaction, dealTransactions } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLocalTimeString = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [date, setDate] = useState(getLocalDateString);
  const [time, setTime] = useState(getLocalTimeString);
  const [dealNum, setDealNum] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (deal && open) {
      if (editTransaction) {
        setDate(editTransaction.date.slice(0, 10));
        setTime(editTransaction.time || getLocalTimeString());
        setDealNum(editTransaction.deal);
      } else {
        setDate(getLocalDateString());
        setTime(getLocalTimeString());
        const groupTxns = dealTransactions.filter(t => t.dealId === deal.id);
        let maxNum = 0;
        groupTxns.forEach(t => {
          const num = parseInt(t.deal, 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        setDealNum((maxNum + 1).toString());
      }
      setError('');
      setConfirmDelete(false);
    }
  }, [deal, open, editTransaction, dealTransactions]);

  const isDirty = useMemo(() => {
    if (editTransaction) {
      return (
        date !== editTransaction.date.slice(0, 10) ||
        dealNum !== editTransaction.deal ||
        (time || '') !== (editTransaction.time || '')
      );
    }
    return dealNum !== (dealTransactions.filter(t => t.dealId === deal.id).length + 1).toString();
  }, [date, dealNum, time, editTransaction, dealTransactions, deal.id]);

  const handleClose = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!date) return setError('Date is required.');
    if (!dealNum.trim()) return setError('Deal number is required.');

    if (editTransaction) {
      const updated: DealTransaction = {
        ...editTransaction,
        date,
        time: time || undefined,
        deal: dealNum.trim(),
      };
      const success = await updateDealTransaction(updated);
      if (success) onClose();
      return;
    }

    const newTxn: DealTransaction = {
      id: `txn-${Date.now()}`,
      date,
      time: time || undefined,
      deal: dealNum.trim(),
      weight: 0,
      rate: 0,
      pureCostAed: 0,
      currencyAmount: 0,
      liveSellRate: 0,
      sellPremiumDiscount: 0,
      salesAed: 0,
      expenses: 0,
      grossProfit: 0,
      netProfitPerGram: 0,
      managementProfit: 0,
      fixOrUnfix: 'unfixed',
      marginDeposit: 0,
      premiumDiscount: 0,
      dealId: deal.id,
      buys: [],
    };

    const success = await addDealTransaction(newTxn);
    if (success) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editTransaction ? 'Edit Deal' : 'Create Deal'}
      footer={
        <>
          {editTransaction && onDelete && (
            <div className="mr-auto">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                >
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Sure?</span>
                  <button
                    type="button"
                    onClick={() => { onDelete(editTransaction); onClose(); }}
                    className="rounded-full bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Yes, Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-slate-400">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          <button type="button" className={btnSecondary} onClick={handleClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit}>
            {editTransaction ? 'Save Changes' : 'Create Deal'}
          </button>
        </>
      }
    >
      {error && <div className={`${formError} mb-4`}>{error}</div>}

      <p className="mb-4 text-sm text-slate-500">
        {editTransaction
          ? 'Update deal date, time, and number. Buy legs are managed on the deal detail page.'
          : 'Create an empty deal shell. Add buy legs from the deal detail page.'}
      </p>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Date & Time</label>
          <div className="flex gap-2">
            <input className={`${formInput} min-w-0 flex-[3] px-2 sm:px-3`} type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input className={`${formInput} min-w-0 flex-[2] px-2 sm:px-3 text-center`} type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Deal Number</label>
          <input className={formInput} type="text" placeholder="e.g. 22" value={dealNum} onChange={e => setDealNum(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
