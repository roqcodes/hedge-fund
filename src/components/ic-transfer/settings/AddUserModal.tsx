'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect, formTextarea } from '@/lib/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  showCommission?: boolean;
  showRate?: boolean;
};

export default function AddUserModal({
  open,
  onClose,
  title = 'Add User',
  showCommission = false,
  showRate = false,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={onClose}>Create User</button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Name</label>
        <input className={formInput} placeholder="Full name" />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Phone Number</label>
        <div className="flex gap-2">
          <select className={`${formSelect} w-24 shrink-0`} defaultValue="+91">
            <option value="+91">+91</option>
            <option value="+971">+971</option>
          </select>
          <input className={formInput} placeholder="Enter phone number" />
        </div>
      </div>
      {showCommission && (
        <div className={formGroup}>
          <label className={formLabel}>Commission</label>
          <input className={formInput} placeholder="0" />
        </div>
      )}
      <div className={formGroup}>
        <label className={formLabel}>Region</label>
        <select className={formSelect} defaultValue="">
          <option value="" disabled>Select Region</option>
          <option>UAE</option>
          <option>KSA</option>
          <option>India</option>
        </select>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Email</label>
        <input className={formInput} type="email" placeholder="email@example.com" />
      </div>
      {showRate && (
        <div className={formGroup}>
          <label className={formLabel}>Rate</label>
          <input className={formInput} defaultValue="0" />
        </div>
      )}
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
      <div className={formGroup}>
        <label className={formLabel}>Address</label>
        <textarea className={formTextarea} rows={2} />
      </div>
    </Modal>
  );
}
