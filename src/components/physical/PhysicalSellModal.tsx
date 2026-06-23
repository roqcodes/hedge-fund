'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
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
import { useApp } from '@/context/AppContext';
import PhysicalTxnPreview, { buildSellPreviewRow, SELL_PREVIEW_COLUMNS } from './PhysicalTxnPreview';
import { PhysicalBuy } from '@/types';

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

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

  useEffect(() => {
    if (!open) return;
    const { idrGramStr: _idr, ...defaults } = buildSellFormDefaultsFromBuy(buy);
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

  const set = (patch: Partial<PhysicalSellFormFields & { item?: string }>) =>
    setForm(prev => normalizePhysicalSellForm({ ...prev, ...patch }));

  const calc = useMemo(() => {
    const grossWeight = parseFloat(form.grossWeightStr) || 0;
    const touch = parseFloat(form.touchStr) || 1;
    const touchLoss = parseFloat(form.touchLossStr) || 0;
    const idrGram = parseFloat(form.idrGramStr) || 0;
    const idrToUsdt = parseFloat(form.idrToUsdtStr) || 17770;
    const base = computePhysicalTxn({ grossWeight, touch, touchLoss, idrGram, idrToUsdt });
    const metrics = computeSellMetrics(base, costPerGram);
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
    };
  }, [form, costPerGram]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calc.pureGram > buy.remainingWeight) {
      alert(`Cannot sell more than remaining weight (${buy.remainingWeight.toFixed(3)}g)`);
      return;
    }
    setIsSaving(true);
    const dateTime = `${form.date}T${form.time}:00`;
    const res = await dbAddPhysicalSellAction({
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Gold Sell"
      maxWidth="max-w-[1200px] w-[96vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" form="physical-sell-form" disabled={isSaving || calc.pureGram > buy.remainingWeight} className={`${btnPrimary} ${isSaving ? 'opacity-50' : ''}`}>
            {isSaving ? 'Saving...' : 'Register Sell'}
          </button>
        </>
      }
    >
      <form id="physical-sell-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
          Selling from: <strong>{buy.item || buy.particulars}</strong> · Max available: <strong>{buy.remainingWeight.toFixed(3)} g</strong>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Customer</h3>
            <InputField label="Customer">
              <ComboSearchInput
                value={form.customerName}
                onChange={v => set({ customerName: v, customerId: '', openingBalance: '' })}
                onSelectOption={opt => {
                  const c = customers.find(x => x.id === opt.value);
                  if (c) {
                    set({ customerId: c.id, customerName: c.name, openingBalance: String(c.balance ?? 0) });
                  }
                }}
                options={customerOptions}
                placeholder="Search customer or type name..."
              />
            </InputField>
            <InputField label="Opening Balance">
              <input type="text" readOnly value={form.openingBalance ? `AED ${Number(form.openingBalance).toLocaleString()}` : '—'} className={`${formInput} bg-slate-50`} />
            </InputField>
            <InputField label="Narration">
              <textarea value={form.narration} onChange={e => set({ narration: e.target.value })} rows={3} className={`${formInput} resize-none`} placeholder="Sell narration..." />
            </InputField>
            <InputField label="Notes">
              <textarea value={form.notes} onChange={e => set({ notes: e.target.value })} rows={2} className={`${formInput} resize-none`} />
            </InputField>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InputField label="Date">
                <input type="date" value={form.date} onChange={e => set({ date: e.target.value })} className={formInput} required />
              </InputField>
              <InputField label="Time">
                <input type="time" value={form.time} onChange={e => set({ time: e.target.value })} className={formInput} required />
              </InputField>
              <InputField label="TXN ID">
                <input type="text" value={form.txnId} readOnly className={`${formInput} bg-slate-50 font-mono text-sm`} />
              </InputField>
              <InputField label="Payment Mode">
                <select value={form.paymentMode} onChange={e => set({ paymentMode: e.target.value as PhysicalPaymentMode })} className={formInput}>
                  {PAYMENT_MODE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </InputField>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InputField label="Gram">
                <input type="number" step="0.001" value={form.grossWeightStr} onChange={e => set({ grossWeightStr: e.target.value })} className={formInput} required />
              </InputField>
              <InputField label="Touch">
                <input type="number" step="0.0001" value={form.touchStr} onChange={e => set({ touchStr: e.target.value })} className={formInput} required />
              </InputField>
              <InputField label="Touch Loss">
                <input type="number" step="0.001" value={form.touchLossStr} onChange={e => set({ touchLossStr: e.target.value })} className={formInput} />
              </InputField>
              <InputField label="Actual Purity">
                <input type="text" readOnly value={calc.actualPurity.toFixed(3)} className={`${formInput} bg-slate-50 font-mono ${calc.pureGram > buy.remainingWeight ? 'text-red-600 font-bold' : ''}`} />
              </InputField>
              <InputField label="Market / USD">
                <input type="number" step="0.0001" value={form.marketUsdStr} onChange={e => set({ marketUsdStr: e.target.value })} className={formInput} />
              </InputField>
              <InputField label="Deal">
                <input type="number" step="0.01" value={form.dealStr} onChange={e => set({ dealStr: e.target.value })} className={formInput} />
              </InputField>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <InputField label="IDR (per gram)">
                <input type="number" step="1" value={form.idrGramStr} onChange={e => set({ idrGramStr: e.target.value })} className={formInput} required />
              </InputField>
              <InputField label="IDR Rate / USDT">
                <input type="number" step="1" value={form.idrToUsdtStr} onChange={e => set({ idrToUsdtStr: e.target.value })} className={formInput} required />
              </InputField>
              <InputField label="USD">
                <input type="text" readOnly value={form.usdAmountStr || '—'} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="AED">
                <input type="text" readOnly value={form.aedAmountStr || '—'} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="TLT IDR Value">
                <input type="text" readOnly value={calc.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="TLT AED Value">
                <input type="text" readOnly value={calc.tltAedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="Total USDT">
                <input type="text" readOnly value={calc.totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="Sell Value (AED)">
                <input type="text" readOnly value={calc.sellValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} className={`${formInput} bg-emerald-50 font-bold text-emerald-700`} />
              </InputField>
              <InputField label="Cost Value">
                <input type="text" readOnly value={calc.costValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="Margin">
                <input type="text" readOnly value={`${calc.margin.toFixed(2)}%`} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="Profit">
                <input type="text" readOnly value={calc.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })} className={`${formInput} font-bold ${calc.profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`} />
              </InputField>
            </div>
          </div>
        </div>

        <PhysicalTxnPreview rows={[previewRow]} columns={SELL_PREVIEW_COLUMNS} />
      </form>
    </Modal>
  );
}
