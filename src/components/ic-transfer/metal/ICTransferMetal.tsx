'use client';

import React, { useState } from 'react';
import { DataTableSection, PageHeader, PageShell } from '../ui';

const COLS = ['#', 'Metal Type', 'Purity', 'Weight (g)', 'Location', 'Status', 'Last Updated'];

export default function ICTransferMetal() {
  const [search, setSearch] = useState('');

  return (
    <PageShell>
      <PageHeader
        title="Metal Management"
        subtitle="Track metal inventory across warehouses"
      />

      <DataTableSection
        title="All Metal Records"
        columns={COLS}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search metal records..."
        emptyMessage="No metal records yet."
      />
    </PageShell>
  );
}
