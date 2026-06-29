'use client';

import React, { useState } from 'react';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow } from '@/lib/ui';
import { PageHeader, PageShell, SectionCard, AddButton } from '../ui';
import { useApp } from '@/context/AppContext';
import { ICRateGroup } from '@/types';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';

// Comprehensive list of world currencies
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
  'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'
];

export default function ICTransferRatesPage() {
  const { icRateGroups, addICRateGroup, updateICRateGroup, deleteICRateGroup, setICRateGroupCustomers, setICRateGroupBranches, allBranches, showToast, currentSlug } = useApp();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ICRateGroup | null>(null);
  
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [currency, setCurrency] = useState('');
  const [saleRate, setSaleRate] = useState(0);
  const [conversionRate, setConversionRate] = useState(1);
  
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  
  const [branchSearch, setBranchSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [inlineEditing, setInlineEditing] = useState<string | null>(null);
  const [inlineSaleRate, setInlineSaleRate] = useState<number>(0);
  const [inlineConversionRate, setInlineConversionRate] = useState<number>(1);
  const [branchCustomers, setBranchCustomers] = useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    if (currentSlug) {
      getCustomersBySlug(currentSlug).then(res => {
        if (res.success && res.customers) {
          setBranchCustomers(res.customers);
        }
      });
    }
  }, [currentSlug]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setName('');
    setCountry('');
    setRegion('');
    setCurrency('');
    setSaleRate(0);
    setConversionRate(1);
    setSelectedCustomers([]);
    setSelectedBranches([]);
    setBranchSearch('');
    setCustomerSearch('');
    setModalOpen(true);
  };

  const handleEdit = (group: ICRateGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setCountry(group.country);
    setRegion(group.region);
    setCurrency(group.currency);
    setSaleRate(group.saleRate);
    setConversionRate(group.conversionRate || 1);
    setSelectedCustomers(group.customerIds || []);
    setSelectedBranches(group.branchIds || []);
    setBranchSearch('');
    setCustomerSearch('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !country || !region || !currency) return;
    
    // Strict enforcement: Ensure the entered currency is in the predefined list
    if (!WORLD_CURRENCIES.includes(currency.toUpperCase())) {
      showToast('Please select a valid currency from the list.', 'error');
      return;
    }

    // Uniqueness validation: Same customer cannot be in multiple groups
    for (const cid of selectedCustomers) {
      const otherGroup = icRateGroups.find(g => g.id !== editingGroup?.id && g.customerIds?.includes(cid));
      if (otherGroup) {
        const customer = branchCustomers.find(c => c.id === cid);
        showToast(`Customer "${customer?.name || cid}" is already assigned to rate group "${otherGroup.name}"`, 'error');
        return;
      }
    }

    // Uniqueness validation: Same branch cannot be in multiple groups
    for (const bid of selectedBranches) {
      const otherGroup = icRateGroups.find(g => g.id !== editingGroup?.id && g.branchIds?.includes(bid));
      if (otherGroup) {
        const branch = allBranches.find(b => b.id === bid);
        showToast(`Branch "${branch?.name || bid}" is already assigned to rate group "${otherGroup.name}"`, 'error');
        return;
      }
    }

    setIsSaving(true);
    let success = false;
    let groupId = editingGroup?.id;
    
    if (editingGroup) {
      success = await updateICRateGroup(editingGroup.id, name, country, region, currency.toUpperCase(), saleRate, conversionRate);
    } else {
      const newGroupId = await addICRateGroup(name, country, region, currency.toUpperCase(), saleRate, conversionRate);
      if (newGroupId) {
        success = true;
        groupId = newGroupId;
      }
    }
    
    if (success && groupId) {
      const resCust = await setICRateGroupCustomers(groupId, selectedCustomers);
      const resBranch = await setICRateGroupBranches(groupId, selectedBranches);
      if (!resCust || !resBranch) {
        success = false;
      }
    }
    
    setIsSaving(false);
    if (success) {
      setModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this rate group?')) {
      await deleteICRateGroup(id);
    }
  };

  const startInlineEdit = (group: ICRateGroup) => {
    setInlineEditing(group.id);
    setInlineSaleRate(group.saleRate);
    setInlineConversionRate(group.conversionRate || 1);
  };

  const saveInlineEdit = async (group: ICRateGroup) => {
    const success = await updateICRateGroup(group.id, group.name, group.country, group.region, group.currency, inlineSaleRate, inlineConversionRate);
    if (success) {
      setInlineEditing(null);
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditing(null);
  };

  const toggleSelection = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(id)) {
      setList(list.filter(i => i !== id));
    } else {
      setList([...list, id]);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Rate Groups"
        subtitle="Manage dynamic rate groups for customers and branches"
        actions={
          <div className="flex items-center gap-3">
            <AddButton label="Create Group" onClick={openCreateModal} />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {icRateGroups.map(group => (
          <SectionCard key={group.id}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{group.name}</h3>
                  <p className="text-sm text-slate-500">{group.region}, {group.country}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(group)} className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">Edit</button>
                  <button onClick={() => handleDelete(group.id)} className="text-sm px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">Delete</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded">
                  <div className="text-xs text-slate-500 font-medium">Currency</div>
                  <div className="font-bold text-slate-800">{group.currency}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded relative">
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs text-slate-500 font-medium">Rates</div>
                    {inlineEditing === group.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveInlineEdit(group)} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded hover:bg-emerald-200">Save</button>
                        <button onClick={cancelInlineEdit} className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-300">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startInlineEdit(group)} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200">Quick Edit</button>
                    )}
                  </div>
                  {inlineEditing === group.id ? (
                    <div className="space-y-2 mt-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Sale Rate (AED)</label>
                        <input type="number" step="0.000001" className="w-full text-xs p-1 border rounded" value={inlineSaleRate} onChange={e => setInlineSaleRate(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Conversion Rate</label>
                        <input type="number" step="0.000001" className="w-full text-xs p-1 border rounded" value={inlineConversionRate} onChange={e => setInlineConversionRate(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-emerald-600">
                        <span className="text-[10px] text-slate-400 font-normal mr-1">Sale:</span>
                        {group.saleRate}
                      </div>
                      <div className="text-sm font-bold text-indigo-600">
                        <span className="text-[10px] text-slate-400 font-normal mr-1">Conv:</span>
                        {group.conversionRate || 1}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <div className="text-xs text-slate-500 font-medium mb-1">Branches</div>
                  <div className="flex flex-wrap gap-1">
                    {group.branchIds?.length ? group.branchIds.map(bid => {
                      const b = allBranches.find(x => x.id === bid);
                      return <span key={bid} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">{b?.name || bid}</span>;
                    }) : <span className="text-xs font-bold text-slate-800">0</span>}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <div className="text-xs text-slate-500 font-medium mb-1">Customers</div>
                  <div className="flex flex-wrap gap-1">
                    {group.customerIds?.length ? group.customerIds.map(cid => {
                      const c = branchCustomers.find(x => x.id === cid);
                      return <span key={cid} className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full">{c?.name || cid}</span>;
                    }) : <span className="text-xs font-bold text-slate-800">0</span>}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
        {icRateGroups.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No rate groups created yet. Click "Create Group" to add one.
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroup ? 'Edit Rate Group' : 'Create Rate Group'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setModalOpen(false)} disabled={isSaving}>Cancel</button>
            <button type="submit" form="rateGroupForm" className={btnPrimary} disabled={isSaving}>
              {isSaving ? 'Saving...' : (editingGroup ? 'Save Changes' : 'Create Group')}
            </button>
          </>
        }
      >
        <form id="rateGroupForm" onSubmit={handleSave} className="space-y-4">
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Group Name</label>
              <input className={formInput} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Premium Asia" required />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Currency</label>
              <ComboSearchInput
                value={currency}
                onChange={setCurrency}
                options={WORLD_CURRENCIES.map(c => ({ value: c, label: c }))}
                placeholder="Search or select currency..."
              />
            </div>
          </div>
          
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Country</label>
              <input className={formInput} value={country} onChange={e => setCountry(e.target.value)} required />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Region</label>
              <input className={formInput} value={region} onChange={e => setRegion(e.target.value)} required />
            </div>
          </div>
          
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Sale Rate (AED)</label>
              <input className={formInput} value={saleRate} onChange={e => setSaleRate(parseFloat(e.target.value) || 0)} type="number" step="0.000001" required />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>AED to {currency || 'Currency'} Conversion Rate</label>
              <input className={formInput} value={conversionRate} onChange={e => setConversionRate(parseFloat(e.target.value) || 0)} type="number" step="0.000001" required />
            </div>
          </div>
          
          {editingGroup && (
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
              <div className={formGroup}>
                <div className="flex items-center justify-between mb-2">
                  <label className={formLabel + " !mb-0"}>Assign Branches</label>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{selectedBranches.length} selected</span>
                </div>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search branches..."
                    className={formInput + " !py-1.5 !pl-8 !text-xs"}
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                  />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
                </div>
                <div className="border border-slate-200 rounded-xl h-60 overflow-y-auto p-2 bg-slate-50 space-y-1">
                  {allBranches
                    .filter(b => !b.hiddenPages?.includes('ic-transfer-branch'))
                    .filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase()))
                    .map(b => {
                    const isSelected = selectedBranches.includes(b.id);
                    return (
                      <div 
                        key={b.id} 
                        onClick={() => toggleSelection(b.id, selectedBranches, setSelectedBranches)}
                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium border' : 'hover:bg-slate-100 border border-transparent text-slate-600'}`}
                      >
                        {b.name}
                        {isSelected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                    );
                  })}
                  {allBranches
                    .filter(b => !b.hiddenPages?.includes('ic-transfer-branch'))
                    .filter(b => b.name.toLowerCase().includes(branchSearch.toLowerCase())).length === 0 && (
                    <div className="text-xs text-center text-slate-400 py-4">No branches found</div>
                  )}
                </div>
              </div>

              <div className={formGroup}>
                <div className="flex items-center justify-between mb-2">
                  <label className={formLabel + " !mb-0"}>Assign Customers</label>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{selectedCustomers.length} selected</span>
                </div>
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search customers..."
                    className={formInput + " !py-1.5 !pl-8 !text-xs"}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
                </div>
                <div className="border border-slate-200 rounded-xl h-60 overflow-y-auto p-2 bg-slate-50 space-y-1">
                  {branchCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => {
                    const isSelected = selectedCustomers.includes(c.id);
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => toggleSelection(c.id, selectedCustomers, setSelectedCustomers)}
                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium border' : 'hover:bg-slate-100 border border-transparent text-slate-600'}`}
                      >
                        {c.name}
                        {isSelected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                    );
                  })}
                  {branchCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                    <div className="text-xs text-center text-slate-400 py-4">No customers found</div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!editingGroup && (
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 mt-4">
              <p className="text-sm text-slate-600 text-center">Save this group first to assign branches and customers to it.</p>
            </div>
          )}
        </form>
      </Modal>
    </PageShell>
  );
}
