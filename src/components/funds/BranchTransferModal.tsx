'use client';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { generateId } from '@/data/mockData';
import { Transaction, Entity } from '@/types';

export function BranchTransferModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { branches, entities, addEntity, processLedgerTransaction, showToast } = useApp();

  const [tab, setTab] = useState<'customer_account' | 'temporary_credit'>('customer_account');
  const [type, setType] = useState<'debit' | 'credit'>('debit');

  // Entity combobox state
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branch = branches.length === 1 ? branches[0] : null;
  const branchId = branch?.id || '';
  const branchName = branch?.name || '';

  // Entities visible to this branch
  const branchEntities = useMemo(
    () => entities.filter(e => !e.branchId || e.branchId === branchId),
    [entities, branchId]
  );

  // Filtered by search term
  const filteredEntities = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    if (!q) return branchEntities;
    return branchEntities.filter(
      e =>
        e.name.toLowerCase().includes(q) ||
        (e.phone && e.phone.toLowerCase().includes(q))
    );
  }, [branchEntities, entitySearch]);

  // Whether the current search text is a brand-new name
  const isNewEntity = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    return q.length > 0 && !branchEntities.some(e => e.name.toLowerCase() === q);
  }, [branchEntities, entitySearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOut(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOut);
    return () => document.removeEventListener('mousedown', handleOut);
  }, []);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setEntitySearch('');
      setSelectedEntity(null);
      setAmount('');
      setNotes('');
      setDropdownOpen(false);
    }
  }, [open]);

  const selectEntity = useCallback((e: Entity) => {
    setSelectedEntity(e);
    setEntitySearch(e.name);
    setDropdownOpen(false);
  }, []);

  const clearEntity = useCallback(() => {
    setSelectedEntity(null);
    setEntitySearch('');
    inputRef.current?.focus();
  }, []);

  if (!branch) return null;

  const handleSubmit = async () => {
    const nameToUse = entitySearch.trim();
    if (!nameToUse || !amount) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    setIsSubmitting(true);

    // If new name typed, auto-create the entity first
    let resolvedEntity = selectedEntity;
    if (!resolvedEntity || resolvedEntity.name.toLowerCase() !== nameToUse.toLowerCase()) {
      const existing = branchEntities.find(e => e.name.toLowerCase() === nameToUse.toLowerCase());
      if (existing) {
        resolvedEntity = existing;
      } else {
        const newEntity: Entity = {
          id: generateId('ENT'),
          name: nameToUse,
          branchId,
          createdAt: new Date().toISOString(),
        };
        const ok = await addEntity(newEntity);
        if (!ok) {
          showToast('Failed to create entity', 'error');
          setIsSubmitting(false);
          return;
        }
        resolvedEntity = newEntity;
      }
    }

    const deltaCash = type === 'debit' ? amt : -amt;

    const newTxn: Transaction = {
      id: generateId('TXN'),
      date: date,
      from: type === 'debit' ? resolvedEntity.name : branchName,
      to: type === 'debit' ? branchName : resolvedEntity.name,
      amount: amt,
      type: tab,
      status: 'completed',
      category: type,
      notes: notes || '',
    };

    const success = await processLedgerTransaction(newTxn, deltaCash, branchId);
    setIsSubmitting(false);

    if (success) {
      setAmount('');
      setNotes('');
      setEntitySearch('');
      setSelectedEntity(null);
    }
  };

  const showDropdown = dropdownOpen && (filteredEntities.length > 0 || isNewEntity);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Execute Transfer"
      footer={
        <>
          <button
            type="button"
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-dark transition-colors font-medium disabled:opacity-50 w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !entitySearch.trim()}
          >
            {isSubmitting ? 'Processing...' : 'Run Transfer'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'customer_account' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setTab('customer_account')}
          >
            Customer Accounts
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'temporary_credit' ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setTab('temporary_credit')}
          >
            Temporary Credits
          </button>
        </div>

        <div className="space-y-4">
          {/* Date & Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Date &amp; Time</label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none bg-slate-50"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Branch Fund</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none bg-slate-100 text-slate-500 cursor-not-allowed"
                value={branchName}
                disabled
              />
            </div>
          </div>

          {/* Entity Combobox */}
          <div ref={comboRef}>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {tab === 'customer_account' ? 'Customer / Entity' : 'Creditor / Entity'}
            </label>
            <div className="relative">
              {/* Input */}
              <div className={`flex items-center gap-2 w-full px-3 py-2 border rounded-xl bg-white transition-all duration-150 ${dropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200'}`}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
                  placeholder="Type to search or create entity..."
                  value={entitySearch}
                  onChange={e => {
                    setEntitySearch(e.target.value);
                    setSelectedEntity(null);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  autoComplete="off"
                />
                {entitySearch && (
                  <button
                    type="button"
                    onClick={clearEntity}
                    className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto animate-[fade-in-up_0.12s_ease-out_both]">
                  {filteredEntities.map(e => (
                    <button
                      key={e.id}
                      type="button"
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-slate-50 ${selectedEntity?.id === e.id ? 'bg-accent/5 text-accent font-medium' : 'text-slate-700'}`}
                      onClick={() => selectEntity(e)}
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 shrink-0 text-xs font-bold">
                        {e.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 truncate">{e.name}</span>
                      {e.phone && <span className="text-slate-400 text-xs shrink-0">{e.phone}</span>}
                    </button>
                  ))}

                  {/* Create new option */}
                  {isNewEntity && (
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left border-t border-slate-100 text-accent font-medium hover:bg-accent/5 transition-colors"
                      onClick={() => {
                        // Set as a pseudo-entity — actual creation happens on submit
                        setSelectedEntity({
                          id: '__new__',
                          name: entitySearch.trim(),
                          branchId,
                        });
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </span>
                      <span>Create &amp; use &ldquo;{entitySearch.trim()}&rdquo;</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Badge showing new vs existing */}
            {entitySearch.trim() && (
              <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                {selectedEntity?.id === '__new__' || (isNewEntity && !dropdownOpen) ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                    New entity — will be saved automatically on submit
                  </>
                ) : selectedEntity ? (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Existing entity selected
                  </>
                ) : (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
                    Type to filter or create
                  </>
                )}
              </p>
            )}
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Transaction Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="txnType"
                  className="text-accent focus:ring-accent"
                  checked={type === 'debit'}
                  onChange={() => setType('debit')}
                />
                <span className="text-sm font-medium text-slate-700">Debit (Receive Cash)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="txnType"
                  className="text-accent focus:ring-accent"
                  checked={type === 'credit'}
                  onChange={() => setType('credit')}
                />
                <span className="text-sm font-medium text-slate-700">Credit (Pay Cash)</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {type === 'debit'
                ? 'Debit: Cash will be added to the Branch Locker.'
                : 'Credit: Cash will be deducted from the Branch Locker.'}
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Amount (AED)</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none text-lg"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') {
                  e.preventDefault();
                }
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Notes (Optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional details here..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
