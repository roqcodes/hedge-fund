'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { buildCustomerComboOptions } from '@/lib/customerDropdown';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { dbAddUsdtSellAction } from '@/app/actions/usdtActions';
import { computeUsdtSell, generateUsdtTxnId, computeAverageUsdtBuyAedRate, formatUsdtRateInput } from '@/lib/usdtCalculations';
import { useApp } from '@/context/AppContext';
import { formatMoneyValue } from '@/data/mockData';
import { formatNumberWithCommas, cleanCommaNumber } from '@/lib/physicalCalculations';

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
  initialCustomer?: { id: string; name: string; balance?: string | number };
}

export default function USDTSellModal({
  open,
  slug,
  branchId,
  presetMargin,
  onClose,
  onSuccess,
  initialCustomer,
}: USDTSellModalProps) {
  const { activeCurrency, usdtBuys } = useApp();
  const [form, setForm] = useState(defaultForm(presetMargin));
  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const branchBuys = useMemo(
    () => usdtBuys.filter(b => b.branchId === branchId),
    [usdtBuys, branchId],
  );
  const averageBuyRate = useMemo(
    () => computeAverageUsdtBuyAedRate(branchBuys),
    [branchBuys],
  );

  useEffect(() => {
    if (!open) return;
    const avg = computeAverageUsdtBuyAedRate(usdtBuys.filter(b => b.branchId === branchId));
    const costStr = avg != null ? formatUsdtRateInput(avg) : '';
    const base = {
      ...defaultForm(presetMargin),
      txnId: generateUsdtTxnId(slug, 'SELL'),
      costStr,
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
  }, [open, slug, presetMargin, initialCustomer, branchId, usdtBuys]);

  const set = (patch: Partial<ReturnType<typeof defaultForm>>) => setForm(prev => ({ ...prev, ...patch }));

  const calc = useMemo(() => {
    const usdtAmount = parseFloat(cleanCommaNumber(form.usdtAmountStr)) || 0;
    const cost = parseFloat(cleanCommaNumber(form.costStr)) || 0;
    const margin = parseFloat(cleanCommaNumber(form.marginStr)) || 0;
    const serviceCharge = parseFloat(cleanCommaNumber(form.serviceChargeStr)) || 0;
    return computeUsdtSell({ usdtAmount, cost, margin, serviceCharge });
  }, [form.usdtAmountStr, form.costStr, form.marginStr, form.serviceChargeStr]);

  const customerOptions = buildCustomerComboOptions(customers);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usdtAmount = parseFloat(cleanCommaNumber(form.usdtAmountStr)) || 0;
    const cost = parseFloat(cleanCommaNumber(form.costStr)) || 0;
    const margin = parseFloat(cleanCommaNumber(form.marginStr)) || 0;
    if (!form.customerName.trim()) {
      alert('Customer is required');
      return;
    }
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
      openingBalance: form.openingBalance ? parseFloat(cleanCommaNumber(form.openingBalance)) : undefined,
      usdtAmount,
      cost,
      margin,
      aedRate: calc.aedRate,
      serviceCharge: parseFloat(cleanCommaNumber(form.serviceChargeStr)) || 0,
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
            <input type="text" className={formInput} value={form.usdtAmountStr} onChange={e => set({ usdtAmountStr: formatNumberWithCommas(e.target.value) })} placeholder="100,000" />
          </InputField>
          <InputField label="Cost">
            <input type="text" className={formInput} value={form.costStr} onChange={e => set({ costStr: formatNumberWithCommas(e.target.value) })} placeholder="3.6789" />
            {averageBuyRate != null && (
              <p className="text-[10px] text-slate-400">
                Avg AED rate from {branchBuys.length} purchase{branchBuys.length === 1 ? '' : 's'} — editable
              </p>
            )}
          </InputField>
          <InputField label="Margin">
            <input type="text" className={formInput} value={form.marginStr} onChange={e => set({ marginStr: formatNumberWithCommas(e.target.value) })} placeholder="0.002" />
          </InputField>
          <InputField label="AED Rate">
            <input type="text" className={formInput} value={calc.aedRate > 0 ? calc.aedRate.toFixed(4) : ''} readOnly placeholder="—" />
          </InputField>
          <InputField label="Ser Charge">
            <input type="text" className={formInput} value={form.serviceChargeStr} onChange={e => set({ serviceChargeStr: formatNumberWithCommas(e.target.value) })} placeholder="0" />
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
