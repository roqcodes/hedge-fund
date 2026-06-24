'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { BRANCH_NAV_PAGES } from '@/lib/branchPages';
import type { PageAccessLevel, PagePermissionMap } from '@/types';
import {
  fetchStaffPermissionsAction,
  updateStaffPermissionsAction,
} from '@/app/actions/permissionActions';
import { btnPrimary, btnSecondary, dataTable, tableWrap } from '@/lib/ui';
import PageAccessRadioGroup from './PageAccessRadioGroup';

type Props = {
  open: boolean;
  onClose: () => void;
  branchSlug?: string;
  branchId?: string;
  user: { email: string; name: string; userId?: string };
  onSaved?: () => void;
};

export default function UserPermissionsPanel({ open, onClose, branchSlug, branchId, user, onSaved }: Props) {
  const [permissions, setPermissions] = useState<PagePermissionMap>({});
  const [pageIds, setPageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user.userId || (!branchSlug && !branchId)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchStaffPermissionsAction(user.userId, branchSlug, branchId).then(res => {
      if (cancelled) return;
      if (res.success) {
        setPermissions(res.data);
        setPageIds(res.pages);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, branchSlug, branchId, user.userId]);

  const handleSave = async () => {
    if (!user.userId || (!branchSlug && !branchId)) return;
    setSaving(true);
    setError(null);
    const res = await updateStaffPermissionsAction(user.userId, permissions, branchSlug, branchId);
    setSaving(false);
    if (res.success) {
      onSaved?.();
      onClose();
    } else {
      setError(res.error);
    }
  };

  const setPageAccess = (pageId: string, level: PageAccessLevel) => {
    setPermissions(prev => ({ ...prev, [pageId]: level }));
  };

  const pageLabel = (pageId: string) =>
    BRANCH_NAV_PAGES.find(p => p.id === pageId)?.label ?? pageId;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Page Access"
      maxWidth="max-w-3xl"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto`}
            onClick={handleSave}
            disabled={saving || loading || !user.userId}
          >
            {saving ? 'Saving…' : 'Save permissions'}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        Configure what <strong>{user.name}</strong> can access within this branch.
        Dashboard is always visible; account settings are always available for password changes.
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!user.userId ? (
        <p className="text-sm text-amber-700">User ID unavailable — try refreshing the user list.</p>
      ) : loading ? (
        <p className="text-sm text-slate-500">Loading permissions…</p>
      ) : (
        <div className={tableWrap}>
          <table className={dataTable}>
            <thead>
              <tr>
                <th className="w-[28%] px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Page</th>
                <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Access</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-y border-l border-black/5 bg-white px-3 py-3 text-sm font-medium text-slate-900 first:rounded-l-2xl">
                  Dashboard
                </td>
                <td className="border-y border-r border-black/5 bg-white px-3 py-3 last:rounded-r-2xl">
                  <PageAccessRadioGroup
                    name="dashboard"
                    value={permissions.dashboard ?? 'read'}
                    onChange={level => setPageAccess('dashboard', level)}
                  />
                </td>
              </tr>
              {pageIds.map((pageId, idx) => (
                <tr key={pageId}>
                  <td className={`border-y border-l border-black/5 bg-white px-3 py-3 text-sm font-medium text-slate-900 ${idx === pageIds.length - 1 ? 'first:rounded-bl-2xl' : ''}`}>
                    {pageLabel(pageId)}
                  </td>
                  <td className={`border-y border-r border-black/5 bg-white px-3 py-3 ${idx === pageIds.length - 1 ? 'last:rounded-br-2xl' : ''}`}>
                    <PageAccessRadioGroup
                      name={pageId}
                      value={permissions[pageId] ?? 'read'}
                      onChange={level => setPageAccess(pageId, level)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
