'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Deal, DealTransaction, DealTransactionExpense } from '@/types';
import { formatAEDStr, getGlobalCurrency } from '@/data/mockData';
import { dbFetchDealExpensesAction } from '@/app/actions/dbActions';
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

  const [liveSellRateStr, setLiveSellRateStr] = useState('');
  const [sellPremiumDiscountStr, setSellPremiumDiscountStr] = useState('');
  const [expensesStr, setExpensesStr] = useState('0');
  const [fetchedExpenseItems, setFetchedExpenseItems] = useState<DealTransactionExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLiveSellRateStr(transaction.liveSellRate ? transaction.liveSellRate.toString() : '');
      setSellPremiumDiscountStr(transaction.sellPremiumDiscount ? transaction.sellPremiumDiscount.toString() : '');
      setError('');
      setFetchedExpenseItems([]);

      // Auto-fetch itemised expenses and sum them
      setExpensesLoading(true);
      dbFetchDealExpensesAction(transaction.id).then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setFetchedExpenseItems(res.data);
          const total = res.data.reduce((acc, e) => acc + e.value, 0);
          setExpensesStr(total.toFixed(4));
        } else {
          // Fallback: use value already stored on the transaction row
          setExpensesStr(transaction.expenses ? transaction.expenses.toString() : '0');
        }
        setExpensesLoading(false);
      });
    }
  }, [open, transaction]);

  const liveSellRate = Number(liveSellRateStr) || 0; // Live rate per gram (AED/gram)
  const sellPremiumDiscount = Number(sellPremiumDiscountStr) || 0; // Sell premium/discount (per troy oz)
  const expenses = Number(expensesStr) || 0;
  const weight = transaction.weight;
  const pureCostAed = transaction.pureCostAed;
  const managerShare = deal.managerShare ?? 20;

  const calculations = useMemo(() => {
    // 1 troy oz = 31.1034768 grams
    const sellPremiumDiscountPerGram = sellPremiumDiscount / 31.1034768;
    const effectiveSellRate = liveSellRate + sellPremiumDiscountPerGram;
    const salesAed = weight * effectiveSellRate;

    const grossProfit = salesAed - pureCostAed - expenses;
    const netProfitPerGram = weight > 0 ? grossProfit / weight : 0;
    const managementProfit = grossProfit * (managerShare / 100);
    const investorProfitPool = grossProfit - managementProfit;

    return {
      sellPremiumDiscountPerGram,
      effectiveSellRate,
      salesAed,
      grossProfit,
      netProfitPerGram,
      managementProfit,
      investorProfitPool,
    };
  }, [liveSellRate, sellPremiumDiscount, expenses, pureCostAed, weight, managerShare]);

  const partnerBreakdown = useMemo(() => {
    if (!deal || !deal.investors) return [];
    return deal.investors.map(inv => {
      const sharePercentage = deal.amount > 0 ? (inv.amount / deal.amount) * 100 : 0;
      const volumeShare = weight * (sharePercentage / 100);
      const purchaseShare = pureCostAed * (sharePercentage / 100);
      const salesShare = calculations.salesAed * (sharePercentage / 100);
      const payout = calculations.investorProfitPool * (sharePercentage / 100);
      return {
        name: inv.investorName,
        percentage: sharePercentage,
        volumeShare,
        purchaseShare,
        salesShare,
        payout,
      };
    });
  }, [deal, calculations.investorProfitPool, weight, pureCostAed, calculations.salesAed]);

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

    if (liveSellRate <= 0) return setError('Live rate per gram is required.');

    const updatedTxn: DealTransaction = {
      ...transaction,
      liveSellRate,
      sellPremiumDiscount,
      salesAed: Number(calculations.salesAed.toFixed(2)),
      expenses,
      grossProfit: Number(calculations.grossProfit.toFixed(2)),
      netProfitPerGram: Number(calculations.netProfitPerGram.toFixed(4)),
      managementProfit: Number(calculations.managementProfit.toFixed(2)),
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
          <span className="text-slate-400">Purchase Cost:</span>{' '}
          <span className="text-slate-900">{formatCost(pureCostAed)} AED</span>
        </div>
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Live Selling Rate (AED/Gram)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={liveSellRateStr}
            onChange={e => setLiveSellRateStr(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Sell Premium / Discount (per troy oz)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={sellPremiumDiscountStr}
            onChange={e => setSellPremiumDiscountStr(e.target.value)}
          />
        </div>
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>
            Expenses (AED)
            {expensesLoading && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                fetching…
              </span>
            )}
          </label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={expensesStr}
            onChange={e => setExpensesStr(e.target.value)}
          />
          {/* Itemised expense breakdown chips */}
          {!expensesLoading && fetchedExpenseItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fetchedExpenseItems.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700"
                >
                  <span className="text-rose-400">{item.key}:</span>
                  <span className="font-mono font-black">AED {item.value.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                </span>
              ))}
              <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                {fetchedExpenseItems.length} item{fetchedExpenseItems.length !== 1 ? 's' : ''} auto-loaded
              </span>
            </div>
          )}
          {!expensesLoading && fetchedExpenseItems.length === 0 && (
            <p className="mt-1 text-[10px] text-slate-400">No itemised expenses found — enter manually or add via Expenses button.</p>
          )}
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
        <h4 className="mb-4 text-sm font-bold text-emerald-800 flex items-center gap-1.5 border-b border-emerald-100/50 pb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M12 14h.01M15 11h.01M15 7h.01M18 21H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" />
          </svg>
          Sale Performance Inference
        </h4>

        {/* 1. Rates & Overalls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Effective Sell Rate</p>
            <p className="font-mono text-sm font-bold text-slate-900 mt-1">{formatCost(calculations.effectiveSellRate)} /g</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Sales (AED)</p>
            <p className="font-mono text-sm font-bold text-slate-900 mt-1">{formatCost(calculations.salesAed)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Profit</p>
            <p className={`font-mono text-sm font-bold mt-1 ${calculations.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCost(calculations.grossProfit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Profit / g</p>
            <p className={`font-mono text-sm font-bold mt-1 ${calculations.netProfitPerGram >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCost(calculations.netProfitPerGram)}</p>
          </div>
        </div>

        {/* 2. Investor Breakdown */}
        <div className="border-t border-emerald-100/50 pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-emerald-800">Investor Breakdown</p>
          <div className="flex flex-col gap-3">
            {partnerBreakdown.map((partner, idx) => (
              <div key={idx} className="flex flex-col rounded-xl bg-white border border-emerald-100/40 p-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-50 pb-2 mb-2">
                  <div>
                    <p className="font-bold text-slate-800 uppercase text-xs">{partner.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{partner.percentage.toFixed(2)}% share</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Net Profit</p>
                    <p className={`font-mono text-sm font-black ${partner.payout >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCost(partner.payout)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Volume (g)</p>
                    <p className="font-mono text-xs font-semibold text-slate-700">{partner.volumeShare.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Purchase</p>
                    <p className="font-mono text-xs font-semibold text-slate-700">{formatCost(partner.purchaseShare)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Sales</p>
                    <p className="font-mono text-xs font-semibold text-slate-700">{formatCost(partner.salesShare)}</p>
                  </div>
                </div>
              </div>
            ))}

            {managerShare > 0 && (
              <div className="flex justify-between items-center rounded-xl bg-emerald-50/50 border border-emerald-500/20 p-3 shadow-sm mt-1">
                <div>
                  <p className="font-bold text-slate-800 uppercase text-xs">Management</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{managerShare}% fee</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-emerald-600/70 font-bold uppercase tracking-wider mb-0.5">Net Profit</p>
                  <p className={`font-mono text-sm font-black ${calculations.managementProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCost(calculations.managementProfit)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
