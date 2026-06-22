'use client';

import React from 'react';
import { formGroup, formInput, formLabel, formRow } from '@/lib/ui';
import { PageHeader, PageShell, SectionCard } from '../ui';

export default function ICTransferRatesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Price Management"
        subtitle="Configure buy, sale, and conversion rates"
      />

      <SectionCard>
        <div className="p-6 sm:p-8">
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Buy Rate</label>
              <input className={formInput} defaultValue="42" readOnly />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Sale Rate</label>
              <input className={formInput} defaultValue="43.5" readOnly />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>SAR Conversion</label>
              <input className={formInput} defaultValue="1.04" readOnly />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>INR Conversion</label>
              <input className={formInput} defaultValue="25" readOnly />
            </div>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
