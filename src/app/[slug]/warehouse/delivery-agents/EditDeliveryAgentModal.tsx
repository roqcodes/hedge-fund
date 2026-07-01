'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { updateDeliveryAgent } from '@/app/actions/warehouseActions';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary } from '@/lib/ui';

type Props = {
  agent: any;
  warehouseId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditDeliveryAgentModal({ agent, warehouseId, onClose, onSuccess }: Props) {
  const { showToast, currentSlug } = useApp();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(agent.name || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(agent.phone || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updateDeliveryAgent({
      id: agent.id,
      email: agent.email,
      name,
      password: password || undefined,
      phone,
      branchSlug: currentSlug,
    });

    if (res.success) {
      showToast('Delivery agent updated successfully', 'success');
      onSuccess();
    } else {
      showToast(res.error || 'Failed to update agent', 'error');
    }
    setLoading(false);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Edit Account"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="edit-agent-form" disabled={loading} className={btnPrimary}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="edit-agent-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Account ID</label>
            <input
              disabled
              type="text"
              value={agent.account_id}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Enter full name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</label>
            <input
              disabled
              type="email"
              value={agent.email}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 flex justify-between text-sm font-medium text-slate-700">
              <span>Reset Password</span>
              <span className="text-xs font-normal text-slate-400 font-mono">(Optional)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="+971..."
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
