'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { warehouseAcceptOrder, assignOrderToAgent } from '@/app/actions/warehouseActions';
import Modal from '@/components/ui/Modal';
import { canWarehouseAct, normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';
import { WorkflowNotice } from '@/components/ic-transfer/shared/orderWorkflow';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import type { WarehouseOrder } from '@/types/warehouse';

type Props = {
  order: WarehouseOrder;
  agents: { id: string; name: string; account_id: string }[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function AssignDeliveryAgentModal({ order, agents, onClose, onSuccess }: Props) {
  const { showToast, user } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(order.delivery_agent_id || '');

  const needsWarehouseAccept = canWarehouseAct(order.order_status);
  const isReassignOnly = normalizeOrderStatus(order.order_status) === 'wh_processing';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) {
      showToast('Please select a delivery agent', 'error');
      return;
    }
    setLoading(true);

    const updatedBy = user?.email || 'warehouse';
    const res = needsWarehouseAccept
      ? await warehouseAcceptOrder(order.id, selectedAgentId, updatedBy)
      : await assignOrderToAgent(order.id, selectedAgentId);

    setLoading(false);
    if (res.success) {
      showToast(needsWarehouseAccept ? 'Order accepted and agent assigned' : 'Agent assigned successfully', 'success');
      onSuccess();
    } else {
      showToast(res.error || 'Failed to assign agent', 'error');
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={needsWarehouseAccept ? 'Accept Order & Assign Agent' : 'Assign Delivery Agent'}
      maxWidth="max-w-sm"
      footer={
        <div className="flex w-full justify-end gap-3">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="assign-agent-form" disabled={loading} className={btnPrimary}>
            {loading ? 'Saving...' : needsWarehouseAccept ? 'Accept & Assign' : 'Assign'}
          </button>
        </div>
      }
    >
        <form id="assign-agent-form" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {order.rejection_remarks && (
              <WorkflowNotice variant="warning" title="Note">
                {order.rejection_remarks}
              </WorkflowNotice>
            )}
            {needsWarehouseAccept && (
              <p className="text-sm text-slate-600">
                Accept this order and assign a delivery agent to begin processing.
              </p>
            )}
            {isReassignOnly && !order.delivery_agent_id && (
              <p className="text-sm text-slate-600">Reassign a delivery agent for this order.</p>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Delivery Agent</label>
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
            </div>
          </div>
        </form>
    </Modal>
  );
}
