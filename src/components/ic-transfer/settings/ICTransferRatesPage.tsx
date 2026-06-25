'use client';

import React, { useState, useEffect } from 'react';
import { btnPrimary, formGroup, formInput, formLabel, formRow } from '@/lib/ui';
import { PageHeader, PageShell, SectionCard } from '../ui';
import { useApp } from '@/context/AppContext';

export default function ICTransferRatesPage() {
  const { icRates, updateICRates } = useApp();
  const currentRates = icRates.length > 0 ? icRates[0] : null;

  const [buyRate, setBuyRate] = useState(currentRates?.buyRate || 0);
  const [saleRate, setSaleRate] = useState(currentRates?.saleRate || 0);
  const [sarConversion, setSarConversion] = useState(currentRates?.sarConversion || 0);
  const [inrConversion, setInrConversion] = useState(currentRates?.inrConversion || 0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentRates) {
      setBuyRate(currentRates.buyRate);
      setSaleRate(currentRates.saleRate);
      setSarConversion(currentRates.sarConversion);
      setInrConversion(currentRates.inrConversion);
    }
  }, [currentRates]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateICRates(buyRate, saleRate, sarConversion, inrConversion);
    setIsSaving(false);
  };

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
              <input className={formInput} value={buyRate} onChange={(e) => setBuyRate(parseFloat(e.target.value) || 0)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Sale Rate</label>
              <input className={formInput} value={saleRate} onChange={(e) => setSaleRate(parseFloat(e.target.value) || 0)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>SAR Conversion</label>
              <input className={formInput} value={sarConversion} onChange={(e) => setSarConversion(parseFloat(e.target.value) || 0)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>INR Conversion</label>
              <input className={formInput} value={inrConversion} onChange={(e) => setInrConversion(parseFloat(e.target.value) || 0)} type="number" step="0.01" />
            </div>
          </div>
          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button type="button" onClick={handleSave} disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
