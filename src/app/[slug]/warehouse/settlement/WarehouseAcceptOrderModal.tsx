'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { warehouseAcceptOrder, warehouseAcceptDirectDeliver } from '@/app/actions/warehouseActions';
import Modal from '@/components/ui/Modal';
import { WorkflowNotice } from '@/components/ic-transfer/shared/orderWorkflow';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import type { WarehouseOrder } from '@/types/warehouse';

type FulfillmentRoute = 'agent' | 'direct';

type Props = {
  order: WarehouseOrder;
  agents: { id: string; name: string; account_id: string }[];
  onClose: () => void;
  onSuccess: (route: FulfillmentRoute) => void;
};

export default function WarehouseAcceptOrderModal({ order, agents, onClose, onSuccess }: Props) {
  const { showToast, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<FulfillmentRoute>('agent');
  const [selectedAgentId, setSelectedAgentId] = useState(order.delivery_agent_id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const updatedBy = user?.email || 'warehouse';

    if (route === 'agent') {
      if (!selectedAgentId) {
        showToast('Please select a delivery agent', 'error');
        setLoading(false);
        return;
      }
      const res = await warehouseAcceptOrder(order.id, selectedAgentId, updatedBy);
      setLoading(false);
      if (res.success) {
        showToast('Order accepted and agent assigned', 'success');
        onSuccess('agent');
      } else {
        showToast(res.error || 'Failed to assign agent', 'error');
      }
      return;
    }

    const res = await warehouseAcceptDirectDeliver(order.id, updatedBy);
    setLoading(false);
    if (res.success) {
      showToast('Order accepted — moved to Deliver queue', 'success');
      onSuccess('direct');
    } else {
      showToast(res.error || 'Failed to accept order', 'error');
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Accept Order"
      maxWidth="max-w-md"
      footer={
        <div className="flex w-full justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" form="warehouse-accept-form" disabled={loading} className={btnPrimary}>
            {loading ? 'Saving…' : route === 'agent' ? 'Accept & Assign Agent' : 'Accept & Deliver'}
          </button>
        </div>
      }
    >
      <form id="warehouse-accept-form" onSubmit={handleSubmit} className="space-y-4">
        {order.rejection_remarks ? (
          <WorkflowNotice variant="warning" title="Note">
            {order.rejection_remarks}
          </WorkflowNotice>
        ) : null}
        <p className="text-sm text-slate-600">
          Choose how this order should be fulfilled after acceptance.
        </p>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Fulfillment route
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
            <input
              type="radio"
              name="warehouse-fulfillment-route"
              value="agent"
              checked={route === 'agent'}
              onChange={() => setRoute('agent')}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Assign delivery agent</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Agent records delivery, proof, and partial splits from My Deliveries.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-emerald-300 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50/60">
            <input
              type="radio"
              name="warehouse-fulfillment-route"
              value="direct"
              checked={route === 'direct'}
              onChange={() => setRoute('direct')}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Direct deliver</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Warehouse completes delivery from the Deliver tab — qty, proof, and splits.
              </span>
            </span>
          </label>
        </fieldset>
        {route === 'agent' ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Select delivery agent</label>
            {agents.length === 0 ? (
              <p className="text-sm text-amber-700">No delivery agents configured. Add one first or choose direct deliver.</p>
            ) : (
              <select
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
                required
              >
                <option value="">-- Select agent --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.account_id})</option>
                ))}
              </select>
            )}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
