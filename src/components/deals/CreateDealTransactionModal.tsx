'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Deal, DealTransaction } from '@/types';
import { formatAEDStr } from '@/data/mockData';
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
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  editTransaction?: DealTransaction;
}) {
  const { addDealTransaction, updateDealTransaction, investors, dealTransactions } = useApp();

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Inputs
  const [date, setDate] = useState(getLocalDateString);
  const [dealNum, setDealNum] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [fixOrUnfix, setFixOrUnfix] = useState<'fixed' | 'unfixed'>('fixed');
  const [salesValueInrStr, setSalesValueInrStr] = useState('');
  const [rvRateStr, setRvRateStr] = useState('');
  const [salesAedStr, setSalesAedStr] = useState('');
  const [expensesStr, setExpensesStr] = useState('0');
  const [dealShareStr, setDealShareStr] = useState('100');
  const [aibakShareStr, setAibakShareStr] = useState('20');
  const [marginDepositStr, setMarginDepositStr] = useState('0');
  const [premiumDiscountStr, setPremiumDiscountStr] = useState('0');

  const [error, setError] = useState('');

  // Reset/sync defaults when deal changes, modal opens or editTransaction changes
  useEffect(() => {
    if (deal && open) {
      if (editTransaction) {
        setDate(editTransaction.date.slice(0, 10));
        setDealNum(editTransaction.deal);
        setWeightStr(editTransaction.weight.toString());
        setRateStr(editTransaction.rate.toString());
        setFixOrUnfix(editTransaction.fixOrUnfix === 'unfixed' ? 'unfixed' : 'fixed');
        setSalesValueInrStr(editTransaction.salesValueInr ? editTransaction.salesValueInr.toString() : '');
        setRvRateStr(editTransaction.rvRate ? editTransaction.rvRate.toString() : '');
        setSalesAedStr(editTransaction.salesAed ? editTransaction.salesAed.toString() : '');
        setExpensesStr(editTransaction.expenses.toString());

        // Back-calculate input shares from stored totals
        const totalProfitPerKg = editTransaction.weight > 0 ? (editTransaction.grossProfit / (editTransaction.weight / 1000)) : 0;
        const backCalculatedDealShare = totalProfitPerKg !== 0 ? (editTransaction.tProfit / totalProfitPerKg) * 100 : 100;
        const backCalculatedAibakShare = totalProfitPerKg !== 0 ? (editTransaction.aibakProfit / totalProfitPerKg) * 100 : 20;

        setDealShareStr(Math.round(backCalculatedDealShare).toString());
        setAibakShareStr(Math.round(backCalculatedAibakShare).toString());

        setMarginDepositStr(editTransaction.marginDeposit.toString());
        setPremiumDiscountStr(editTransaction.premiumDiscount.toString());
      } else {
        setDate(getLocalDateString());

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
        setFixOrUnfix('fixed');
        setSalesValueInrStr('');
        setRvRateStr('');
        setSalesAedStr('');
        setExpensesStr('0');
        setDealShareStr('100');
        setAibakShareStr('20');
        setMarginDepositStr('0');
        setPremiumDiscountStr('0');
      }
      setError('');
    }
  }, [deal, open, editTransaction, dealTransactions]);

  // Numerical conversions
  const weight = Number(weightStr) || 0;
  const rate = Number(rateStr) || 0;
  const salesValueInr = Number(salesValueInrStr) || 0;
  const rvRate = Number(rvRateStr) || 0;
  const expenses = Number(expensesStr) || 0;
  const dealShare = Number(dealShareStr) || 100;
  const managerShare = deal?.managerShare ?? 20;
  const aibakShare = Number(aibakShareStr) || 0;
  const marginDeposit = Number(marginDepositStr) || 0;
  const premiumDiscount = Number(premiumDiscountStr) || 0;

  // Real-time calculations
  const calculations = useMemo(() => {
    const pureCostAed = weight * rate;

    let salesAed = 0;
    if (fixOrUnfix === 'fixed') {
      salesAed = (salesValueInr * rvRate) / 100000;
    } else {
      salesAed = Number(salesAedStr) || 0;
    }

    const grossProfit = salesAed - pureCostAed - expenses;
    const nPPerGr = weight > 0 ? grossProfit / weight : 0;
    const totalProfitPerKg = weight > 0 ? (grossProfit / (weight / 1000)) : 0;

    const tProfit = totalProfitPerKg * (dealShare / 100);
    const mange = tProfit * (managerShare / 100);
    const aibakProfit = totalProfitPerKg * (aibakShare / 100);

    return {
      pureCostAed,
      salesAed,
      grossProfit,
      nPPerGr,
      tProfit,
      mange,
      aibakProfit,
    };
  }, [
    weight,
    rate,
    fixOrUnfix,
    salesValueInr,
    rvRate,
    salesAedStr,
    expenses,
    dealShare,
    managerShare,
    aibakShare,
  ]);

  const partnerBreakdown = useMemo(() => {
    if (!deal || !deal.investors) return [];
    const remainingProfit = calculations.tProfit - calculations.mange;
    return deal.investors.map(inv => {
      const sharePercentage = deal.amount > 0 ? (inv.amount / deal.amount) * 100 : 0;
      const payout = remainingProfit * (sharePercentage / 100);
      return {
        name: inv.investorName,
        percentage: sharePercentage,
        payout,
      };
    });
  }, [deal, calculations.tProfit, calculations.mange]);

  const handleSubmit = async () => {
    setError('');

    if (!date) return setError('Date is required.');
    if (!dealNum.trim()) return setError('Deal number is required.');
    if (weight <= 0) return setError('Weight must be greater than zero.');
    if (rate <= 0) return setError('Purchase rate must be greater than zero.');

    if (fixOrUnfix === 'fixed') {
      if (salesValueInr <= 0) return setError('Sales Value INR is required for fixed deals.');
      if (rvRate <= 0) return setError('RV Rate is required for fixed deals.');
    } else {
      if (calculations.salesAed <= 0) return setError('Sales AED is required for unfixed deals.');
    }

    const newTxn: DealTransaction = {
      id: editTransaction ? editTransaction.id : `txn-${Date.now()}`,
      date,
      deal: dealNum.trim(),
      weight,
      rate,
      pureCostAed: Number(calculations.pureCostAed.toFixed(2)),
      salesValueInr,
      rvRate,
      salesAed: Number(calculations.salesAed.toFixed(2)),
      expenses,
      grossProfit: Number(calculations.grossProfit.toFixed(2)),
      nPPerGr: Number(calculations.nPPerGr.toFixed(4)),
      tProfit: Number(calculations.tProfit.toFixed(2)),
      mange: Number(calculations.mange.toFixed(2)),
      aibakProfit: Number(calculations.aibakProfit.toFixed(2)),
      fixOrUnfix,
      marginDeposit,
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
      title={editTransaction ? "Edit Deal Transaction" : "Add Deal Transaction"}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={handleSubmit}>
            {editTransaction ? 'Save Changes' : 'Add Transaction'}
          </button>
        </>
      }
    >
      {error && <div className={`${formError} mb-4`}>{error}</div>}

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Date</label>
          <input
            className={formInput}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
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
          <label className={formLabel}>Purchase Rate (AED)</label>
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
          <label className={formLabel}>Fix Status</label>
          <select
            className={formSelect}
            value={fixOrUnfix}
            onChange={e => setFixOrUnfix(e.target.value as 'fixed' | 'unfixed')}
          >
            <option value="fixed">Fixed</option>
            <option value="unfixed">Unfixed</option>
          </select>
        </div>
        {fixOrUnfix === 'unfixed' ? (
          <div className={formGroup}>
            <label className={formLabel}>Sales AED</label>
            <input
              className={formInput}
              type="number"
              placeholder="0.00"
              value={salesAedStr}
              onChange={e => setSalesAedStr(e.target.value)}
            />
          </div>
        ) : (
          <div className={formGroup}>
            <label className={formLabel}>Expenses (AED)</label>
            <input
              className={formInput}
              type="number"
              placeholder="0.00"
              value={expensesStr}
              onChange={e => setExpensesStr(e.target.value)}
            />
          </div>
        )}
      </div>

      {fixOrUnfix === 'fixed' && (
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Sales Value INR</label>
            <input
              className={formInput}
              type="number"
              placeholder="0.00"
              value={salesValueInrStr}
              onChange={e => setSalesValueInrStr(e.target.value)}
            />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>RV Rate</label>
            <input
              className={formInput}
              type="number"
              placeholder="0.00"
              value={rvRateStr}
              onChange={e => setRvRateStr(e.target.value)}
            />
          </div>
        </div>
      )}

      {fixOrUnfix === 'fixed' && (
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Expenses (AED)</label>
            <input
              className={formInput}
              type="number"
              placeholder="0.00"
              value={expensesStr}
              onChange={e => setExpensesStr(e.target.value)}
            />
          </div>
          <div className={formGroup}></div>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="mb-3 text-sm font-bold text-slate-800">Advanced Share Percentages</h4>
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Deal Share (%)</label>
            <input
              className={formInput}
              type="number"
              value={dealShareStr}
              onChange={e => setDealShareStr(e.target.value)}
            />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Aibak Share (%)</label>
            <input
              className={formInput}
              type="number"
              value={aibakShareStr}
              onChange={e => setAibakShareStr(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="mb-3 text-sm font-bold text-slate-800">Optional Adjustments</h4>
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Margin Deposit (AED)</label>
            <input
              className={formInput}
              type="number"
              value={marginDepositStr}
              onChange={e => setMarginDepositStr(e.target.value)}
            />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Premium / Discount (AED)</label>
            <input
              className={formInput}
              type="number"
              value={premiumDiscountStr}
              onChange={e => setPremiumDiscountStr(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Calculated Preview Card */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm">
        <h4 className="mb-3 text-sm font-bold text-emerald-800">Calculated Metrics Preview</h4>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
          <div>
            <p className="text-slate-400">Pure Cost AED</p>
            <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(calculations.pureCostAed)}</p>
          </div>
          <div>
            <p className="text-slate-400">Sales AED</p>
            <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(calculations.salesAed)}</p>
          </div>
          <div>
            <p className="text-slate-400">Gross Profit</p>
            <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(calculations.grossProfit)}</p>
          </div>
          <div>
            <p className="text-slate-400">N P.PER GR (Profit/g)</p>
            <p className="font-mono text-sm font-bold text-slate-900">{calculations.nPPerGr.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-slate-400">T Profit (Profit per kg)</p>
            <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(calculations.tProfit)}</p>
          </div>
          <div>
            <p className="text-slate-400">Management Share ({managerShare}%)</p>
            <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(calculations.mange)}</p>
          </div>
          <div>
            <p className="text-slate-400">Aibak Profit (AIBAK PROFIT)</p>
            <p className="font-mono text-sm font-bold text-emerald-700">{formatAEDStr(calculations.aibakProfit)}</p>
          </div>
          <div></div>

          {partnerBreakdown.length > 0 && (
            <div className="col-span-2 border-t border-emerald-100/50 pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Partner Profit Shares</p>
              <div className="grid grid-cols-2 gap-4">
                {partnerBreakdown.map((partner, idx) => (
                  <div key={idx}>
                    <p className="text-slate-400">{partner.name} ({partner.percentage.toFixed(2)}%)</p>
                    <p className="font-mono text-sm font-bold text-slate-900">{formatAEDStr(partner.payout)}</p>
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
