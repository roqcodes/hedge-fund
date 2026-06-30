'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { completeDeliveryWithUnits, deliveryAgentRejectOrder } from '@/app/actions/warehouseActions';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import Modal from '@/components/ui/Modal';
import RejectRemarkModal from '@/components/ic-transfer/shared/RejectRemarkModal';
import { canDeliveryAgentAct } from '@/lib/icTransfer/orderStatus';
import { PriorityBadge } from '@/components/warehouse/shared';
import { formatUnits, getRemainingUnits, isSaleCompleted } from '@/lib/icTransfer/saleUnits';
import { AdminOrderStatusBadge } from '@/components/ic-transfer/shared/OrderStatusBadge';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { uploadImageToCloudinary, deleteCloudinaryImageByToken } from '@/lib/cloudinary';
import type { WarehouseOrder } from '@/types/warehouse';

type Props = {
  order: WarehouseOrder;
  isDeliveryView?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function OrderDetailsModal({ order, isDeliveryView = false, onClose, onSuccess }: Props) {
  const { showToast, user, branches } = useApp();
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const totalUnits = Number(order.units);
  const [collectedUnits, setCollectedUnits] = useState(totalUnits.toString());
  const [deliveryImageUrl, setDeliveryImageUrl] = useState(order?.delivery_image_url || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  if (!order) return null;

  const isEditable = isDeliveryView && !isSaleCompleted(order.order_status) && canDeliveryAgentAct(order.order_status);
  const remainingUnits = isEditable
    ? Math.max(0, totalUnits - (parseFloat(collectedUnits) || 0))
    : getRemainingUnits(totalUnits, order.collected_units, order.order_status);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { secureUrl, deleteToken: token } = await uploadImageToCloudinary(file);
      setDeliveryImageUrl(secureUrl);
      setDeleteToken(token || '');
      showToast('Delivery proof image uploaded successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showToast(message === 'Upload failed' ? 'Failed to upload image. Please try again.' : message, 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async () => {
    if (deleteToken) {
      try {
        await deleteCloudinaryImageByToken(deleteToken);
      } catch {
        /* non-blocking */
      }
    }
    setDeliveryImageUrl('');
    setDeleteToken('');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const units = parseFloat(collectedUnits);
    if (!Number.isFinite(units) || units <= 0 || units > totalUnits) {
      showToast(`Enter delivered units between 1 and ${formatUnits(totalUnits)}`, 'error');
      setLoading(false);
      return;
    }
    const res = await completeDeliveryWithUnits(
      order.id,
      units,
      deliveryImageUrl,
      user?.email || 'delivery_agent',
    );
    setLoading(false);
    if (res.success) {
      showToast(res.message || 'Delivery recorded', 'success');
      onSuccess();
    } else {
      showToast(res.error || 'Failed to update order', 'error');
    }
  };

  const handleReject = async (remarks: string) => {
    setLoading(true);
    const res = await deliveryAgentRejectOrder(order.id, remarks, user?.email || 'delivery_agent');
    setLoading(false);
    if (res.success) {
      showToast('Order rejected', 'success');
      setRejectOpen(false);
      onSuccess();
    } else {
      showToast(res.error || 'Failed to reject order', 'error');
    }
  };

  return (
    <>
      <Modal
        open={true}
        onClose={onClose}
        title={isEditable ? 'Record Delivery' : 'Order Details'}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-between gap-3 w-full">
            {isEditable ? (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                disabled={loading}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Reject Order
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>Close</button>
              {isEditable && (
                <button type="submit" form="complete-order-form" disabled={loading || isUploading} className={btnPrimary}>
                  {loading ? 'Processing...' : 'Accept & Complete'}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order ID</p>
                <p className="font-mono text-sm font-semibold text-slate-900 mt-0.5">{getFormattedTxnId(order.id, 'sale', order, branches)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{new Date(order.created_at).toLocaleString()}</p>
              </div>
            </div>

            {order.derived_from_sale_id && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-800">
                <span className="font-bold">Derived from order: </span>
                <span className="font-mono">{getFormattedTxnId(order.derived_from_sale_id, 'sale', null, branches)}</span>
                <span className="text-indigo-600"> — remainder from a partial delivery</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
                <div className="mt-0.5"><PriorityBadge priority={order.priority} /></div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/55">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Units</p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{formatUnits(totalUnits)}</p>
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
                  <label className="mb-1.5 block text-sm font-semibold text-slate-900">Delivered Units</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalUnits}
                    required
                    value={collectedUnits}
                    onChange={e => setCollectedUnits(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent font-semibold"
                    placeholder="Enter units delivered"
                  />
                  <div className="flex justify-between items-center mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">Remaining units:</span>
                    <span className={`text-xs font-bold ${remainingUnits > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatUnits(remainingUnits)}
                    </span>
                  </div>
                  {remainingUnits > 0 && (
                    <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                      Remaining {formatUnits(remainingUnits)} units will be created as a new independent order linked to this one.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-900">Upload Delivery Proof</label>
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-1 opacity-70" aria-hidden>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="text-xs font-semibold">{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                      </label>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Delivered Units:</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatUnits(order.collected_units || (order.order_status === 'completed' ? totalUnits : 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Remaining Units:</span>
                  <span className="text-sm font-bold text-slate-700">{formatUnits(remainingUnits)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:border-l lg:pl-8 lg:border-slate-100">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Original Order Image</p>
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
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Delivery Proof</p>
              {deliveryImageUrl ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={deliveryImageUrl} alt="Delivery proof" className="absolute inset-0 h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-xs font-medium">
                  No delivery proof uploaded
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <RejectRemarkModal
        open={rejectOpen}
        loading={loading}
        title="Reject Delivery"
        description="Provide a reason for rejecting this delivery. The warehouse manager and admin will be notified."
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}
