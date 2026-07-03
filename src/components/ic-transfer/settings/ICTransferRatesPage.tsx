'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader, PageShell, SectionCard, AddButton, SearchInput, IconManageUsers, IconAddGroup } from '../ui';
import { useApp } from '@/context/AppContext';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { portalMobileToolbarClass } from '@/lib/icTransfer/layoutConstants';
import { sortRateGroupsForTable } from '@/lib/icTransfer/rateGroupUtils';
import RateGroupsTable from './RateGroupsTable';
import RateGroupBulkUpdateBar from './RateGroupBulkUpdateBar';
import RateGroupFormModal, { type RateGroupFormValues } from './RateGroupFormModal';
import RateGroupManageUsersModal, { type RateGroupMembersPayload } from './RateGroupManageUsersModal';
import RateGroupViewModal from './RateGroupViewModal';
import type { ICRateGroup } from '@/types';

const WORLD_CURRENCIES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD',
  'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS',
  'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR',
  'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD',
  'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU',
  'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK',
  'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG',
  'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK',
  'SGD', 'SHP', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL',
  'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH',
  'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD',
  'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL',
];

export default function ICTransferRatesPage() {
  const {
    icRateGroups,
    addICRateGroup,
    updateICRateGroup,
    deleteICRateGroup,
    bulkUpdateICRateGroupRates,
    setICRateGroupCustomers,
    setICRateGroupBranches,
    allBranches,
    showToast,
    currentSlug,
  } = useApp();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingGroup, setEditingGroup] = useState<ICRateGroup | null>(null);
  const [viewGroup, setViewGroup] = useState<ICRateGroup | null>(null);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [branchCustomers, setBranchCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!currentSlug) return;
    getCustomersBySlug(currentSlug).then(res => {
      if (res.success && res.customers) {
        setBranchCustomers(res.customers);
      }
    });
  }, [currentSlug]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? icRateGroups.filter(group =>
          group.name.toLowerCase().includes(q) ||
          group.country.toLowerCase().includes(q) ||
          group.region.toLowerCase().includes(q) ||
          group.currency.toLowerCase().includes(q),
        )
      : icRateGroups;
    return sortRateGroupsForTable(base);
  }, [icRateGroups, search]);

  const handleBulkSave = async (groupIds: string[], saleRate: number, conversionRate: number) => {
    setIsBulkSaving(true);
    const success = await bulkUpdateICRateGroupRates(groupIds, saleRate, conversionRate);
    setIsBulkSaving(false);
    return success;
  };

  const openCreateModal = () => {
    setFormMode('create');
    setEditingGroup(null);
    setFormOpen(true);
  };

  const openEditModal = (group: ICRateGroup) => {
    setViewGroup(null);
    setFormMode('edit');
    setEditingGroup(group);
    setFormOpen(true);
  };

  const openViewModal = (group: ICRateGroup) => {
    setViewGroup(group);
  };

  const handleDelete = async (group: ICRateGroup) => {
    if (!confirm(`Delete rate group "${group.name}"?`)) return;
    await deleteICRateGroup(group.id);
  };

  const handleSave = async (values: RateGroupFormValues) => {
    const { name, country, region, currency } = values;

    if (!name || !country || !currency) return;

    if (!WORLD_CURRENCIES.includes(currency.toUpperCase())) {
      showToast('Please select a valid currency from the list.', 'error');
      return;
    }

    setIsSaving(true);
    let success = false;

    if (editingGroup) {
      success = await updateICRateGroup(
        editingGroup.id,
        name,
        country,
        region,
        currency.toUpperCase(),
        editingGroup.saleRate,
        editingGroup.conversionRate ?? 1,
      );
    } else {
      const newGroupId = await addICRateGroup(
        name,
        country,
        region,
        currency.toUpperCase(),
        0,
        1,
      );
      success = !!newGroupId;
    }

    setIsSaving(false);
    if (success) {
      setFormOpen(false);
      setEditingGroup(null);
    }
  };

  const handleManageUsersSave = async ({ groupId, branchIds, customerIds }: RateGroupMembersPayload) => {
    setIsManagingUsers(true);
    const resBranch = await setICRateGroupBranches(groupId, branchIds);
    const resCust = await setICRateGroupCustomers(groupId, customerIds);
    setIsManagingUsers(false);
    if (resBranch && resCust) {
      setManageUsersOpen(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Rate Groups"
        subtitle="Manage dynamic rate groups for customers and branches"
        actions={
          <div className="flex flex-wrap gap-2">
            <AddButton
              label="Manage Users"
              icon={<IconManageUsers />}
              onClick={() => setManageUsersOpen(true)}
            />
            <AddButton
              label="Create Group"
              icon={<IconAddGroup />}
              onClick={openCreateModal}
            />
          </div>
        }
      />

      <SectionCard>
        <RateGroupBulkUpdateBar
          groups={icRateGroups}
          isSaving={isBulkSaving}
          onSave={handleBulkSave}
        />

        <div className={`${portalMobileToolbarClass} md:border-b md:border-slate-100 md:px-6 md:py-4 md:pb-3`}>
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">All Groups</h3>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search groups…"
            className="min-w-0 max-sm:w-full flex-1"
          />
        </div>
        <div className="p-0 pb-3 md:pb-5">
          <RateGroupsTable
            groups={filteredGroups}
            onView={openViewModal}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        </div>
      </SectionCard>

      <RateGroupFormModal
        open={formOpen}
        mode={formMode}
        initialGroup={editingGroup}
        isSaving={isSaving}
        onClose={() => {
          setFormOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={handleSave}
      />

      <RateGroupManageUsersModal
        open={manageUsersOpen}
        groups={icRateGroups}
        allBranches={allBranches}
        branchCustomers={branchCustomers}
        isSaving={isManagingUsers}
        onClose={() => setManageUsersOpen(false)}
        onSave={handleManageUsersSave}
      />

      <RateGroupViewModal
        group={viewGroup}
        branches={allBranches}
        customers={branchCustomers}
        onClose={() => setViewGroup(null)}
        onEdit={openEditModal}
      />
    </PageShell>
  );
}
