'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary } from '@/lib/ui';
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
import { buildDraftBuy, type PhysicalDraftBuy } from '@/lib/physical/drafts';

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
    {children}
  </div>
);

const cleanInput = "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors";
const cleanSelect = "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0px_center] bg-no-repeat pr-6";

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
  onSaveDraft?: (draft: PhysicalDraftBuy) => void;
}

export default function PhysicalDealBuyForm({ slug, branchId, onClose, onSuccess, onSaveDraft }: Omit<PhysicalBuyModalProps, 'open'>) {
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
    setForm(f => ({ ...defaultForm(), txnId: generatePhysicalTxnId(slug, 'BUY') }));
    Promise.all([getCustomersBySlug(slug), getProductsBySlug(slug)]).then(([custRes, prodRes]) => {
      if (custRes.success && custRes.customers) setCustomers(custRes.customers);
      if (prodRes.success && prodRes.products) setProducts(prodRes.products);
    });
  }, [slug]);

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

  const buildBuyPayload = () => {
    const dateTime = `${form.date}T${form.time}:00`;
    return {
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
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item.trim()) {
      alert('Item is required');
      return;
    }
    setIsSaving(true);
    const res = await dbAddPhysicalBuyAction(buildBuyPayload());
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const handleSaveDraft = () => {
    if (!form.item.trim()) {
      alert('Item is required to save a draft');
      return;
    }
    onSaveDraft?.(buildDraftBuy(buildBuyPayload()));
    onClose();
  };

  const previewRow = buildBuyPreviewRow(form, calc);
  const formattedDate = new Date(form.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = new Date(`1970-01-01T${form.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
      <form id="physical-buy-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
        
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 font-medium -mt-4">
          <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">#{form.txnId || 'PENDING'}</span>
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
              <h3 className="text-sm font-bold text-slate-800">Product</h3>
              <InputField label="Search Product">
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
                  placeholder="Select product..."
                  className="!border-0 !border-b !border-slate-200 !rounded-none !bg-transparent !px-0 !shadow-none focus-within:!border-slate-400"
                />
              </InputField>

            </div>
          </div>

          <div className="flex flex-col gap-5 pt-2">
            <h3 className="text-sm font-bold text-slate-800">Trade Details</h3>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-5">
              <InputField label="Gram">
                <input type="number" step="0.001" className={cleanInput} value={form.grossWeightStr} onChange={e => set({ grossWeightStr: e.target.value })} required />
              </InputField>
              
              <InputField label="Touch">
                <input type="number" step="0.0001" className={cleanInput} value={form.touchStr} onChange={e => set({ touchStr: e.target.value })} required />
              </InputField>
              
              <InputField label="Loss">
                <input type="number" step="0.001" className={cleanInput} value={form.touchLossStr} onChange={e => set({ touchLossStr: e.target.value })} />
              </InputField>
              
              <InputField label="Purity">
                <div className="py-1.5 text-sm font-bold text-slate-900 font-mono">
                  {calc.actualPurity.toFixed(3)}
                </div>
              </InputField>
              
              <InputField label="IDR per Gram">
                <input type="number" step="1" className={cleanInput} value={form.idrGramStr} onChange={e => set({ idrGramStr: e.target.value })} required />
              </InputField>
              
              <InputField label="USDT Rate">
                <input type="number" step="1" className={cleanInput} value={form.idrToUsdtStr} onChange={e => set({ idrToUsdtStr: e.target.value })} required />
              </InputField>
              
              <InputField label="USD">
                <input type="number" step="0.01" className={cleanInput} value={form.usdAmountStr} onChange={(e) => set({ usdAmountStr: e.target.value })} placeholder="0.00" />
              </InputField>
              
              <InputField label="AED">
                <input type="number" step="0.01" className={cleanInput} value={form.aedAmountStr} onChange={(e) => set({ aedAmountStr: e.target.value })} placeholder="0.00" />
              </InputField>
              
              <InputField label="Payment Mode">
                <select className={cleanSelect} value={form.paymentMode} onChange={e => set({ paymentMode: e.target.value as PhysicalPaymentMode })}>
                  {PAYMENT_MODE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </InputField>

              <InputField label="Pricing">
                <div className="flex w-full items-center rounded-lg bg-slate-100 p-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() => set({ fixOrUnfix: 'unfixed' })}
                    className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                      form.fixOrUnfix === 'unfixed'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Unfixed
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ fixOrUnfix: 'fixed' })}
                    className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                      form.fixOrUnfix === 'fixed'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Fixed
                  </button>
                </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Weight</span>
                <span className="text-lg md:text-xl font-black text-slate-800 font-mono tracking-tight">{calc.actualPurity.toFixed(3)}<span className="text-xs font-bold text-slate-400 ml-1">g</span></span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total USDT</span>
                <span className="text-lg md:text-xl font-black text-emerald-600 font-mono tracking-tight">{calc.totalUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-3 border-t border-slate-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total IDR</span>
              <span className="text-xl md:text-2xl font-black text-slate-800 font-mono tracking-tight">{calc.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        <div className="-mt-4">
          <PhysicalTxnPreview rows={[previewRow]} columns={BUY_PREVIEW_COLUMNS} />
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 mt-2 sm:flex-row sm:justify-end sm:gap-3 [&>button]:w-full sm:[&>button]:w-auto">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 transition-colors rounded-xl hover:bg-slate-100 hover:text-slate-900">
            Cancel
          </button>
          {onSaveDraft && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              Save as Draft
            </button>
          )}
          <button type="submit" disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50' : ''}`}>
            {isSaving ? 'Saving...' : 'Create Deal'}
          </button>
        </div>
      </form>
  );
}
