'use client';

import React, { useState } from 'react';
import {
  CognitoUser,
  createCognitoUserAction,
  deleteCognitoUserAction,
  updateCognitoUserAttributesAction,
} from '@/app/actions/cognitoActions';
import { useApp } from '@/context/AppContext';
import { formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import { btnPrimary, btnGhost, btnSm, pageHeader, pageTitle, pageSubtitle, tableWrap, dataTable, formInput } from '@/lib/ui';
import { CreateUserModal, EditUserModal } from '@/components/users/UserModals';

interface WarehouseUsersManagementProps {
  initialUsers: CognitoUser[];
  error?: string;
  warehouseId: string;
  branchSlug: string;
}

export default function WarehouseUsersManagement({
  initialUsers,
  error,
  warehouseId,
  branchSlug,
}: WarehouseUsersManagementProps) {
  const { showToast, user: currentUser } = useApp();
  const [users, setUsers] = useState<CognitoUser[]>(initialUsers);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<CognitoUser | null>(null);

  const roleName = `warehouse_${warehouseId}`;
  
  // Use current user's branch as the branchId for these users so branch managers can delete/manage them
  const currentUserBranchId = currentUser?.branchId || '';

  const handleCreate = async (email: string, name: string, role: string, branchId: string, passwordRaw: string) => {
    // Determine the precise role format based on dropdown selection
    // We slice the warehouseId to 8 chars to avoid hitting the Cognito custom:role max length limit
    const shortWarehouseId = warehouseId.slice(0, 8);
    const formattedRole = role === 'delivery' ? `delivery_${shortWarehouseId}` : `warehouse_${shortWarehouseId}`;

    let res: any;

    if (role === 'delivery') {
      const { createDeliveryAgent } = await import('@/app/actions/warehouseActions');
      res = await createDeliveryAgent({
        warehouse_id: warehouseId,
        name,
        email,
        password: passwordRaw,
        branchSlug,
      });
      // createDeliveryAgent uses a default password 'Aibak123!' internally, but we should probably 
      // let them know if it succeeded.
    } else {
      res = await createCognitoUserAction(
        email,
        name,
        formattedRole,
        currentUserBranchId,
        passwordRaw,
        branchSlug,
      );
    }

    if (res.success) {
      showToast('Warehouse user created successfully.');
      setUsers([{
        username: email,
        email,
        name,
        role: formattedRole,
        branchId: currentUserBranchId,
        status: 'CONFIRMED',
        created: new Date().toISOString(),
      }, ...users]);
      setShowCreate(false);
    } else {
      showToast(res.error || 'Failed to create user', 'error');
    }
  };

  const handleEditUser = async (email: string, newName: string) => {
    const res = await updateCognitoUserAttributesAction(email, newName, branchSlug);
    if (res.success) {
      setUsers(prev => prev.map(u => u.email === email ? { ...u, name: newName } : u));
      showToast('User updated successfully.');
      setEditingUser(null);
    } else {
      showToast(res.error || 'Failed to update user', 'error');
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

  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredUsers = React.useMemo(() => {
    return users.filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchTerm]);

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
            <h2 className={pageTitle}>Warehouse Users</h2>
            <p className={pageSubtitle}>
              Manage users who have access to this specific warehouse.
            </p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            Add Warehouse User
          </button>
        </div>

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 px-4 pb-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-bold text-slate-900">
              Users
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
              <table className={`${dataTable} min-w-[600px] hidden md:table`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Name & Email</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Created</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500">
                        {error ? 'Unable to load users.' : searchTerm ? 'No users match your search.' : 'No users found.'}
                      </td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <React.Fragment key={u.username}>
                      <tr data-interactive-row>
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 first:rounded-l-2xl sm:px-5 sm:py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{u.name}</span>
                            <span className="text-xs text-slate-500">{u.email}</span>
                          </div>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                          <span className={badgeClass(u.status === 'CONFIRMED' ? 'completed' : 'processing')}>{u.status}</span>
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                          {formatDateTime(u.created)}
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => setEditingUser(u)} className={`${btnGhost} ${btnSm} text-slate-600`}>
                              Edit
                            </button>
                            {u.email !== currentUser?.email && (
                              <button onClick={() => handleDelete(u.email)} className={`${btnGhost} ${btnSm} text-red-600 hover:bg-red-50 hover:text-red-700`}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-col gap-4 py-4 md:hidden">
                {filteredUsers.map(u => (
                  <div key={u.username} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{u.name}</span>
                      <span className={badgeClass(u.status === 'CONFIRMED' ? 'completed' : 'processing')}>{u.status}</span>
                    </div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <div className="flex items-center justify-end gap-3 mt-2">
                      <button onClick={() => setEditingUser(u)} className="text-xs font-bold text-slate-600">Edit</button>
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

      {showCreate && (
        <CreateUserModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onAdd={handleCreate}
          fixedBranchId={currentUserBranchId}
          fixedWarehouseId={warehouseId}
        />
      )}

      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
          user={editingUser}
          isSuperAdmin={false}
        />
      )}
    </>
  );
}
