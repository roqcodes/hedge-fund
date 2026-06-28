'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { updateOrderStatus } from '@/app/actions/warehouseActions';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary } from '@/lib/ui';


type Props = {
  order: any;
  isDeliveryView?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function OrderDetailsModal({ order, isDeliveryView = false, onClose, onSuccess }: Props) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState(
    order?.collected_amount !== undefined && order?.collected_amount !== null && Number(order?.collected_amount) !== 0 
      ? Number(order?.collected_amount).toString() 
      : Number(order?.aed_amount || 0).toString()
  );

  const [deliveryImageUrl, setDeliveryImageUrl] = useState(order?.delivery_image_url || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const cloudName   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

  if (!cloudName || !uploadPreset) {
    console.error('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET env var');
  }

  if (!order) return null;

  const isEditable = isDeliveryView && order.delivery_status !== 'Completed';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cloudName || !uploadPreset) {
      showToast('Image upload is not configured (missing Cloudinary credentials)', 'error');
      return;
    }

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
      setDeliveryImageUrl(data.secure_url);
      setDeleteToken(data.delete_token || '');
      showToast('Delivery proof image uploaded successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to upload image. Please try again.', 'error');
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
    setDeliveryImageUrl('');
    setDeleteToken('');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const amt = parseFloat(collectedAmount);
    if (isNaN(amt) || amt < 0) {
      showToast('Please enter a valid collected amount', 'error');
      setLoading(false);
      return;
    }

    const totalAmt = Number(order.aed_amount || 0);
    const newStatus = amt >= totalAmt ? 'Completed' : 'Partial';

    const res = await updateOrderStatus(order.id, newStatus, amt, deliveryImageUrl);

    if (res.success) {
      showToast(`Order status updated to ${newStatus}`, 'success');
      onSuccess();
    } else {
      showToast(res.error || 'Failed to update order', 'error');
    }
    setLoading(false);
  };

  const formatAED = (val: any) => {
    return Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AED';
  };

  const remainingAmount = Math.max(0, Number(order.aed_amount || 0) - (parseFloat(collectedAmount) || 0));

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEditable ? "Update Order Status" : "Order Details"}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>Close</button>
          {isEditable && (
            <button type="submit" form="complete-order-form" disabled={loading || isUploading} className={btnPrimary}>
              {loading ? 'Processing...' : 'Save Updates'}
            </button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: Fields and Inputs */}
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order ID</p>
              <p className="font-mono text-sm font-semibold text-slate-900 mt-0.5">{order.id.split('-')[0]}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-0.5 ${
                order.priority === 'High' ? 'bg-red-50 text-red-700 border border-red-200' :
                order.priority === 'Low' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-slate-100 text-slate-700'
              }`}>
                {order.priority || 'Normal'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-100 p-4 bg-slate-50/55">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Units</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{Number(order.units).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Rate</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{formatAED(order.unit_rate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total AED</p>
              <p className="text-sm font-bold text-accent mt-0.5">{formatAED(order.aed_amount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mt-0.5 ${
                order.delivery_status === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                order.delivery_status === 'Partial' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                order.delivery_status === 'Cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                'bg-slate-100 text-slate-700'
              }`}>
                {order.delivery_status || 'Pending'}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Agent</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">{order.delivery_agent_name || 'Unassigned'}</p>
            </div>
          </div>

          {order.address && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivery Address</p>
              <p className="text-sm text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{order.address}</p>
            </div>
          )}

          {isEditable ? (
            <form id="complete-order-form" onSubmit={handleUpdateOrder} className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-900">Collected Amount (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={collectedAmount}
                  onChange={e => setCollectedAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent font-semibold"
                  placeholder="Enter collected amount"
                />
                <div className="flex justify-between items-center mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Remaining Amount:</span>
                  <span className={`text-xs font-bold ${remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatAED(remainingAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-900">Upload Delivery/Payment Proof</label>
                <div className="flex items-center gap-3">
                  {deliveryImageUrl ? (
                    <div className="relative w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deliveryImageUrl} alt="Delivery proof" className="w-full h-full object-cover" />
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
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Collected Amount:</span>
                <span className="text-sm font-bold text-emerald-700">{formatAED(order.collected_amount)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Remaining Amount:</span>
                <span className="text-sm font-bold text-slate-700">{formatAED(Math.max(0, Number(order.aed_amount || 0) - Number(order.collected_amount || 0)))}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Images */}
        <div className="flex flex-col gap-6 lg:border-l lg:pl-8 lg:border-slate-100">
          {/* original order image */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Original Order Image (Branch Upload)</p>
            {order.image_url ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={order.image_url} alt="Order proof" className="absolute inset-0 h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-xs font-medium">
                No original image uploaded
              </div>
            )}
          </div>

          {/* delivery agent proof image */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Delivery/Payment Proof (Agent Upload)</p>
            {deliveryImageUrl ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={deliveryImageUrl} alt="Delivery proof" className="absolute inset-0 h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-xs font-medium">
                No delivery proof image uploaded
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
