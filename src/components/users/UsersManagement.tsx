'use client';

import React, { useState } from 'react';
import { CognitoUser, createCognitoUserAction, deleteCognitoUserAction, updateCognitoUserPasswordAction, updateCognitoUserAttributesAction } from '@/app/actions/cognitoActions';
import { useApp } from '@/context/AppContext';
import { formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import { btnPrimary, btnGhost, btnSm, pageHeader, pageTitle, pageSubtitle, tableWrap, dataTable, formInput } from '@/lib/ui';
import { CreateUserModal, ResetPasswordModal, EditUserModal } from './UserModals';

interface UsersManagementProps {
  initialUsers: CognitoUser[];
  error?: string;
  fixedBranchId?: string;
}

export default function UsersManagement({ initialUsers, error, fixedBranchId }: UsersManagementProps) {
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

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedUsers = React.useMemo(() => {
    let result = users.filter((u) => 
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
  }, [users, searchTerm, sortField, sortDirection, branches]);

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

        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 pb-4 px-4 md:border-b md:border-slate-100 md:px-8 md:py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <h3 className="text-lg font-bold text-slate-900">Cognito User Directory</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
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
              <div className="flex md:hidden items-center gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className={`${formInput} !py-2 !text-sm flex-1 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`}
                >
                  <option value="name">Sort by: Name</option>
                  <option value="role">Sort by: Role</option>
                  <option value="branchId">Sort by: Branch</option>
                  <option value="created">Sort by: Date</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex size-[38px] flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:bg-slate-100"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}>
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="p-0">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[800px] hidden md:table`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Name & Email</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Role</th>
                    {!fixedBranchId && <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch Assignment</th>}
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Created</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                        {error ? 'Unable to load users due to configuration error.' : searchTerm ? 'No users found matching search.' : 'No users found in Cognito.'}
                      </td>
                    </tr>
                  ) : filteredAndSortedUsers.map(u => (
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
              {/* Mobile View */}
              <div className="flex md:hidden flex-col gap-4 py-4">
                {filteredAndSortedUsers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500">
                    {error ? 'Unable to load users due to configuration error.' : searchTerm ? 'No users found matching search.' : 'No users found in Cognito.'}
                  </div>
                ) : filteredAndSortedUsers.map(u => (
                  <div key={u.username} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-[0.98]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 uppercase">{u.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${u.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{u.status === 'CONFIRMED' ? 'ACTIVE' : u.status}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4 border-y border-slate-50 py-4 mt-1">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                        <span className="font-mono text-[11px] font-bold text-slate-900 truncate" title={u.email}>{u.email}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role</span>
                        <span className="font-mono text-xs font-bold text-emerald-600 capitalize">{u.role.replace('_', ' ')}</span>
                      </div>
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Branch</span>
                        <span className="font-mono text-[11px] font-bold text-slate-900 truncate" title={getBranchName(u.branchId)}>{getBranchName(u.branchId)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Created</span>
                        <span className="font-mono text-[11px] font-bold text-slate-900 truncate">{formatDateTime(u.created)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-1 flex items-center justify-end gap-4">
                      <button onClick={() => setEditingUser(u)} className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">Edit</button>
                      <button onClick={() => setResetEmail(u.email)} className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">Reset</button>
                      <button onClick={() => handleDelete(u.email)} className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors">Delete</button>
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

      {resetEmail && (
        <ResetPasswordModal
          open={true}
          onClose={() => setResetEmail(null)}
          email={resetEmail!}
          onReset={handleResetPassword}
        />
      )}

      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
          user={editingUser!}
        />
      )}
    </>
  );
}
