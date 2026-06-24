'use client';

import React from 'react';
import { BRANCH_NAV_PAGES } from '@/lib/branchPages';
import type { BranchPageId } from '@/lib/branchPages';
import type { PageAccessLevel, PagePermissionMap } from '@/types';
import { accessLevelLabel } from './PageAccessRadioGroup';

function accessBadgeClass(level: PageAccessLevel | undefined): string {
  switch (level ?? 'none') {
    case 'write':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/15';
    case 'read':
      return 'bg-sky-50 text-sky-700 ring-sky-600/15';
    default:
      return 'bg-slate-100 text-slate-400 ring-slate-300/20';
  }
}

type Props = {
  permissions: PagePermissionMap | undefined;
  pages: BranchPageId[];
  loading?: boolean;
};

export default function StaffAccessSummary({ permissions, pages, loading }: Props) {
  if (loading && permissions === undefined) {
    return <p className="text-xs text-slate-400">Loading access…</p>;
  }

  const resolved = permissions ?? { dashboard: 'read' as const };
  const dashboardLevel = resolved.dashboard ?? 'read';
  const allPages: { id: string; label: string; level: PageAccessLevel }[] = [
    { id: 'dashboard', label: 'Dashboard', level: dashboardLevel },
    ...pages.map(id => ({
      id,
      label: BRANCH_NAV_PAGES.find(p => p.id === id)?.label ?? id,
      level: (resolved[id] ?? 'read') as PageAccessLevel,
    })),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {allPages.map(({ id, label, level }) => (
        <span
          key={id}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${accessBadgeClass(level)}`}
          title={`${label}: ${accessLevelLabel(level)}`}
        >
          <span className="max-w-[120px] truncate">{label}</span>
          <span className="opacity-70">·</span>
          <span>{accessLevelLabel(level, true)}</span>
        </span>
      ))}
    </div>
  );
}
