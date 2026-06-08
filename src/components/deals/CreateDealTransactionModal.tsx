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
  const [purchaseCostStr, setPurchaseCostStr] = useState('');
  const [fixOrUnfix, setFixOrUnfix] = useState<'fixed' | 'unfixed'>('unfixed');

  const [error, setError] = useState('');

  // Reset/sync defaults when deal changes, modal opens or editTransaction changes
  useEffect(() => {
    if (deal && open) {
      if (editTransaction) {
        setDate(editTransaction.date.slice(0, 10));
        setTime(editTransaction.time || getLocalTimeString());
        setDealNum(editTransaction.deal);
        setWeightStr(editTransaction.weight.toString());
        setPurchaseCostStr(editTransaction.pureCostAed.toString());
        setFixOrUnfix(editTransaction.fixOrUnfix === 'unfixed' ? 'unfixed' : 'fixed');
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
        setPurchaseCostStr('');
        setFixOrUnfix('unfixed');
      }
      setError('');
      setConfirmDelete(false);
    }
  }, [deal, open, editTransaction, dealTransactions]);

  // Handle field changes directly without auto-calculations
  const handleFieldChange = (field: 'weight' | 'purchaseCost', value: string) => {
    if (field === 'weight') {
      setWeightStr(value);
    } else if (field === 'purchaseCost') {
      setPurchaseCostStr(value);
    }
  };

  const parseSafeNumber = (val: string | number) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Numerical conversions
  const weight = parseSafeNumber(weightStr);

  // Real-time calculations
  const calculations = useMemo(() => {
    const pureCostAed = parseSafeNumber(purchaseCostStr);

    return {
      pureCostAed,
    };
  }, [purchaseCostStr]);

  const partnerBreakdown = useMemo(() => {
    if (!deal || !deal.investors) return [];
    return deal.investors.map(inv => {
      const sharePercentage = deal.amount > 0 ? (inv.amount / deal.amount) * 100 : 0;
      const costShare = calculations.pureCostAed * (sharePercentage / 100);
      const goldShare = weight * (sharePercentage / 100);
      return {
        name: inv.investorName,
        percentage: sharePercentage,
        amount: costShare,
        goldShare,
      };
    });
  }, [deal, calculations.pureCostAed, weight]);

  const handleSubmit = async () => {
    setError('');

    if (!date) return setError('Date is required.');
    if (!dealNum.trim()) return setError('Deal number is required.');
    if (weight <= 0) return setError('Weight must be greater than zero.');
    if (calculations.pureCostAed <= 0) return setError('Purchase cost must be greater than zero.');


    const newTxn: DealTransaction = {
      id: editTransaction ? editTransaction.id : `txn-${Date.now()}`,
      date,
      time: time || undefined,
      deal: dealNum.trim(),
      weight,
      rate: 0,
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
      premiumDiscount: 0,
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
          <button 
            type="button" 
            className={btnPrimary} 
            onClick={handleSubmit} 
          >
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
            onChange={e => handleFieldChange('weight', e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Purchase Cost (AED)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={purchaseCostStr}
            onChange={e => handleFieldChange('purchaseCost', e.target.value)}
          />
        </div>
      </div>

      <div className={formRow}>
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
        <div className={formGroup}></div>
      </div>

      {/* Calculated Preview Card */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 shadow-sm">
        <h4 className="mb-4 text-sm font-bold text-emerald-800 flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M12 14h.01M15 11h.01M15 7h.01M18 21H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          Deal Cost Inference
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4 text-xs font-semibold text-slate-600">
          {/* 1. Transaction Summary */}
          <div className="col-span-1 sm:col-span-2">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-100/50 pb-1">Transaction Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-white border border-emerald-100/40 p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Deal No.</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">{dealNum || '-'}</p>
              </div>
              <div className="rounded-xl bg-white border border-emerald-100/40 p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Date & Time</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">{date} {time}</p>
              </div>
              <div className="rounded-xl bg-white border border-emerald-100/40 p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Status</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-0.5 capitalize">{fixOrUnfix}</p>
              </div>
              <div className="rounded-xl bg-white border border-emerald-100/40 p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Weight</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">{weight > 0 ? `${weight.toLocaleString()} g` : '-'}</p>
              </div>
            </div>
          </div>

          {/* 2. Deal Cost */}
          <div className="col-span-1 sm:col-span-2">
            <div className="rounded-xl bg-emerald-100/30 p-4 border border-emerald-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-0.5">Purchase Cost (AED)</p>
              </div>
              <p className="font-mono text-2xl font-black text-emerald-700 text-right">
                {formatCost(calculations.pureCostAed)}
              </p>
            </div>
          </div>

          {/* 3. Investor Cost Shares */}
          {partnerBreakdown.length > 0 && (
            <div className="col-span-1 sm:col-span-2">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-100/50 pb-1">Investor Cost Shares</p>
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
                      {partner.goldShare > 0 && (
                        <p className="font-mono text-[10px] font-bold text-amber-600 mt-0.5 bg-amber-50 inline-block px-1.5 py-0.5 rounded">
                          {partner.goldShare.toFixed(3)} g
                        </p>
                      )}
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
