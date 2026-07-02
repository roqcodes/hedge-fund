'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary } from '@/lib/ui';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { dbAddPhysicalSellAction } from '@/app/actions/physicalActions';
import {
  buildSellFormDefaultsFromBuy,
  computePhysicalTxn,
  computeSellMetrics,
  generatePhysicalTxnId,
  normalizePhysicalSellForm,
  type PhysicalSellFormFields,
  PAYMENT_MODE_OPTIONS,
  type PhysicalPaymentMode,
} from '@/lib/physicalCalculations';
import { convertFromAed } from '@/lib/currency';
import { convertAedToUsdt } from '@/lib/physicalCurrencyDisplay';
import { useApp } from '@/context/AppContext';
import PhysicalTxnPreview, { buildSellPreviewRow, SELL_PREVIEW_COLUMNS } from './PhysicalTxnPreview';
import { PhysicalBuy } from '@/types';

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
    {children}
  </div>
);

const cleanInput =
  'w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors';
const cleanSelect =
  "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0px_center] bg-no-repeat pr-6";

const defaultForm = () => normalizePhysicalSellForm({});

interface PhysicalSellModalProps {
  open: boolean;
  slug: string;
  buy: PhysicalBuy;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhysicalSellModal({ open, slug, buy, onClose, onSuccess }: PhysicalSellModalProps) {
  const { currencyRates } = useApp();
  const [form, setForm] = useState(defaultForm());
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const costPerGram = buy.pureGram > 0 ? buy.buyValue / buy.pureGram : 0;
  const maxRemaining = buy.remainingWeight;
  const stockName = buy.item || buy.particulars || 'Stock';

  useEffect(() => {
    if (!open) return;
    const {
      idrGramStr: _idr,
      customerId: _cid,
      customerName: _cname,
      openingBalance: _ob,
      ...defaults
    } = buildSellFormDefaultsFromBuy(buy);
    setForm(
      normalizePhysicalSellForm({
        ...defaultForm(),
        txnId: generatePhysicalTxnId(slug, 'SELL'),
        ...defaults,
        idrGramStr: '',
      }),
    );
    getCustomersBySlug(slug).then(res => {
      if (res.success && res.customers) setCustomers(res.customers);
    });
  }, [open, slug, buy]);

  const set = (patch: Partial<PhysicalSellFormFields>) =>
    setForm(prev => normalizePhysicalSellForm({ ...prev, ...patch }));

  const calc = useMemo(() => {
    const grossWeight = parseFloat(form.grossWeightStr) || 0;
    const touch = parseFloat(form.touchStr) || 1;
    const touchLoss = parseFloat(form.touchLossStr) || 0;
    const idrGram = parseFloat(form.idrGramStr) || 0;
    const idrToUsdt = parseFloat(form.idrToUsdtStr) || 17770;
    const base = computePhysicalTxn({ grossWeight, touch, touchLoss, idrGram, idrToUsdt });
    const metrics = computeSellMetrics(base, costPerGram);
    const costValueUsdt = convertAedToUsdt(metrics.costValue, currencyRates);
    const profitUsdt = base.totalUsdt - costValueUsdt;
    return {
      grossWeight,
      touch,
      actualPurity: base.actualPurity,
      idrGram,
      idrToUsdt,
      tltIdrValue: base.tltIdrValue,
      tltAedValue: base.tltAedValue,
      totalUsdt: base.totalUsdt,
      pureGram: base.pureGram,
      idrRate: base.idrRate,
      total: base.total,
      ...metrics,
      costValueUsdt,
      profitUsdt,
    };
  }, [form, costPerGram, currencyRates]);

  useEffect(() => {
    const sellValue = calc.sellValue;
    if (sellValue <= 0) {
      setForm(prev =>
        normalizePhysicalSellForm({
          ...prev,
          usdAmountStr: '',
          aedAmountStr: '',
        }),
      );
      return;
    }
    const aedStr = sellValue.toFixed(2);
    const usdStr = convertFromAed(sellValue, 'USD').toFixed(2);
    setForm(prev =>
      normalizePhysicalSellForm({
        ...prev,
        aedAmountStr: aedStr,
        usdAmountStr: usdStr,
      }),
    );
  }, [calc.sellValue, currencyRates]);

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name}${c.balance != null ? ` (AED ${Number(c.balance).toLocaleString()})` : ''}`,
  }));

  const overLimit = calc.pureGram > maxRemaining;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overLimit) {
      alert(`Cannot sell more than remaining weight (${maxRemaining.toFixed(3)}g)`);
      return;
    }
    setIsSaving(true);
    const dateTime = `${form.date}T${form.time}:00`;
    const res = await dbAddPhysicalSellAction({
      buyId: buy.id,
      date: dateTime,
      particulars: form.narration.trim() || stockName,
      grossWeight: calc.grossWeight,
      pureConversion: calc.touch,
      pureGram: calc.pureGram,
      idrGram: calc.idrGram,
      idrToUsdt: calc.idrToUsdt,
      idrRate: calc.idrRate,
      total: calc.total,
      sellValue: calc.sellValue,
      txnId: form.txnId,
      customerId: form.customerId || undefined,
      customerName: form.customerName.trim() || undefined,
      openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : undefined,
      narration: form.narration.trim() || undefined,
      notes: form.notes.trim() || undefined,
      touchLoss: parseFloat(form.touchLossStr) || undefined,
      actualPurity: calc.actualPurity,
      marketUsd: parseFloat(form.marketUsdStr) || undefined,
      deal: parseFloat(form.dealStr) || undefined,
      paymentMode: form.paymentMode,
      idrAmount: calc.idrGram || undefined,
      usdAmount: parseFloat(form.usdAmountStr) || undefined,
      aedAmount: parseFloat(form.aedAmountStr) || undefined,
      totalWeight: calc.actualPurity,
      tltIdrValue: calc.tltIdrValue,
      tltAedValue: calc.tltAedValue,
      totalUsdt: calc.totalUsdt,
      costValue: calc.costValue,
      margin: calc.margin,
    });
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const previewRow = buildSellPreviewRow(form, calc);
  const formattedDate = new Date(form.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(`1970-01-01T${form.time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="New Gold Sell" maxWidth="max-w-[1200px] w-[96vw]">
      <div className="pt-2">
        <form id="physical-sell-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 font-medium -mt-4">
            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              #{form.txnId || 'PENDING'}
            </span>
            <span>•</span>
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{formattedTime}</span>
          </div>

          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-800">Customer</h3>
                <InputField label="Search Customer">
                  <ComboSearchInput
                    value={form.customerName}
                    onChange={v => set({ customerName: v, customerId: '', openingBalance: '' })}
                    onSelectOption={opt => {
                      const c = customers.find(x => x.id === opt.value);
                      if (c) {
                        set({
                          customerId: c.id,
                          customerName: c.name,
                          openingBalance: String(c.balance ?? 0),
                        });
                      }
                    }}
                    options={customerOptions}
                    placeholder="Select customer..."
                    className="!border-0 !border-b !border-slate-200 !rounded-none !bg-transparent !px-0 !shadow-none focus-within:!border-slate-400"
                  />
                </InputField>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-800">Stock Metal</h3>
                <InputField label="Selling From">
                  <div className="flex flex-col gap-0.5 border-b border-slate-200 py-1.5">
                    <span className="text-sm font-semibold text-slate-800">{stockName}</span>
                    <span className="text-[11px] text-slate-500">
                      Touch {buy.pureConversion}
                      {buy.purity != null ? ` · Purity ${buy.purity}` : ''}
                      {' · '}
                      <span className="font-bold text-amber-600">{maxRemaining.toFixed(3)}g available</span>
                    </span>
                  </div>
                </InputField>
              </div>
            </div>

            <div className="flex flex-col gap-5 pt-2">
              <h3 className="text-sm font-bold text-slate-800">Trade Details</h3>

              <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-5">
                <InputField label="Gram">
                  <input
                    type="number"
                    step="0.001"
                    className={cleanInput}
                    value={form.grossWeightStr}
                    onChange={e => set({ grossWeightStr: e.target.value })}
                    required
                  />
                </InputField>

                <InputField label="Touch">
                  <input
                    type="number"
                    step="0.0001"
                    className={cleanInput}
                    value={form.touchStr}
                    onChange={e => set({ touchStr: e.target.value })}
                    required
                  />
                </InputField>

                <InputField label="Loss">
                  <input
                    type="number"
                    step="0.001"
                    className={cleanInput}
                    value={form.touchLossStr}
                    onChange={e => set({ touchLossStr: e.target.value })}
                  />
                </InputField>

                <InputField label="Purity">
                  <div
                    className={`py-1.5 text-sm font-bold font-mono ${overLimit ? 'text-red-600' : 'text-slate-900'}`}
                  >
                    {calc.actualPurity.toFixed(3)}
                  </div>
                </InputField>

                <InputField label="IDR per Gram">
                  <input
                    type="number"
                    step="1"
                    className={cleanInput}
                    value={form.idrGramStr}
                    onChange={e => set({ idrGramStr: e.target.value })}
                    required
                  />
                </InputField>

                <InputField label="USDT Rate">
                  <input
                    type="number"
                    step="1"
                    className={cleanInput}
                    value={form.idrToUsdtStr}
                    onChange={e => set({ idrToUsdtStr: e.target.value })}
                    required
                  />
                </InputField>

                <InputField label="USD">
                  <input
                    type="number"
                    step="0.01"
                    className={cleanInput}
                    value={form.usdAmountStr}
                    onChange={e => set({ usdAmountStr: e.target.value })}
                    placeholder="0.00"
                  />
                </InputField>

                <InputField label="AED">
                  <input
                    type="number"
                    step="0.01"
                    className={cleanInput}
                    value={form.aedAmountStr}
                    onChange={e => set({ aedAmountStr: e.target.value })}
                    placeholder="0.00"
                  />
                </InputField>

                <InputField label="Payment Mode">
                  <select
                    className={cleanSelect}
                    value={form.paymentMode}
                    onChange={e => set({ paymentMode: e.target.value as PhysicalPaymentMode })}
                  >
                    {PAYMENT_MODE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Deal">
                  <input
                    type="number"
                    step="0.01"
                    className={cleanInput}
                    value={form.dealStr}
                    onChange={e => set({ dealStr: e.target.value })}
                  />
                </InputField>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="flex flex-col justify-center">
              <InputField label="Notes">
                <textarea
                  value={form.notes}
                  onChange={e => set({ notes: e.target.value })}
                  rows={2}
                  className="w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0 resize-none transition-colors"
                  placeholder="Additional notes..."
                />
              </InputField>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 shadow-sm flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Weight</span>
                  <span className="text-lg md:text-xl font-black text-slate-800 font-mono tracking-tight">
                    {calc.actualPurity.toFixed(3)}
                    <span className="text-xs font-bold text-slate-400 ml-1">g</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buy Value (USDT)</span>
                  <span className="text-lg md:text-xl font-black text-slate-600 font-mono tracking-tight">
                    {calc.costValueUsdt.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit (USDT)</span>
                  <span
                    className={`text-lg md:text-xl font-black font-mono tracking-tight ${calc.profitUsdt >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {calc.profitUsdt >= 0 ? '+' : ''}
                    {calc.profitUsdt.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200/60">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total IDR</span>
                  <span className="text-xl md:text-2xl font-black text-slate-800 font-mono tracking-tight">
                    {calc.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total USDT</span>
                  <span className="text-xl md:text-2xl font-black text-emerald-600 font-mono tracking-tight">
                    {calc.totalUsdt.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="-mt-4">
            <PhysicalTxnPreview rows={[previewRow]} columns={SELL_PREVIEW_COLUMNS} />
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 mt-2 sm:flex-row sm:justify-end sm:gap-3 [&>button]:w-full sm:[&>button]:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 transition-colors rounded-xl hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || overLimit}
              className={`${btnPrimary} ${isSaving || overLimit ? 'opacity-50' : ''}`}
            >
              {isSaving ? 'Saving...' : 'Register Sell'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
