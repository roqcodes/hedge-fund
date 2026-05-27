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
  formError,
} from '@/lib/ui';

export default function SellDealModal({
  open,
  onClose,
  deal,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  transaction: DealTransaction;
}) {
  const { updateDealTransaction } = useApp();

  const [salesValueInrStr, setSalesValueInrStr] = useState('');
  const [rvRateStr, setRvRateStr] = useState('');
  const [expensesStr, setExpensesStr] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSalesValueInrStr(transaction.salesValueInr ? transaction.salesValueInr.toString() : '');
      setRvRateStr(transaction.rvRate ? transaction.rvRate.toString() : '');
      setExpensesStr(transaction.expenses ? transaction.expenses.toString() : '0');
      setError('');
    }
  }, [open, transaction]);

  const salesValueInr = Number(salesValueInrStr) || 0;
  const rvRate = Number(rvRateStr) || 0;
  const expenses = Number(expensesStr) || 0;
  const weight = transaction.weight;
  const pureCostAed = transaction.pureCostAed;
  const managerShare = deal.managerShare ?? 20;

  const calculations = useMemo(() => {
    const salesAed = (salesValueInr * rvRate) / 100000;
    const grossProfit = salesAed - pureCostAed - expenses;
    const nPPerGr = weight > 0 ? grossProfit / weight : 0;
    const tProfit = weight > 0 ? (grossProfit / (weight / 1000)) : 0;
    const mange = tProfit * (managerShare / 100);
    const investorProfitPool = tProfit - mange;

    return {
      salesAed,
      grossProfit,
      nPPerGr,
      tProfit,
      mange,
      investorProfitPool,
    };
  }, [salesValueInr, rvRate, expenses, pureCostAed, weight, managerShare]);

  const partnerBreakdown = useMemo(() => {
    if (!deal || !deal.investors) return [];
    return deal.investors.map(inv => {
      const sharePercentage = deal.amount > 0 ? (inv.amount / deal.amount) * 100 : 0;
      const payout = calculations.investorProfitPool * (sharePercentage / 100);
      return {
        name: inv.investorName,
        percentage: sharePercentage,
        payout,
      };
    });
  }, [deal, calculations.investorProfitPool]);

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

  const handleSubmit = async () => {
    setError('');

    if (salesValueInr <= 0) return setError('Sales Value INR is required.');
    if (rvRate <= 0) return setError('RV Rate is required.');

    const updatedTxn: DealTransaction = {
      ...transaction,
      salesValueInr,
      rvRate,
      salesAed: Number(calculations.salesAed.toFixed(2)),
      expenses,
      grossProfit: Number(calculations.grossProfit.toFixed(2)),
      nPPerGr: Number(calculations.nPPerGr.toFixed(4)),
      tProfit: Number(calculations.tProfit.toFixed(2)),
      mange: Number(calculations.mange.toFixed(2)),
      aibakProfit: Number(calculations.mange.toFixed(2)),
      fixOrUnfix: 'fixed', // Mark as settled
    };

    const success = await updateDealTransaction(updatedTxn);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Sell Deal #${transaction.deal}`}
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={handleSubmit}>
            Confirm Sale
          </button>
        </>
      }
    >
      {error && <div className={`${formError} mb-4`}>{error}</div>}

      <div className="mb-4 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-2 gap-3">
        <div>
          <span className="text-slate-400">Deal Weight:</span>{' '}
          <span className="text-slate-900">{weight.toLocaleString()} g</span>
        </div>
        <div>
          <span className="text-slate-400">Pure Cost:</span>{' '}
          <span className="text-slate-900">{formatCost(pureCostAed)} AED</span>
        </div>
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Sales Value (INR)</label>
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
            placeholder="e.g. 3850"
            value={rvRateStr}
            onChange={e => setRvRateStr(e.target.value)}
          />
        </div>
      </div>

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
        <div className={formGroup}>
          <label className={formLabel}>Calculated Sales AED</label>
          <div className="font-mono text-sm font-bold text-slate-900 border border-slate-200 bg-slate-50/50 rounded-xl p-2.5 mt-1 h-[42px] flex items-center">
            {formatCost(calculations.salesAed)}
          </div>
        </div>
      </div>

      {/* Calculated Preview Card */}
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 shadow-sm">
        <h4 className="mb-4 text-sm font-bold text-emerald-800 flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M12 14h.01M15 11h.01M15 7h.01M18 21H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          Sale Performance Inference
        </h4>
        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
          <div>
            <p className="text-slate-400">Gross Profit (AED)</p>
            <p className={`font-mono text-base font-black ${calculations.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCost(calculations.grossProfit)}
            </p>
          </div>
          <div>
            <p className="text-slate-400">Total Profit (T Profit)</p>
            <p className={`font-mono text-base font-black ${calculations.tProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCost(calculations.tProfit)}
            </p>
          </div>
          <div className="col-span-2 border-t border-emerald-100/50 pt-2 mt-1">
            <p className="text-slate-400">Net Profit per Gram</p>
            <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
              {calculations.nPPerGr.toFixed(4)} /g
            </p>
          </div>

          <div className="col-span-2 border-t border-emerald-100/50 pt-3 mt-1 flex justify-between">
            <div>
              <p className="text-slate-400">Management share ({managerShare}%)</p>
              <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                {formatCost(calculations.mange)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400">Investor Pool</p>
              <p className="font-mono text-sm font-bold text-emerald-700 mt-0.5">
                {formatCost(calculations.investorProfitPool)}
              </p>
            </div>
          </div>

          {partnerBreakdown.length > 0 && (
            <div className="col-span-2 border-t border-emerald-100/50 pt-4 mt-2">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Investor Profit Payouts</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {partnerBreakdown.map((partner, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white border border-emerald-100/40 p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div>
                      <p className="font-bold text-slate-800 uppercase">{partner.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{partner.percentage.toFixed(2)}% share</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono text-sm font-black ${partner.payout >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCost(partner.payout)}
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
