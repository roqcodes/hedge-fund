'use client';

import React from 'react';

export type CustomerSubTab = {
  id: string;
  label: string;
  count: number;
};

interface Props {
  tabs: CustomerSubTab[];
  active: string;
  onChange: (id: string) => void;
}

export default function CustomerSubTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-100">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 border-b-2 px-3 py-2 text-xs font-bold transition-colors sm:px-4 sm:text-sm ${
            active === tab.id
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}
