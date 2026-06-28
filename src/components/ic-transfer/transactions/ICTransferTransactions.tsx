'use client';

import React from 'react';
import { PageHeader, PageShell } from '../ui';

export default function ICTransferTransactions() {
  return (
    <PageShell>
      <PageHeader
        title="Transactions"
        subtitle="Manage IC Transfer transactions"
      />
      <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-sm font-medium text-slate-500">Transactions feature coming soon...</p>
      </div>
    </PageShell>
  );
}
