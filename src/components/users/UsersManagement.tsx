'use client';

import React, { useState } from 'react';
import { CognitoUser, createCognitoUserAction, deleteCognitoUserAction, updateCognitoUserPasswordAction, updateCognitoUserAttributesAction } from '@/app/actions/cognitoActions';
import { useApp } from '@/context/AppContext';
import { formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import { btnPrimary, btnGhost, btnSm, pageHeader, pageTitle, pageSubtitle, tableWrap, dataTable } from '@/lib/ui';
import { CreateUserModal, ResetPasswordModal, EditUserModal } from './UserModals';

interface UsersManagementProps {
  initialUsers: CognitoUser[];
  error?: string;
}

export default function UsersManagement({ initialUsers, error }: UsersManagementProps) {
  const { showToast, branches } = useApp();
  const [users, setUsers] = useState<CognitoUser[]>(initialUsers);
  
  const [showCreate, setShowCreate] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<CognitoUser | null>(null);

  const handleCreate = async (email: string, name: string, role: string, branchId: string, passwordRaw: string) => {
    const res = await createCognitoUserAction(email, name, role, branchId, passwordRaw);
    if (res.success) {
      showToast('User created successfully in Cognito!');
      // Optimistically add to list
      setUsers([{
        username: email,
        email,
        name,
        role,
        branchId,
        status: 'CONFIRMED',
        created: new Date().toISOString()
      }, ...users]);
    } else {
      showToast(res.error || 'Failed to create user', 'error');
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetEmail) return;
    const res = await updateCognitoUserPasswordAction(resetEmail, newPassword);
    if (res.success) {
      showToast('Password reset successfully!');
    } else {
      showToast(res.error || 'Failed to reset password', 'error');
    }
  };

  const handleEditUser = async (email: string, newName: string) => {
    const res = await updateCognitoUserAttributesAction(email, newName);
    if (res.success) {
      setUsers(prev => prev.map(u => u.email === email ? { ...u, name: newName } : u));
      showToast('User updated successfully!');
      setEditingUser(null);
    } else {
      showToast(res.error || 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email} from Cognito?`)) return;
    const res = await deleteCognitoUserAction(email);
    if (res.success) {
      showToast('User deleted successfully');
      setUsers(users.filter(u => u.email !== email));
    } else {
      showToast(res.error || 'Failed to delete user', 'error');
    }
  };

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '-';
    return branches.find(b => b.id === branchId)?.name || branchId;
  };

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200">
            <h3 className="text-sm font-bold text-red-800">Cognito Configuration Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Users & Roles</h2>
            <p className={pageSubtitle}>Manage AWS Cognito users, permissions, and branch assignments.</p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            Create User
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-bold text-slate-900">Cognito User Directory</h3>
            <span className="text-xs font-semibold text-slate-400">{users.length} TOTAL USERS</span>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[800px]`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Name & Email</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Role</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch Assignment</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Created</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        {error ? 'Unable to load users due to configuration error.' : 'No users found in Cognito.'}
                      </td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u.username} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 first:rounded-l-2xl sm:px-5 sm:py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{u.name}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </div>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(u.role === 'admin' ? 'active' : 'pending')}>{u.role}</span>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4">
                        {getBranchName(u.branchId)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                        <span className={badgeClass(u.status === 'CONFIRMED' ? 'completed' : 'processing')}>{u.status}</span>
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                        {formatDateTime(u.created)}
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingUser(u)} className={`${btnGhost} ${btnSm} text-slate-600`}>
                            Edit
                          </button>
                          <button onClick={() => setResetEmail(u.email)} className={`${btnGhost} ${btnSm} text-slate-600`}>
                            Reset Password
                          </button>
                          <button onClick={() => handleDelete(u.email)} className={`${btnGhost} ${btnSm} text-red-600 hover:bg-red-50 hover:text-red-700`}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CreateUserModal 
        open={showCreate} 
        onClose={() => setShowCreate(false)} 
        onAdd={handleCreate} 
      />

      {resetEmail && (
        <ResetPasswordModal
          open={true}
          onClose={() => setResetEmail(null)}
          email={resetEmail}
          onReset={handleResetPassword}
        />
      )}

      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
          user={editingUser}
        />
      )}
    </>
  );
}
