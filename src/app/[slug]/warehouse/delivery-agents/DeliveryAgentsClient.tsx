'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { PageShell } from '@/components/ic-transfer/ui';
import PageHeader from '@/components/ic-transfer/ui/PageHeader';
import { dataTable, tableWrap, btnPrimary, filterSelect } from '@/lib/ui';
import { fetchDeliveryAgents, deleteDeliveryAgent } from '@/app/actions/warehouseActions';
import CreateDeliveryAgentModal from './CreateDeliveryAgentModal';
import EditDeliveryAgentModal from './EditDeliveryAgentModal';
import { ConfirmModal, SkeletonRows } from '@/components/warehouse/shared';
import type { DeliveryAgent } from '@/types/warehouse';

type SortField = 'Name' | 'Region' | 'Group' | 'Account ID';

export default function DeliveryAgentsClient({ branchSlug }: { branchSlug: string }) {
  const { user, showToast, icWarehouses, icRegions } = useApp();

  const [agents, setAgents]       = useState<DeliveryAgent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAgent, setEditingAgent]     = useState<DeliveryAgent | null>(null);
  const [deletingAgent, setDeletingAgent]   = useState<DeliveryAgent | null>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  const [search,        setSearch]        = useState('');
  const [filterRegion,  setFilterRegion]  = useState('All');
  const [sortField,     setSortField]     = useState<SortField>('Name');
  const [sortOrder,     setSortOrder]     = useState<'asc' | 'desc'>('asc');

  // RBAC: warehouse_* role can fully CRUD delivery agents
  const rawRoleId   = (user?.role?.startsWith('warehouse_') || user?.role?.startsWith('delivery_')) ? user.role.split('_')[1] : null;
  const warehouseId = rawRoleId ? icWarehouses.find((w: any) => w.id.startsWith(rawRoleId))?.id : null;

  const canManageAgents =
    user?.role?.startsWith('warehouse_') ||
    user?.role === 'branch_manager' ||
    user?.role === 'admin';

  const loadAgents = useCallback(async () => {
    if (!warehouseId) { setLoading(false); return; }
    setLoading(true);
    const result = await fetchDeliveryAgents(warehouseId);
    if (result.success && result.data) {
      setAgents(result.data as DeliveryAgent[]);
    } else {
      showToast(result.error || 'Failed to fetch delivery agents', 'error');
    }
    setLoading(false);
  }, [warehouseId, showToast]);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  const handleDelete = async () => {
    if (!deletingAgent) return;
    setDeleteLoading(true);
    const res = await deleteDeliveryAgent(deletingAgent.id, deletingAgent.email);
    if (res.success) {
      showToast('Delivery agent deleted successfully', 'success');
      setDeletingAgent(null);
      loadAgents();
    } else {
      showToast(res.error || 'Failed to delete', 'error');
    }
    setDeleteLoading(false);
  };

  const handleSort = (field: SortField) => {
    setSortField(f => {
      if (f === field) { setSortOrder(o => (o === 'asc' ? 'desc' : 'asc')); return f; }
      setSortOrder('asc');
      return field;
    });
  };

  const filteredAgents = useMemo<DeliveryAgent[]>(() => {
    return agents.filter(a => {
      const matchSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.account_id.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase());
      const matchRegion =
        filterRegion === 'All' || a.region_id === filterRegion;
      return matchSearch && matchRegion;
    });
  }, [agents, search, filterRegion]);

  const sortedAgents = useMemo<DeliveryAgent[]>(() => {
    return [...filteredAgents].sort((a, b) => {
      let vA: string, vB: string;
      switch (sortField) {
        case 'Region':     vA = a.region_name || ''; vB = b.region_name || ''; break;
        case 'Group':      vA = a.group_name  || ''; vB = b.group_name  || ''; break;
        case 'Account ID': vA = a.account_id;        vB = b.account_id;        break;
        default:           vA = a.name;               vB = b.name;
      }
      const cmp = vA.localeCompare(vB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredAgents, sortField, sortOrder]);

  const SortTh = ({ field, align = 'left' }: { field: SortField; align?: 'left' | 'right' | 'center' }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-3 pb-3 text-${align} text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5 cursor-pointer select-none hover:text-slate-700 transition-colors`}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
          <span>{field}</span>
          {active && <span className="text-[10px] text-accent">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
        </div>
      </th>
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Delivery Agent Management"
        subtitle="Warehouse Portal / Delivery Agents"
        actions={
          canManageAgents ? (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={btnPrimary}
              disabled={!warehouseId}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add Agent
            </button>
          ) : null
        }
      />

      <div className="flex flex-col gap-6">
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-4 pb-4 md:border-b md:border-slate-100 md:px-5 md:py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
              Delivery Agents
              <span className="ml-2 text-sm font-normal text-slate-400">({sortedAgents.length})</span>
            </h3>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <input
                type="text"
                placeholder="Search by ID, Name or Email"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:max-w-[200px] rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              />
              <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className={filterSelect}>
                <option value="All">All Regions</option>
                {icRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {/* Desktop table */}
          <div className={`${tableWrap} hidden md:block`}>
            <table className={`${dataTable} min-w-[860px]`}>
              <thead>
                <tr>
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">#</th>
                  <SortTh field="Account ID" />
                  <SortTh field="Name" />
                  <SortTh field="Region" />
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Number</th>
                  <SortTh field="Group" />
                  <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Email</th>
                  {canManageAgents && (
                    <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows cols={canManageAgents ? 8 : 7} />
                ) : sortedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={canManageAgents ? 8 : 7} className="px-6 py-10 text-center text-sm text-slate-400">
                      No delivery agents found.
                    </td>
                  </tr>
                ) : (
                  sortedAgents.map((agent, i) => (
                    <tr key={agent.id} className="hover:bg-slate-50 transition-colors" data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 text-slate-400">{i + 1}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-mono sm:px-5 sm:py-4 text-slate-600">{agent.account_id}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-semibold sm:px-5 sm:py-4 text-slate-900">{agent.name}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600">{agent.region_name || '—'}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600">{agent.phone || '—'}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600">{agent.group_name || '—'}</td>
                      <td className={`border-y border-black/5 bg-white px-3 py-3.5 text-sm sm:px-5 sm:py-4 text-slate-600 ${!canManageAgents ? 'border-r last:rounded-r-2xl' : ''}`}>{agent.email}</td>
                      {canManageAgents && (
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-right last:rounded-r-2xl sm:px-5 sm:py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingAgent(agent)}
                              className="text-slate-400 hover:text-accent transition-colors p-1 rounded-lg hover:bg-accent/5"
                              title="Edit Agent"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeletingAgent(agent)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                              title="Delete Agent"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="flex md:hidden flex-col gap-3 py-4 px-4">
            {loading ? (
              <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
            ) : sortedAgents.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No delivery agents found.</div>
            ) : (
              sortedAgents.map(agent => (
                <div key={agent.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)]">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-slate-900">{agent.name}</span>
                      <span className="text-xs text-slate-500">{agent.email}</span>
                      {agent.region_name && <span className="text-xs text-slate-400">{agent.region_name}{agent.group_name ? ` · ${agent.group_name}` : ''}</span>}
                    </div>
                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{agent.account_id}</span>
                  </div>
                  {canManageAgents && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                      <button onClick={() => setEditingAgent(agent)} className="text-xs font-bold text-slate-500 hover:text-accent transition-colors">Edit</button>
                      <button onClick={() => setDeletingAgent(agent)} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">Delete</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add modal */}
      {isAddModalOpen && warehouseId && (
        <CreateDeliveryAgentModal
          warehouseId={warehouseId}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); loadAgents(); }}
        />
      )}

      {/* Edit modal */}
      {editingAgent && warehouseId && (
        <EditDeliveryAgentModal
          agent={editingAgent}
          warehouseId={warehouseId}
          onClose={() => setEditingAgent(null)}
          onSuccess={() => { setEditingAgent(null); loadAgents(); }}
        />
      )}

      {/* Confirm delete */}
      <ConfirmModal
        open={!!deletingAgent}
        title="Delete Delivery Agent"
        message={`Are you sure you want to delete "${deletingAgent?.name}"? This will remove their Cognito account and all associated data.`}
        confirmLabel="Delete Agent"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeletingAgent(null)}
      />
    </PageShell>
  );
}
