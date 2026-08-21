'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { formatAED } from '@/data/mockData';
import { AdminOrderStatusBadge } from '@/components/ic-transfer/shared/OrderStatusBadge';
import CopyOrderDetailsButton from '@/components/ic-transfer/shared/CopyOrderDetailsButton';
import ProofImageActions from '@/components/ic-transfer/shared/ProofImageActions';
import { useApp } from '@/context/AppContext';

type ViewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  order: {
    id: string;
    aed_amount?: number;
    units?: number;
    order_status?: string;
    delivery_agent_name?: string | null;
    image_url?: string | null;
    delivery_image_url?: string | null;
    address?: string | null;
  } | null;
};

export default function ViewOrderModal({ open, onClose, order }: ViewOrderModalProps) {
  const { showToast } = useApp();
  if (!order) return null;

  const totalUnits = Number(order.units || 0);

  return (
    <Modal open={open} onClose={onClose} title="Order Details" maxWidth="max-w-4xl" footer={<div />}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order ID</h4>
            <p className="mt-1 font-mono text-sm text-slate-900">{order.id}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount</h4>
            <p className="mt-1 text-xl font-bold text-accent">{formatAED(order.aed_amount || 0)}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Units</h4>
            <p className="mt-1 text-sm font-medium text-slate-900">{order.units || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</h4>
            <div className="mt-1">
              <AdminOrderStatusBadge status={order.order_status} />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Agent</h4>
            <p className="mt-1 text-sm font-medium text-slate-900">{order.delivery_agent_name || 'Unassigned'}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Address</h4>
            {order.address?.trim() ? (
              <>
                <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
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
              <p className="mt-1 text-sm text-slate-400">No address provided</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Original Image</h4>
            {order.image_url ? (
              <>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.image_url}
                    alt="Order proof"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
                <ProofImageActions
                  imageUrl={order.image_url}
                  downloadFilename={`order-${order.id}`}
                  enableShare
                  shareTitle="Original order image"
                  onCopySuccess={() => showToast('Image copied')}
                  onCopyError={msg => showToast(msg, 'error')}
                  onDownloadError={msg => showToast(msg, 'error')}
                  onShareError={msg => showToast(msg, 'error')}
                />
              </>
            ) : (
              <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-slate-400">
                <p className="text-xs font-medium">No image uploaded</p>
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

          {order.delivery_image_url ? (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Payment Proof</h4>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.delivery_image_url}
                  alt="Payment proof"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
              <ProofImageActions
                imageUrl={order.delivery_image_url}
                downloadFilename={`payment-proof-${order.id}`}
                enableShare
                shareTitle="Payment proof"
                onCopySuccess={() => showToast('Image copied')}
                onCopyError={msg => showToast(msg, 'error')}
                onDownloadError={msg => showToast(msg, 'error')}
                onShareError={msg => showToast(msg, 'error')}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
