'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect, formTextarea } from '@/lib/ui';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AddPurchaseModal({ open, onClose }: Props) {
  const [units, setUnits] = useState('');
  const [rate, setRate] = useState('42');
  const unitNum = parseFloat(units) || 0;
  const rateNum = parseFloat(rate) || 0;
  const inrTotal = unitNum * rateNum * 25;
  const aedTotal = unitNum * rateNum;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Purchase"
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={onClose}>Add Purchase</button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          June 22, 2026
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          10:38 PM
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className={formGroup}>
            <label className={formLabel}>Location</label>
            <select className={formSelect} defaultValue="">
              <option value="" disabled>Select Location</option>
              <option>Mumbai</option>
              <option>Delhi</option>
              <option>Chennai</option>
              <option>Bangalore</option>
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Select Supplier</label>
            <select className={formSelect} defaultValue="">
              <option value="" disabled>Supplier</option>
              <option>Supplier Gamma</option>
            </select>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Unit Rate</label>
              <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Number of Unit</label>
              <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} />
            </div>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Warehouse</label>
            <select className={formSelect} defaultValue="">
              <option value="" disabled>Select Warehouse</option>
              <option>Warehouse Beta</option>
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Payment Method</label>
            <select className={formSelect} defaultValue="credit">
              <option value="credit">Credit</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Notes</label>
            <textarea className={formTextarea} rows={3} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">INR</p>
              <p className="text-2xl font-bold text-slate-900">{inrTotal.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">AED</p>
              <p className="text-2xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Payment</p>
              <p className="text-2xl font-bold text-slate-900">0</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Due Amount</p>
              <p className="text-2xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#f5f0e8] p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">Total Due</p>
            <p className="text-3xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-400">Due Date: —</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
