'use client';

import React from 'react';
import type { ICRateGroup, ICRateGroupPricingConfig, ICRateTransactionPricing } from '@/types';
import {
  getFlatRateFromGroup,
  getPricingSummaryLabel,
  hasAdvancedPricing,
  hasMixedPerTypePricing,
  normalizePricingConfig,
} from '@/lib/icTransfer/ratePricing';
import {
  IC_SALE_TRANSACTION_TYPE_OPTIONS,
  type ICSaleTransactionType,
} from '@/lib/icTransfer/transactionTypes';
import { formatRateAmount, getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';

type Props = {
  group: Pick<ICRateGroup, 'saleRate' | 'conversionRate' | 'currency' | 'pricingConfig'>;
  /** Branch portal: show local currency rates only. */
  convertedRateOnly?: boolean;
};

function localRate(saleRate: number, conversionRate: number): number {
  return getCurrencyUnitRate(saleRate, conversionRate > 0 ? conversionRate : 1);
}

function formatUnitsRange(minUnits: number, maxUnits: number | null): string {
  if (maxUnits == null) return `${minUnits}+`;
  return `${minUnits} – ${maxUnits}`;
}

function RateValue({
  saleRate,
  conversionRate,
  currency,
  convertedRateOnly,
  size = 'md',
}: {
  saleRate: number;
  conversionRate: number;
  currency: string;
  convertedRateOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const local = localRate(saleRate, conversionRate);
  const sizeClass =
    size === 'lg'
      ? 'text-2xl font-bold'
      : size === 'sm'
        ? 'text-sm font-semibold'
        : 'text-lg font-bold';

  if (convertedRateOnly) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 tabular-nums text-slate-900 ${sizeClass}`}>
        {formatRateAmount(local)}
        <span className="text-[11px] font-medium text-slate-400">{currency}</span>
      </span>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className={`block tabular-nums text-slate-900 ${sizeClass}`}>
        {formatRateAmount(local)}{' '}
        <span className="text-[11px] font-medium text-slate-400">{currency}</span>
      </span>
      <span className="block text-[11px] tabular-nums text-slate-500">
        AED {formatRateAmount(saleRate)} · conv {formatRateAmount(conversionRate)}
      </span>
    </div>
  );
}

function FlatRatePanel({
  saleRate,
  conversionRate,
  currency,
  convertedRateOnly,
  caption,
}: {
  saleRate: number;
  conversionRate: number;
  currency: string;
  convertedRateOnly?: boolean;
  caption?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-4">
      {caption ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{caption}</p>
      ) : null}
      <div className={caption ? 'mt-2' : undefined}>
        <RateValue
          saleRate={saleRate}
          conversionRate={conversionRate}
          currency={currency}
          convertedRateOnly={convertedRateOnly}
          size="lg"
        />
      </div>
    </div>
  );
}

function SlabLadder({
  pricing,
  currency,
  convertedRateOnly,
  fallback,
  framed = true,
}: {
  pricing: ICRateTransactionPricing;
  currency: string;
  convertedRateOnly?: boolean;
  fallback: { saleRate: number; conversionRate: number };
  framed?: boolean;
}) {
  const slabs = pricing.slabs ?? [];
  if (slabs.length === 0) {
    return (
      <FlatRatePanel
        saleRate={pricing.saleRate ?? fallback.saleRate}
        conversionRate={pricing.conversionRate ?? fallback.conversionRate}
        currency={currency}
        convertedRateOnly={convertedRateOnly}
        caption="Flat rate"
      />
    );
  }

  return (
    <ol
      className={`space-y-0 overflow-hidden ${
        framed ? 'rounded-xl border border-slate-200 bg-white' : ''
      }`}
    >
      {slabs.map((tier, index) => {
        const isLast = index === slabs.length - 1;
        const sale = tier.saleRate > 0 ? tier.saleRate : fallback.saleRate;
        const conv = tier.conversionRate > 0 ? tier.conversionRate : fallback.conversionRate;
        return (
          <li
            key={`${tier.minUnits}-${tier.maxUnits ?? 'open'}-${index}`}
            className={`flex items-stretch gap-0 ${isLast ? '' : 'border-b border-slate-100'}`}
          >
            <div className="flex w-10 shrink-0 flex-col items-center py-3" aria-hidden>
              <span
                className={`mt-1 size-2.5 rounded-full ${
                  isLast ? 'bg-accent' : 'bg-slate-300'
                }`}
              />
              {!isLast ? <span className="mt-1 w-px flex-1 bg-slate-200" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pr-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Units
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
                  {formatUnitsRange(tier.minUnits, tier.maxUnits)}
                  {tier.maxUnits == null ? (
                    <span className="ml-1.5 text-[11px] font-medium text-slate-400">open</span>
                  ) : null}
                </p>
              </div>
              <RateValue
                saleRate={sale}
                conversionRate={conv}
                currency={currency}
                convertedRateOnly={convertedRateOnly}
                size="sm"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PerTypeGrid({
  config,
  currency,
  convertedRateOnly,
  fallback,
}: {
  config: ICRateGroupPricingConfig;
  currency: string;
  convertedRateOnly?: boolean;
  fallback: { saleRate: number; conversionRate: number };
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {IC_SALE_TRANSACTION_TYPE_OPTIONS.map(opt => {
        const pricing = config.byTransactionType?.[opt.value as ICSaleTransactionType];
        const isSlab = pricing?.mode === 'slab';

        return (
          <div
            key={opt.value}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
              <p className="text-xs font-bold text-slate-800">{opt.label}</p>
              <p className="text-[10px] font-medium text-slate-400">
                {isSlab ? 'Volume slabs' : 'Flat rate'}
              </p>
            </div>
            <div className="p-3">
              {isSlab ? (
                <SlabLadder
                  pricing={pricing ?? { mode: 'slab', slabs: [] }}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  fallback={fallback}
                  framed={false}
                />
              ) : (
                <RateValue
                  saleRate={pricing?.saleRate ?? fallback.saleRate}
                  conversionRate={pricing?.conversionRate ?? fallback.conversionRate}
                  currency={currency}
                  convertedRateOnly={convertedRateOnly}
                  size="md"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Read-only visual of a rate group's current pricing structure. */
export default function RateGroupPricingStructure({
  group,
  convertedRateOnly = false,
}: Props) {
  const fallback = getFlatRateFromGroup(group);
  const config = normalizePricingConfig(
    group.pricingConfig ?? { scope: 'all_types', kind: 'flat' },
    fallback,
  );
  const advanced = hasAdvancedPricing(config);
  const summary = getPricingSummaryLabel(config);

  return (
    <section className="space-y-3" aria-label="Current rate structure">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Rate structure
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{summary}</p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            advanced ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {advanced ? 'Advanced' : 'Simple'}
        </span>
      </div>

      {!advanced ? (
        <FlatRatePanel
          saleRate={fallback.saleRate}
          conversionRate={fallback.conversionRate}
          currency={group.currency}
          convertedRateOnly={convertedRateOnly}
          caption={`Same rate for Transfer, CDM, By Hand, and NRE`}
        />
      ) : config.scope === 'all_types' && config.kind === 'slab' && config.common ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Shared volume tiers for every transaction type.
          </p>
          <SlabLadder
            pricing={config.common}
            currency={group.currency}
            convertedRateOnly={convertedRateOnly}
            fallback={fallback}
          />
        </div>
      ) : config.scope === 'per_type' ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            {hasMixedPerTypePricing(config)
              ? 'Flat and slab rates differ by transaction type.'
              : config.kind === 'slab'
                ? 'Separate volume tiers for each transaction type.'
                : 'A different flat rate for each transaction type.'}
          </p>
          <PerTypeGrid
            config={config}
            currency={group.currency}
            convertedRateOnly={convertedRateOnly}
            fallback={fallback}
          />
        </div>
      ) : (
        <FlatRatePanel
          saleRate={fallback.saleRate}
          conversionRate={fallback.conversionRate}
          currency={group.currency}
          convertedRateOnly={convertedRateOnly}
        />
      )}
    </section>
  );
}
