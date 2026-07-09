'use client';

import React, { useMemo, useState } from 'react';
import ICTransferSettingsUsersPage from '@/components/ic-transfer/settings/ICTransferSettingsUsersPage';
import { AddButton } from '@/components/ic-transfer/ui';
import AddRegionModal from '@/components/ic-transfer/settings/AddRegionModal';
import AddUserModal from '@/components/ic-transfer/settings/AddUserModal';
import { useApp } from '@/context/AppContext';
import type { ICSupplier } from '@/types';
import {
  filterSuppliersForAdminPortal,
  filterSuppliersForBranchPortal,
  type ICTransferPortalMode,
} from '@/lib/icTransfer/branchPortalScope';

type Props = {
  portalMode?: ICTransferPortalMode;
  branchId?: string;
};

export default function ICTransferSuppliersPage({ portalMode = 'admin', branchId }: Props) {
  const isBranchPortal = portalMode === 'branch' && !!branchId;
  const { icRegions, icSuppliers, addICRegion, addICSupplier, updateICSupplier, deleteICSupplier } = useApp();
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ICSupplier | null>(null);

  const scopedSuppliers = useMemo(() => {
    if (isBranchPortal) return filterSuppliersForBranchPortal(icSuppliers, branchId!);
    return filterSuppliersForAdminPortal(icSuppliers);
  }, [icSuppliers, isBranchPortal, branchId]);

  const handleAddRegion = async (name: string, country: string) => {
    await addICRegion(name, country);
  };

  const handleSaveSupplier = async (data: {
    id?: string;
    name: string;
    phone: string;
    commission: number | null;
    regionId: string;
    email: string;
    address: string;
  }) => {
    if (data.id) {
      await updateICSupplier(
        data.id,
        data.name,
        data.phone,
        data.commission,
        data.regionId,
        data.email,
        data.address,
      );
    } else {
      await addICSupplier(
        data.name,
        data.phone,
        data.commission,
        data.regionId,
        data.email,
        data.address,
        isBranchPortal ? branchId : undefined,
      );
    }
    setSupplierModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = async (id: string) => {
    await deleteICSupplier(id);
  };

  const openEdit = (supplier: ICSupplier) => {
    setEditingSupplier(supplier);
    setSupplierModalOpen(true);
  };

  const openAdd = () => {
    setEditingSupplier(null);
    setSupplierModalOpen(true);
  };

  return (
    <ICTransferSettingsUsersPage
      title="Suppliers"
      subtitle={
        isBranchPortal
          ? 'Manage suppliers exclusive to your branch'
          : 'Manage HQ supplier settings and rates'
      }
      data={scopedSuppliers}
      onEditItem={openEdit}
      onDeleteItem={handleDeleteSupplier}
      actions={
        <div className="flex gap-2">
          <AddButton
            label="Manage Regions"
            onClick={() => setRegionModalOpen(true)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm:h-[18px] sm:w-[18px]">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            }
          />
          <AddButton label="Add Supplier" onClick={openAdd} />
        </div>
      }
      showCommission={false}
      showRate={false}
    >
      <AddRegionModal open={regionModalOpen} onClose={() => setRegionModalOpen(false)} onAdd={handleAddRegion} />
      <AddUserModal
        open={supplierModalOpen}
        onClose={() => {
          setSupplierModalOpen(false);
          setEditingSupplier(null);
        }}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        regions={icRegions}
        showCommission={false}
        showRate={false}
        showPassword={false}
        initialData={editingSupplier}
        onAdd={handleSaveSupplier}
      />
    </ICTransferSettingsUsersPage>
  );
}
