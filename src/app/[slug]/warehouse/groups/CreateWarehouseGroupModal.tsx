'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { createWarehouseGroup } from '@/app/actions/warehouseActions';
import Modal from '@/components/ui/Modal';

type Props = {
  warehouseId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateWarehouseGroupModal({ warehouseId, onClose, onSuccess }: Props) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await createWarehouseGroup(warehouseId, name, description);

    if (res.success) {
      showToast('Group created successfully', 'success');
      onSuccess();
    } else {
      showToast(res.error || 'Failed to create group', 'error');
    }
    setLoading(false);
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Add Group"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-group-form"
            disabled={loading}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Add Group'}
          </button>
        </div>
      }
    >
      <form id="add-group-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Group Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="e.g. CDM"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-1 focus:ring-accent resize-none min-h-[80px]"
              placeholder="Optional description"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
