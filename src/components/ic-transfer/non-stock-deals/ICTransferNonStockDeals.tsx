'use client';

import React from 'react';
import { PageHeader, PageShell } from '../ui';

export default function ICTransferNonStockDeals() {
  return (
    <PageShell>
      <PageHeader
        title="Non Stock Deals"
        subtitle="Manage IC Transfer non stock deals"
      />
      <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-sm font-medium text-slate-500">Non Stock Deals feature coming soon...</p>
      </div>
    </PageShell>
  );
}
