'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow } from '@/lib/ui';
import type { ICRateGroup } from '@/types';
import type { Branch } from '@/types';

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

type CustomerOption = { id: string; name: string };

export type RateGroupFormValues = {
  name: string;
  country: string;
  region: string;
  currency: string;
  saleRate: string;
  conversionRate: string;
  selectedCustomers: string[];
  selectedBranches: string[];
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialGroup: ICRateGroup | null;
  allGroups: ICRateGroup[];
  allBranches: Branch[];
  branchCustomers: CustomerOption[];
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: RateGroupFormValues) => void | Promise<void>;
};

function toggleSelection(
  id: string,
  list: string[],
  setList: React.Dispatch<React.SetStateAction<string[]>>,
) {
  setList(list.includes(id) ? list.filter(i => i !== id) : [...list, id]);
}

export default function RateGroupFormModal({
  open,
  mode,
  initialGroup,
  allGroups,
  allBranches,
  branchCustomers,
  isSaving,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit';

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [currency, setCurrency] = useState('');
  const [saleRate, setSaleRate] = useState('0');
  const [conversionRate, setConversionRate] = useState('1');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchSearch, setBranchSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialGroup) {
      setName(initialGroup.name);
      setCountry(initialGroup.country);
      setRegion(initialGroup.region);
      setCurrency(initialGroup.currency);
      setSaleRate(initialGroup.saleRate.toString());
      setConversionRate((initialGroup.conversionRate || 1).toString());
      setSelectedCustomers(initialGroup.customerIds || []);
      setSelectedBranches(initialGroup.branchIds || []);
    } else {
      setName('');
      setCountry('');
      setRegion('');
      setCurrency('');
      setSaleRate('0');
      setConversionRate('1');
      setSelectedCustomers([]);
      setSelectedBranches([]);
    }
    setBranchSearch('');
    setCustomerSearch('');
  }, [open, initialGroup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      country,
      region,
      currency,
      saleRate: isEdit ? saleRate : '0',
      conversionRate: isEdit ? conversionRate : '1',
      selectedCustomers,
      selectedBranches,
    });
  };

  const visibleBranches = allBranches
    .filter(b => !b.hiddenPages?.includes('ic-transfer-branch'))
    .filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()));

  const visibleCustomers = branchCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Rate Group' : 'Create Rate Group'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="rateGroupForm" className={btnPrimary} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </>
      }
    >
      <form id="rateGroupForm" onSubmit={handleSubmit} className="space-y-4">
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Group Name</label>
            <input
              className={formInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Premium Asia"
              required
            />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Currency</label>
            <ComboSearchInput
              value={currency}
              onChange={setCurrency}
              options={WORLD_CURRENCIES.map(c => ({ value: c, label: c }))}
              placeholder="Search or select currency…"
            />
          </div>
        </div>

        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Country</label>
            <input className={formInput} value={country} onChange={e => setCountry(e.target.value)} required />
          </div>
        </div>

        {isEdit ? (
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Sale Rate (AED)</label>
              <input
                className={formInput}
                value={saleRate}
                onChange={e => setSaleRate(e.target.value)}
                type="number"
                step="0.000001"
                required
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>AED to {currency || 'Currency'} Conversion Rate</label>
              <input
                className={formInput}
                value={conversionRate}
                onChange={e => setConversionRate(e.target.value)}
                type="number"
                step="0.000001"
                required
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm text-slate-600">
              Sale rate and conversion can be configured after the group is created.
            </p>
          </div>
        )}

        {isEdit ? (
          <div className="grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <AssignmentPanel
              title="Assign Branches"
              search={branchSearch}
              onSearchChange={setBranchSearch}
              searchPlaceholder="Search branches…"
              selectedCount={selectedBranches.length}
              emptyLabel="No branches found"
              items={visibleBranches.map(b => {
                const assignedGroup = allGroups.find(
                  g => g.id !== initialGroup?.id && g.branchIds?.includes(b.id),
                );
                return {
                  id: b.id,
                  label: b.name,
                  sublabel: assignedGroup?.name,
                  disabled: !!assignedGroup,
                  selected: selectedBranches.includes(b.id),
                };
              })}
              onToggle={id => toggleSelection(id, selectedBranches, setSelectedBranches)}
            />
            <AssignmentPanel
              title="Assign Customers"
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              searchPlaceholder="Search customers…"
              selectedCount={selectedCustomers.length}
              emptyLabel="No customers found"
              items={visibleCustomers.map(c => {
                const assignedGroup = allGroups.find(
                  g => g.id !== initialGroup?.id && g.customerIds?.includes(c.id),
                );
                return {
                  id: c.id,
                  label: c.name,
                  sublabel: assignedGroup?.name,
                  disabled: !!assignedGroup,
                  selected: selectedCustomers.includes(c.id),
                };
              })}
              onToggle={id => toggleSelection(id, selectedCustomers, setSelectedCustomers)}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm text-slate-600">
              Save this group first, then edit it to assign branches and customers.
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}

function AssignmentPanel({
  title,
  search,
  onSearchChange,
  searchPlaceholder,
  selectedCount,
  emptyLabel,
  items,
  onToggle,
}: {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  selectedCount: number;
  emptyLabel: string;
  items: {
    id: string;
    label: string;
    sublabel?: string;
    disabled: boolean;
    selected: boolean;
  }[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className={formGroup}>
      <div className="mb-2 flex items-center justify-between">
        <label className={`${formLabel} !mb-0`}>{title}</label>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
          {selectedCount} selected
        </span>
      </div>
      <div className="relative mb-2">
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
      <div className="h-60 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
        {items.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">{emptyLabel}</div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              onClick={() => !item.disabled && onToggle(item.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                item.disabled
                  ? 'cursor-not-allowed border border-transparent bg-slate-100 text-slate-400 opacity-40'
                  : item.selected
                    ? 'cursor-pointer border border-indigo-200 bg-indigo-50 font-medium text-indigo-700'
                    : 'cursor-pointer border border-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{item.label}</span>
                {item.sublabel ? (
                  <span className="truncate text-[10px] font-normal text-slate-400">({item.sublabel})</span>
                ) : null}
              </div>
              {item.selected && !item.disabled ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-indigo-600" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
