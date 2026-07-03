'use client';

import React, { useState, useEffect, useMemo } from 'react';
// Removed Modal import
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
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
import StockMetalSelect from './StockMetalSelect';
import { PhysicalBuy } from '@/types';
import { buildDraftSell, type PhysicalDraftSell } from '@/lib/physical/drafts';

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
    {children}
  </div>
);

const cleanInput = "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors";
const cleanSelect = "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0px_center] bg-no-repeat pr-6";

const defaultForm = () => normalizePhysicalSellForm({});

interface PhysicalStockSellModalProps {
  slug: string;
  availableBuys: PhysicalBuy[];
  initialBuyId?: string;
  onClose: () => void;
  onSuccess: () => void;
  onSaveDraft?: (draft: PhysicalDraftSell) => void;
}

export default function PhysicalDealSellForm({
  slug,
  availableBuys,
  initialBuyId,
  onClose,
  onSuccess,
  onSaveDraft,
}: PhysicalStockSellModalProps) {
  const { currencyRates } = useApp();
  const [selectedBuyId, setSelectedBuyId] = useState('');
  const [form, setForm] = useState(() =>
    normalizePhysicalSellForm({
      ...defaultForm(),
      txnId: generatePhysicalTxnId(slug, 'SELL'),
    }),
  );
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const selectedBuy = availableBuys.find(b => b.id === selectedBuyId) ?? null;
  const costPerGram =
    selectedBuy && selectedBuy.pureGram > 0 ? selectedBuy.buyValue / selectedBuy.pureGram : 0;

  useEffect(() => {
    const defaultId =
      initialBuyId && availableBuys.some(b => b.id === initialBuyId)
        ? initialBuyId
        : '';
    setSelectedBuyId(defaultId);
    setForm(prev =>
      normalizePhysicalSellForm({
        ...defaultForm(),
        txnId: prev.txnId || generatePhysicalTxnId(slug, 'SELL'),
      }),
    );
    getCustomersBySlug(slug).then(res => {
      if (res.success && res.customers) setCustomers(res.customers);
    });
  }, [slug, initialBuyId, availableBuys]);

  useEffect(() => {
    if (!selectedBuyId) {
      setForm(prev =>
        normalizePhysicalSellForm({
          ...defaultForm(),
          txnId: prev.txnId,
          date: prev.date,
          time: prev.time,
        }),
      );
      return;
    }
    const b = availableBuys.find(x => x.id === selectedBuyId);
    if (!b) return;
    // Exclude customer fields — selecting stock must not autofill the customer.
    const {
      idrGramStr: _idr,
      customerId: _cid,
      customerName: _cname,
      openingBalance: _ob,
      ...defaults
    } = buildSellFormDefaultsFromBuy(b);
    setForm(prev =>
      normalizePhysicalSellForm({
        ...prev,
        ...defaults,
        idrGramStr: prev.idrGramStr,
      }),
    );
  }, [selectedBuyId, availableBuys]);

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
    // Sell value in USDT equals the deal's totalUsdt; derive cost & profit in USDT
    // from the same rate so the trio stays internally consistent.
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

  const maxRemaining = selectedBuy?.remainingWeight ?? 0;
  const overLimit = calc.pureGram > maxRemaining;

  const buildSellPayload = (buy: PhysicalBuy) => {
    const dateTime = `${form.date}T${form.time}:00`;
    return {
      buyId: buy.id,
      date: dateTime,
      particulars: form.narration.trim() || buy.item || buy.particulars,
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
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!selectedBuy) {
      alert('Please select a stock metal');
      return;
    }
    if (overLimit) {
      alert(`Cannot sell more than remaining weight (${maxRemaining.toFixed(3)}g)`);
      return;
    }
    setIsSaving(true);
    const res = await dbAddPhysicalSellAction(buildSellPayload(selectedBuy));
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const handleSaveDraft = () => {
    if (!form.customerName.trim()) {
      alert('Customer name is required to save a draft');
      return;
    }
    if (!selectedBuy) {
      alert('Please select a stock metal to save a draft');
      return;
    }
    if (overLimit) {
      alert(`Cannot sell more than remaining weight (${maxRemaining.toFixed(3)}g)`);
      return;
    }
    onSaveDraft?.(buildDraftSell({ ...buildSellPayload(selectedBuy), profit: calc.profit }));
    onClose();
  };

  const previewRow = buildSellPreviewRow(form, calc);

  if (availableBuys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center h-96">
        <div className="rounded-full bg-slate-50 p-4 mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Stock Available</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-sm">There are currently no unfixed or available buys to sell from. Please register a physical buy first.</p>
        <button type="button" onClick={onClose} className="mt-6 px-6 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
          Close
        </button>
      </div>
    );
  }

  return (
    <form id="physical-stock-sell-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
      
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-medium -mt-4">
        <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">#{form.txnId || 'PENDING'}</span>
        <span>•</span>
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</span>
          <input
            type="date"
            value={form.date}
            onChange={e => set({ date: e.target.value })}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-0"
            required
          />
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time</span>
          <input
            type="time"
            value={form.time}
            onChange={e => set({ time: e.target.value })}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-0"
            required
          />
        </label>
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
            <InputField label="Select Stock">
              <StockMetalSelect
                availableBuys={availableBuys}
                selectedBuyId={selectedBuyId}
                onSelect={setSelectedBuyId}
              />
            </InputField>
          </div>
        </div>

        <div className="flex flex-col gap-5 pt-2">
          <h3 className="text-sm font-bold text-slate-800">Trade Details</h3>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-5">
            <InputField label="Gram">
              <input type="number" step="0.001" className={cleanInput} value={form.grossWeightStr} onChange={e => set({ grossWeightStr: e.target.value })} disabled={!selectedBuy} required />
            </InputField>
            
            <InputField label="Touch">
              <input type="number" step="0.0001" className={cleanInput} value={form.touchStr} onChange={e => set({ touchStr: e.target.value })} disabled={!selectedBuy} required />
            </InputField>
            
            <InputField label="Loss">
              <input type="number" step="0.001" className={cleanInput} value={form.touchLossStr} onChange={e => set({ touchLossStr: e.target.value })} disabled={!selectedBuy} />
            </InputField>
            
            <InputField label="Purity">
              <div className={`py-1.5 text-sm font-bold font-mono ${overLimit ? 'text-red-600' : 'text-slate-900'}`}>
                {calc.actualPurity.toFixed(3)}
              </div>
            </InputField>
            
            <InputField label="IDR per Gram">
              <input type="number" step="1" className={cleanInput} value={form.idrGramStr} onChange={e => set({ idrGramStr: e.target.value })} disabled={!selectedBuy} required />
            </InputField>
            
            <InputField label="USDT Rate">
              <input type="number" step="1" className={cleanInput} value={form.idrToUsdtStr} onChange={e => set({ idrToUsdtStr: e.target.value })} disabled={!selectedBuy} required />
            </InputField>
            
            <InputField label="USD">
              <input type="number" step="0.01" className={cleanInput} value={form.usdAmountStr} onChange={(e) => set({ usdAmountStr: e.target.value })} placeholder="0.00" disabled={!selectedBuy} />
            </InputField>
            
            <InputField label="AED">
              <input type="number" step="0.01" className={cleanInput} value={form.aedAmountStr} onChange={(e) => set({ aedAmountStr: e.target.value })} placeholder="0.00" disabled={!selectedBuy} />
            </InputField>
            
            <InputField label="Payment Mode">
              <select className={cleanSelect} value={form.paymentMode} onChange={e => set({ paymentMode: e.target.value as PhysicalPaymentMode })}>
                {PAYMENT_MODE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </InputField>

            <InputField label="Deal">
              <input type="number" step="0.01" className={cleanInput} value={form.dealStr} onChange={e => set({ dealStr: e.target.value })} disabled={!selectedBuy} />
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
              <span className="text-lg md:text-xl font-black text-slate-800 font-mono tracking-tight">{calc.actualPurity.toFixed(3)}<span className="text-xs font-bold text-slate-400 ml-1">g</span></span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buy Value (USDT)</span>
              <span className="text-lg md:text-xl font-black text-slate-600 font-mono tracking-tight">{calc.costValueUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit (USDT)</span>
              <span className={`text-lg md:text-xl font-black font-mono tracking-tight ${calc.profitUsdt >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {calc.profitUsdt >= 0 ? '+' : ''}{calc.profitUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200/60">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total IDR</span>
              <span className="text-xl md:text-2xl font-black text-slate-800 font-mono tracking-tight">{calc.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total USDT</span>
              <span className="text-xl md:text-2xl font-black text-emerald-600 font-mono tracking-tight">{calc.totalUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-4">
        <PhysicalTxnPreview rows={[previewRow]} columns={SELL_PREVIEW_COLUMNS} />
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 mt-2 sm:flex-row sm:justify-end sm:gap-3 [&>button]:w-full sm:[&>button]:w-auto">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 transition-colors rounded-xl hover:bg-slate-100 hover:text-slate-900">
          Cancel
        </button>
        {onSaveDraft && (
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving || !selectedBuy || overLimit}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Save as Draft
          </button>
        )}
        <button type="submit" disabled={isSaving || !selectedBuy || overLimit} className={`${btnPrimary} ${isSaving || !selectedBuy ? 'opacity-50' : ''}`}>
          {isSaving ? 'Saving...' : 'Register Sell'}
        </button>
      </div>
    </form>
  );
}
