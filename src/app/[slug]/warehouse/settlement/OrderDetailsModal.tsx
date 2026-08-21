'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { completeDeliveryWithUnits, deliveryAgentRejectOrder, warehouseRejectOrder } from '@/app/actions/warehouseActions';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import Modal from '@/components/ui/Modal';
import ImageDropZone from '@/components/ui/ImageDropZone';
import RejectRemarkModal from '@/components/ic-transfer/shared/RejectRemarkModal';
import CopyOrderDetailsButton from '@/components/ic-transfer/shared/CopyOrderDetailsButton';
import ProofImageActions from '@/components/ic-transfer/shared/ProofImageActions';
import { canDeliveryAgentAct } from '@/lib/icTransfer/orderStatus';
import { PriorityBadge } from '@/components/warehouse/shared';
import { formatUnits, getRemainingUnits, isDeliveryAgentFinished } from '@/lib/icTransfer/saleUnits';
import { AdminOrderStatusBadge } from '@/components/ic-transfer/shared/OrderStatusBadge';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { uploadImageToCloudinary, deleteCloudinaryImageByToken } from '@/lib/cloudinary';
import type { WarehouseOrder } from '@/types/warehouse';

type Props = {
  order: WarehouseOrder;
  isDeliveryView?: boolean;
  isWarehouseDirectDeliver?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function MetricCell({
  label,
  value,
  valueClassName = 'text-slate-900',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums leading-none sm:text-lg md:text-xl ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

export default function OrderDetailsModal({
  order,
  isDeliveryView = false,
  isWarehouseDirectDeliver = false,
  onClose,
  onSuccess,
}: Props) {
  const { showToast, user, branches } = useApp();
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const totalUnits = Number(order.units);
  const [collectedUnits, setCollectedUnits] = useState('');
  const [deliveryImageUrl, setDeliveryImageUrl] = useState(order?.delivery_image_url || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  if (!order) return null;

  const canRecordDelivery = (isDeliveryView || isWarehouseDirectDeliver)
    && !isDeliveryAgentFinished(order.order_status)
    && canDeliveryAgentAct(order.order_status);
  const isEditable = canRecordDelivery;

  const deliveredUnits = isEditable
    ? Math.min(totalUnits, Math.max(0, parseFloat(collectedUnits) || 0))
    : Number(order.collected_units || (order.order_status === 'completed' ? totalUnits : 0));

  const remainingUnits = isEditable
    ? Math.max(0, totalUnits - deliveredUnits)
    : getRemainingUnits(totalUnits, order.collected_units, order.order_status);

  const deliveryPct =
    totalUnits <= 0 ? 0 : Math.min(100, Math.round((deliveredUnits / totalUnits) * 100));

  const formattedId = getFormattedTxnId(order.id, 'sale', order, branches);
  const parentId = order.derived_from_sale_id
    ? getFormattedTxnId(order.derived_from_sale_id, 'sale', null, branches)
    : null;

  const handleImageUpload = async (file: File) => {
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
    const updatedBy = user?.email || (isWarehouseDirectDeliver ? 'warehouse' : 'delivery_agent');
    const res = isWarehouseDirectDeliver
      ? await warehouseRejectOrder(order.id, remarks, updatedBy)
      : await deliveryAgentRejectOrder(order.id, remarks, updatedBy);
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
        maxWidth="max-w-3xl"
        footer={
          <div className="flex w-full justify-between gap-3">
            {isEditable ? (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                disabled={loading}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                Reject Order
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>
                Close
              </button>
              {isEditable && (
                <button
                  type="submit"
                  form="complete-order-form"
                  disabled={loading || isUploading}
                  className={btnPrimary}
                >
                  {loading ? 'Processing…' : 'Accept & Complete'}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200/90">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Order</p>
                <p className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-900">{formattedId}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <PriorityBadge priority={order.priority} />
                <AdminOrderStatusBadge status={order.order_status} />
              </div>
            </div>

            {parentId ? (
              <div className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-2 text-xs text-indigo-800 sm:px-5">
                <span className="font-semibold">Split order</span>
                <span className="text-indigo-600"> · remainder from </span>
                <span className="font-mono font-medium">{parentId}</span>
              </div>
            ) : null}

            <div className="px-4 py-4 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Delivery progress</p>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
                <MetricCell label="Total" value={formatUnits(totalUnits)} />
                <MetricCell
                  label="Delivered"
                  value={formatUnits(deliveredUnits)}
                  valueClassName="text-emerald-700"
                />
                <MetricCell
                  label="Remaining"
                  value={formatUnits(remainingUnits)}
                  valueClassName={remainingUnits > 0 ? 'text-amber-700' : 'text-slate-500'}
                />
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Units delivered</span>
                  <span className="tabular-nums">{deliveryPct}%</span>
                </div>
                <div
                  className="relative h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={deliveryPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Share of order units delivered"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-300 ease-out"
                    style={{ width: `${deliveryPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  {formatUnits(deliveredUnits)} delivered
                  {remainingUnits > 0
                    ? ` · ${formatUnits(remainingUnits)} will stay on a new linked order`
                    : ' · full delivery'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 px-4 py-4 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Delivery address</p>
            {order.address?.trim() ? (
              <>
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  {order.address}
                </p>
                <div className="mt-2">
                  <CopyOrderDetailsButton
                    address={order.address}
                    units={totalUnits}
                    enableShare
                    onCopySuccess={() => showToast('Address details copied')}
                    onCopyError={msg => showToast(msg, 'error')}
                    onShareError={msg => showToast(msg, 'error')}
                  />
                </div>
              </>
            ) : (
              <div className="mt-2 flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-400">
                No address text provided
              </div>
            )}
          </section>

          {isEditable ? (
            <section className="rounded-2xl border border-slate-200/90 px-4 py-4 sm:px-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Record delivery</p>
              <form id="complete-order-form" onSubmit={handleUpdateOrder} className="mt-3 space-y-4">
                <div>
                  <label htmlFor="delivered-units" className="mb-1.5 block text-sm font-semibold text-slate-900">
                    Delivered units
                  </label>
                  <input
                    id="delivered-units"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalUnits}
                    required
                    value={collectedUnits}
                    onChange={e => setCollectedUnits(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="Enter units delivered"
                  />
                  {remainingUnits > 0 ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      Remaining {formatUnits(remainingUnits)} units will be created as a new order linked to this one.
                    </p>
                  ) : null}
                </div>
              </form>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Original order</p>
              {order.image_url ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.image_url} alt="Original order" className="absolute inset-0 h-full w-full object-contain" />
                  </div>
                  <ProofImageActions
                    imageUrl={order.image_url}
                    downloadFilename={`order-${formattedId}`}
                    enableShare
                    shareTitle="Original order image"
                    shareText={`Original order image for ${formattedId}`}
                    onCopySuccess={() => showToast('Image copied')}
                    onCopyError={msg => showToast(msg, 'error')}
                    onDownloadError={msg => showToast(msg, 'error')}
                    onShareError={msg => showToast(msg, 'error')}
                  />
                </>
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs font-medium text-slate-400">
                  <span>No original image</span>
                  <CopyOrderDetailsButton
                    address={order.address ?? undefined}
                    units={totalUnits}
                    enableShare
                    onCopySuccess={() => showToast('Details copied')}
                    onCopyError={msg => showToast(msg, 'error')}
                    onShareError={msg => showToast(msg, 'error')}
                  />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Payment proof</p>
              {isEditable ? (
                <ImageDropZone
                  imageUrl={deliveryImageUrl}
                  onUpload={handleImageUpload}
                  onClear={handleDeleteImage}
                  isUploading={isUploading}
                  showCapture
                  emptyLabel="Add payment proof image"
                />
              ) : deliveryImageUrl ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={deliveryImageUrl} alt="Payment proof" className="absolute inset-0 h-full w-full object-contain" />
                  </div>
                  <ProofImageActions
                    imageUrl={deliveryImageUrl}
                    downloadFilename={`payment-proof-${formattedId}`}
                    enableShare
                    shareTitle="Payment proof"
                    shareText={`Payment proof for ${formattedId}`}
                    onCopySuccess={() => showToast('Image copied')}
                    onCopyError={msg => showToast(msg, 'error')}
                    onDownloadError={msg => showToast(msg, 'error')}
                    onShareError={msg => showToast(msg, 'error')}
                  />
                </>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-400">
                  No payment proof
                </div>
              )}
            </div>
          </section>
        </div>
      </Modal>

      <RejectRemarkModal
        open={rejectOpen}
        loading={loading}
        title={isWarehouseDirectDeliver ? 'Reject Order' : 'Reject Delivery'}
        description={
          isWarehouseDirectDeliver
            ? 'Provide a reason for rejecting this order. The admin will be notified to reassign or reject.'
            : 'Provide a reason for rejecting this delivery. The warehouse manager and admin will be notified.'
        }
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}
