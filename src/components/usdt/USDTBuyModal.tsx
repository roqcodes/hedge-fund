'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { buildCustomerComboOptions } from '@/lib/customerDropdown';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { dbAddUsdtBuyAction } from '@/app/actions/usdtActions';
import { computeUsdtBuy, generateUsdtTxnId } from '@/lib/usdtCalculations';
import { useApp } from '@/context/AppContext';
import { formatMoneyValue } from '@/data/mockData';
import { formatNumberWithCommas, cleanCommaNumber } from '@/lib/physicalCalculations';

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
  walletId: '',
  openingBalance: '',
  usdtAmountStr: '',
  aedRateStr: '',
  serviceChargeStr: '',
  notes: '',
});

interface USDTBuyModalProps {
  open: boolean;
  slug: string;
  branchId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialCustomer?: { id: string; name: string; balance?: string | number };
}

export default function USDTBuyModal({ open, slug, branchId, onClose, onSuccess, initialCustomer }: USDTBuyModalProps) {
  const { activeCurrency } = useApp();
  const [form, setForm] = useState(defaultForm());
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = {
      ...defaultForm(),
      txnId: generateUsdtTxnId(slug, 'BUY'),
      ...(initialCustomer
        ? {
            customerId: initialCustomer.id,
            customerName: initialCustomer.name,
            openingBalance: String(initialCustomer.balance ?? ''),
          }
        : {}),
    };
    setForm(base);
    getCustomersBySlug(slug).then(res => {
      if (res.success && res.customers) setCustomers(res.customers);
    });
  }, [open, slug, initialCustomer]);

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const calc = useMemo(() => {
    const usdtAmount = parseFloat(cleanCommaNumber(form.usdtAmountStr)) || 0;
    const aedRate = parseFloat(cleanCommaNumber(form.aedRateStr)) || 0;
    const serviceCharge = parseFloat(cleanCommaNumber(form.serviceChargeStr)) || 0;
    return computeUsdtBuy({ usdtAmount, aedRate, serviceCharge });
  }, [form.usdtAmountStr, form.aedRateStr, form.serviceChargeStr]);

  const customerOptions = buildCustomerComboOptions(customers);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usdtAmount = parseFloat(cleanCommaNumber(form.usdtAmountStr)) || 0;
    const aedRate = parseFloat(cleanCommaNumber(form.aedRateStr)) || 0;
    if (!form.customerName.trim()) {
      alert('Customer is required');
      return;
    }
    if (usdtAmount <= 0 || aedRate <= 0) {
      alert('USDT amount and AED rate are required');
      return;
    }
    setIsSaving(true);
    const dateTime = `${form.date}T${form.time}:00`;
    const res = await dbAddUsdtBuyAction({
      branchId,
      date: dateTime,
      txnId: form.txnId,
      customerId: form.customerId || undefined,
      customerName: form.customerName.trim() || undefined,
      walletId: form.walletId.trim() || undefined,
      openingBalance: form.openingBalance ? parseFloat(cleanCommaNumber(form.openingBalance)) : undefined,
      usdtAmount,
      aedRate,
      serviceCharge: parseFloat(cleanCommaNumber(form.serviceChargeStr)) || 0,
      aedTotal: calc.aedTotal,
      notes: form.notes.trim() || undefined,
    }, slug);
    setIsSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Buy USDT"
      maxWidth="max-w-[720px] w-[96vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" form="usdt-buy-form" disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50' : ''}`}>
            {isSaving ? 'Saving...' : 'Record Buy'}
          </button>
        </>
      }
    >
      <form id="usdt-buy-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField label="Date">
            <input type="date" className={formInput} value={form.date} onChange={e => set({ date: e.target.value })} />
          </InputField>
          <InputField label="Time">
            <input type="time" className={formInput} value={form.time} onChange={e => set({ time: e.target.value })} />
          </InputField>
          <InputField label="Txn ID">
            <input type="text" className={formInput} value={form.txnId} onChange={e => set({ txnId: e.target.value })} />
          </InputField>
          <InputField label="Wallet ID">
            <input type="text" className={formInput} value={form.walletId} onChange={e => set({ walletId: e.target.value })} placeholder="123456789" />
          </InputField>
        </div>

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField label="Opening Balance">
            <input type="text" className={formInput} value={form.openingBalance} readOnly placeholder="—" />
          </InputField>
          <InputField label="Received USDT Amount">
            <input type="text" className={formInput} value={form.usdtAmountStr} onChange={e => set({ usdtAmountStr: formatNumberWithCommas(e.target.value) })} placeholder="100,000" />
          </InputField>
          <InputField label="AED Rate">
            <input type="text" className={formInput} value={form.aedRateStr} onChange={e => set({ aedRateStr: formatNumberWithCommas(e.target.value) })} placeholder="3.6789" />
          </InputField>
          <InputField label="Ser Charge">
            <input type="text" className={formInput} value={form.serviceChargeStr} onChange={e => set({ serviceChargeStr: formatNumberWithCommas(e.target.value) })} placeholder="0" />
          </InputField>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">AED Total</div>
          <div className="text-xl font-extrabold tabular-nums text-emerald-900">
            {formatMoneyValue(calc.aedTotal, activeCurrency)}
          </div>
        </div>

        <InputField label="Notes">
          <textarea className={`${formInput} min-h-[72px]`} value={form.notes} onChange={e => set({ notes: e.target.value })} />
        </InputField>
      </form>
    </Modal>
  );
}
