'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { ICFundAccount } from '@/types';
import type { ICFundAccountType } from '@/lib/icFunds/constants';
import { accountTypeLabel } from '@/lib/icFunds/constants';
import { fmtICAmount } from '@/lib/icFunds/format';
import { icfInput, icfLabel } from '@/components/ic-funds/ui';

export default function AccountPicker({
  label,
  accounts,
  allowedTypes,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  accounts: ICFundAccount[];
  allowedTypes: ReadonlySet<ICFundAccountType>;
  value: string;
  onChange: (accountId: string) => void;
  excludeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selected = accounts.find(a => a.id === value);
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(a => {
      if (a.id === excludeId) return false;
      if (a.status !== 'active') return false;
      if (!allowedTypes.has(a.accountType)) return false;
      if (q && !a.name.toLowerCase().includes(q) && !accountTypeLabel(a.accountType).toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [accounts, allowedTypes, excludeId, query]);

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label className={icfLabel}>{label}</label>
        {selected ? (
          <span className={`font-mono text-[11px] tabular-nums ${selected.balance < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {fmtICAmount(selected.balance)}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <input
          className={icfInput}
          value={open ? query : selected?.name ?? ''}
          placeholder="Search account"
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onChange={e => {
            setQuery(e.target.value);
            if (value) onChange('');
          }}
        />
        {open ? (
          <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white py-0.5 shadow-sm">
            {options.length === 0 ? (
              <li className="px-2.5 py-1.5 text-sm text-slate-500">No matching accounts</li>
            ) : (
              options.map(account => (
                <li key={account.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-sm hover:bg-slate-50"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      onChange(account.id);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-slate-900">{account.name}</span>
                      <span className="ml-1.5 text-[11px] text-slate-400">{accountTypeLabel(account.accountType)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
                      {fmtICAmount(account.balance)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
