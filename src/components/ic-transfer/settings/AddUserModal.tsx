'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect, formTextarea } from '@/lib/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  showCommission?: boolean;
  showRate?: boolean;
  showPassword?: boolean;
  initialData?: any;
  regions?: { id: string; name: string }[];
  onAdd?: (data: {
    id?: string;
    name: string;
    phone: string;
    commission: number | null;
    regionId: string;
    email: string;
    address: string;
  }) => Promise<boolean | void>;
};

export default function AddUserModal({
  open,
  onClose,
  title = 'Add User',
  showCommission = false,
  showRate = false,
  showPassword = true,
  initialData,
  regions,
  onAdd,
}: Props) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [commission, setCommission] = useState('');
  const [regionId, setRegionId] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setPhoneNumber(initialData?.phone || '');
      setCommission(initialData?.commission ? String(initialData.commission) : '');
      setRegionId(initialData?.regionId || (regions?.[0]?.id || ''));
      setEmail(initialData?.email || '');
      setAddress(initialData?.address || '');
    }
  }, [open, initialData, regions]);

  const handleSubmit = async () => {
    if (!name) return;
    setIsSubmitting(true);
    if (onAdd) {
      const commValue = commission ? parseFloat(commission) : null;
      await onAdd({
        id: initialData?.id,
        name,
        phone: phoneNumber,
        commission: commValue,
        regionId,
        email,
        address,
      });
    }
    // reset
    setName('');
    setPhoneNumber('');
    setCommission('');
    setRegionId('');
    setEmail('');
    setAddress('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || !name}>
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Name</label>
        <input className={formInput} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Phone Number</label>
        <input className={formInput} placeholder="Enter phone number (e.g. +971...)" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
      </div>
      {showCommission && (
        <div className={formGroup}>
          <label className={formLabel}>Commission</label>
          <input className={formInput} placeholder="0" type="number" step="0.01" value={commission} onChange={e => setCommission(e.target.value)} />
        </div>
      )}
      <div className={formGroup}>
        <label className={formLabel}>Region</label>
        <select className={formSelect} value={regionId} onChange={e => setRegionId(e.target.value)}>
          <option value="" disabled>Select Region</option>
          {regions ? (
            regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
          ) : (
            <>
              <option>UAE</option>
              <option>KSA</option>
              <option>India</option>
            </>
          )}
        </select>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Email</label>
        <input className={formInput} type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      {showRate && (
        <div className={formGroup}>
          <label className={formLabel}>Rate</label>
          <input className={formInput} defaultValue="0" />
        </div>
      )}
      {showPassword && (
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Password</label>
            <input className={formInput} type="password" />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Confirm Password</label>
            <input className={formInput} type="password" />
          </div>
        </div>
      )}
      <div className={formGroup}>
        <label className={formLabel}>Address</label>
        <textarea className={formTextarea} rows={2} value={address} onChange={e => setAddress(e.target.value)} />
      </div>
    </Modal>
  );
}
