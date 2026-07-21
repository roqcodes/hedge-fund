import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import PasswordInput from '@/components/ui/PasswordInput';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { saveCustomer } from '@/app/actions/customerActions';
import { PasswordRequirements } from '@/components/users/UserModals';
import { validatePassword } from '@/lib/passwordValidation';
import { WORLD_CURRENCIES } from '@/lib/worldCurrencies';

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
    cognitoUserId?: string | null;
    currency?: string;
  } | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CustomerModal({ slug, open, customer, onClose, onSave }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    balance: '0',
    status: 'active',
    currency: 'AED',
  });
  const [isSaving, setIsSaving] = useState(false);
  const isNew = !customer;

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        password: '',
        balance: String(customer.balance ?? '0'),
        status: customer.status || 'active',
        currency: (customer as Record<string, unknown>).currency as string || 'AED',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        password: '',
        balance: '0',
        status: 'active',
        currency: 'AED',
      });
    }
  }, [customer, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const currencyOptions = WORLD_CURRENCIES.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }));

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Customer name is required');
      return;
    }
    if (isNew && !formData.email.trim()) {
      alert('Email is required to create a customer portal account');
      return;
    }
    if (isNew && !validatePassword(formData.password).isValid) {
      return;
    }

    setIsSaving(true);
    const res = await saveCustomer(slug, {
      id: customer?.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      password: isNew ? formData.password : undefined,
      balance: formData.balance,
      status: formData.status,
      currency: formData.currency,
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
            disabled={isSaving || (isNew && !validatePassword(formData.password).isValid)}
            className={`${btnPrimary} ${isSaving || (isNew && !validatePassword(formData.password).isValid) ? 'cursor-not-allowed opacity-50' : ''}`}
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
            Email {isNew ? '*' : ''}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={formInput}
            placeholder="customer@example.com"
            required={isNew}
            readOnly={!isNew && !!customer?.cognitoUserId}
          />
          {!isNew && customer?.cognitoUserId ? (
            <p className="mt-1 text-xs text-slate-400">Portal login email cannot be changed after account creation.</p>
          ) : isNew ? (
            <p className="mt-1 text-xs text-slate-400">Used for customer portal sign-in. A Cognito account will be created.</p>
          ) : null}
        </div>

        {isNew ? (
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Portal Password *
            </label>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter secure password"
              required
              autoComplete="new-password"
            />
            <PasswordRequirements pw={formData.password} />
            <p className="mt-1 text-xs text-slate-400">Customer signs in at the branch portal with this email and password.</p>
          </div>
        ) : null}

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
            Default Currency
          </label>
          <SearchableSelect
            options={currencyOptions}
            value={formData.currency}
            onChange={value => setFormData(prev => ({ ...prev, currency: value }))}
            placeholder="Select currency..."
          />
          <p className="mt-1 text-xs text-slate-400">Base currency for this customer. Defaults to AED.</p>
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
