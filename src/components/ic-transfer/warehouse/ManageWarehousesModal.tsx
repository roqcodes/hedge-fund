'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import AddUserModal from '@/components/ic-transfer/settings/AddUserModal';
import { useApp } from '@/context/AppContext';
import type { ICWarehouse } from '@/types';
import { ConfirmModal } from '@/components/warehouse/shared';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ManageWarehousesModal({ open, onClose }: Props) {
  const { icWarehouses, addICWarehouse, updateICWarehouse, deleteICWarehouse } = useApp();
  const router = useRouter();
  const params = useParams();
  const branchSlug = params.slug as string;

  const [formOpen, setFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<ICWarehouse | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sortedWarehouses = useMemo(
    () => [...icWarehouses].sort((a, b) => a.name.localeCompare(b.name)),
    [icWarehouses],
  );

  const openAdd = () => {
    setEditingWarehouse(null);
    setFormOpen(true);
  };

  const openEdit = (warehouse: ICWarehouse) => {
    setEditingWarehouse(warehouse);
    setFormOpen(true);
  };

  const handleSave = async (data: {
    id?: string;
    name: string;
    phone: string;
    commission: number | null;
    regionId: string;
    email: string;
    address: string;
  }) => {
    if (data.id) {
      await updateICWarehouse(
        data.id,
        data.name,
        data.phone,
        data.commission,
        '',
        data.email,
        data.address,
      );
    } else {
      await addICWarehouse(
        data.name,
        data.phone,
        data.commission,
        '',
        data.email,
        data.address,
      );
    }
    setFormOpen(false);
    setEditingWarehouse(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    await deleteICWarehouse(deleteTargetId);
    setDeleteLoading(false);
    setDeleteTargetId(null);
  };

  const openUsers = (warehouseId: string) => {
    onClose();
    router.push(`/${branchSlug}/ic-transfer/warehouse/${warehouseId}`);
  };

  return (
    <>
      <ConfirmModal
        open={!!deleteTargetId}
        title="Delete Warehouse"
        message="Are you sure you want to delete this warehouse? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
      <Modal
        open={open}
        onClose={onClose}
        title="Manage Warehouses"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={onClose}>
              Close
            </button>
            <button type="button" className={btnPrimary} onClick={openAdd}>
              Add Warehouse
            </button>
          </>
        }
      >
        <div className="max-h-[min(420px,60vh)] overflow-y-auto rounded-lg border border-slate-200">
          {sortedWarehouses.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">No warehouses configured yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sortedWarehouses.map(warehouse => (
                <li key={warehouse.id} className="flex items-start justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{warehouse.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {warehouse.phone || 'No phone'}
                      {warehouse.commission != null ? ` · ${warehouse.commission}% commission` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      onClick={() => openUsers(warehouse.id)}
                    >
                      Users
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600 hover:bg-sky-100"
                      onClick={() => openEdit(warehouse)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                      onClick={() => setDeleteTargetId(warehouse.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <AddUserModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingWarehouse(null);
        }}
        title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
        showCommission
        showRate={false}
        showPassword={false}
        showRegion={false}
        initialData={editingWarehouse}
        onAdd={handleSave}
      />
    </>
  );
}
