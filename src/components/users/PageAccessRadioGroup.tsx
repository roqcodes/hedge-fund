'use client';

import React from 'react';
import type { PageAccessLevel } from '@/types';

export const PAGE_ACCESS_OPTIONS: { value: PageAccessLevel; label: string; short: string }[] = [
  { value: 'none', label: 'No access', short: 'None' },
  { value: 'read', label: 'Read only', short: 'Read' },
  { value: 'write', label: 'Read & write', short: 'Write' },
];

export function accessLevelLabel(level: PageAccessLevel | undefined, short = false): string {
  const opt = PAGE_ACCESS_OPTIONS.find(o => o.value === (level ?? 'none'));
  return short ? (opt?.short ?? 'None') : (opt?.label ?? 'No access');
}

type Props = {
  name: string;
  value: PageAccessLevel;
  onChange: (level: PageAccessLevel) => void;
  compact?: boolean;
};

export default function PageAccessRadioGroup({ name, value, onChange, compact = false }: Props) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">{name} access level</legend>
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'sm:gap-3'}`}>
        {PAGE_ACCESS_OPTIONS.map(opt => {
          const id = `${name}-${opt.value}`;
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
              } ${compact ? 'px-2.5 py-1.5 text-xs' : ''}`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="size-3.5 shrink-0 accent-[var(--color-accent,#2563eb)]"
              />
              <span>{compact ? opt.short : opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
