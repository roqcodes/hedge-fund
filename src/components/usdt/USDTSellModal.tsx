'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { dbAddUsdtSellAction } from '@/app/actions/usdtActions';
import { computeUsdtSell, generateUsdtTxnId } from '@/lib/usdtCalculations';
import { useApp } from '@/context/AppContext';
import { formatMoneyValue } from '@/data/mockData';

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

const defaultForm = (presetMargin: number) => ({
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  txnId: '',
  customerId: '',
  customerName: '',
  walletId: '',
  openingBalance: '',
  usdtAmountStr: '',
  costStr: '',
  marginStr: String(presetMargin),
  serviceChargeStr: '',
  notes: '',
});

interface USDTSellModalProps {
  open: boolean;
  slug: string;
  branchId: string;
  presetMargin: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function USDTSellModal({
  open,
  slug,
  branchId,
  presetMargin,
  onClose,
  onSuccess,
}: USDTSellModalProps) {
  const { activeCurrency } = useApp();
  const [form, setForm] = useState(defaultForm(presetMargin));
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...defaultForm(presetMargin), txnId: generateUsdtTxnId(slug, 'SELL') });
    getCustomersBySlug(slug).then(res => {
      if (res.success && res.customers) setCustomers(res.customers);
    });
  }, [open, slug, presetMargin]);

  const set = (patch: Partial<ReturnType<typeof defaultForm>>) => setForm(prev => ({ ...prev, ...patch }));

  const calc = useMemo(() => {
    const usdtAmount = parseFloat(form.usdtAmountStr) || 0;
    const cost = parseFloat(form.costStr) || 0;
    const margin = parseFloat(form.marginStr) || 0;
    const serviceCharge = parseFloat(form.serviceChargeStr) || 0;
    return computeUsdtSell({ usdtAmount, cost, margin, serviceCharge });
  }, [form.usdtAmountStr, form.costStr, form.marginStr, form.serviceChargeStr]);

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name}${c.balance != null ? ` (AED ${Number(c.balance).toLocaleString()})` : ''}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usdtAmount = parseFloat(form.usdtAmountStr) || 0;
    const cost = parseFloat(form.costStr) || 0;
    const margin = parseFloat(form.marginStr) || 0;
    if (usdtAmount <= 0 || cost <= 0) {
      alert('USDT amount and cost are required');
      return;
    }
    setIsSaving(true);
    const dateTime = `${form.date}T${form.time}:00`;
    const res = await dbAddUsdtSellAction({
      branchId,
      date: dateTime,
      txnId: form.txnId,
      customerId: form.customerId || undefined,
      customerName: form.customerName.trim() || undefined,
      walletId: form.walletId.trim() || undefined,
      openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : undefined,
      usdtAmount,
      cost,
      margin,
      aedRate: calc.aedRate,
      serviceCharge: parseFloat(form.serviceChargeStr) || 0,
      aedTotal: calc.aedTotal,
      profit: calc.profit,
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
      title="Sell USDT"
      maxWidth="max-w-[720px] w-[96vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" form="usdt-sell-form" disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50' : ''}`}>
            {isSaving ? 'Saving...' : 'Record Sell'}
          </button>
        </>
      }
    >
      <form id="usdt-sell-form" onSubmit={handleSubmit} className="space-y-5">
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
          <InputField label="Sell USDT Amount">
            <input type="number" step="any" className={formInput} value={form.usdtAmountStr} onChange={e => set({ usdtAmountStr: e.target.value })} placeholder="100000" />
          </InputField>
          <InputField label="Cost">
            <input type="number" step="any" className={formInput} value={form.costStr} onChange={e => set({ costStr: e.target.value })} placeholder="3.6789" />
          </InputField>
          <InputField label="Margin">
            <input type="number" step="any" className={formInput} value={form.marginStr} onChange={e => set({ marginStr: e.target.value })} placeholder="0.002" />
          </InputField>
          <InputField label="AED Rate">
            <input type="text" className={formInput} value={calc.aedRate > 0 ? calc.aedRate.toFixed(4) : ''} readOnly placeholder="—" />
          </InputField>
          <InputField label="Ser Charge">
            <input type="number" step="any" className={formInput} value={form.serviceChargeStr} onChange={e => set({ serviceChargeStr: e.target.value })} placeholder="0" />
          </InputField>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">AED Total</div>
            <div className="text-xl font-extrabold tabular-nums text-slate-900">
              {formatMoneyValue(calc.aedTotal, activeCurrency)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Profit</div>
            <div className="text-xl font-extrabold tabular-nums text-emerald-900">
              {formatMoneyValue(calc.profit, activeCurrency)}
            </div>
          </div>
        </div>

        <InputField label="Notes">
          <textarea className={`${formInput} min-h-[72px]`} value={form.notes} onChange={e => set({ notes: e.target.value })} />
        </InputField>
      </form>
    </Modal>
  );
}
