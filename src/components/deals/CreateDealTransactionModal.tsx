'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Deal, DealTransaction } from '@/types';
import { formatAEDStr, getGlobalCurrency } from '@/data/mockData';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formSelect,
  formError,
  formHint,
} from '@/lib/ui';

export default function CreateDealTransactionModal({
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
  const { addDealTransaction, updateDealTransaction, investors, dealTransactions } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const formatCost = (amount: number) => {
    const currency = getGlobalCurrency();
    const rates: Record<string, number> = {
      AED: 1,
      USD: 0.2723,
      INR: 22.68,
    };
    const converted = amount * (rates[currency] || 1);
    const numStr = Math.abs(converted).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = amount < 0 ? '-' : '';
    return `${sign}${numStr}`;
  };

  // Inputs
  const [date, setDate] = useState(getLocalDateString);
  const [time, setTime] = useState(getLocalTimeString);
  const [dealNum, setDealNum] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [fixOrUnfix, setFixOrUnfix] = useState<'fixed' | 'unfixed'>('unfixed');
  const [premiumDiscountStr, setPremiumDiscountStr] = useState('0');

  const [error, setError] = useState('');

  // Reset/sync defaults when deal changes, modal opens or editTransaction changes
  useEffect(() => {
    if (deal && open) {
      if (editTransaction) {
        setDate(editTransaction.date.slice(0, 10));
        setTime(editTransaction.time || getLocalTimeString());
        setDealNum(editTransaction.deal);
        setWeightStr(editTransaction.weight.toString());
        setRateStr(editTransaction.rate.toString());
        setFixOrUnfix(editTransaction.fixOrUnfix === 'unfixed' ? 'unfixed' : 'fixed');
        setPremiumDiscountStr(editTransaction.premiumDiscount.toString());
      } else {
        setDate(getLocalDateString());
        setTime(getLocalTimeString());

        // Find next deal sequence number for this group
        const groupTxns = dealTransactions.filter(t => t.dealId === deal.id);
        let maxNum = 0;
        groupTxns.forEach(t => {
          const num = parseInt(t.deal, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        });
        const autoDealNum = (maxNum + 1).toString();
        setDealNum(autoDealNum);

        setWeightStr('');
        setRateStr('');
        setFixOrUnfix('unfixed');
        setPremiumDiscountStr('0');
      }
      setError('');
      setConfirmDelete(false);
    }
  }, [deal, open, editTransaction, dealTransactions]);

  // Numerical conversions
  const weight = Number(weightStr) || 0;
  const rate = Number(rateStr) || 0;
  const premiumDiscount = Number(premiumDiscountStr) || 0;

  // Real-time calculations
  const calculations = useMemo(() => {
    // 1 troy oz = 31.1034768 grams
    const premiumDiscountPerGram = premiumDiscount / 31.1034768;
    const effectiveRate = rate + premiumDiscountPerGram;
    const pureCostAed = weight * effectiveRate;

    return {
      premiumDiscountPerGram,
      effectiveRate,
      pureCostAed,
    };
  }, [weight, rate, premiumDiscount]);

  const partnerBreakdown = useMemo(() => {
    if (!deal || !deal.investors) return [];
    return deal.investors.map(inv => {
      const sharePercentage = deal.amount > 0 ? (inv.amount / deal.amount) * 100 : 0;
      const costShare = calculations.pureCostAed * (sharePercentage / 100);
      return {
        name: inv.investorName,
        percentage: sharePercentage,
        amount: costShare,
      };
    });
  }, [deal, calculations.pureCostAed]);

  const handleSubmit = async () => {
    setError('');

    if (!date) return setError('Date is required.');
    if (!dealNum.trim()) return setError('Deal number is required.');
    if (weight <= 0) return setError('Weight must be greater than zero.');
    if (rate <= 0) return setError('Purchase rate must be greater than zero.');

    const newTxn: DealTransaction = {
      id: editTransaction ? editTransaction.id : `txn-${Date.now()}`,
      date,
      time: time || undefined,
      deal: dealNum.trim(),
      weight,
      rate,
      pureCostAed: Number(calculations.pureCostAed.toFixed(2)),
      liveSellRate: editTransaction?.liveSellRate || 0,
      sellPremiumDiscount: editTransaction?.sellPremiumDiscount || 0,
      salesAed: editTransaction?.salesAed || 0,
      expenses: editTransaction?.expenses || 0,
      grossProfit: editTransaction?.grossProfit || 0,
      netProfitPerGram: editTransaction?.netProfitPerGram || 0,
      managementProfit: editTransaction?.managementProfit || 0,
      fixOrUnfix,
      marginDeposit: editTransaction?.marginDeposit || 0,
      premiumDiscount,
      dealId: deal.id,
    };

    const success = editTransaction
      ? await updateDealTransaction(newTxn)
      : await addDealTransaction(newTxn);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editTransaction ? "Edit Deal" : "Add Deal"}
      footer={
        <>
          {/* Left side: delete (edit mode only) */}
          {editTransaction && onDelete && (
            <div className="mr-auto">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Sure?</span>
                  <button
                    type="button"
                    onClick={() => { onDelete(editTransaction); onClose(); }}
                    className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition-all"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Right side: cancel / save */}
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={handleSubmit}>
            {editTransaction ? 'Save Changes' : 'Add Deal'}
          </button>
        </>
      }
    >
      {error && <div className={`${formError} mb-4`}>{error}</div>}

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Date & Time</label>
          <div className="flex gap-2">
            <input
              className={`${formInput} min-w-0 flex-[3] px-2 sm:px-3`}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            <input
              className={`${formInput} min-w-0 flex-[2] px-2 sm:px-3 text-center`}
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Deal Number</label>
          <input
            className={formInput}
            type="text"
            placeholder="e.g. 22"
            value={dealNum}
            onChange={e => setDealNum(e.target.value)}
          />
        </div>
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Weight (grams)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={weightStr}
            onChange={e => setWeightStr(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Purchase Rate (AED/Gram)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={rateStr}
            onChange={e => setRateStr(e.target.value)}
          />
        </div>
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Premium / Discount (per troy oz)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={premiumDiscountStr}
            onChange={e => setPremiumDiscountStr(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Deal Status</label>
          <select
            className={formSelect}
            value={fixOrUnfix}
            onChange={e => setFixOrUnfix(e.target.value as 'fixed' | 'unfixed')}
          >
            <option value="unfixed">Unfixed</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
      </div>

      {/* Calculated Preview Card */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 shadow-sm">
        <h4 className="mb-4 text-sm font-bold text-emerald-800 flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M12 14h.01M15 11h.01M15 7h.01M18 21H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          Deal Cost Inference
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
          <div>
            <p className="text-slate-400">Premium/Discount per Gram</p>
            <p className="font-mono text-sm font-bold text-slate-900">
              {formatCost(calculations.premiumDiscountPerGram)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              ({premiumDiscount >= 0 ? '+' : ''}{premiumDiscount.toFixed(2)}/oz ÷ 31.1035)
            </p>
          </div>
          <div>
            <p className="text-slate-400">Effective Rate per Gram</p>
            <p className="font-mono text-sm font-bold text-slate-900">
              {formatCost(calculations.effectiveRate)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              (Rate: {rate.toFixed(2)} + Prem: {calculations.premiumDiscountPerGram.toFixed(4)})
            </p>
          </div>
          <div className="col-span-2 border-t border-emerald-100/50 pt-3 mt-1">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Final Cost (Pure Cost AED)</p>
            <p className="font-mono text-xl font-black text-emerald-700 mt-1">
              {formatCost(calculations.pureCostAed)}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              ({weight.toLocaleString()} g × {formatCost(calculations.effectiveRate)})
            </p>
          </div>

          {partnerBreakdown.length > 0 && (
            <div className="col-span-2 border-t border-emerald-100/50 pt-4 mt-2">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Investor Cost Shares</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {partnerBreakdown.map((partner, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white border border-emerald-100/40 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div>
                      <p className="font-bold text-slate-800 uppercase">{partner.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{partner.percentage.toFixed(2)}% share</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-black text-slate-900">
                        {formatCost(partner.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
