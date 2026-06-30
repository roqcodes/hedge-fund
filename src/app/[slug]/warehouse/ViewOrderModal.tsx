import React from 'react';
import Modal from '@/components/ui/Modal';
import { formatAED } from '@/data/mockData';
import { AdminOrderStatusBadge } from '@/components/ic-transfer/shared/OrderStatusBadge';

type ViewOrderModalProps = {
  open: boolean;
  onClose: () => void;
  order: any | null;
};

export default function ViewOrderModal({ open, onClose, order }: ViewOrderModalProps) {
  if (!order) return null;

  return (
    <Modal open={open} onClose={onClose} title="Order Details" maxWidth="max-w-4xl" footer={<div />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Order Data */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order ID</h4>
            <p className="mt-1 text-sm font-mono text-slate-900">{order.id}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer</h4>
            <p className="mt-1 text-sm font-semibold text-slate-900">{order.customer_name}</p>
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
          {order.address && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</h4>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{order.address}</p>
            </div>
          )}
        </div>

        {/* Right Side: Image */}
        <div className="flex flex-col border-t pt-6 md:border-t-0 md:border-l md:pl-6 md:pt-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Uploaded Image</h4>
          {order.image_url ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={order.image_url} 
                alt="Order proof" 
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-50">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-xs font-medium">No image uploaded</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
