'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { BRANCH_NAV_PAGES, HIDEABLE_BRANCH_PAGE_IDS } from '@/lib/branchPages';
import { btnPrimary, btnSm } from '@/lib/ui';

type Props = {
  branchId: string;
  hiddenPages: string[];
};

export default function BranchPageSettings({ branchId, hiddenPages }: Props) {
  const { updateBranchPages } = useApp();
  const [localHidden, setLocalHidden] = useState<string[]>(hiddenPages);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalHidden(hiddenPages);
  }, [hiddenPages]);

  const hideablePages = BRANCH_NAV_PAGES.filter(p => HIDEABLE_BRANCH_PAGE_IDS.includes(p.id));

  const isPageEnabled = (pageId: string) => {
    if (pageId === 'ic-transfer-admin') {
      return (
        !localHidden.includes('ic-transfer-admin') &&
        !localHidden.includes('ic-transfer')
      );
    }
    if (pageId === 'ic-transfer') {
      return !localHidden.includes('ic-transfer') && !localHidden.includes('ic-transfer-branch');
    }
    return !localHidden.includes(pageId);
  };

  const togglePage = (pageId: string) => {
    setLocalHidden(prev => {
      if (pageId === 'ic-transfer-admin') {
        const disabling = !prev.includes('ic-transfer-admin') && !prev.includes('ic-transfer');
        if (disabling) {
          return [...prev.filter(id => id !== 'ic-transfer-admin' && id !== 'ic-transfer'), 'ic-transfer-admin'];
        }
        return prev.filter(id => id !== 'ic-transfer-admin' && id !== 'ic-transfer');
      }

      return prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBranchPages(branchId, localHidden);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    localHidden.length !== hiddenPages.length ||
    localHidden.some(id => !hiddenPages.includes(id));

  return (
    <div className="mt-8 md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
      <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Portal Pages</h3>
          <p className="mt-1 text-sm text-slate-500">
            Control which pages branch managers can see in their portal.
          </p>
        </div>
        <button
          type="button"
          className={`${btnPrimary} ${btnSm} mt-3 sm:mt-0`}
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
        {hideablePages.map(page => {
          const enabled = isPageEnabled(page.id);
          return (
            <label
              key={page.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                enabled
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">{page.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => togglePage(page.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          );
        })}
      </div>

      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 sm:px-8">
        Dashboard and Settings are always visible. Hidden pages are removed from navigation and blocked via direct URL.
      </p>
    </div>
  );
}
