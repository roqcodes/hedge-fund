'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect, formTextarea } from '@/lib/ui';
import { useApp } from '@/context/AppContext';

import { ICSale } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICSale;
};

export default function AddSaleModal({ open, onClose, initialData }: Props) {
  const { icRegions, addICSale, updateICSale, entities } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [country, setCountry] = useState('UAE');
  const [locationId, setLocationId] = useState(initialData?.locationId || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMode || 'credit');
  const [address, setAddress] = useState(initialData?.address || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setRate(initialData?.unitRate?.toString() || '');
      setCustomerName(initialData?.customerName || '');
      setLocationId(initialData?.locationId || '');
      setPaymentMethod(initialData?.paymentMode || 'credit');
      setAddress(initialData?.address || '');
    }
  }, [open, initialData]);

  const unitNum = parseFloat(units) || 0;
  const rateNum = parseFloat(rate) || 0;
  const inrTotal = unitNum * rateNum * 25; // using mock multiplier for now
  const aedTotal = unitNum * rateNum;

  const handleSubmit = async () => {
    if (!unitNum || !rateNum || !customerName) return;
    setIsSubmitting(true);
    
    const payload = {
      customerName,
      locationId,
      unitRate: rateNum,
      units: unitNum,
      paymentMode: paymentMethod,
      address,
      inrAmount: inrTotal,
      aedAmount: aedTotal,
    };

    if (initialData) {
      await updateICSale(initialData.id, payload);
    } else {
      await addICSale(payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Sale" : "Add Sale"}
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || !unitNum || !rateNum || !customerName}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Sale')}
          </button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className={formGroup}>
            <label className={formLabel}>Customer Name</label>
            <ComboSearchInput
              value={customerName}
              onChange={setCustomerName}
              options={entities.map(e => ({ value: e.id, label: e.name }))}
              placeholder="Search customer or type name..."
            />
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Country</label>
              <select className={formSelect} value={country} onChange={e => setCountry(e.target.value)}>
                <option value="UAE">UAE</option>
                <option value="India">India</option>
                <option value="KSA">KSA</option>
              </select>
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Location</label>
              <select className={formSelect} value={locationId} onChange={e => setLocationId(e.target.value)}>
                <option value="" disabled>Select Location</option>
                {icRegions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Unit Rate</label>
              <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Order (Unit)</label>
              <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} type="number" step="0.01" />
            </div>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Payment Mode</label>
            <select className={formSelect} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="credit">Credit</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Address</label>
            <textarea className={formTextarea} rows={2} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Amount (INR)</p>
              <p className="text-2xl font-bold text-slate-900">{inrTotal.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Amount (AED)</p>
              <p className="text-2xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#f5f0e8] p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">Total Due</p>
            <p className="text-3xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
