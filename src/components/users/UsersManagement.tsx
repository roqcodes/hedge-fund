'use client';

import React, { useState } from 'react';
import {
  CognitoUser,
  createCognitoUserAction,
  deleteCognitoUserAction,
  resetCognitoUserPasswordAction,
  updateCognitoUserAttributesAction,
} from '@/app/actions/cognitoActions';
import { useApp } from '@/context/AppContext';
import { formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import { btnPrimary, btnGhost, btnSm, pageHeader, pageTitle, pageSubtitle, tableWrap, dataTable, formInput } from '@/lib/ui';
import { CreateUserModal, EditUserModal, ResetPasswordModal } from './UserModals';
import UserPermissionsPanel from './UserPermissionsPanel';
import StaffAccessSummary from './StaffAccessSummary';
import { fetchBranchStaffPermissionsBatchAction, fetchAdminStaffPermissionsBatchAction } from '@/app/actions/permissionActions';
import { createDeliveryAgent } from '@/app/actions/warehouseActions';
import type { BranchPageId } from '@/lib/branchPages';
import type { PagePermissionMap } from '@/types';

interface UsersManagementProps {
  initialUsers: CognitoUser[];
  error?: string;
  fixedBranchId?: string;
  branchSlug?: string;
  isBranchManager?: boolean;
  isSuperAdmin?: boolean;
}

export default function UsersManagement({
  initialUsers,
  error,
  fixedBranchId,
  branchSlug,
  isBranchManager = false,
  isSuperAdmin = false,
}: UsersManagementProps) {
  const { showToast, branches, user: currentUser, currentSlug } = useApp();
  const [users, setUsers] = useState<CognitoUser[]>(initialUsers);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<CognitoUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<CognitoUser | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<CognitoUser | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<Record<string, PagePermissionMap>>({});
  const [manageablePages, setManageablePages] = useState<BranchPageId[]>([]);
  const [pagesByBranchId, setPagesByBranchId] = useState<Record<string, BranchPageId[]>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const loadStaffPermissions = React.useCallback(async () => {
    if (isBranchManager && branchSlug) {
      setPermissionsLoading(true);
      const res = await fetchBranchStaffPermissionsBatchAction(branchSlug);
      if (res.success) {
        setStaffPermissions(res.permissionsByUser);
        setManageablePages(res.pages);
      }
      setPermissionsLoading(false);
      return;
    }

    if (isSuperAdmin) {
      setPermissionsLoading(true);
      const res = await fetchAdminStaffPermissionsBatchAction();
      if (res.success) {
        setStaffPermissions(res.permissionsByUser);
        setPagesByBranchId(res.pagesByBranchId);
      }
      setPermissionsLoading(false);
    }
  }, [isBranchManager, isSuperAdmin, branchSlug]);

  React.useEffect(() => {
    loadStaffPermissions();
  }, [loadStaffPermissions]);

  const visibleUsers = isBranchManager
    ? users.filter(u => u.role === 'staff')
    : users;

  const handleCreate = async (email: string, name: string, role: string, branchId: string, passwordRaw: string, warehouseId?: string) => {
    let effectiveRole = role;
    if (fixedBranchId) {
      if (role === 'warehouse_manager' && warehouseId) effectiveRole = `warehouse_${warehouseId}`;
      if (role === 'delivery' && warehouseId) effectiveRole = `delivery_${warehouseId}`;
      if (role !== 'warehouse_manager' && role !== 'delivery') effectiveRole = 'staff';
    }

    if (role === 'delivery' && warehouseId) {
      const res = await createDeliveryAgent({ 
        warehouse_id: warehouseId, 
        name, 
        email, 
        branchSlug: currentSlug || branchSlug || '' 
      });
      if (res.success) {
        showToast('Delivery agent created successfully.');
        setUsers([{
          username: email,
          email,
          name,
          role: effectiveRole,
          branchId: fixedBranchId || branchId,
          status: 'CONFIRMED',
          created: new Date().toISOString(),
        }, ...users]);
      } else {
        showToast(res.error || 'Failed to create delivery agent', 'error');
      }
      return;
    }

    const res = await createCognitoUserAction(
      email,
      name,
      effectiveRole,
      fixedBranchId || branchId,
      passwordRaw,
      branchSlug,
    );
    if (res.success) {
      showToast('User created successfully.');
      setUsers([{
        username: email,
        email,
        name,
        role: effectiveRole,
        branchId: fixedBranchId || branchId,
        status: 'CONFIRMED',
        created: new Date().toISOString(),
      }, ...users]);
      if (effectiveRole === 'staff') {
        await loadStaffPermissions();
      }
    } else {
      showToast(res.error || 'Failed to create user', 'error');
    }
  };

  const handleEditUser = async (email: string, newName: string, role?: string, branchId?: string) => {
    const res = await updateCognitoUserAttributesAction(email, newName, branchSlug, role, branchId);
    if (res.success) {
      setUsers(prev => prev.map(u => u.email === email ? {
        ...u,
        name: newName,
        ...(role !== undefined ? { role } : {}),
        ...(branchId !== undefined ? { branchId: branchId || undefined } : {}),
      } : u));
      showToast('User updated successfully.');
      setEditingUser(null);
      await loadStaffPermissions();
    } else {
      showToast(res.error || 'Failed to update user', 'error');
    }
  };

  const handleResetPassword = async (email: string, newPassword: string) => {
    const res = await resetCognitoUserPasswordAction(email, newPassword, branchSlug);
    if (res.success) {
      showToast('Password reset successfully.');
      setResetPasswordUser(null);
    } else {
      showToast(res.error || 'Failed to reset password', 'error');
      throw new Error(res.error || 'Failed to reset password');
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;
    const res = await deleteCognitoUserAction(email, branchSlug);
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

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedUsers = React.useMemo(() => {
    let result = visibleUsers.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getBranchName(u.branchId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a, b) => {
      let aVal = a[sortField as keyof typeof a] || '';
      let bVal = b[sortField as keyof typeof b] || '';

      if (sortField === 'branchId') {
        aVal = getBranchName(a.branchId);
        bVal = getBranchName(b.branchId);
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });

    return result;
  }, [visibleUsers, searchTerm, sortField, sortDirection, branches]);

  const canManagePermissions = (isBranchManager && !!branchSlug) || isSuperAdmin;
  const tableColCount = fixedBranchId ? 5 : 6;

  const getPagesForUser = (u: CognitoUser): BranchPageId[] => {
    if (isSuperAdmin && u.branchId) {
      return pagesByBranchId[u.branchId] ?? [];
    }
    return manageablePages;
  };

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-bold text-red-800">Configuration Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>{isBranchManager ? 'Staff Users' : 'Users & Roles'}</h2>
            <p className={pageSubtitle}>
              {isBranchManager
                ? 'Create staff accounts and control page-level access for your branch.'
                : isSuperAdmin
                  ? 'Manage all users, roles, branch assignments, and staff page access across the platform.'
                  : 'Manage platform users, roles, and branch assignments.'}
            </p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            {isBranchManager ? 'Add Staff' : 'Create User'}
          </button>
        </div>

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 px-4 pb-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-bold text-slate-900">
              {isBranchManager ? 'Branch Staff' : 'User Directory'}
            </h3>
            <div className="relative flex-1 sm:max-w-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm`}
              />
            </div>
          </div>

          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[800px] hidden md:table`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Name & Email</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Role</th>
                    {!fixedBranchId && <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch</th>}
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Created</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        {error ? 'Unable to load users.' : searchTerm ? 'No users match your search.' : 'No users found.'}
                      </td>
                    </tr>
                  ) : filteredAndSortedUsers.map(u => (
                    <React.Fragment key={u.username}>
                      <tr data-interactive-row>
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 first:rounded-l-2xl sm:px-5 sm:py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{u.name}</span>
                            <span className="text-xs text-slate-500">{u.email}</span>
                          </div>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                          <span className={badgeClass(u.role === 'admin' ? 'active' : 'pending')}>{u.role.replace('_', ' ')}</span>
                        </td>
                        {!fixedBranchId && (
                          <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4">
                            {getBranchName(u.branchId)}
                          </td>
                        )}
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                          <span className={badgeClass(u.status === 'CONFIRMED' ? 'completed' : 'processing')}>{u.status}</span>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                          {formatDateTime(u.created)}
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {canManagePermissions && u.role === 'staff' && u.branchId && (
                              <button
                                onClick={() => setPermissionsUser(u)}
                                className={`${btnGhost} ${btnSm} text-accent`}
                              >
                                Access
                              </button>
                            )}
                            <button onClick={() => setEditingUser(u)} className={`${btnGhost} ${btnSm} text-slate-600`}>
                              Edit
                            </button>
                            {isBranchManager && u.role === 'staff' && (
                              <button
                                onClick={() => setResetPasswordUser(u)}
                                className={`${btnGhost} ${btnSm} text-amber-700 hover:bg-amber-50 hover:text-amber-800`}
                              >
                                Reset password
                              </button>
                            )}
                            {u.email !== currentUser?.email && (
                              <button onClick={() => handleDelete(u.email)} className={`${btnGhost} ${btnSm} text-red-600 hover:bg-red-50 hover:text-red-700`}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {canManagePermissions && u.role === 'staff' && u.branchId && (
                        <tr>
                          <td
                            colSpan={tableColCount}
                            className="border-x border-b border-black/5 bg-slate-50/80 px-3 py-3 last:rounded-b-2xl sm:px-5"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">
                                Page access · {getBranchName(u.branchId)}
                              </span>
                              <StaffAccessSummary
                                permissions={u.userId ? staffPermissions[u.userId] : undefined}
                                pages={getPagesForUser(u)}
                                loading={permissionsLoading}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-col gap-4 py-4 md:hidden">
                {filteredAndSortedUsers.map(u => (
                  <div key={u.username} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{u.name}</span>
                      <span className={badgeClass(u.role === 'admin' ? 'active' : 'pending')}>{u.role.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    {canManagePermissions && u.role === 'staff' && u.branchId && (
                      <div className="border-t border-slate-50 pt-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Page access · {getBranchName(u.branchId)}
                        </p>
                        <StaffAccessSummary
                          permissions={u.userId ? staffPermissions[u.userId] : undefined}
                          pages={getPagesForUser(u)}
                          loading={permissionsLoading}
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-3">
                      {canManagePermissions && u.role === 'staff' && u.branchId && (
                        <button onClick={() => setPermissionsUser(u)} className="text-xs font-bold text-accent">Access</button>
                      )}
                      <button onClick={() => setEditingUser(u)} className="text-xs font-bold text-slate-600">Edit</button>
                      {isBranchManager && u.role === 'staff' && (
                        <button onClick={() => setResetPasswordUser(u)} className="text-xs font-bold text-amber-700">
                          Reset password
                        </button>
                      )}
                      {u.email !== currentUser?.email && (
                        <button onClick={() => handleDelete(u.email)} className="text-xs font-bold text-red-600">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onAdd={(email, name, role, branchId, pwd) => handleCreate(email, name, role, fixedBranchId || branchId, pwd)}
        fixedBranchId={fixedBranchId}
      />

      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
          user={editingUser}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {resetPasswordUser && (
        <ResetPasswordModal
          open={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          email={resetPasswordUser.email}
          onReset={(newPassword) => handleResetPassword(resetPasswordUser.email, newPassword)}
        />
      )}

      {permissionsUser && permissionsUser.branchId && (
        <UserPermissionsPanel
          open={!!permissionsUser}
          onClose={() => setPermissionsUser(null)}
          branchSlug={branchSlug}
          branchId={permissionsUser.branchId}
          user={{
            email: permissionsUser.email,
            name: permissionsUser.name,
            userId: permissionsUser.userId,
          }}
          onSaved={() => {
            showToast('Permissions updated.');
            loadStaffPermissions();
          }}
        />
      )}
    </>
  );
}
