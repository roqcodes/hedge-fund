'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader, PageShell, SectionCard, AddButton, SearchInput, IconManageUsers, IconAddGroup } from '../ui';
import { useApp } from '@/context/AppContext';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { portalMobileToolbarClass } from '@/lib/icTransfer/layoutConstants';
import { sortRateGroupsForTable } from '@/lib/icTransfer/rateGroupUtils';
import {
  mergeBranchPortalCustomerAssignments,
  type ICTransferPortalMode,
} from '@/lib/icTransfer/branchPortalScope';
import {
  getAdminAssignedBranchRateGroup,
  getBranchManageableRateGroups,
  filterRateGroupsForAdminPortal,
} from '@/lib/icTransfer/branchRateScope';
import { hasAdvancedPricing, remapPricingConfigToConversion } from '@/lib/icTransfer/ratePricing';
import BranchAdminAssignedRateCard from './BranchAdminAssignedRateCard';
import RateGroupsTable from './RateGroupsTable';
import RateGroupBulkUpdateBar from './RateGroupBulkUpdateBar';
import RateGroupFormModal, { type RateGroupFormValues } from './RateGroupFormModal';
import RateGroupManageUsersModal, { type RateGroupMembersPayload } from './RateGroupManageUsersModal';
import RateGroupViewModal from './RateGroupViewModal';
import type { ICRateGroup, ICRateGroupPricingConfig } from '@/types';

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

type Props = {
  portalMode?: ICTransferPortalMode;
  branchId?: string;
};

export default function ICTransferRatesPage({ portalMode = 'admin', branchId }: Props) {
  const {
    icRateGroups,
    addICRateGroup,
    updateICRateGroup,
    deleteICRateGroup,
    bulkUpdateICRateGroupRates,
    updateICRateGroupPricing,
    setICRateGroupCustomers,
    setICRateGroupBranches,
    allBranches,
    showToast,
    currentSlug,
  } = useApp();

  const isBranchPortal = portalMode === 'branch' && !!branchId;

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingGroup, setEditingGroup] = useState<ICRateGroup | null>(null);
  const [viewGroup, setViewGroup] = useState<ICRateGroup | null>(null);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManagingUsers, setIsManagingUsers] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [savingPricingGroupId, setSavingPricingGroupId] = useState<string | null>(null);
  const [branchCustomers, setBranchCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!currentSlug) return;
    getCustomersBySlug(currentSlug).then(res => {
      if (res.success && res.customers) {
        setBranchCustomers(res.customers);
      }
    });
  }, [currentSlug]);

  const branchCustomerIdSet = useMemo(
    () => new Set(branchCustomers.map(c => c.id)),
    [branchCustomers],
  );

  const adminAssignedBranchRate = useMemo(() => {
    if (!isBranchPortal || !branchId) return undefined;
    return getAdminAssignedBranchRateGroup(icRateGroups, branchId);
  }, [icRateGroups, isBranchPortal, branchId]);

  const branchCustomerRateGroups = useMemo(() => {
    if (isBranchPortal && branchId) {
      return getBranchManageableRateGroups(icRateGroups, branchId, branchCustomerIdSet);
    }
    return filterRateGroupsForAdminPortal(icRateGroups);
  }, [icRateGroups, isBranchPortal, branchId, branchCustomerIdSet]);

  const scopedRateGroups = branchCustomerRateGroups;

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? scopedRateGroups.filter(group =>
          group.name.toLowerCase().includes(q) ||
          group.country.toLowerCase().includes(q) ||
          group.currency.toLowerCase().includes(q),
        )
      : scopedRateGroups;
    return sortRateGroupsForTable(base);
  }, [scopedRateGroups, search]);

  const handleBulkSave = async (
    groupIds: string[],
    saleRate: number,
    conversionRate: number,
    pricingConfig: ICRateGroupPricingConfig | null,
    convertedRateExact?: number | null,
  ) => {
    setIsBulkSaving(true);
    try {
      const allowedIds = isBranchPortal
        ? groupIds.filter(id => scopedRateGroups.some(g => g.id === id))
        : groupIds;

      if (allowedIds.length === 0) {
        showToast('Select at least one rate group you can manage.', 'error');
        return false;
      }

      let success = false;

      if (isBranchPortal) {
        const advanced = hasAdvancedPricing(pricingConfig);
        // Simple flat: prefer the exact local rate typed in the editor.
        // Advanced: derive from seeded AED×conversion (per-type/slab config is remapped separately).
        const targetConverted =
          !advanced && convertedRateExact != null && convertedRateExact > 0
            ? convertedRateExact
            : saleRate * conversionRate;
        const results = await Promise.all(
          allowedIds.map(async id => {
            const group = scopedRateGroups.find(g => g.id === id);
            const conv = group?.conversionRate && group.conversionRate > 0 ? group.conversionRate : 1;
            const derivedSale = conv > 0 ? targetConverted / conv : saleRate;
            // Rebase any advanced per-type / slab rates onto this group's conversion.
            const remappedConfig = remapPricingConfigToConversion(pricingConfig, conv);
            return updateICRateGroupPricing(id, derivedSale, conv, remappedConfig);
          }),
        );
        success = results.every(Boolean);
        if (!success) {
          showToast('Some rate groups failed to update.', 'error');
        }
      } else {
        success = await bulkUpdateICRateGroupRates(
          allowedIds,
          saleRate,
          conversionRate,
          pricingConfig,
        );
      }

      return success;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to apply rates', 'error');
      return false;
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleSaveGroupPricing = async (
    groupId: string,
    saleRate: number,
    conversionRate: number,
    pricingConfig: ICRateGroupPricingConfig | null,
  ) => {
    if (isBranchPortal && !scopedRateGroups.some(g => g.id === groupId)) return false;
    setSavingPricingGroupId(groupId);
    const group = scopedRateGroups.find(g => g.id === groupId);
    let finalSale = saleRate;
    const finalConv =
      isBranchPortal && group?.conversionRate && group.conversionRate > 0
        ? group.conversionRate
        : conversionRate;

    if (isBranchPortal && group) {
      const convertedRate = saleRate * conversionRate;
      finalSale = finalConv > 0 ? convertedRate / finalConv : saleRate;
    }

    const remappedConfig = isBranchPortal
      ? remapPricingConfigToConversion(pricingConfig, finalConv)
      : pricingConfig;

    const success = await updateICRateGroupPricing(groupId, finalSale, finalConv, remappedConfig);
    setSavingPricingGroupId(null);
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
    const { name, country, currency } = values;

    if (!name || !country || !currency) return;

    if (!WORLD_CURRENCIES.includes(currency.toUpperCase())) {
      showToast('Please select a valid currency from the list.', 'error');
      return;
    }

    if (isBranchPortal && adminAssignedBranchRate) {
      const expected = adminAssignedBranchRate.currency.toUpperCase();
      if (currency.toUpperCase() !== expected) {
        showToast(`Customer rate groups must use ${expected} (admin-assigned branch currency).`, 'error');
        return;
      }
    }

    setIsSaving(true);
    let success = false;

    if (editingGroup) {
      success = await updateICRateGroup(
        editingGroup.id,
        name,
        country,
        currency.toUpperCase(),
        editingGroup.saleRate,
        editingGroup.conversionRate ?? 1,
      );
    } else {
      const newGroupId = await addICRateGroup(
        name,
        country,
        currency.toUpperCase(),
        0,
        1,
        isBranchPortal ? branchId : undefined,
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

    let finalBranchIds = branchIds;
    let finalCustomerIds = customerIds;

    if (isBranchPortal && branchId) {
      const group = icRateGroups.find(g => g.id === groupId);
      finalBranchIds = group?.branchIds ?? [];
      finalCustomerIds = mergeBranchPortalCustomerAssignments(
        group?.customerIds,
        branchCustomerIdSet,
        customerIds,
      );
    }

    const resBranch = await setICRateGroupBranches(groupId, finalBranchIds);
    const resCust = await setICRateGroupCustomers(groupId, finalCustomerIds);
    setIsManagingUsers(false);
    if (resBranch && resCust) {
      setManageUsersOpen(false);
    }
  };

  const currentBranch = isBranchPortal
    ? allBranches.find(b => b.id === branchId)
    : undefined;

  return (
    <PageShell>
      <PageHeader
        title="Rate Groups"
        subtitle={
          isBranchPortal
            ? 'Your admin-assigned branch rate and customer-specific groups you manage'
            : 'Manage dynamic rate groups for customers and branches'
        }
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

      {isBranchPortal && adminAssignedBranchRate && (
        <div className="mb-5">
          <BranchAdminAssignedRateCard group={adminAssignedBranchRate} />
        </div>
      )}

      <SectionCard>
        <RateGroupBulkUpdateBar
          groups={scopedRateGroups}
          isSaving={isBulkSaving}
          convertedRateOnly={isBranchPortal}
          onSave={handleBulkSave}
        />

        <div className={`${portalMobileToolbarClass} md:border-b md:border-slate-100 md:px-6 md:py-4 md:pb-3`}>
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
            {isBranchPortal ? 'Your customer rate groups' : 'All Groups'}
          </h3>
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
            onSavePricing={handleSaveGroupPricing}
            savingGroupId={savingPricingGroupId}
            hideBranchColumn={isBranchPortal}
            convertedRateOnly={isBranchPortal}
          />
        </div>
      </SectionCard>

      <RateGroupFormModal
        open={formOpen}
        mode={formMode}
        initialGroup={editingGroup}
        isSaving={isSaving}
        lockedCurrency={
          isBranchPortal && adminAssignedBranchRate
            ? adminAssignedBranchRate.currency
            : undefined
        }
        onClose={() => {
          setFormOpen(false);
          setEditingGroup(null);
        }}
        onSubmit={handleSave}
      />

      <RateGroupManageUsersModal
        open={manageUsersOpen}
        groups={scopedRateGroups}
        allBranches={isBranchPortal && currentBranch ? [currentBranch] : allBranches}
        branchCustomers={branchCustomers}
        customersOnly={isBranchPortal}
        isSaving={isManagingUsers}
        onClose={() => setManageUsersOpen(false)}
        onSave={handleManageUsersSave}
      />

      <RateGroupViewModal
        group={viewGroup}
        branches={isBranchPortal && currentBranch ? [currentBranch] : allBranches}
        customers={branchCustomers}
        onClose={() => setViewGroup(null)}
        onEdit={openEditModal}
        hideAedRate={isBranchPortal}
        hideBranches={isBranchPortal}
      />
    </PageShell>
  );
}
