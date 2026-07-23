'use client';

import React, { useMemo } from 'react';
import type { PhysicalBuy } from '@/types';
import CustomerLink from '@/components/customers/CustomerLink';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';
import { formatPhysicalIdr, formatPhysicalAed } from '@/lib/physicalCurrencyDisplay';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import {
  DetailSummaryStack,
  DetailSummaryCard,
  DetailSummaryHeader,
  DetailSummarySplit,
  DetailSummaryPanel,
  DetailSummarySectionTitle,
  DetailPill,
  DetailMetricHighlight,
  DetailMiniMetric,
  DetailProgressBar,
  DetailUsdtMetric,
  DetailCustomerChip,
  DetailSpecCard,
  DetailSpecPanel,
  DetailSpecGrid,
  DetailSpecCell,
  DetailMetaInline,
} from '@/components/ui/DealDetailLayout';

function fmtGram(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

type Props = {
  buy: PhysicalBuy;
  branchSlug: string;
  sellCount: number;
  totalSellValueAed: number;
  totalProfitAed: number;
};

export default function PhysicalBuyDetailSummary({
  buy,
  branchSlug,
  sellCount,
  totalSellValueAed,
  totalProfitAed,
}: Props) {
  const { fmtUsdt, fmtUsdtDirect } = usePhysicalCurrency();

  const soldGram = Math.max(0, buy.grossWeight - buy.remainingWeight);
  const soldPct =
    buy.grossWeight > 0 ? Math.min(100, Math.round((soldGram / buy.grossWeight) * 100)) : 0;

  const buyValueLabel =
    buy.totalUsdt != null ? fmtUsdtDirect(buy.totalUsdt) : fmtUsdt(buy.buyValue);

  const plTone =
    totalProfitAed > 0 ? 'profit' : totalProfitAed < 0 ? 'loss' : 'neutral';

  const progressHint = useMemo(
    () => `${fmtGram(soldGram)} g sold · ${fmtGram(buy.remainingWeight)} g remaining`,
    [buy.remainingWeight, soldGram],
  );

  const costPerGramUsdt =
    buy.totalUsdt != null && buy.pureGram > 0 ? buy.totalUsdt / buy.pureGram : undefined;
  const costPerGramAed =
    buy.totalUsdt == null && buy.pureGram > 0 ? buy.buyValue / buy.pureGram : undefined;

  const dateStr = new Date(buy.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <DetailSummaryStack>
      <DetailSummaryCard ariaLabel="Buy deal summary">
        <DetailSummaryHeader
          badges={
            <>
              <DetailPill tone="buy">Buy</DetailPill>
              {buy.fixOrUnfix === 'fixed' ? <DetailPill tone="fix">Fix</DetailPill> : null}
              {buy.fixOrUnfix === 'unfixed' ? <DetailPill tone="unfix">Unfix</DetailPill> : null}
              {buy.status === 'closed' ? <DetailPill tone="closed">Closed</DetailPill> : null}
            </>
          }
          meta={
            <DetailMetaInline
              txnId={buy.txnId ? `#${buy.txnId}` : buy.id}
              date={dateStr}
            />
          }
        />

        <DetailSummarySplit>
          <DetailSummaryPanel side="left">
            <div className="flex max-sm:flex-col max-sm:gap-4 sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
              <DetailMetricHighlight
                label="Stock on deal"
                value={fmtGram(buy.remainingWeight)}
                unit="g remaining"
                valueClassName="text-amber-700"
              />
              <div className="flex gap-5 sm:gap-6">
                <DetailMiniMetric label="Purchased" value={fmtGram(buy.grossWeight)} valueClassName="text-emerald-600" align="right" />
                <DetailMiniMetric label="Sold" value={fmtGram(soldGram)} valueClassName="text-amber-600" align="right" />
              </div>
            </div>
            <DetailProgressBar label="Stock movement" pct={soldPct} hint={progressHint} />
          </DetailSummaryPanel>

          <DetailSummaryPanel side="right">
            <DetailSummarySectionTitle>Deal economics</DetailSummarySectionTitle>
            <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-6">
              <DetailUsdtMetric
                label="Buy value"
                value={
                  <>
                    {buyValueLabel}
                    <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
                  </>
                }
              />
              <DetailUsdtMetric
                label="Sold value"
                value={
                  <>
                    {fmtUsdt(totalSellValueAed)}
                    <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
                  </>
                }
                hint={`${sellCount} sell${sellCount !== 1 ? 's' : ''}`}
              />
              <DetailUsdtMetric
                label="P&L"
                tone={plTone}
                value={
                  <>
                    {fmtUsdt(totalProfitAed, true)}
                    <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
                  </>
                }
              />
            </div>
            <DetailCustomerChip
              initials={(buy.customerName ?? '?').slice(0, 2)}
              name={
                <CustomerLink
                  slug={branchSlug}
                  customerId={buy.customerId}
                  customerName={buy.customerName}
                  className="truncate"
                />
              }
              sub={buy.item || buy.particulars || undefined}
            />
          </DetailSummaryPanel>
        </DetailSummarySplit>
      </DetailSummaryCard>

      <DetailSpecCard ariaLabel="Buy deal specifications">
        <DetailSpecPanel title="Commercial">
          <DetailSpecGrid cols={3}>
            <DetailSpecCell
              label="Total value"
              value={
                <PhysicalAmountDisplay
                  usdtAmount={buy.totalUsdt}
                  aedAmount={buy.buyValue}
                  size="sm"
                  align="left"
                  showUnit={false}
                  className="!items-start !text-left"
                />
              }
            />
            <DetailSpecCell
              label="IDR value"
              value={formatPhysicalIdr(buy.tltIdrValue ?? buy.pureGram * buy.idrGram)}
              mono
            />
            <DetailSpecCell label="AED value" value={formatPhysicalAed(buy.aedAmount ?? buy.buyValue)} mono />
            <DetailSpecCell label="IDR / g" value={buy.idrGram.toLocaleString()} mono />
            <DetailSpecCell label="IDR / USDT" value={buy.idrToUsdt.toLocaleString()} mono />
            <DetailSpecCell
              label="USDT / g"
              value={buy.idrRate.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              mono
            />
            <DetailSpecCell
              label="Cost / g"
              value={
                <PhysicalAmountDisplay
                  usdtAmount={costPerGramUsdt}
                  aedAmount={costPerGramAed}
                  size="sm"
                  align="left"
                  showUnit={false}
                  className="!items-start !text-left"
                />
              }
            />
          </DetailSpecGrid>
        </DetailSpecPanel>

        <DetailSpecPanel title="Metal & inventory" bordered={false}>
          <DetailSpecGrid cols={4}>
            <DetailSpecCell label="Gross wt" value={`${fmtGram(buy.grossWeight)} g`} mono />
            <DetailSpecCell label="Pure conv" value={String(buy.pureConversion)} mono />
            <DetailSpecCell label="Pure gram" value={`${fmtGram(buy.pureGram)} g`} mono />
            <DetailSpecCell label="Remaining" value={`${fmtGram(buy.remainingWeight)} g`} mono />
          </DetailSpecGrid>
          {(buy.purity != null || buy.notes) && (
            <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
              <DetailSpecGrid cols={2}>
                {buy.purity != null ? (
                  <DetailSpecCell label="Purity" value={`${buy.purity}%`} mono />
                ) : null}
                {buy.notes ? (
                  <DetailSpecCell label="Notes" value={buy.notes} className="col-span-2" />
                ) : null}
              </DetailSpecGrid>
            </div>
          )}
        </DetailSpecPanel>
      </DetailSpecCard>
    </DetailSummaryStack>
  );
}
