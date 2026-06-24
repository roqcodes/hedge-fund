'use client';

import React, { useState } from 'react';
import { changeOwnPasswordAction } from '@/app/actions/permissionActions';
import { useApp } from '@/context/AppContext';
import { btnPrimary, formGroup, formInput, formLabel, pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import { ChangePasswordModal } from './UserModals';

type Props = {
  branchSlug?: string;
};

export default function StaffAccountSettings({ branchSlug }: Props) {
  const { user, showToast } = useApp();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const res = await changeOwnPasswordAction(currentPassword, newPassword, branchSlug);
    if (res.success) {
      showToast('Password updated successfully.');
    } else {
      showToast(res.error || 'Failed to change password', 'error');
      throw new Error(res.error);
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>My Account</h2>
            <p className={pageSubtitle}>Manage your profile and security settings</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-surface sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className={formGroup}>
              <label className={formLabel}>Full name</label>
              <input className={formInput} value={user.name} disabled readOnly />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Email</label>
              <input className={formInput} value={user.email} disabled readOnly />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Role</label>
              <input className={formInput} value={user.role.replace('_', ' ')} disabled readOnly />
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-bold text-slate-900">Security</h3>
            <p className="mt-1 text-sm text-slate-500">
              Change your password using your current password. Only you can update your credentials.
            </p>
            <button
              type="button"
              className={`${btnPrimary} mt-4`}
              onClick={() => setShowPasswordModal(true)}
            >
              Change password
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onChange={handleChangePassword}
      />
    </>
  );
}