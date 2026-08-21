'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import PasswordInput from '@/components/ui/PasswordInput';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import {
  createICFundAccountAction,
  resetICFundAccountPasswordAction,
  updateICFundAccountAction,
} from '@/app/actions/icFundsActions';
import { IC_FUND_ACCOUNT_TYPE_OPTIONS } from '@/lib/icFunds/constants';
import { PasswordRequirements, ResetPasswordModal } from '@/components/users/UserModals';
import { validatePassword } from '@/lib/passwordValidation';
import type { ICFundAccount } from '@/types';
import type { ICFundAccountType } from '@/lib/icFunds/constants';

interface ICFundAccountModalProps {
  branchId: string;
  open: boolean;
  account?: ICFundAccount | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ICFundAccountModal({
  branchId,
  open,
  account,
  onClose,
  onSave,
}: ICFundAccountModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    accountType: 'personal' as ICFundAccountType,
    openingBalance: '0',
    notes: '',
    status: 'active',
    phone: '',
    email: '',
    password: '',
    requireSignIn: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const isNew = !account;

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        accountType: account.accountType,
        openingBalance: String(account.openingBalance ?? '0'),
        notes: account.notes || '',
        status: account.status || 'active',
        phone: account.phone || '',
        email: account.email || '',
        password: '',
        requireSignIn: Boolean(account.hasPortalLogin),
      });
    } else {
      setFormData({
        name: '',
        accountType: 'personal',
        openingBalance: '0',
        notes: '',
        status: 'active',
        phone: '',
        email: '',
        password: '',
        requireSignIn: false,
      });
    }
  }, [account, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRequireSignInToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      requireSignIn: checked,
      email: checked ? prev.email : '',
      password: checked ? prev.password : '',
    }));
  };

  const canSubmitNew =
    formData.name.trim() &&
    (!formData.requireSignIn || (formData.email.trim() && validatePassword(formData.password).isValid));

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Account name is required');
      return;
    }
    if (isNew && formData.requireSignIn && !formData.email.trim()) {
      alert('Email is required when sign-in is enabled');
      return;
    }
    if (isNew && formData.requireSignIn && !validatePassword(formData.password).isValid) {
      return;
    }

    setIsSaving(true);
    if (isNew) {
      const res = await createICFundAccountAction({
        branchId,
        name: formData.name,
        accountType: formData.accountType,
        openingBalance: Number(formData.openingBalance) || 0,
        notes: formData.notes,
        requireSignIn: formData.requireSignIn,
        email: formData.requireSignIn ? formData.email : undefined,
        password: formData.requireSignIn ? formData.password : undefined,
        phone: formData.phone || undefined,
      });
      setIsSaving(false);
      if (!res.success) {
        alert('Failed to create account: ' + res.error);
        return;
      }
    } else if (account) {
      const res = await updateICFundAccountAction({
        branchId,
        id: account.id,
        name: formData.name,
        accountType: formData.accountType,
        openingBalance: Number(formData.openingBalance) || 0,
        notes: formData.notes,
        status: formData.status as 'active' | 'inactive',
        phone: formData.phone,
      });
      setIsSaving(false);
      if (!res.success) {
        alert('Failed to update account: ' + res.error);
        return;
      }
    }
    onSave();
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!account?.id) return;
    const res = await resetICFundAccountPasswordAction(branchId, account.id, newPassword);
    if (res.success) {
      setShowResetPassword(false);
      alert('Portal password reset successfully.');
    } else {
      alert(res.error || 'Failed to reset password');
      throw new Error(res.error || 'Failed to reset password');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={account ? 'Edit Account' : 'New Account'}
        maxWidth="max-w-[560px] w-[95vw]"
        footer={
          <>
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || (isNew && !canSubmitNew)}
              className={`${btnPrimary} ${isSaving || (isNew && !canSubmitNew) ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {isSaving ? 'Saving...' : account ? 'Save Changes' : 'Create Account'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Account Name *
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
              Account Type
            </label>
            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className={formInput}
            >
              {IC_FUND_ACCOUNT_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              {IC_FUND_ACCOUNT_TYPE_OPTIONS.find(o => o.value === formData.accountType)?.hint}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Opening Balance
            </label>
            <input
              type="number"
              step="0.01"
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              className={formInput}
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-slate-400">Locked after the first entry on this account.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className={`${formInput} min-h-[72px] resize-y`}
              placeholder="Optional notes"
            />
          </div>

          {isNew ? (
            <ToggleSwitch
              checked={formData.requireSignIn}
              onChange={handleRequireSignInToggle}
              label="Require sign in"
              hint="Create a portal login so this account holder can sign in with email and password."
            />
          ) : null}

          {(isNew && formData.requireSignIn) || (!isNew && account?.hasPortalLogin) ? (
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
                readOnly={!isNew}
              />
              {!isNew ? (
                <p className="mt-1 text-xs text-slate-400">Portal login email cannot be changed after creation.</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Used for portal sign-in. A Cognito account will be created.</p>
              )}
            </div>
          ) : null}

          {isNew && formData.requireSignIn ? (
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
            </div>
          ) : null}

          {!isNew && account?.hasPortalLogin && account.email ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Portal password</p>
              <p className="mt-1 text-xs text-amber-700">
                Set a new password for <strong>{account.email}</strong>. The account holder does not need their current
                password.
              </p>
              <button
                type="button"
                className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-50"
                onClick={() => setShowResetPassword(true)}
              >
                Reset portal password
              </button>
            </div>
          ) : null}

          {!isNew ? (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select name="status" value={formData.status} onChange={handleChange} className={formInput}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          ) : null}
        </div>
      </Modal>

      {account?.email ? (
        <ResetPasswordModal
          open={showResetPassword}
          onClose={() => setShowResetPassword(false)}
          email={account.email}
          onReset={handleResetPassword}
        />
      ) : null}
    </>
  );
}
