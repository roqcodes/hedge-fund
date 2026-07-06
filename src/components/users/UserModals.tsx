'use client';
import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import PasswordInput from '@/components/ui/PasswordInput';
import { useApp } from '@/context/AppContext';
import { btnPrimary, btnSecondary, formGroup, formLabel, formInput, formHint } from '@/lib/ui';
import {
  PASSWORD_REQUIREMENTS_HINT,
  validatePassword,
} from '@/lib/passwordValidation';

export { validatePassword } from '@/lib/passwordValidation';

export function PasswordRequirements({ pw }: { pw: string }) {
  if (!pw) return <p className={formHint}>{PASSWORD_REQUIREMENTS_HINT}</p>;
  const { checks } = validatePassword(pw);
  return (
    <ul className="mt-2 text-[11px] space-y-1 font-medium">
      <li className={checks.length ? 'text-green-600' : 'text-slate-400'}>
        {checks.length ? '✓' : '○'} At least 8 characters
      </li>
      <li className={checks.upper && checks.lower ? 'text-green-600' : 'text-slate-400'}>
        {checks.upper && checks.lower ? '✓' : '○'} Upper & lowercase letters
      </li>
      <li className={checks.number ? 'text-green-600' : 'text-slate-400'}>
        {checks.number ? '✓' : '○'} At least 1 number
      </li>
      <li className={checks.special ? 'text-green-600' : 'text-slate-400'}>
        {checks.special ? '✓' : '○'} At least 1 special character
      </li>
    </ul>
  );
}


export function CreateUserModal({
  open,
  onClose,
  onAdd,
  fixedBranchId,
  fixedWarehouseId
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (email: string, name: string, role: string, branchId: string, passwordRaw: string, warehouseId?: string) => Promise<void>;
  fixedBranchId?: string;
  fixedWarehouseId?: string;
}) {
  const { branches, icWarehouses } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(fixedWarehouseId ? 'warehouse_manager' : (fixedBranchId ? 'staff' : 'admin'));
  const [branchId, setBranchId] = useState(fixedBranchId || '');
  const [warehouseId, setWarehouseId] = useState(fixedWarehouseId || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !name || !validatePassword(password).isValid) return;
    if ((role === 'branch_manager' || role === 'staff') && !branchId) return;
    if ((role === 'warehouse_manager' || role === 'delivery') && !warehouseId) return;
    
    setLoading(true);
    await onAdd(email, name, role, branchId, password, warehouseId);
    setLoading(false);
    
    // reset
    setEmail('');
    setName('');
    setRole(fixedWarehouseId ? 'warehouse_manager' : (fixedBranchId ? 'staff' : 'admin'));
    setBranchId(fixedBranchId || '');
    setPassword('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create User (Cognito)"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit} disabled={loading || !validatePassword(password).isValid}>
            {loading ? 'Creating...' : 'Create Permanent User'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Email / Username</label>
        <input className={formInput} placeholder="e.g. admin@aibak.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Full Name</label>
        <input className={formInput} placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Permanent Password</label>
        <PasswordInput placeholder="Enter secure password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
        <PasswordRequirements pw={password} />
      </div>
      {!fixedBranchId && (
        <div className={formGroup}>
          <label className={formLabel}>Role</label>
          <select className={formInput} value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
            <option value="admin">Superadmin</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      )}
      {fixedBranchId && (
        <div className={formGroup}>
          <label className={formLabel}>Role</label>
          <select className={formInput} value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
            {!fixedWarehouseId && <option value="staff">Staff</option>}
            <option value="warehouse_manager">Warehouse Manager</option>
            <option value="delivery">Delivery User</option>
          </select>
          <p className={formHint}>
            {fixedWarehouseId ? 'Create a manager or delivery account for this warehouse.' : 'Branch managers can create staff, warehouse manager, and delivery accounts.'}
          </p>
        </div>
      )}
      {(role === 'branch_manager' || role === 'staff') && !fixedBranchId && (
        <div className={formGroup}>
          <label className={formLabel}>Assign to Branch</label>
          <select className={formInput} value={branchId} onChange={e => setBranchId(e.target.value)} disabled={loading}>
            <option value="">-- Select a branch --</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}
      {(role === 'warehouse_manager' || role === 'delivery') && fixedBranchId && (
        <div className={formGroup}>
          <label className={formLabel}>Assign to Warehouse</label>
          {fixedWarehouseId ? (
            <input 
              className={formInput} 
              value={icWarehouses?.find((w: any) => w.id === fixedWarehouseId)?.name || fixedWarehouseId} 
              disabled 
              readOnly 
            />
          ) : (
            <select className={formInput} value={warehouseId} onChange={e => setWarehouseId(e.target.value)} disabled={loading}>
              <option value="">-- Select a warehouse --</option>
              {icWarehouses?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ChangePasswordModal({
  open,
  onClose,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  onChange: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!validatePassword(password).isValid || !currentPassword) return;
    setLoading(true);
    try {
      await onChange(currentPassword, password);
      setCurrentPassword('');
      setPassword('');
      onClose();
    } catch {
      // toast handled by caller
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Password"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto`}
            onClick={handleSubmit}
            disabled={loading || !validatePassword(password).isValid || !currentPassword}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Current password</label>
        <PasswordInput
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
        />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>New password</label>
        <PasswordInput
          placeholder="Enter secure password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="new-password"
        />
        <PasswordRequirements pw={password} />
      </div>
    </Modal>
  );
}

export function ResetPasswordModal({
  open,
  onClose,
  email,
  onReset
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  onReset: (newPassword: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!validatePassword(password).isValid) return;
    setLoading(true);
    await onReset(password);
    setLoading(false);
    setPassword('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset Password"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit} disabled={loading || !validatePassword(password).isValid}>
            {loading ? 'Resetting...' : 'Set New Password'}
          </button>
        </>
      }
    >
      <div className="mb-4 text-sm text-slate-600">
        You are resetting the permanent password for <strong>{email}</strong>.
      </div>
      <div className={formGroup}>
        <label className={formLabel}>New Permanent Password</label>
        <PasswordInput placeholder="Enter secure password" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
        <PasswordRequirements pw={password} />
      </div>
    </Modal>
  );
}

export function EditUserModal({
  open,
  onClose,
  onSave,
  user,
  isSuperAdmin = false,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (email: string, newName: string, role?: string, branchId?: string) => Promise<void>;
  user: { email: string; name: string; role?: string; branchId?: string };
  isSuperAdmin?: boolean;
}) {
  const { branches } = useApp();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role || 'admin');
  const [branchId, setBranchId] = useState(user.branchId || '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setName(user.name);
    setRole(user.role || 'admin');
    setBranchId(user.branchId || '');
  }, [user]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (isSuperAdmin && (role === 'branch_manager' || role === 'staff') && !branchId) return;
    setLoading(true);
    await onSave(user.email, name, isSuperAdmin ? role : undefined, isSuperAdmin ? branchId : undefined);
    setLoading(false);
  };

  const showBranchSelect = isSuperAdmin && (role === 'branch_manager' || role === 'staff');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit User"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Email / Username</label>
        <input className={formInput} value={user.email} disabled={true} />
        <p className={formHint}>Emails cannot be changed once created.</p>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Full Name</label>
        <input className={formInput} value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      </div>
      {isSuperAdmin && (
        <div className={formGroup}>
          <label className={formLabel}>Role</label>
          <select className={formInput} value={role} onChange={e => setRole(e.target.value)} disabled={loading}>
            <option value="admin">Superadmin</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      )}
      {showBranchSelect && (
        <div className={formGroup}>
          <label className={formLabel}>Branch Assignment</label>
          <select className={formInput} value={branchId} onChange={e => setBranchId(e.target.value)} disabled={loading}>
            <option value="">-- Select a branch --</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}
    </Modal>
  );
}
