'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { assignOrderToAgent } from '@/app/actions/warehouseActions';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary } from '@/lib/ui';

type Props = {
  order: any;
  agents: any[];
  onClose: () => void;
  onSuccess: () => void;
};

export default function AssignDeliveryAgentModal({ order, agents, onClose, onSuccess }: Props) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(order.delivery_agent_id || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await assignOrderToAgent(order.id, selectedAgentId || null);

    if (res.success) {
      showToast('Agent assigned successfully', 'success');
      onSuccess();
    } else {
      showToast(res.error || 'Failed to assign agent', 'error');
    }
    setLoading(false);
  };

  return (
    <Modal 
      open={true} 
      onClose={onClose} 
      title="Assign Agent" 
      maxWidth="max-w-sm"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="assign-agent-form" disabled={loading} className={btnPrimary}>
            {loading ? 'Saving...' : 'Assign'}
          </button>
        </div>
      }
    >
      <form id="assign-agent-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Select Delivery Agent</label>
            <select
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">-- Unassigned --</option>
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
