'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { ICSale } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICSale;
};

export default function AddICBranchOrderModal({ open, onClose, initialData }: Props) {
  const { addICSale, updateICSale, branches, currentSlug, icRates } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || 'by_hand');
  const [address, setAddress] = useState(initialData?.address || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [serviceCharge, setServiceCharge] = useState(initialData?.serviceCharge?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Retrieve current active rates
  const activeRate = icRates.length > 0 ? icRates[0] : null;
  const saleRate = activeRate?.saleRate || 0;
  const inrConversion = activeRate?.inrConversion || 1;
  const sarConversion = activeRate?.sarConversion || 1;

  // Cloudinary credentials from env
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'finite-x-reality';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'meal_payments';

  // Retrieve branch name
  const branchName = branches.find(b => b.slug === currentSlug)?.name || currentSlug || 'Branch Customer';

  useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setTransactionType(initialData?.transactionType || 'by_hand');
      setAddress(initialData?.address || '');
      setImageUrl(initialData?.imageUrl || '');
      setDeleteToken('');
      setServiceCharge(initialData?.serviceCharge?.toString() || '');
    }
  }, [open, initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.secure_url);
      setDeleteToken(data.delete_token || '');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (deleteToken) {
      try {
        const formData = new FormData();
        formData.append('token', deleteToken);
        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.error('Failed to delete image from Cloudinary:', err);
      }
    }
    setImageUrl('');
    setDeleteToken('');
  };

  const unitNum = parseFloat(units) || 0;
  const rateNum = initialData ? initialData.unitRate : saleRate;
  const inrConversionRate = initialData ? (initialData.inrAmount && initialData.aedAmount ? initialData.inrAmount / initialData.aedAmount : inrConversion) : inrConversion;
  const sarConversionRate = sarConversion;
  const serviceChargeNum = parseFloat(serviceCharge) || 0;

  const aedBaseTotal = unitNum * rateNum;
  const aedNetTotal = Math.max(0, aedBaseTotal - serviceChargeNum);
  const inrTotal = aedNetTotal * inrConversionRate;
  const sarTotal = aedNetTotal * sarConversionRate;

  const handleSubmit = async () => {
    if (!unitNum || !rateNum) return;
    setIsSubmitting(true);
    
    const payload = {
      customerName: branchName,
      transactionType,
      unitRate: rateNum,
      units: unitNum,
      inrAmount: inrTotal,
      aedAmount: aedNetTotal,
      address: address || undefined,
      imageUrl: imageUrl || undefined,
      serviceCharge: serviceChargeNum,
      sarAmount: sarTotal,
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
      title={initialData ? "Edit Order" : "Create Transfer Order"}
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting || isUploading}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || isUploading || !unitNum || !rateNum}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Create Order')}
          </button>
        </>
      }
    >
      {saleRate > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Live Sale Rates:</span>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="font-semibold text-slate-400 uppercase">AED:</span>{' '}
              <span className="font-bold text-accent">{saleRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {inrConversion > 0 && (
              <div className="border-l border-slate-200 pl-4">
                <span className="font-semibold text-slate-400 uppercase">INR:</span>{' '}
                <span className="font-bold text-emerald-600">{(saleRate * inrConversion).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {sarConversion > 0 && (
              <div className="border-l border-slate-200 pl-4">
                <span className="font-semibold text-slate-400 uppercase">SAR:</span>{' '}
                <span className="font-bold text-indigo-600">{(saleRate * sarConversion).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Customer (Your Branch)</label>
              <input 
                className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`} 
                value={branchName} 
                disabled 
                readOnly 
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Transaction Type</label>
              <select className={formSelect} value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                <option value="by_hand">By Hand</option>
                <option value="transfer">Transfer</option>
                <option value="cdm">CDM</option>
              </select>
            </div>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Unit Rate (Locked)</label>
              <input 
                className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`} 
                value={rateNum} 
                disabled 
                readOnly 
                type="number" 
              />
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Autofilled from active rates settings.</p>
            </div>
            <div className={formGroup}>
              <label className={formLabel}>INR Conversion Rate (Locked)</label>
              <input 
                className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`} 
                value={inrConversionRate} 
                disabled 
                readOnly 
                type="number" 
              />
            </div>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Order Units</label>
              <input 
                className={formInput} 
                value={units} 
                onChange={e => setUnits(e.target.value)} 
                type="number" 
                step="0.01" 
                placeholder="Enter units quantity"
                required
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Service Charge (AED)</label>
              <input 
                className={formInput} 
                value={serviceCharge} 
                onChange={e => setServiceCharge(e.target.value)} 
                type="number" 
                step="0.01" 
                placeholder="0.00"
              />
            </div>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Address</label>
              <textarea 
                className={`${formInput} min-h-[90px] resize-y py-2.5`} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Enter delivery address details"
                rows={3}
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Captured Image</label>
              <div className="flex items-center gap-3 mt-2">
                {imageUrl ? (
                  <div className="relative w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group shrink-0">
                    <img src={imageUrl} alt="Captured" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/50 text-white text-[9px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleDeleteImage}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <label className={`${btnSecondary} text-xs py-2.5 px-3.5 flex items-center gap-1.5 cursor-pointer select-none`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isUploading ? 'Uploading...' : 'Capture Image'}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-slate-100 p-5 bg-slate-50/50">
            <div className="text-center border-r border-slate-100 pr-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount (INR)</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{inrTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center border-r border-slate-100 px-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount (SAR)</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{sarTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center pl-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount (AED)</p>
              <p className="text-lg font-bold text-accent mt-1">{aedBaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          {serviceChargeNum > 0 && (
            <div className="rounded-3xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Charge (AED)</p>
              <p className="text-xl font-bold text-red-500 mt-0.5">-{serviceChargeNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          )}
          <div className="rounded-3xl bg-slate-50 border border-slate-100 p-5 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Due (AED)</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{aedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
