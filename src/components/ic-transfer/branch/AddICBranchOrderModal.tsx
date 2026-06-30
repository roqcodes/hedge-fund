'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { ICSale } from '@/types';
import { canBranchResubmitOrder } from '@/lib/icTransfer/orderStatus';
import { hasICSaleContentChanged } from '@/lib/icTransfer/saleChanges';
import { WorkflowNotice } from '../shared/orderWorkflow';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICSale;
};

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export default function AddICBranchOrderModal({ open, onClose, initialData }: Props) {
  const { addICSale, resubmitICSale, branches, currentSlug, icRateGroups } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || 'transfer');
  const [address, setAddress] = useState(initialData?.address || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [serviceCharge, setServiceCharge] = useState(initialData?.serviceCharge?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary credentials from env
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'finite-x-reality';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'meal_payments';

  // Retrieve branch info
  const currentBranch = branches.find(b => b.slug === currentSlug);
  const branchName = currentBranch?.name || currentSlug || 'Branch Customer';
  const currentBranchId = currentBranch?.id;

  const applicableGroup = icRateGroups.find(g => 
    (currentBranchId && g.branchIds?.includes(currentBranchId))
  );

  const groupCurrency = applicableGroup?.currency || 'Currency';
  const groupSaleRate = applicableGroup?.saleRate || 0;

  useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setTransactionType(initialData?.transactionType || 'transfer');
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
  const rateNum = initialData ? initialData.unitRate : groupSaleRate;
  const serviceChargeNum = parseFloat(serviceCharge) || 0;

  const aedBaseTotal = unitNum * rateNum;
  const aedNetTotal = Math.max(0, aedBaseTotal - serviceChargeNum);
  
  const inrConversionRate = rateNum > 0 ? 1000 / rateNum : 0;
  const inrTotal = aedBaseTotal * inrConversionRate;

  const isResubmitMode = !!initialData && canBranchResubmitOrder(initialData.orderStatus);

  const payload = {
    customerName: branchName,
    transactionType,
    unitRate: rateNum,
    units: unitNum,
    convertedAmount: inrTotal,
    aedAmount: aedNetTotal,
    address: address || undefined,
    imageUrl: imageUrl || undefined,
    serviceCharge: serviceChargeNum,
  };

  const contentPayload = {
    units: unitNum,
    transactionType,
    convertedAmount: inrTotal,
    aedAmount: aedNetTotal,
    address: address || undefined,
    imageUrl: imageUrl || undefined,
    serviceCharge: serviceChargeNum,
  };

  const hasChanges = !initialData || hasICSaleContentChanged(initialData, contentPayload);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNum || !rateNum) return;
    if (isResubmitMode && !hasChanges) return;
    setIsSubmitting(true);

    if (initialData && isResubmitMode) {
      await resubmitICSale(initialData.id, contentPayload, currentSlug);
    } else if (!initialData) {
      await addICSale(payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isResubmitMode ? 'Edit & Resubmit Order' : 'Create Transfer Order'}
      maxWidth="max-w-[1100px] w-[95vw]"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting || isUploading}>Cancel</button>
          <button
            type="submit"
            form="branch-order-form"
            className={btnPrimary}
            disabled={isSubmitting || isUploading || !unitNum || !rateNum || (isResubmitMode && !hasChanges)}
            title={isResubmitMode && !hasChanges ? 'Change at least one field before resubmitting' : undefined}
          >
            {isSubmitting
              ? 'Saving...'
              : isResubmitMode
                ? 'Save & Resend to Admin'
                : 'Create Order'}
          </button>
        </>
      }
    >
      <form id="branch-order-form" onSubmit={handleSubmit} className="space-y-5">
        {isResubmitMode && initialData?.rejectionRemarks && (
          <WorkflowNotice variant="danger" title="Order rejected by admin">
            {initialData.rejectionRemarks}
            <span className="mt-1 block text-[10px] font-medium opacity-80">
              Update the order details below, then resend for admin review.
            </span>
          </WorkflowNotice>
        )}

        {applicableGroup && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Applicable Rate Group: <strong>{applicableGroup.name}</strong></span>
            <div>
              <span className="font-semibold text-slate-400 uppercase">Rate ({groupCurrency}):</span>{' '}
              <span className="font-bold text-accent">{groupSaleRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Customer details, Address and Upload */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Customer</h3>
            
            <InputField label="Customer (Your Branch)">
              <input 
                className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`} 
                value={branchName} 
                disabled 
                readOnly 
              />
            </InputField>

            <InputField label="Address / Description">
              <textarea 
                className={`${formInput} resize-none`} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Enter delivery address details"
                rows={3}
              />
            </InputField>

            <InputField label="Captured Image">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group shrink-0">
                    <img src={imageUrl} alt="Captured proof" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/60 text-white text-[10px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleDeleteImage}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-slate-400 hover:bg-slate-100/50 cursor-pointer transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 opacity-70">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs font-semibold">{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            </InputField>
          </div>

          {/* Right Column: Transaction Details, Pricing, and Totals */}
          <div className="space-y-4 lg:col-span-7 lg:border-l lg:pl-6 lg:border-slate-100">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Transaction Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Transaction Type">
                <div className="flex rounded-xl bg-slate-100 p-1 w-full border border-slate-200/50 h-[46px] sm:h-[54px] items-stretch gap-1">
                  {[
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'cdm', label: 'CDM' },
                    { value: 'by_hand', label: 'By Hand' }
                  ].map(opt => {
                    const isActive = transactionType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTransactionType(opt.value)}
                        className={`flex-1 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                          isActive 
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </InputField>

              <InputField label="Unit Rate (Locked)">
                <input 
                  className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`} 
                  value={rateNum} 
                  disabled 
                  readOnly 
                  type="number" 
                />
              </InputField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Order Units">
                <input 
                  className={formInput} 
                  value={units} 
                  onChange={e => setUnits(e.target.value)} 
                  type="number" 
                  step="0.01" 
                  placeholder="Enter units quantity"
                  required
                />
              </InputField>

              <InputField label="Service Charge (AED)">
                <input 
                  className={formInput} 
                  value={serviceCharge} 
                  onChange={e => setServiceCharge(e.target.value)} 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                />
              </InputField>
            </div>

            <h3 className="border-b border-slate-100 pb-2 pt-2 text-sm font-bold text-slate-900">Calculations</h3>
            
            <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
              <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (INR)</span>
                <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {inrTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (AED)</span>
                <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {aedBaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Due (AED)</span>
                <span className="mt-1.5 text-lg sm:text-xl font-black text-emerald-700 font-mono">
                  {aedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
