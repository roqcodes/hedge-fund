'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { getProductsBySlug } from '@/app/actions/productActions';
import { dbAddPhysicalBuyAction } from '@/app/actions/physicalActions';
import {
  computePhysicalTxn,
  generatePhysicalTxnId,
  PAYMENT_MODE_OPTIONS,
  type PhysicalPaymentMode,
} from '@/lib/physicalCalculations';
import { convertFromAed } from '@/lib/currency';
import { useApp } from '@/context/AppContext';
import PhysicalTxnPreview, { buildBuyPreviewRow, BUY_PREVIEW_COLUMNS } from './PhysicalTxnPreview';

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

const defaultForm = () => ({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  txnId: '',
  customerId: '',
  customerName: '',
  openingBalance: '',
  productId: '',
  item: '',
  notes: '',
  grossWeightStr: '',
  touchStr: '0.995',
  touchLossStr: '0',
  marketUsdStr: '',
  dealStr: '',
  fixOrUnfix: 'unfixed' as 'fixed' | 'unfixed',
  paymentMode: 'CASH' as PhysicalPaymentMode,
  idrGramStr: '',
  idrToUsdtStr: '17770',
  usdAmountStr: '',
  aedAmountStr: '',
});

interface PhysicalBuyModalProps {
  open: boolean;
  slug: string;
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhysicalBuyModal({ open, slug, branchId, onClose, onSuccess }: PhysicalBuyModalProps) {
  const { currencyRates } = useApp();
  const [form, setForm] = useState(defaultForm());
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [products, setProducts] = useState<{
    id: string;
    name: string;
    sku: string;
    purity: string | number;
    weight?: string | number;
    buy_premium?: string | number;
  }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(f => ({ ...defaultForm(), txnId: generatePhysicalTxnId(slug, 'BUY') }));
    Promise.all([getCustomersBySlug(slug), getProductsBySlug(slug)]).then(([custRes, prodRes]) => {
      if (custRes.success && custRes.customers) setCustomers(custRes.customers);
      if (prodRes.success && prodRes.products) setProducts(prodRes.products);
    });
  }, [open, slug]);

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const calc = useMemo(() => {
    const grossWeight = parseFloat(form.grossWeightStr) || 0;
    const touch = parseFloat(form.touchStr) || 1;
    const touchLoss = parseFloat(form.touchLossStr) || 0;
    const idrGram = parseFloat(form.idrGramStr) || 0;
    const idrToUsdt = parseFloat(form.idrToUsdtStr) || 17770;
    const base = computePhysicalTxn({ grossWeight, touch, touchLoss, idrGram, idrToUsdt });
    return {
      grossWeight,
      touch,
      touchLoss,
      actualPurity: base.actualPurity,
      marketUsd: parseFloat(form.marketUsdStr) || 0,
      deal: parseFloat(form.dealStr) || 0,
      idrGram,
      idrToUsdt,
      idrRate: base.idrRate,
      usdAmount: parseFloat(form.usdAmountStr) || 0,
      aedAmount: parseFloat(form.aedAmountStr) || 0,
      tltIdrValue: base.tltIdrValue,
      tltAedValue: base.tltAedValue,
      totalUsdt: base.totalUsdt,
      buyValue: base.total,
      pureGram: base.pureGram,
      total: base.total,
    };
  }, [form]);

  useEffect(() => {
    const buyValue = calc.buyValue;
    if (buyValue <= 0) {
      setForm(prev =>
        prev.usdAmountStr === '' && prev.aedAmountStr === ''
          ? prev
          : { ...prev, usdAmountStr: '', aedAmountStr: '' },
      );
      return;
    }
    const aedStr = buyValue.toFixed(2);
    const usdStr = convertFromAed(buyValue, 'USD').toFixed(2);
    setForm(prev =>
      prev.aedAmountStr === aedStr && prev.usdAmountStr === usdStr
        ? prev
        : { ...prev, aedAmountStr: aedStr, usdAmountStr: usdStr },
    );
  }, [calc.buyValue, currencyRates]);

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name}${c.balance != null ? ` (AED ${Number(c.balance).toLocaleString()})` : ''}`,
  }));

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name}${p.sku ? ` · ${p.sku}` : ''}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item.trim()) {
      alert('Item is required');
      return;
    }
    setIsSaving(true);
    const dateTime = `${form.date}T${form.time}:00`;
    const res = await dbAddPhysicalBuyAction({
      branchId,
      date: dateTime,
      particulars: form.item.trim(),
      grossWeight: calc.grossWeight,
      pureConversion: calc.touch,
      pureGram: calc.pureGram,
      idrGram: calc.idrGram,
      idrToUsdt: calc.idrToUsdt,
      idrRate: calc.idrRate,
      total: calc.total,
      buyValue: calc.buyValue,
      txnId: form.txnId,
      customerId: form.customerId || undefined,
      customerName: form.customerName.trim() || undefined,
      openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : undefined,
      productId: form.productId || undefined,
      item: form.item.trim(),
      notes: form.notes.trim() || undefined,
      touchLoss: calc.touchLoss || undefined,
      actualPurity: calc.actualPurity,
      marketUsd: calc.marketUsd || undefined,
      deal: calc.deal || undefined,
      fixOrUnfix: form.fixOrUnfix,
      paymentMode: form.paymentMode,
      idrAmount: calc.idrGram || undefined,
      usdAmount: calc.usdAmount || undefined,
      aedAmount: calc.aedAmount || undefined,
      totalWeight: calc.actualPurity,
      tltIdrValue: calc.tltIdrValue,
      tltAedValue: calc.tltAedValue,
      totalUsdt: calc.totalUsdt,
    });
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const previewRow = buildBuyPreviewRow(form, calc);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Deal"
      maxWidth="max-w-[1200px] w-[96vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" form="physical-buy-form" disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50' : ''}`}>
            {isSaving ? 'Saving...' : 'Create Deal'}
          </button>
        </>
      }
    >
      <form id="physical-buy-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Customer & Item</h3>
            <InputField label="Customer">
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
                placeholder="Search customer or type name..."
              />
            </InputField>
            <InputField label="Opening Balance">
              <input type="text" readOnly value={form.openingBalance ? `AED ${Number(form.openingBalance).toLocaleString()}` : '—'} className={`${formInput} bg-slate-50`} />
            </InputField>
            <InputField label="Item / Product">
              <ComboSearchInput
                value={form.item}
                onChange={v => set({ item: v, productId: '' })}
                onSelectOption={opt => {
                  const p = products.find(x => x.id === opt.value);
                  if (p) {
                    const touchVal = p.purity 
                      ? (parseFloat(p.purity.toString()) > 1 
                        ? parseFloat(p.purity.toString()) / 1000 
                        : parseFloat(p.purity.toString()))
                      : 0.995;
                    set({
                      productId: p.id,
                      item: p.name,
                      touchStr: touchVal.toString(),
                      grossWeightStr: p.weight ? p.weight.toString() : '',
                      dealStr: p.buy_premium ? p.buy_premium.toString() : '0',
                    });
                  }
                }}
                options={productOptions}
                placeholder="Search product or type item..."
              />
            </InputField>
            <InputField label="Notes">
              <textarea value={form.notes} onChange={e => set({ notes: e.target.value })} rows={3} className={`${formInput} resize-none`} placeholder="Additional notes..." />
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
                <input type="text" readOnly value={calc.actualPurity.toFixed(3)} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="Total Weight">
                <input type="text" readOnly value={calc.actualPurity.toFixed(3)} className={`${formInput} bg-slate-50 font-mono`} />
              </InputField>
              <InputField label="Market / USD">
                <input type="number" step="0.0001" value={form.marketUsdStr} onChange={e => set({ marketUsdStr: e.target.value })} className={formInput} />
              </InputField>
              <InputField label="Deal">
                <input type="number" step="0.01" value={form.dealStr} onChange={e => set({ dealStr: e.target.value })} className={formInput} />
              </InputField>
              <InputField label="Fix / Unfix">
                <select 
                  value={form.fixOrUnfix} 
                  onChange={e => set({ fixOrUnfix: e.target.value as 'fixed' | 'unfixed' })} 
                  className={formInput}
                >
                  <option value="fixed">Fixed</option>
                  <option value="unfixed">Unfixed</option>
                </select>
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
              <InputField label="Buy Value (AED)">
                <input type="text" readOnly value={calc.buyValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} className={`${formInput} bg-emerald-50 font-bold text-emerald-700`} />
              </InputField>
            </div>
          </div>
        </div>

        <PhysicalTxnPreview rows={[previewRow]} columns={BUY_PREVIEW_COLUMNS} />
      </form>
    </Modal>
  );
}
