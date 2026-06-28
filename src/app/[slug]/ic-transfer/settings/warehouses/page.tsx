'use client';

import React, { useState } from 'react';
import ICTransferSettingsUsersPage from '@/components/ic-transfer/settings/ICTransferSettingsUsersPage';
import { AddButton } from '@/components/ic-transfer/ui';
import AddRegionModal from '@/components/ic-transfer/settings/AddRegionModal';
import AddUserModal from '@/components/ic-transfer/settings/AddUserModal';
import { useApp } from '@/context/AppContext';
import { useRouter, useParams } from 'next/navigation';

export default function WarehouseManagementPage() {
  const { icRegions, icWarehouses, addICRegion, addICWarehouse, updateICWarehouse, deleteICWarehouse } = useApp();
  const router = useRouter();
  const params = useParams();
  const branchSlug = params.slug as string;
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);

  const handleAddRegion = async (name: string, country: string) => {
    await addICRegion(name, country);
  };

  const handleSaveWarehouse = async (data: any) => {
    if (data.id) {
      await updateICWarehouse(data.id, data.name, data.phone, data.commission, data.regionId, data.email, data.address);
    } else {
      await addICWarehouse(data.name, data.phone, data.commission, data.regionId, data.email, data.address);
    }
    setWarehouseModalOpen(false);
    setEditingWarehouse(null);
  };

  const handleDeleteWarehouse = async (id: string) => {
    await deleteICWarehouse(id);
  };

  const openEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setWarehouseModalOpen(true);
  };

  const openAdd = () => {
    setEditingWarehouse(null);
    setWarehouseModalOpen(true);
  };

  return (
    <ICTransferSettingsUsersPage
      title="Warehouse Settings"
      subtitle="Manage warehouse settings and locations"
      nameColumn="Name"
      data={icWarehouses}
      onEditItem={openEdit}
      onDeleteItem={handleDeleteWarehouse}
      onRowClick={(w) => router.push(`/${branchSlug}/ic-transfer/settings/warehouses/${w.id}`)}
      showCommission={true}
      showRate={false}
      actions={
        <div className="flex gap-2">
          <AddButton 
            label="Manage Regions" 
            onClick={() => setRegionModalOpen(true)} 
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="sm:h-[18px] sm:w-[18px]">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            }
          />
          <AddButton label="Add Warehouse" onClick={openAdd} />
        </div>
      }
    >
      <AddRegionModal open={regionModalOpen} onClose={() => setRegionModalOpen(false)} onAdd={handleAddRegion} />
      <AddUserModal
        open={warehouseModalOpen}
        onClose={() => { setWarehouseModalOpen(false); setEditingWarehouse(null); }}
        title={editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
        regions={icRegions}
        showCommission={true}
        showRate={false}
        showPassword={false}
        initialData={editingWarehouse}
        onAdd={handleSaveWarehouse}
      />
    </ICTransferSettingsUsersPage>
  );
}
