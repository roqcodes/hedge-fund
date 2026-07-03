'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel } from '@/lib/ui';
import type { Branch, ICRateGroup } from '@/types';

type CustomerOption = { id: string; name: string };

export type RateGroupMembersPayload = {
  groupId: string;
  branchIds: string[];
  customerIds: string[];
};

type MemberItem = {
  id: string;
  label: string;
  kind: 'branch' | 'customer';
  assignedGroupName?: string;
};

type OverviewItem = {
  id: string;
  label: string;
  kind: 'branch' | 'customer';
  groupId?: string;
  groupName?: string;
};

type Props = {
  open: boolean;
  groups: ICRateGroup[];
  allBranches: Branch[];
  branchCustomers: CustomerOption[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: RateGroupMembersPayload) => void | Promise<void>;
};

function findBranchGroup(groups: ICRateGroup[], branchId: string, excludeGroupId?: string) {
  return groups.find(
    g => g.id !== excludeGroupId && g.branchIds?.includes(branchId),
  );
}

function findCustomerGroup(groups: ICRateGroup[], customerId: string, excludeGroupId?: string) {
  return groups.find(
    g => g.id !== excludeGroupId && g.customerIds?.includes(customerId),
  );
}

export default function RateGroupManageUsersModal({
  open,
  groups,
  allBranches,
  branchCustomers,
  isSaving,
  onClose,
  onSave,
}: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [overviewSearch, setOverviewSearch] = useState('');
  const [assignedBranchIds, setAssignedBranchIds] = useState<string[]>([]);
  const [assignedCustomerIds, setAssignedCustomerIds] = useState<string[]>([]);
  // A member queued from the overview to be added as soon as a group is picked.
  const pendingAssignRef = useRef<{ id: string; kind: 'branch' | 'customer' } | null>(null);
  // The member whose group-picker popup is currently open (overview flow).
  const [assignPickerItem, setAssignPickerItem] = useState<OverviewItem | null>(null);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  const groupOptions = useMemo(
    () =>
      groups.map(g => ({
        value: g.id,
        label: `${g.name} · ${g.currency}`,
      })),
    [groups],
  );

  const visibleBranches = useMemo(
    () =>
      allBranches.filter(b => !b.hiddenPages?.includes('ic-transfer-branch')),
    [allBranches],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedGroupId('');
    setGroupQuery('');
    setLeftSearch('');
    setRightSearch('');
    setOverviewSearch('');
    setAssignedBranchIds([]);
    setAssignedCustomerIds([]);
    pendingAssignRef.current = null;
    setAssignPickerItem(null);
  }, [open]);

  useEffect(() => {
    if (!selectedGroup) {
      setAssignedBranchIds([]);
      setAssignedCustomerIds([]);
      return;
    }
    const branchIds = [...(selectedGroup.branchIds ?? [])];
    const customerIds = [...(selectedGroup.customerIds ?? [])];
    // Pull in a member queued from the overview's "Assign" action.
    const pending = pendingAssignRef.current;
    if (pending) {
      if (pending.kind === 'branch' && !branchIds.includes(pending.id)) branchIds.push(pending.id);
      if (pending.kind === 'customer' && !customerIds.includes(pending.id)) customerIds.push(pending.id);
      pendingAssignRef.current = null;
    }
    setAssignedBranchIds(branchIds);
    setAssignedCustomerIds(customerIds);
    setGroupQuery(`${selectedGroup.name} · ${selectedGroup.currency}`);
  }, [selectedGroup]);

  const leftItems = useMemo(() => {
    const q = leftSearch.trim().toLowerCase();
    const branchItems: MemberItem[] = visibleBranches
      .filter(b => !assignedBranchIds.includes(b.id))
      .map(b => {
        const owner = findBranchGroup(groups, b.id, selectedGroupId);
        return {
          id: b.id,
          label: b.name,
          kind: 'branch' as const,
          assignedGroupName: owner?.name,
        };
      });

    const customerItems: MemberItem[] = branchCustomers
      .filter(c => !assignedCustomerIds.includes(c.id))
      .map(c => {
        const owner = findCustomerGroup(groups, c.id, selectedGroupId);
        return {
          id: c.id,
          label: c.name,
          kind: 'customer' as const,
          assignedGroupName: owner?.name,
        };
      });

    const combined = [...branchItems, ...customerItems];
    const filtered = !q
      ? combined
      : combined.filter(
          item =>
            item.label.toLowerCase().includes(q) ||
            item.kind.toLowerCase().includes(q) ||
            item.assignedGroupName?.toLowerCase().includes(q),
        );
    // Addable items (not owned by another group) float to the top.
    return filtered
      .slice()
      .sort((a, b) => Number(!!a.assignedGroupName) - Number(!!b.assignedGroupName));
  }, [
    visibleBranches,
    branchCustomers,
    assignedBranchIds,
    assignedCustomerIds,
    groups,
    selectedGroupId,
    leftSearch,
  ]);

  const rightItems = useMemo(() => {
    const q = rightSearch.trim().toLowerCase();
    const branchItems: MemberItem[] = assignedBranchIds
      .map(id => visibleBranches.find(b => b.id === id))
      .filter((b): b is Branch => !!b)
      .map(b => ({ id: b.id, label: b.name, kind: 'branch' as const }));

    const customerItems: MemberItem[] = assignedCustomerIds
      .map(id => branchCustomers.find(c => c.id === id))
      .filter((c): c is CustomerOption => !!c)
      .map(c => ({ id: c.id, label: c.name, kind: 'customer' as const }));

    const combined = [...branchItems, ...customerItems];
    if (!q) return combined;
    return combined.filter(
      item => item.label.toLowerCase().includes(q) || item.kind.toLowerCase().includes(q),
    );
  }, [assignedBranchIds, assignedCustomerIds, visibleBranches, branchCustomers, rightSearch]);

  const overviewItems = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    const branchItems: OverviewItem[] = visibleBranches.map(b => {
      const owner = findBranchGroup(groups, b.id);
      return {
        id: b.id,
        label: b.name,
        kind: 'branch' as const,
        groupId: owner?.id,
        groupName: owner?.name,
      };
    });
    const customerItems: OverviewItem[] = branchCustomers.map(c => {
      const owner = findCustomerGroup(groups, c.id);
      return {
        id: c.id,
        label: c.name,
        kind: 'customer' as const,
        groupId: owner?.id,
        groupName: owner?.name,
      };
    });
    const combined = [...branchItems, ...customerItems];
    const filtered = !q
      ? combined
      : combined.filter(
          item =>
            item.label.toLowerCase().includes(q) ||
            item.kind.toLowerCase().includes(q) ||
            item.groupName?.toLowerCase().includes(q),
        );
    // Assigned members (with an editable group) float to the top.
    return filtered
      .slice()
      .sort((a, b) => Number(!a.groupId) - Number(!b.groupId));
  }, [visibleBranches, branchCustomers, groups, overviewSearch]);

  const addItem = (item: MemberItem) => {
    if (item.assignedGroupName) return;
    if (item.kind === 'branch') {
      setAssignedBranchIds(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));
    } else {
      setAssignedCustomerIds(prev => (prev.includes(item.id) ? prev : [...prev, item.id]));
    }
  };

  const removeItem = (item: MemberItem) => {
    if (item.kind === 'branch') {
      setAssignedBranchIds(prev => prev.filter(id => id !== item.id));
    } else {
      setAssignedCustomerIds(prev => prev.filter(id => id !== item.id));
    }
  };

  const selectGroupById = (groupId: string) => {
    const match = groups.find(g => g.id === groupId);
    if (!match) return;
    setSelectedGroupId(match.id);
    setGroupQuery(`${match.name} · ${match.currency}`);
  };

  const requestAssign = (item: OverviewItem) => {
    setAssignPickerItem(item);
  };

  const confirmAssignToGroup = (groupId: string) => {
    if (!assignPickerItem) return;
    pendingAssignRef.current = { id: assignPickerItem.id, kind: assignPickerItem.kind };
    setAssignPickerItem(null);
    // Opening the group switches to the edit panels with the member injected.
    selectGroupById(groupId);
  };

  const handleSave = async () => {
    if (!selectedGroupId) return;
    await onSave({
      groupId: selectedGroupId,
      branchIds: assignedBranchIds,
      customerIds: assignedCustomerIds,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Users"
      maxWidth="max-w-5xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={handleSave}
            disabled={isSaving || !selectedGroupId}
          >
            {isSaving ? 'Saving…' : 'Save Assignments'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className={formGroup}>
          <label className={formLabel}>Rate Group</label>
          <ComboSearchInput
            value={groupQuery}
            onChange={v => {
              setGroupQuery(v);
              if (selectedGroupId) {
                const match = groups.find(g => g.id === selectedGroupId);
                if (match && v !== `${match.name} · ${match.currency}`) {
                  setSelectedGroupId('');
                }
              }
            }}
            onSelectOption={opt => {
              setSelectedGroupId(opt.value);
              setGroupQuery(opt.label);
            }}
            options={groupOptions}
            placeholder="Search and select a rate group…"
          />
        </div>

        {!selectedGroup ? (
          <OverviewPanel
            items={overviewItems}
            search={overviewSearch}
            onSearchChange={setOverviewSearch}
            onEdit={selectGroupById}
            onAssign={requestAssign}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MemberPanel
              title="All Members"
              subtitle="Branches and customers not in this group"
              search={leftSearch}
              onSearchChange={setLeftSearch}
              searchPlaceholder="Search available…"
              emptyLabel="No available items"
              items={leftItems}
              actionLabel="Add"
              actionVariant="add"
              onAction={addItem}
            />
            <MemberPanel
              title={`In "${selectedGroup.name}"`}
              subtitle={`${assignedBranchIds.length} branches · ${assignedCustomerIds.length} customers`}
              search={rightSearch}
              onSearchChange={setRightSearch}
              searchPlaceholder="Search assigned…"
              emptyLabel="No members assigned yet"
              items={rightItems}
              actionLabel="Remove"
              actionVariant="remove"
              onAction={removeItem}
            />
          </div>
        )}
      </div>

      <AssignGroupPicker
        item={assignPickerItem}
        groups={groups}
        onClose={() => setAssignPickerItem(null)}
        onPick={confirmAssignToGroup}
      />
    </Modal>
  );
}

function AssignGroupPicker({
  item,
  groups,
  onClose,
  onPick,
}: {
  item: OverviewItem | null;
  groups: ICRateGroup[];
  onClose: () => void;
  onPick: (groupId: string) => void;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (item) setSearch('');
  }, [item]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.currency.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q),
    );
  }, [groups, search]);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item ? `Assign "${item.label}"` : 'Assign'}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Choose the rate group to add this {item?.kind ?? 'member'} to.
        </p>
        <div className="relative">
          <input
            type="text"
            autoFocus
            placeholder="Search rate groups…"
            className={`${formInput} !py-2 !pl-8 !text-sm`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </div>

        <div className="max-h-[320px] space-y-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No rate groups found</div>
          ) : (
            filtered.map(g => {
              const members = (g.branchIds?.length ?? 0) + (g.customerIds?.length ?? 0);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onPick(g.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">{g.name}</div>
                    <div className="truncate text-[11px] text-slate-500">
                      {g.currency}
                      {g.country ? ` · ${g.country}` : ''} · {members} member{members === 1 ? '' : 's'}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
                    Add
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

function OverviewPanel({
  items,
  search,
  onSearchChange,
  onEdit,
  onAssign,
}: {
  items: OverviewItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (groupId: string) => void;
  onAssign: (item: OverviewItem) => void;
}) {
  const rowGrid =
    'grid grid-cols-[92px_minmax(0,1fr)_minmax(0,140px)_76px] items-center gap-3 px-3';

  return (
    <div className="flex h-[440px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900">All Members</h4>
            <p className="text-[11px] text-slate-500">
              Every branch and customer with its assigned rate group
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {items.length}
          </span>
        </div>
        <div className="relative mt-3">
          <input
            type="text"
            placeholder="Search members or groups…"
            className={`${formInput} !py-1.5 !pl-8 !text-xs`}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
      </div>

      <div className={`${rowGrid} shrink-0 border-b border-slate-100 bg-slate-50/80 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400`}>
        <span>Type</span>
        <span>Name</span>
        <span>Group</span>
        <span className="text-right">Action</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No members found</div>
        ) : (
          items.map(item => (
            <div
              key={`${item.kind}-${item.id}`}
              className={`${rowGrid} border-b border-slate-50 py-2.5 text-sm text-slate-700 last:border-b-0 hover:bg-slate-50/60`}
            >
              <span
                className={`w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  item.kind === 'branch'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-violet-100 text-violet-700'
                }`}
              >
                {item.kind}
              </span>
              <span className="truncate font-medium">{item.label}</span>
              <span
                className={`truncate text-xs ${
                  item.groupName ? 'font-medium text-slate-600' : 'italic text-slate-400'
                }`}
              >
                {item.groupName ?? 'Unassigned'}
              </span>
              <div className="flex justify-end">
                {item.groupId ? (
                  <button
                    type="button"
                    onClick={() => onEdit(item.groupId!)}
                    className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAssign(item)}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
                  >
                    Assign
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MemberPanel({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder,
  emptyLabel,
  items,
  actionLabel,
  actionVariant,
  onAction,
}: {
  title: string;
  subtitle: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  items: MemberItem[];
  actionLabel: string;
  actionVariant: 'add' | 'remove';
  onAction: (item: MemberItem) => void;
}) {
  const actionClass =
    actionVariant === 'add'
      ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
      : 'bg-red-50 text-red-600 hover:bg-red-100';

  return (
    <div className="flex h-[440px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            <p className="text-[11px] text-slate-500">{subtitle}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {items.length}
          </span>
        </div>
        <div className="relative mt-3">
          <input
            type="text"
            placeholder={searchPlaceholder}
            className={`${formInput} !py-1.5 !pl-8 !text-xs`}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">{emptyLabel}</div>
        ) : (
          items.map(item => {
            const disabled = !!item.assignedGroupName;
            return (
              <div
                key={`${item.kind}-${item.id}`}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                  disabled ? 'bg-slate-50 text-slate-400' : 'bg-slate-50/50 text-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                        item.kind === 'branch'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-violet-100 text-violet-700'
                      }`}
                    >
                      {item.kind}
                    </span>
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  {item.assignedGroupName ? (
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">
                      Assigned to {item.assignedGroupName}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={disabled && actionVariant === 'add'}
                  onClick={() => onAction(item)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${actionClass}`}
                >
                  {actionLabel}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
