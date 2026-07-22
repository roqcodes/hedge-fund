'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { PhysicalBuy } from '@/types';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { getProductsBySlug } from '@/app/actions/productActions';
import { dbUpdatePhysicalBuyMetadataAction } from '@/app/actions/physicalActions';
import { PAYMENT_MODE_OPTIONS, type PhysicalPaymentMode } from '@/lib/physicalCalculations';
import PhysicalDetailField from './PhysicalDetailField';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import { btnPrimary } from '@/lib/ui';
import { useWriteAccess } from '@/context/RbacWriteContext';

const cleanInput =
  'w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors';
const cleanSelect =
  "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0px_center] bg-no-repeat pr-6";

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
    {children}
  </div>
);

function parseDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toISOString().split('T')[0],
    time: d.toTimeString().slice(0, 5),
  };
}

interface Props {
  open: boolean;
  slug: string;
  buy: PhysicalBuy;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhysicalBuyEditModal({ open, slug, buy, onClose, onSuccess }: Props) {
  const { canWrite, buttonProps: wp } = useWriteAccess();
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string; purity: string | number; weight?: string | number }[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [txnId, setTxnId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productId, setProductId] = useState('');
  const [item, setItem] = useState('');
  const [notes, setNotes] = useState('');
  const [fixOrUnfix, setFixOrUnfix] = useState<'fixed' | 'unfixed'>('unfixed');
  const [paymentMode, setPaymentMode] = useState<PhysicalPaymentMode>('CASH');

  useEffect(() => {
    if (!open) return;
    const dt = parseDateTime(buy.date);
    setDate(dt.date);
    setTime(dt.time);
    setTxnId(buy.txnId ?? '');
    setCustomerId(buy.customerId ?? '');
    setCustomerName(buy.customerName ?? '');
    setProductId(buy.productId ?? '');
    setItem(buy.item || buy.particulars || '');
    setNotes(buy.notes ?? '');
    setFixOrUnfix(buy.fixOrUnfix ?? 'unfixed');
    setPaymentMode(buy.paymentMode ?? 'CASH');
    Promise.all([getCustomersBySlug(slug), getProductsBySlug(slug)]).then(([custRes, prodRes]) => {
      if (custRes.success && custRes.customers) setCustomers(custRes.customers);
      if (prodRes.success && prodRes.products) setProducts(prodRes.products);
    });
  }, [open, buy, slug]);

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
    if (!canWrite) return;
    if (!customerName.trim()) {
      alert('Customer name is required');
      return;
    }
    if (!item.trim()) {
      alert('Item is required');
      return;
    }
    setIsSaving(true);
    const res = await dbUpdatePhysicalBuyMetadataAction(buy.id, {
      date: `${date}T${time}:00`,
      txnId: txnId.trim() || undefined,
      customerId: customerId || undefined,
      customerName: customerName.trim(),
      productId: productId || undefined,
      item: item.trim(),
      notes: notes.trim() || undefined,
      fixOrUnfix,
      paymentMode,
    });
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Buy Deal" maxWidth="max-w-[900px] w-[96vw]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <p className="-mt-2 text-xs text-slate-500">
          Numeric trade values cannot be changed. Update customer, item, date, and other details below.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField label="Date">
            <input type="date" className={cleanInput} value={date} onChange={e => setDate(e.target.value)} required />
          </InputField>
          <InputField label="Time">
            <input type="time" className={cleanInput} value={time} onChange={e => setTime(e.target.value)} required />
          </InputField>
          <InputField label="TXN ID">
            <input type="text" className={cleanInput} value={txnId} onChange={e => setTxnId(e.target.value)} />
          </InputField>
          <InputField label="Payment Mode">
            <select
              className={cleanSelect}
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value as PhysicalPaymentMode)}
            >
              {PAYMENT_MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </InputField>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField label="Customer">
            <ComboSearchInput
              value={customerName}
              onChange={v => {
                setCustomerName(v);
                setCustomerId('');
              }}
              onSelectOption={opt => {
                const c = customers.find(x => x.id === opt.value);
                if (c) {
                  setCustomerId(c.id);
                  setCustomerName(c.name);
                }
              }}
              options={customerOptions}
              placeholder="Select customer..."
              className="!border-0 !border-b !border-slate-200 !rounded-none !bg-transparent !px-0 !shadow-none focus-within:!border-slate-400"
            />
          </InputField>
          <InputField label="Product / Item">
            <ComboSearchInput
              value={item}
              onChange={v => {
                setItem(v);
                setProductId('');
              }}
              onSelectOption={opt => {
                const p = products.find(x => x.id === opt.value);
                if (p) {
                  setProductId(p.id);
                  setItem(p.name);
                }
              }}
              options={productOptions}
              placeholder="Select product..."
              className="!border-0 !border-b !border-slate-200 !rounded-none !bg-transparent !px-0 !shadow-none focus-within:!border-slate-400"
            />
          </InputField>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField label="Pricing">
            <div className="flex w-full items-center rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setFixOrUnfix('unfixed')}
                className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                  fixOrUnfix === 'unfixed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Unfixed
              </button>
              <button
                type="button"
                onClick={() => setFixOrUnfix('fixed')}
                className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                  fixOrUnfix === 'fixed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Fixed
              </button>
            </div>
          </InputField>
          <InputField label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
              placeholder="Additional notes..."
            />
          </InputField>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Trade Values (read-only)</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <PhysicalDetailField label="Gross Wt" value={`${buy.grossWeight.toFixed(3)} g`} />
            <PhysicalDetailField label="Touch" value={buy.pureConversion} />
            <PhysicalDetailField label="Pure Gram" value={`${buy.pureGram.toFixed(3)} g`} />
            <PhysicalDetailField label="IDR / Gram" value={buy.idrGram.toLocaleString()} />
            <PhysicalDetailField label="USDT Rate" value={buy.idrToUsdt.toLocaleString()} />
            <PhysicalDetailField
              label="Buy Value (USDT)"
              value={<PhysicalAmountDisplay usdtAmount={buy.totalUsdt} aedAmount={buy.buyValue} size="sm" showUnit={false} />}
            />
            <PhysicalDetailField label="Remaining" value={`${buy.remainingWeight.toFixed(3)} g`} />
            {buy.totalUsdt != null ? (
              <PhysicalDetailField label="Total USDT" value={buy.totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })} />
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !canWrite}
            {...wp()}
            className={`${btnPrimary} ${isSaving || !canWrite ? 'opacity-50' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
