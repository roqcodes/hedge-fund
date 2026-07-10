'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { ConfirmModal } from '@/components/warehouse/shared';
import {
  getSubCustomersBySlug,
  saveSubCustomer,
  deleteSubCustomer,
} from '@/app/actions/subCustomerActions';
import type { ICSubCustomer } from '@/types';

type Props = {
  slug: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export default function SubCustomerModal({ slug, open, onClose, onUpdated }: Props) {
  const [subCustomers, setSubCustomers] = useState<ICSubCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ICSubCustomer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ICSubCustomer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadSubCustomers = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    const res = await getSubCustomersBySlug(slug);
    if (res.success && res.subCustomers) {
      setSubCustomers(res.subCustomers);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    if (open) {
      loadSubCustomers();
      setEditing(null);
      setFormOpen(false);
      setName('');
      setContact('');
    }
  }, [open, loadSubCustomers]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setContact('');
    setFormOpen(true);
  };

  const openEdit = (sc: ICSubCustomer) => {
    setEditing(sc);
    setName(sc.name);
    setContact(sc.contact || '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await saveSubCustomer(slug, {
      id: editing?.id,
      name: name.trim(),
      contact: contact.trim() || null,
    });
    setSaving(false);
    if (res.success) {
      await loadSubCustomers();
      onUpdated?.();
      setFormOpen(false);
      setEditing(null);
    } else {
      alert(res.error || 'Failed to save sub-customer');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await deleteSubCustomer(slug, deleteTarget.id);
    setDeleteLoading(false);
    if (res.success) {
      setDeleteTarget(null);
      await loadSubCustomers();
      onUpdated?.();
    } else {
      alert(res.error || 'Failed to delete sub-customer');
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Sub Customers"
        maxWidth="max-w-lg w-[95vw]"
        footer={
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Manage third-party recipients for your transfer orders. Sub-customers are private to your account.
            </p>
            <button type="button" className={btnPrimary} onClick={openCreate}>
              <span className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add
              </span>
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : subCustomers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">No sub-customers yet</p>
              <p className="mt-1 text-xs text-slate-400">Add recipients you send transfers to.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {subCustomers.map(sc => (
                <li key={sc.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{sc.name}</p>
                    {sc.contact && (
                      <p className="text-xs text-slate-400 truncate">{sc.contact}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => openEdit(sc)}
                      aria-label={`Edit ${sc.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      onClick={() => setDeleteTarget(sc)}
                      disabled={sc.hasOrders}
                      title={sc.hasOrders ? 'Cannot delete — has existing orders' : 'Delete'}
                      aria-label={`Delete ${sc.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Sub Customer' : 'New Sub Customer'}
        maxWidth="max-w-md w-[95vw]"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <InputField label="Name">
            <input
              className={formInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Recipient name"
              autoFocus
            />
          </InputField>
          <InputField label="Contact (optional)">
            <input
              className={formInput}
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Phone or email"
            />
          </InputField>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Sub Customer"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
