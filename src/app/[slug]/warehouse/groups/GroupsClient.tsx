'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell } from '@/components/ic-transfer/ui';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { dataTable, tableWrap } from '@/lib/ui';
import { fetchWarehouseGroups, deleteWarehouseGroup } from '@/app/actions/warehouseActions';
import CreateWarehouseGroupModal from './CreateWarehouseGroupModal';
import { formatDateTime } from '@/data/mockData';

export default function GroupsClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast, icWarehouses } = useApp();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const rawRoleId = (user?.role?.startsWith('warehouse_') || user?.role?.startsWith('delivery_')) ? user.role.split('_')[1] : null;
  const warehouseId = rawRoleId ? icWarehouses.find((w: any) => w.id.startsWith(rawRoleId))?.id : null;

  const loadGroups = async () => {
    if (!warehouseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchWarehouseGroups(warehouseId);
    if (result.success && result.data) {
      setGroups(result.data);
    } else {
      showToast(result.error || 'Failed to fetch groups', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, [warehouseId, showToast]); // Added showToast

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    const res = await deleteWarehouseGroup(id);
    if (res.success) {
      showToast('Group deleted successfully', 'success');
      loadGroups();
    } else {
      showToast(res.error || 'Failed to delete group', 'error');
    }
  };

  return (
    <PageShell>
      <PageHeader 
        title="Delivery Agent Group Management" 
        subtitle="Warehouse Portal / Group Management" 
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
            disabled={!warehouseId}
          >
            <span>+</span>
            Add Group
          </button>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 pb-4 px-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">Groups</h3>
          </div>

          <div className={`${tableWrap} hidden md:block`}>
            <table className={`${dataTable} min-w-[860px]`}>
            <thead>
              <tr>
                <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">#</th>
                <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Group Name</th>
                <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Description</th>
                <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Created Date</th>
                <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No groups found</td>
                </tr>
              ) : (
                groups.map((group, index) => (
                  <tr key={group.id} className="cursor-pointer hover:bg-slate-50 transition-colors" data-interactive-row>
                    <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-900">{index + 1}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4 text-slate-900">{group.name}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600 max-w-[300px] truncate">{group.description || '—'}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600">{formatDateTime(group.created_at)}</td>
                    <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-right last:rounded-r-2xl sm:px-5 sm:py-4">
                      <button
                        onClick={() => handleDelete(group.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Delete Group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile View */}
        <div className="flex md:hidden flex-col gap-3 py-4 px-4">
          {groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No groups found.</div>
          ) : (
            groups.map((group, i) => (
              <div key={group.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-slate-900">{group.name}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(group.created_at)}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-600">{group.description || '—'}</div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                  <button onClick={() => handleDelete(group.id)} className="text-xs font-bold text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>


      {isAddModalOpen && warehouseId && (
        <CreateWarehouseGroupModal
          warehouseId={warehouseId}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadGroups();
          }}
        />
      )}
    </PageShell>
  );
}
