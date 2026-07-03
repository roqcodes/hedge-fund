'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { PhysicalBuy, PhysicalSell } from '@/types';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { dbUpdatePhysicalSellMetadataAction } from '@/app/actions/physicalActions';
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
  sell: PhysicalSell;
  sourceBuy?: PhysicalBuy | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PhysicalSellEditModal({ open, slug, sell, sourceBuy, onClose, onSuccess }: Props) {
  const { canWrite, buttonProps: wp } = useWriteAccess();
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [txnId, setTxnId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [narration, setNarration] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<PhysicalPaymentMode>('CASH');

  useEffect(() => {
    if (!open) return;
    const dt = parseDateTime(sell.date);
    setDate(dt.date);
    setTime(dt.time);
    setTxnId(sell.txnId ?? '');
    setCustomerId(sell.customerId ?? '');
    setCustomerName(sell.customerName ?? '');
    setNarration(sell.narration || sell.particulars || '');
    setNotes(sell.notes ?? '');
    setPaymentMode(sell.paymentMode ?? 'CASH');
    getCustomersBySlug(slug).then(res => {
      if (res.success && res.customers) setCustomers(res.customers);
    });
  }, [open, sell, slug]);

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name}${c.balance != null ? ` (AED ${Number(c.balance).toLocaleString()})` : ''}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    if (!customerName.trim()) {
      alert('Customer name is required');
      return;
    }
    setIsSaving(true);
    const res = await dbUpdatePhysicalSellMetadataAction(sell.id, {
      date: `${date}T${time}:00`,
      txnId: txnId.trim() || undefined,
      customerId: customerId || undefined,
      customerName: customerName.trim(),
      narration: narration.trim() || undefined,
      notes: notes.trim() || undefined,
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
    <Modal open={open} onClose={onClose} title="Edit Sell Deal" maxWidth="max-w-[900px] w-[96vw]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <p className="-mt-2 text-xs text-slate-500">
          Numeric trade values cannot be changed. Update customer, narration, date, and other details below.
        </p>

        {sourceBuy ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Source stock: <span className="font-semibold text-slate-800">{sourceBuy.item || sourceBuy.particulars}</span>
          </div>
        ) : null}

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
          <InputField label="Narration">
            <input type="text" className={cleanInput} value={narration} onChange={e => setNarration(e.target.value)} />
          </InputField>
        </div>

        <InputField label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-0"
            placeholder="Additional notes..."
          />
        </InputField>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Trade Values (read-only)</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <PhysicalDetailField label="Gross Wt" value={`${sell.grossWeight.toFixed(3)} g`} />
            <PhysicalDetailField label="Touch" value={sell.pureConversion} />
            <PhysicalDetailField label="Pure Gram" value={`${sell.pureGram.toFixed(3)} g`} />
            <PhysicalDetailField label="IDR / Gram" value={sell.idrGram.toLocaleString()} />
            <PhysicalDetailField label="USDT Rate" value={sell.idrToUsdt.toLocaleString()} />
            <PhysicalDetailField
              label="Sell Value (USDT)"
              value={<PhysicalAmountDisplay aedAmount={sell.sellValue} size="sm" showUnit={false} />}
            />
            <PhysicalDetailField
              label="Profit (USDT)"
              value={<PhysicalAmountDisplay aedAmount={sell.profit} size="sm" showPlus profitTone="auto" showUnit={false} />}
            />
            {sell.totalUsdt != null ? (
              <PhysicalDetailField label="Total USDT" value={sell.totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })} />
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
