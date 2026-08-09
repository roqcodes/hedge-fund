'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Deal, DealTransaction, DealTransactionExpense } from '@/types';
import { formatAEDStr, getGlobalCurrency } from '@/data/mockData';
import { dbFetchDealExpensesAction } from '@/app/actions/dbActions';
import type { DealBuyAggregates } from '@/lib/dealCalculations';
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
  aggregates,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  transaction: DealTransaction;
  aggregates?: DealBuyAggregates;
}) {
  const { updateDealTransaction } = useApp();

  const [liveSellRateStr, setLiveSellRateStr] = useState('');
  const [conversionRateStr, setConversionRateStr] = useState('');
  const [sellPremiumDiscountStr, setSellPremiumDiscountStr] = useState('');
  const [expensesStr, setExpensesStr] = useState('0');
  const [fetchedExpenseItems, setFetchedExpenseItems] = useState<DealTransactionExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [error, setError] = useState('');

  const parseSafeNumber = (val: string | number) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    if (!open) return;
    setLiveSellRateStr(transaction.liveSellRate ? transaction.liveSellRate.toString() : '');
    setConversionRateStr(transaction.conversionRate ? transaction.conversionRate.toString() : '');
    setSellPremiumDiscountStr(transaction.sellPremiumDiscount ? transaction.sellPremiumDiscount.toString() : '');
    setError('');
    setFetchedExpenseItems([]);

    const cached = transaction.expensesDetails;
    if (cached && cached.length > 0) {
      setFetchedExpenseItems(cached);
      const total = cached.reduce((acc, e) => acc + e.value, 0);
      setExpensesStr(total.toFixed(4));
      setExpensesLoading(false);
      return;
    }

    setExpensesLoading(true);
    dbFetchDealExpensesAction(transaction.id).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setFetchedExpenseItems(res.data);
        const total = res.data.reduce((acc, e) => acc + e.value, 0);
        setExpensesStr(total.toFixed(4));
      } else {
        setExpensesStr(transaction.expenses ? transaction.expenses.toString() : '0');
      }
      setExpensesLoading(false);
    });
  }, [open, transaction.id, transaction.liveSellRate, transaction.conversionRate, transaction.sellPremiumDiscount, transaction.expenses, transaction.expensesDetails]);

  const liveSellRateInr = parseSafeNumber(liveSellRateStr); // Live rate in INR per ounce
  const conversionRateInput = parseSafeNumber(conversionRateStr);
  const sellPremiumDiscount = parseSafeNumber(sellPremiumDiscountStr); // Sell premium/discount (per troy oz)
  const expenses = parseSafeNumber(expensesStr);
  const weight = aggregates?.totalWeight ?? transaction.weight;
  const pureCostAed = aggregates?.totalCost ?? transaction.pureCostAed;
  const currencyAmount = (aggregates?.totalCurrencyAmount ?? transaction.currencyAmount) || 0;
  const avgPurity = aggregates?.avgPurity ?? transaction.avgPurity;
  const managerShare = deal.managerShare ?? 20;

  const calculations = useMemo(() => {
    let salesAed = 0;
    let conversionMultiplier = 1;

    if (deal.groupType === 'currency') {
      salesAed = currencyAmount * conversionRateInput;
    } else {
      // Determine the conversion multiplier (handles both 3851 and 0.03851 forms)
      conversionMultiplier = conversionRateInput > 100 ? conversionRateInput / 100000 : conversionRateInput || 1;
      salesAed = liveSellRateInr * conversionMultiplier;
    }

    // 2. Gross Profit = Sales AED - Purchase AED
    const grossProfit = salesAed - pureCostAed;

    // 3. Net Profit = Gross Profit - Expenses
    const netProfit = grossProfit - expenses;
    const netProfitPerGram = weight > 0 ? netProfit / weight : 0; 

    // 4. Management & Investor Pool (from Net Profit)
    const managementProfit = netProfit > 0 ? netProfit * (managerShare / 100) : 0;
    const investorProfitPool = netProfit - managementProfit;

    return {
      conversionMultiplier,
      salesAed,
      grossProfit,
      netProfit,
      netProfitPerGram,
      managementProfit,
      investorProfitPool,
    };
  }, [liveSellRateInr, conversionRateInput, expenses, pureCostAed, weight, managerShare]);

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
    const sign = amount < 0 ? '-' : '';
    return `${sign}${numStr}`;
  };

  const isDirty = useMemo(() => {
    if (liveSellRateStr !== (transaction.liveSellRate ? transaction.liveSellRate.toString() : '')) return true;
    if (conversionRateStr !== '') return true;
    if (sellPremiumDiscountStr !== (transaction.sellPremiumDiscount ? transaction.sellPremiumDiscount.toString() : '')) return true;
    return false;
  }, [liveSellRateStr, conversionRateStr, sellPremiumDiscountStr, transaction]);

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (deal.groupType === 'currency') {
      if (conversionRateInput <= 0) return setError('Conversion rate is required.');
    } else {
      if (liveSellRateInr <= 0) return setError('Selling rate INR is required.');
    }

    const updatedTxn: DealTransaction = {
      ...transaction,
      weight,
      pureCostAed,
      currencyAmount: deal.groupType === 'currency' ? currencyAmount : transaction.currencyAmount,
      avgPurity: avgPurity ?? undefined,
      conversionRate: conversionRateInput,
      liveSellRate: deal.groupType === 'currency' ? 0 : Number(liveSellRateInr.toFixed(7)),
      sellPremiumDiscount: 0,
      salesAed: Number(calculations.salesAed.toFixed(7)),
      expenses: Number(expenses.toFixed(7)),
      grossProfit: Number(calculations.netProfit.toFixed(7)), // DB gross_profit stores Net Profit
      netProfitPerGram: Number(calculations.netProfitPerGram.toFixed(7)),
      managementProfit: Number(calculations.managementProfit.toFixed(7)),
      fixOrUnfix: 'fixed', // Mark as settled
      payouts: partnerBreakdown.map(p => ({
        id: `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        dealTransactionId: transaction.id,
        investorId: deal.investors.find(i => i.investorName === p.name)?.investorId || '',
        investorName: p.name,
        payoutAmount: p.payout,
      })),
    };

    const success = await updateDealTransaction(updatedTxn);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Settle / Sell Deal"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className={btnPrimary} onClick={handleSubmit}>
            Confirm Sale
          </button>
        </>
      }
    >
      {transaction.fixOrUnfix === 'fixed' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          ⚠️ This deal has already been settled. Confirming the sale will override the previous settlement data.
        </div>
      )}
      {error && <div className={`${formError} mb-4`}>{error}</div>}

      <div className="mb-4 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-2 gap-3">
        {deal.groupType === 'currency' ? (
          <div>
            <span className="text-slate-400">Deal Amount:</span>{' '}
            <span className="text-slate-900">{currencyAmount.toLocaleString()} Currency</span>
          </div>
        ) : (
          <>
            <div>
              <span className="text-slate-400">Total Weight:</span>{' '}
              <span className="text-slate-900">{weight.toLocaleString()} g</span>
            </div>
            {avgPurity != null && (
              <div>
                <span className="text-slate-400">Avg Purity:</span>{' '}
                <span className="text-slate-900 font-mono">{avgPurity.toFixed(4)}</span>
              </div>
            )}
          </>
        )}
        <div>
          <span className="text-slate-400">Purchase Cost:</span>{' '}
          <span className="text-slate-900">{formatCost(pureCostAed)} AED</span>
        </div>
        {aggregates && aggregates.buyCount > 1 && (
          <div className="col-span-2 text-[10px] text-slate-400">
            Averaged across {aggregates.buyCount} buy legs
          </div>
        )}
      </div>

      <div className={formRow}>
        {deal.groupType === 'currency' ? (
          <>
            <div className={formGroup}>
              <label className={formLabel}>Currency Amount (Buy Value)</label>
              <input
                className={formInput}
                type="number"
                value={transaction.currencyAmount?.toString() || '0'}
                disabled
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Conversion Rate</label>
              <input
                className={formInput}
                type="number"
                placeholder="0.00"
                value={conversionRateStr}
                onChange={e => setConversionRateStr(e.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div className={formGroup}>
              <label className={formLabel}>Selling Rate INR</label>
              <input
                className={formInput}
                type="number"
                placeholder="0.00"
                value={liveSellRateStr}
                onChange={e => setLiveSellRateStr(e.target.value)}
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>INR to AED Rate</label>
              <input
                className={formInput}
                type="number"
                placeholder="3851"
                value={conversionRateStr}
                onChange={e => setConversionRateStr(e.target.value)}
              />
            </div>
          </>
        )}
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
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Sales (AED)</p>
            <p className="font-mono text-sm font-bold text-slate-900 mt-1">{formatCost(calculations.salesAed)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gross Profit</p>
            <p className={`font-mono text-sm font-bold mt-1 ${calculations.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCost(calculations.grossProfit)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net Profit</p>
            <p className={`font-mono text-sm font-bold mt-1 ${calculations.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCost(calculations.netProfit)}</p>
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
                  {deal.groupType !== 'currency' && (
                    <div>
                      <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Volume (g)</p>
                      <p className="font-mono text-xs font-semibold text-slate-700">{partner.volumeShare.toFixed(3)}</p>
                    </div>
                  )}
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
