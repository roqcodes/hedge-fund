'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { generateId } from '@/data/mockData';
import { Transaction, Entity } from '@/types';
import { formInput, formLabel, btnPrimary, btnSecondary } from '@/lib/ui';
import TagMultiSelect from '@/components/ui/TagMultiSelect';
import { TransactionTag } from '@/types';
import { filterBranchLedgers, calculateLedgerBalance, calculateAvailableBranchFund, computeEntityLedgerTabTotals, CUSTOMER_ACCOUNTS_NAME, TEMPORARY_CREDITS_NAME } from '@/lib/ledgers';
import { journalAllowedAccountNames, validateJournalEntry } from '@/lib/journalEntry';
import {
  composeBranchInstant,
  currentTimeHHMM,
  resolveBranchTimeZone,
  todayInTimeZone,
} from '@/lib/businessTime';

export function BranchTransferModal({
  open,
  onClose,
  targetBranchId,
  activeBusinessDate,
}: {
  open: boolean;
  onClose: () => void;
  targetBranchId?: string;
  /** Daily Ledger: force entry onto the open business day. */
  activeBusinessDate?: string;
}) {
  const { branches, entities, ledgers, transactions, addEntity, processLedgerTransaction, showToast, transactionTags, addTransactionTag } = useApp();

  // If targetBranchId is provided, use that branch. Otherwise fallback to assuming the user is a branch manager with only 1 branch.
  const branch = targetBranchId 
    ? branches.find(b => b.id === targetBranchId) || null
    : (branches.length === 1 ? branches[0] : null);
    
  const branchId = branch?.id || '';
  const branchName = branch?.name || '';
  const branchTimezone = resolveBranchTimeZone(branch?.timezone);

  const [assetType, setAssetType] = useState<'currency' | 'gold'>('currency');

  // Calculate balances for all options
  const optionBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    const branchLedgers = filterBranchLedgers(ledgers, branchId);
    const branchTxns = branchId
      ? transactions.filter(t => t.branchId === branchId)
      : transactions;
    
    // Ledger balances (per branch, even for global ledgers)
    const assetTxns = branchTxns.filter(t => (t.assetType || 'currency') === assetType);
    branchLedgers.forEach(l => {
      balances[l.name] = calculateLedgerBalance(l, assetTxns);
    });

    // Branch balance
    if (assetType === 'currency') {
      if (branchName) {
        balances[branchName] = calculateAvailableBranchFund(
          branchName,
          branch?.openingBalance || 0,
          branchTxns,
        );
      }
    } else {
      if (branchName) balances[branchName] = branch?.goldBalance || 0;
    }

    // Entity balances
    entities.forEach(e => {
      if (!e.branchId || e.branchId === branchId) {
        const toSum = transactions.filter(t => t.to === e.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
        const fromSum = transactions.filter(t => t.from === e.name && (t.assetType || 'currency') === assetType).reduce((sum, t) => sum + t.amount, 0);
        const baseBalance = toSum - fromSum;
        
        let netAmount = baseBalance;
        if (assetType === 'currency') {
          const custDep = computeEntityLedgerTabTotals(transactions, e.name, CUSTOMER_ACCOUNTS_NAME);
          const tempCred = computeEntityLedgerTabTotals(transactions, e.name, TEMPORARY_CREDITS_NAME);
          netAmount = baseBalance + custDep.net - tempCred.net;
        }
        
        balances[e.name] = netAmount;
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
      if (filterBranchLedgers([l], branchId).length > 0) {
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
  
  const [fromSubAccount, setFromSubAccount] = useState<'fund' | 'customer_deposit' | 'temp_creds'>('fund');
  const [toSubAccount, setToSubAccount] = useState<'fund' | 'customer_deposit' | 'temp_creds'>('fund');
  
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(() => currentTimeHHMM(branchTimezone));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postingDateLabel = activeBusinessDate
    ? new Date(`${activeBusinessDate}T12:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  useEffect(() => {
    if (open) {
      setTime(currentTimeHHMM(branchTimezone));
    } else {
      setFromSearch('');
      setToSearch('');
      setFromSubAccount('fund');
      setToSubAccount('fund');
      setSelectedTagIds([]);
      setAmount('');
      setNotes('');
      setFromOpen(false);
      setToOpen(false);
      setAssetType('currency');
    }
  }, [open, branchTimezone]);

  if (!branch) return null;

  const handleSubmit = async () => {
    const fromName = fromSearch.trim();
    const toName = toSearch.trim();

    if (!fromName || !toName || !amount) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const amt = parseFloat(amount);

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

    const calendarDate = activeBusinessDate ?? todayInTimeZone(branchTimezone);
    const txnDate = composeBranchInstant(calendarDate, time, branchTimezone);

    setIsSubmitting(true);

    const exactFromName = fromExists.name;
    const exactToName = toExists.name;

    // Build the legs of the transaction based on selected sub-accounts
    const legs: { from: string; to: string }[] = [];

    // 1. Source Extraction Leg
    if (fromExists.type === 'entity') {
      if (fromSubAccount === 'customer_deposit') {
        legs.push({ from: CUSTOMER_ACCOUNTS_NAME, to: exactFromName });
      } else if (fromSubAccount === 'temp_creds') {
        legs.push({ from: TEMPORARY_CREDITS_NAME, to: exactFromName });
      }
    }

    // 2. Main Transfer Leg (only if source differs from destination)
    if (exactFromName !== exactToName) {
      legs.push({ from: exactFromName, to: exactToName });
    }

    // 3. Destination Insertion Leg
    if (toExists.type === 'entity') {
      if (toSubAccount === 'customer_deposit') {
        legs.push({ from: exactToName, to: CUSTOMER_ACCOUNTS_NAME });
      } else if (toSubAccount === 'temp_creds') {
        legs.push({ from: exactToName, to: TEMPORARY_CREDITS_NAME });
      }
    }
    
    // Simplify legs by removing opposites (e.g. A->B and B->A cancel out)
    const simplifiedLegs: { from: string; to: string }[] = [];
    for (const leg of legs) {
      if (leg.from === leg.to) continue; // Skip explicit self-transfers just in case
      const oppositeIdx = simplifiedLegs.findIndex(l => l.from === leg.to && l.to === leg.from);
      if (oppositeIdx !== -1) {
        simplifiedLegs.splice(oppositeIdx, 1);
      } else {
        simplifiedLegs.push(leg);
      }
    }

    if (simplifiedLegs.length === 0) {
      setIsSubmitting(false);
      showToast('This transaction has no net effect (transferring between the same sub-accounts).', 'error');
      return;
    }

    // Validate all legs before processing
    const allowedNames = journalAllowedAccountNames(allOptions.map(o => o.name), branchName, branchFundLabel);
    for (const leg of simplifiedLegs) {
      const legValidation = validateJournalEntry(
        { from: leg.from, to: leg.to, amount: amt, assetType, date: txnDate },
        { branchName, branchFundLabel, allowedAccountNames: allowedNames },
      );
      if (!legValidation.ok) {
        setIsSubmitting(false);
        showToast(`Validation failed for leg (${leg.from} → ${leg.to}): ${legValidation.error}`, 'error');
        return;
      }
    }

    // Process all legs sequentially
    let allSuccess = true;
    for (let i = 0; i < simplifiedLegs.length; i++) {
      const leg = simplifiedLegs[i];
      let deltaCash = 0;
      let deltaGold = 0;

      // Only apply deltaCash / deltaGold to the branch if the branch fund is involved in THIS leg.
      if (leg.from.toLowerCase() === branchFundLabel.trim().toLowerCase()) {
        if (assetType === 'gold') deltaGold = -amt;
        else deltaCash = -amt;
      } else if (leg.to.toLowerCase() === branchFundLabel.trim().toLowerCase()) {
        if (assetType === 'gold') deltaGold = amt;
        else deltaCash = amt;
      }

      const branchLedgersForTxn = filterBranchLedgers(ledgers, branchId);
      const fromLedger = branchLedgersForTxn.find(l => l.name === leg.from);
      const toLedger = branchLedgersForTxn.find(l => l.name === leg.to);

      let category = 'neutral';
      if (deltaCash > 0 || deltaGold > 0) category = 'debit';
      else if (deltaCash < 0 || deltaGold < 0) category = 'credit';
      else if (fromLedger) {
        category = fromLedger.impact === 'positive' ? 'credit' : fromLedger.impact === 'negative' ? 'debit' : 'neutral';
      } else if (toLedger) {
        category = toLedger.impact === 'positive' ? 'debit' : toLedger.impact === 'negative' ? 'credit' : 'neutral';
      }

      // Append multi-leg note context
      let legNote = notes;
      if (simplifiedLegs.length > 1) {
        legNote = `[Leg ${i + 1}/${simplifiedLegs.length}] ` + notes;
      }

      const newTxn: Transaction = {
        id: generateId('TXN'),
        date: txnDate,
        ...(activeBusinessDate ? { businessDate: activeBusinessDate } : {}),
        from: leg.from.toLowerCase() === branchFundLabel.trim().toLowerCase() ? branchName.trim() : leg.from,
        to: leg.to.toLowerCase() === branchFundLabel.trim().toLowerCase() ? branchName.trim() : leg.to,
        amount: amt,
        type: 'transfer',
        assetType,
        status: 'completed',
        tagIds: selectedTagIds,
        category,
        notes: legNote || '',
      };

      const legSuccess = await processLedgerTransaction(newTxn, deltaCash, deltaGold, branchId);
      if (!legSuccess) {
        allSuccess = false;
        break;
      }
    }

    setIsSubmitting(false);

    if (allSuccess) {
      onClose();
    }
  };

  const branchLedgers = filterBranchLedgers(ledgers, branchId);

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

  const renderSubAccountSelector = (
    entityName: string,
    subAccount: 'fund' | 'customer_deposit' | 'temp_creds',
    setSubAccount: (val: 'fund' | 'customer_deposit' | 'temp_creds') => void
  ) => {
    const fundBalance = optionBalances[entityName] || 0;
    const custDepTab = computeEntityLedgerTabTotals(transactions, entityName, CUSTOMER_ACCOUNTS_NAME);
    const tempCredTab = computeEntityLedgerTabTotals(transactions, entityName, TEMPORARY_CREDITS_NAME);
    
    return (
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSubAccount('fund')}
          className={`flex items-center justify-between p-3 text-left rounded-lg border text-sm transition-colors ${
            subAccount === 'fund'
              ? 'border-accent bg-accent/5 ring-1 ring-accent'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className={`font-semibold ${subAccount === 'fund' ? 'text-accent' : 'text-slate-700'}`}>Fund</span>
          <span className="text-slate-500 font-medium truncate max-w-[50%]" title={formatBalance(fundBalance)}>{formatBalance(fundBalance)}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubAccount('customer_deposit')}
          className={`flex items-center justify-between p-3 text-left rounded-lg border text-sm transition-colors ${
            subAccount === 'customer_deposit'
              ? 'border-accent bg-accent/5 ring-1 ring-accent'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className={`font-semibold ${subAccount === 'customer_deposit' ? 'text-accent' : 'text-slate-700'}`}>Cust. Deposit</span>
          <span className="text-slate-500 font-medium truncate max-w-[50%]" title={formatBalance(custDepTab.net)}>{formatBalance(custDepTab.net)}</span>
        </button>
        <button
          type="button"
          onClick={() => setSubAccount('temp_creds')}
          className={`flex items-center justify-between p-3 text-left rounded-lg border text-sm transition-colors ${
            subAccount === 'temp_creds'
              ? 'border-accent bg-accent/5 ring-1 ring-accent'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <span className={`font-semibold ${subAccount === 'temp_creds' ? 'text-accent' : 'text-slate-700'}`}>Temp Creds</span>
          <span className="text-slate-500 font-medium truncate max-w-[50%]" title={formatBalance(tempCredTab.net)}>{formatBalance(tempCredTab.net)}</span>
        </button>
      </div>
    );
  };

  const fromExistsOption = useMemo(() => allOptions.find(o => o.name.toLowerCase() === fromSearch.trim().toLowerCase()), [fromSearch, allOptions]);
  const toExistsOption = useMemo(() => allOptions.find(o => o.name.toLowerCase() === toSearch.trim().toLowerCase()), [toSearch, allOptions]);

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
        <div className="flex w-full gap-1 rounded-lg bg-slate-100 p-1">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          {postingDateLabel ? (
            <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 sm:py-3">
              Posting to active business day:{' '}
              <span className="font-semibold text-slate-900">{postingDateLabel}</span>
            </p>
          ) : (
            <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 sm:py-3">
              Posting date:{' '}
              <span className="font-semibold text-slate-900">
                {todayInTimeZone(branchTimezone)}
              </span>
            </p>
          )}
          <div className="sm:w-36">
            <label className={formLabel}>Time</label>
            <input
              type="time"
              className={formInput}
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* From / To row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={formLabel}>From Account</label>
            {renderDropdown(fromSearch, setFromSearch, fromOpen, setFromOpen)}
            {fromExistsOption?.type === 'entity' && renderSubAccountSelector(fromExistsOption.name, fromSubAccount, setFromSubAccount)}
          </div>

          <div>
            <label className={formLabel}>To Account</label>
            {renderDropdown(toSearch, setToSearch, toOpen, setToOpen)}
            {toExistsOption?.type === 'entity' && renderSubAccountSelector(toExistsOption.name, toSubAccount, setToSubAccount)}
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
