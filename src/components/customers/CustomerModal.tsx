import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { saveCustomer } from '@/app/actions/customerActions';

interface CustomerModalProps {
  slug: string;
  open: boolean;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    balance?: string | number;
    status?: string;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CustomerModal({ slug, open, customer, onClose, onSave }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    balance: '0',
    status: 'active',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        balance: String(customer.balance ?? '0'),
        status: customer.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        balance: '0',
        status: 'active',
      });
    }
  }, [customer, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Customer name is required');
      return;
    }

    setIsSaving(true);
    const res = await saveCustomer(slug, {
      id: customer?.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      balance: formData.balance,
      status: formData.status,
    });
    setIsSaving(false);

    if (res.success) {
      onSave();
    } else {
      alert('Failed to save customer: ' + res.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'New Customer'}
      maxWidth="max-w-[560px] w-[95vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`${btnPrimary} ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {isSaving ? 'Saving...' : customer ? 'Save Changes' : 'Create Customer'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Customer Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={formInput}
            placeholder="e.g. Ahmed Al Mansoori"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={formInput}
            placeholder="+971 50 123 4567"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={formInput}
            placeholder="customer@example.com"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Balance (AED)
          </label>
          <input
            type="number"
            step="0.01"
            name="balance"
            value={formData.balance}
            onChange={handleChange}
            className={formInput}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-slate-400">Leave as 0 if no opening balance</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Status
          </label>
          <select name="status" value={formData.status} onChange={handleChange} className={formInput}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
