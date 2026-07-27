'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Deal, DealTransaction, DealTransactionBuy } from '@/types';
import { getGlobalCurrency } from '@/data/mockData';
import { generateDealBuyTxnId } from '@/lib/dealCalculations';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formError,
} from '@/lib/ui';

export default function AddDealBuyModal({
  open,
  onClose,
  deal,
  transaction,
  editBuy,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  transaction: DealTransaction;
  editBuy?: DealTransactionBuy;
}) {
  const { addDealTransactionBuy, updateDealTransactionBuy, deleteDealTransactionBuy } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const getLocalDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLocalTimeString = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatCost = (amount: number) => {
    const currency = getGlobalCurrency();
    const rates: Record<string, number> = { AED: 1, USD: 0.2723, INR: 22.68 };
    const converted = amount * (rates[currency] || 1);
    return `${amount < 0 ? '-' : ''}${Math.abs(converted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [date, setDate] = useState(getLocalDateString);
  const [time, setTime] = useState(getLocalTimeString);
  const [txnId, setTxnId] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [purityStr, setPurityStr] = useState('');
  const [purchaseCostStr, setPurchaseCostStr] = useState('');
  const [currencyAmountStr, setCurrencyAmountStr] = useState('');
  const [purchaseRateStr, setPurchaseRateStr] = useState('');
  const [error, setError] = useState('');

  const groupType = deal.groupType === 'currency' ? 'currency' : 'gold';

  useEffect(() => {
    if (open) {
      if (editBuy) {
        setDate(editBuy.date.slice(0, 10));
        setTime(editBuy.time || getLocalTimeString());
        setTxnId(editBuy.txnId);
        setWeightStr(editBuy.weight.toString());
        setPurityStr(editBuy.purity?.toString() || '');
        setPurchaseCostStr(editBuy.pureCostAed.toString());
        setCurrencyAmountStr(editBuy.currencyAmount?.toString() || '');
        setPurchaseRateStr(editBuy.purchaseRate?.toString() || '');
      } else {
        setDate(getLocalDateString());
        setTime(getLocalTimeString());
        setTxnId(generateDealBuyTxnId());
        setWeightStr('');
        setPurityStr('');
        setPurchaseCostStr('');
        setCurrencyAmountStr('');
        setPurchaseRateStr('');
      }
      setError('');
      setConfirmDelete(false);
    }
  }, [open, editBuy]);

  const parseSafeNumber = (val: string) => {
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const weight = parseSafeNumber(weightStr);
  const purity = purityStr.trim() ? parseSafeNumber(purityStr) : undefined;

  const pureCostAed = useMemo(() => {
    if (groupType === 'currency') {
      const ca = parseSafeNumber(currencyAmountStr);
      const pr = parseSafeNumber(purchaseRateStr);
      return ca > 0 && pr > 0 ? ca / pr : 0;
    }
    return parseSafeNumber(purchaseCostStr);
  }, [purchaseCostStr, currencyAmountStr, purchaseRateStr, groupType]);

  const partnerBreakdown = useMemo(() => {
    if (!deal.investors) return [];
    return deal.investors.map(inv => {
      const sharePercentage = deal.amount > 0 ? (inv.amount / deal.amount) * 100 : 0;
      return {
        name: inv.investorName,
        percentage: sharePercentage,
        amount: pureCostAed * (sharePercentage / 100),
        goldShare: weight * (sharePercentage / 100),
      };
    });
  }, [deal, pureCostAed, weight]);

  const handleSubmit = async () => {
    setError('');
    if (!date) return setError('Date is required.');
    if (!txnId.trim()) return setError('Txn ID is required.');

    if (groupType === 'currency') {
      if (parseSafeNumber(currencyAmountStr) <= 0) return setError('Currency amount must be greater than zero.');
      if (parseSafeNumber(purchaseRateStr) <= 0) return setError('Purchase rate must be greater than zero.');
    } else {
      if (weight <= 0) return setError('Weight must be greater than zero.');
      if (purityStr.trim() && (purity == null || purity <= 0 || purity > 1)) {
        return setError('Purity must be between 0 and 1 (e.g. 0.916).');
      }
    }
    if (pureCostAed <= 0) return setError('Purchase cost must be greater than zero.');

    const buy: DealTransactionBuy = {
      id: editBuy ? editBuy.id : `buy-${Date.now()}`,
      dealTransactionId: transaction.id,
      txnId: txnId.trim(),
      date,
      time: time || undefined,
      weight: groupType === 'currency' ? 0 : weight,
      purity: groupType === 'gold' && purity != null ? purity : undefined,
      pureCostAed: Number(pureCostAed.toFixed(2)),
      currencyAmount: groupType === 'currency' ? parseSafeNumber(currencyAmountStr) : undefined,
      purchaseRate: groupType === 'currency' ? parseSafeNumber(purchaseRateStr) : undefined,
    };

    const success = editBuy
      ? await updateDealTransactionBuy(buy, groupType)
      : await addDealTransactionBuy(buy, groupType);
    if (success) onClose();
  };

  const handleDelete = async () => {
    if (!editBuy) return;
    const success = await deleteDealTransactionBuy(editBuy.id, transaction.id, groupType);
    if (success) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editBuy ? 'Edit Buy' : 'Add Buy'}
      footer={
        <>
          {editBuy && transaction.fixOrUnfix === 'unfixed' && (
            <div className="mr-auto">
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600">
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleDelete} className="rounded-full bg-red-600 px-3.5 py-2 text-xs font-bold text-white">Yes, Delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs font-bold text-slate-400">Cancel</button>
                </div>
              )}
            </div>
          )}
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={transaction.fixOrUnfix === 'fixed'}>
            {editBuy ? 'Save Changes' : 'Add Buy'}
          </button>
        </>
      }
    >
      {transaction.fixOrUnfix === 'fixed' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This deal is settled. Buys cannot be changed.
        </div>
      )}
      {error && <div className={`${formError} mb-4`}>{error}</div>}

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Date & Time</label>
          <div className="flex gap-2">
            <input className={`${formInput} min-w-0 flex-[3]`} type="date" value={date} onChange={e => setDate(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
            <input className={`${formInput} min-w-0 flex-[2] text-center`} type="time" value={time} onChange={e => setTime(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
          </div>
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Txn ID</label>
          <input className={`${formInput} font-mono`} type="text" value={txnId} readOnly />
        </div>
      </div>

      <div className={formRow}>
        {groupType === 'currency' ? (
          <>
            <div className={formGroup}>
              <label className={formLabel}>Currency Amount</label>
              <input className={formInput} type="number" value={currencyAmountStr} onChange={e => setCurrencyAmountStr(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Purchase Rate (Local/AED)</label>
              <input className={formInput} type="number" value={purchaseRateStr} onChange={e => setPurchaseRateStr(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
            </div>
          </>
        ) : (
          <>
            <div className={formGroup}>
              <label className={formLabel}>Weight (grams)</label>
              <input className={formInput} type="number" value={weightStr} onChange={e => setWeightStr(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Purity (e.g. 0.916)</label>
              <input className={formInput} type="number" step="0.001" placeholder="0.916" value={purityStr} onChange={e => setPurityStr(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
            </div>
          </>
        )}
      </div>

      {groupType === 'gold' && (
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Purchase Cost (AED)</label>
            <input className={formInput} type="number" value={purchaseCostStr} onChange={e => setPurchaseCostStr(e.target.value)} disabled={transaction.fixOrUnfix === 'fixed'} />
          </div>
          <div className={formGroup} />
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 shadow-sm">
        <h4 className="mb-4 text-sm font-bold text-emerald-800">Deal Cost Inference</h4>
        <div className="rounded-xl bg-emerald-100/30 p-4 border border-emerald-100/50 flex justify-between items-center mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Purchase Cost (AED)</p>
          <p className="font-mono text-2xl font-black text-emerald-700">{formatCost(pureCostAed)}</p>
        </div>
        {partnerBreakdown.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {partnerBreakdown.map((partner, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-white border border-emerald-100/40 p-3">
                <div>
                  <p className="font-bold text-slate-800 uppercase text-xs">{partner.name}</p>
                  <p className="text-[10px] text-slate-400">{partner.percentage.toFixed(2)}% share</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black text-slate-900">{formatCost(partner.amount)}</p>
                  {partner.goldShare > 0 && (
                    <p className="font-mono text-[10px] font-bold text-amber-600">{partner.goldShare.toFixed(3)} g</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
