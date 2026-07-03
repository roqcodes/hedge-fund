'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow } from '@/lib/ui';
import { countryForCurrency } from '@/lib/icTransfer/currencyCountry';
import type { ICRateGroup } from '@/types';

const WORLD_CURRENCIES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL',
  'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP',
  'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GHS', 'GIP', 'GMD',
  'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS',
  'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR',
  'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD',
  'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU',
  'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK',
  'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG',
  'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK',
  'SGD', 'SHP', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL',
  'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH',
  'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD',
  'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL',
];

export type RateGroupFormValues = {
  name: string;
  country: string;
  region: string;
  currency: string;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialGroup: ICRateGroup | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: RateGroupFormValues) => void | Promise<void>;
};

export default function RateGroupFormModal({
  open,
  mode,
  initialGroup,
  isSaving,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = mode === 'edit';

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initialGroup) {
      setName(initialGroup.name);
      setCountry(initialGroup.country);
      setRegion(initialGroup.region);
      setCurrency(initialGroup.currency);
    } else {
      setName('');
      setCountry('');
      setRegion('');
      setCurrency('');
    }
  }, [open, initialGroup]);

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    const suggested = countryForCurrency(value);
    // Changing the currency always updates the country to the matching one.
    if (suggested) setCountry(suggested);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, country, region, currency });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Rate Group' : 'Create Rate Group'}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="rateGroupForm" className={btnPrimary} disabled={isSaving}>
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </>
      }
    >
      <form id="rateGroupForm" onSubmit={handleSubmit} className="space-y-4">
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Group Name</label>
            <input
              className={formInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Premium Asia"
              required
            />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Currency</label>
            <ComboSearchInput
              value={currency}
              onChange={handleCurrencyChange}
              options={WORLD_CURRENCIES.map(c => ({ value: c, label: c }))}
              placeholder="Search or select currency…"
            />
          </div>
        </div>

        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Country</label>
            <input className={formInput} value={country} onChange={e => setCountry(e.target.value)} required />
          </div>
        </div>

        {!isEdit && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm text-slate-600">
              Sale rate and conversion can be configured via bulk update. Assign branches and customers using Manage Users.
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}
