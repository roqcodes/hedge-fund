'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { generateId } from '@/data/mockData';
import { Transaction, Entity } from '@/types';
import { formInput, formLabel, btnPrimary, btnSecondary } from '@/lib/ui';
import TagMultiSelect from '@/components/ui/TagMultiSelect';
import { TransactionTag } from '@/types';

export function BranchTransferModal({
  open,
  onClose,
  targetBranchId,
}: {
  open: boolean;
  onClose: () => void;
  targetBranchId?: string;
}) {
  const { branches, entities, ledgers, transactions, addEntity, processLedgerTransaction, showToast, transactionTags, addTransactionTag } = useApp();

  // If targetBranchId is provided, use that branch. Otherwise fallback to assuming the user is a branch manager with only 1 branch.
  const branch = targetBranchId 
    ? branches.find(b => b.id === targetBranchId) || null
    : (branches.length === 1 ? branches[0] : null);
    
  const branchId = branch?.id || '';
  const branchName = branch?.name || '';

  const [assetType, setAssetType] = useState<'currency' | 'gold'>('currency');

  // Calculate balances for all options
  const optionBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    const branchLedgers = ledgers.filter(l => !l.branchId || l.branchId === branchId);
    
    // Ledger balances
    branchLedgers.forEach(l => {
      const toSum = transactions.filter(t => t.to === l.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
      const fromSum = transactions.filter(t => t.from === l.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
      const tagSum = transactions.filter(t => t.type === l.name && t.from !== l.name && t.to !== l.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
      balances[l.name] = toSum - fromSum + tagSum;
    });

    // Branch balance
    if (assetType === 'currency') {
      if (branchName) {
        let base = branch?.openingBalance || 0;
        const ledgersSet = new Set(branchLedgers.map(l => l.name));
        transactions.forEach((t: Transaction) => {
          if ((t.assetType || 'currency') !== 'currency' || t.status !== 'completed') return;
          const isLedgerTxn = ledgersSet.has(t.from) || ledgersSet.has(t.to) || ledgersSet.has(t.type);
          if (isLedgerTxn) return;
          if (t.to === branchName) base += t.amount;
          if (t.from === branchName) base -= t.amount;
        });
        balances[branchName] = base;
      }
    } else {
      if (branchName) balances[branchName] = branch?.goldBalance || 0;
    }

    // Entity balances
    entities.forEach(e => {
      if (!e.branchId || e.branchId === branchId) {
        const toSum = transactions.filter(t => t.to === e.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
        const fromSum = transactions.filter(t => t.from === e.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
        balances[e.name] = toSum - fromSum;
      }
    });

    return balances;
  }, [transactions, ledgers, branchId, branch, branchName, entities, assetType]);

  // Options group: Branch, Ledgers, Entities
  const branchFundLabel = assetType === 'currency' ? `${branchName} (Branch Fund)` : `${branchName} (Branch Gold Volume)`;

  const allOptions = useMemo(() => {
    const opts: { id: string; name: string; type: 'branch' | 'ledger' | 'entity'; balance: number }[] = [];
    if (branchName) {
      opts.push({ id: branchId, name: branchFundLabel, type: 'branch', balance: optionBalances[branchName] || 0 });
    }
    ledgers.forEach(l => {
      if (!l.branchId || l.branchId === branchId) {
        opts.push({ id: l.id, name: l.name, type: 'ledger', balance: optionBalances[l.name] || 0 });
      }
    });
    entities.forEach(e => {
      if (!e.branchId || e.branchId === branchId) {
        opts.push({ id: e.id, name: e.name, type: 'entity', balance: optionBalances[e.name] || 0 });
      }
    });
    return opts;
  }, [branchName, branchId, ledgers, entities, optionBalances]);

  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setFromSearch('');
      setToSearch('');
      setSelectedTagIds([]);
      setAmount('');
      setNotes('');
      setFromOpen(false);
      setToOpen(false);
      setAssetType('currency');
    }
  }, [open]);

  if (!branch) return null;

  const handleSubmit = async () => {
    const fromName = fromSearch.trim();
    const toName = toSearch.trim();
    
    if (!fromName || !toName || !amount) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    const fromExists = allOptions.find(o => o.name.trim().toLowerCase() === fromName.toLowerCase());
    const toExists = allOptions.find(o => o.name.trim().toLowerCase() === toName.toLowerCase());

    if (!fromExists) {
      showToast(`Account "${fromName}" does not exist. Please create it first.`, 'error');
      return;
    }
    if (!toExists) {
      showToast(`Account "${toName}" does not exist. Please create it first.`, 'error');
      return;
    }

    setIsSubmitting(true);

    const exactFromName = fromExists.name;
    const exactToName = toExists.name;

    // If 'from' is the branch fund, cash/gold decreases (-). If 'to' is the branch fund, cash/gold increases (+).
    let deltaCash = 0;
    let deltaGold = 0;
    
    if (exactFromName.toLowerCase() === branchFundLabel.trim().toLowerCase()) {
      if (assetType === 'gold') deltaGold = -amt;
      else deltaCash = -amt;
    } else if (exactToName.toLowerCase() === branchFundLabel.trim().toLowerCase()) {
      if (assetType === 'gold') deltaGold = amt;
      else deltaCash = amt;
    }

    const newTxn: Transaction = {
      id: generateId('TXN'),
      date: new Date(date).toISOString(),
      from: exactFromName.toLowerCase() === branchFundLabel.trim().toLowerCase() ? branchName.trim() : exactFromName,
      to: exactToName.toLowerCase() === branchFundLabel.trim().toLowerCase() ? branchName.trim() : exactToName,
      amount: amt,
      type: 'transfer',
      assetType,
      status: 'completed',
      tagIds: selectedTagIds,
      category: (() => {
        if (deltaCash > 0 || deltaGold > 0) return 'debit';
        if (deltaCash < 0 || deltaGold < 0) return 'credit';
        const fromLedger = ledgers.filter(l => !l.branchId || l.branchId === branchId).find(l => l.name === exactFromName);
        const toLedger = ledgers.filter(l => !l.branchId || l.branchId === branchId).find(l => l.name === exactToName);
        if (fromLedger) {
          return fromLedger.impact === 'positive' ? 'credit' : fromLedger.impact === 'negative' ? 'debit' : 'neutral';
        }
        if (toLedger) {
          return toLedger.impact === 'positive' ? 'debit' : toLedger.impact === 'negative' ? 'credit' : 'neutral';
        }
        return 'neutral';
      })(),
      notes: notes || '',
    };

    const success = await processLedgerTransaction(newTxn, deltaCash, deltaGold, branchId);
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  const branchLedgers = ledgers.filter(l => !l.branchId || l.branchId === branchId);

  const branchTags = useMemo(
    () => transactionTags.filter(t => !t.branchId || t.branchId === branchId),
    [transactionTags, branchId],
  );

  const handleCreateTag = async (name: string) => {
    const tag: TransactionTag = {
      id: generateId('TAG'),
      name: name.trim(),
      branchId,
      createdAt: new Date().toISOString(),
    };
    return addTransactionTag(tag);
  };

  const getFilteredOptions = (query: string) => {
    const q = query.toLowerCase();
    return allOptions.filter(o => o.name.toLowerCase().includes(q)).slice(0, 50); // limit to 50
  };

  const formatBalance = (bal: number) => {
    if (assetType === 'gold') return `${bal.toFixed(2)}g`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(bal);
  };

  const renderDropdown = (
    searchValue: string, 
    setSearchValue: (val: string) => void, 
    isOpen: boolean, 
    setIsOpen: (val: boolean) => void
  ) => {
    const filtered = getFilteredOptions(searchValue);
    const hasExactMatch = filtered.some(o => o.name.toLowerCase() === searchValue.toLowerCase().trim());

    const selectOption = (name: string) => {
      setSearchValue(name);
      setIsOpen(false);
    };
    
    return (
      <div className="relative">
        <input
          type="text"
          className={formInput}
          placeholder="Search or type new..."
          value={searchValue}
          onChange={e => {
            setSearchValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          autoComplete="off"
        />
        {isOpen && (searchValue || filtered.length > 0) && (
          <div
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-slate-200 rounded-lg shadow-xl outline-none ring-1 ring-black/5"
            onMouseDown={e => e.preventDefault()}
          >
            {filtered.map(o => (
              <button
                key={o.id}
                type="button"
                className="w-full px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0 text-left"
                onMouseDown={() => selectOption(o.name)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">{o.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{o.type}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-xs font-semibold text-slate-700">{formatBalance(o.balance)}</span>
                  <span className="text-[10px] text-slate-400">BALANCE</span>
                </div>
              </button>
            ))}
            {searchValue.trim() && !hasExactMatch && (
              <button
                type="button"
                className="w-full px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-accent text-left"
                onMouseDown={async () => {
                  const newName = searchValue.trim();
                  if (!newName) return;
                  const newEntity: Entity = {
                    id: generateId('ENT'),
                    name: newName,
                    branchId,
                    createdAt: new Date().toISOString(),
                  };
                  await addEntity(newEntity);
                  selectOption(newName);
                  showToast(`Entity "${newName}" created successfully!`, 'success');
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                <span className="text-sm font-medium">Create "{searchValue.trim()}" as new entity</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Universal Journal Entry"
      footer={
        <>
          <button
            type="button"
            className={`${btnSecondary} w-full sm:w-auto`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${btnPrimary} w-full sm:w-auto`}
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !fromSearch.trim() || !toSearch.trim()}
          >
            {isSubmitting ? 'Processing...' : 'Execute Transaction'}
          </button>
        </>
      }
    >
      <div className="space-y-6 pb-24"> {/* Extra padding for absolute dropdowns */}
        {/* Asset Type Toggle */}
        <div className="flex gap-4 p-1 bg-slate-100 rounded-lg w-full max-w-sm">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${assetType === 'currency' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setAssetType('currency')}
          >
            AED Currency
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${assetType === 'gold' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setAssetType('gold')}
          >
            Physical Gold
          </button>
        </div>

        {/* Date */}
        <div>
          <label className={formLabel}>Date &amp; Time</label>
          <input
            type="datetime-local"
            className={formInput}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* From / To row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <label className={formLabel}>From Account</label>
            {renderDropdown(fromSearch, setFromSearch, fromOpen, setFromOpen)}
          </div>

          <div className="relative">
            <label className={formLabel}>To Account</label>
            {renderDropdown(toSearch, setToSearch, toOpen, setToOpen)}
          </div>
        </div>

        {/* Details row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <TagMultiSelect
              label="Tags"
              tags={branchTags}
              selectedIds={selectedTagIds}
              onChange={setSelectedTagIds}
              onCreateTag={handleCreateTag}
              placeholder="Search or add tags..."
            />
          </div>

          <div>
            <label className={formLabel}>Amount ({assetType === 'gold' ? 'Grams' : 'AED'})</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{assetType === 'gold' ? 'g' : 'AED'}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={`${formInput} pl-12 font-medium`}
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={formLabel}>Notes &amp; Particulars</label>
          <textarea
            rows={2}
            className={formInput}
            placeholder="Add context for this journal entry..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
