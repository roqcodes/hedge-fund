'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UsdtBuy, UsdtSell } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatDateTime, formatMoneyValue } from '@/data/mockData';
import { dbDeleteUsdtBuyAction, dbDeleteUsdtSellAction } from '@/app/actions/usdtActions';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { DeleteButton } from '@/components/ui/DeleteActions';
import UsdtEnteredBy from './UsdtEnteredBy';
import CustomerLink from '@/components/customers/CustomerLink';
import { pageHeader, pageTitle, pageSubtitle } from '@/lib/ui';
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
  DetailUsdtMetric,
  DetailCustomerChip,
  DetailSpecCard,
  DetailSpecPanel,
  DetailSpecGrid,
  DetailSpecCell,
  DetailMetaInline,
} from '@/components/ui/DealDetailLayout';

interface Props {
  branchSlug: string;
  dealId: string;
}

function isUsdtSell(deal: UsdtBuy | UsdtSell | null): deal is UsdtSell {
  return deal != null && 'profit' in deal;
}

export default function UsdtDealDetailPage({ branchSlug, dealId }: Props) {
  const router = useRouter();
  const { canWrite, buttonProps: wp } = useWriteAccess();
  const { confirm, alert, Dialog } = useConfirmDialog();
  const { usdtBuys, usdtSells, refetchData, activeCurrency } = useApp();
  const basePath = `/${branchSlug}/usdt`;

  const buy = usdtBuys.find(b => b.id === dealId) ?? null;
  const sell = usdtSells.find(s => s.id === dealId) ?? null;
  const deal = buy ?? sell;
  const type = buy ? 'buy' : sell ? 'sell' : null;

  const fmtAed = (n: number) => formatMoneyValue(n, activeCurrency);
  const fmtUsdt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  const fmtRate = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });

  const handleDelete = async () => {
    if (!canWrite) return;
    if (!deal || !type) return;
    const label = type === 'buy' ? 'purchase' : 'sale';
    const ok = await confirm({
      title: `Delete USDT ${label}?`,
      message: 'This will reverse branch USDT balance, customer balance, and remove the linked fund ledger entry.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const res = type === 'buy'
      ? await dbDeleteUsdtBuyAction(dealId)
      : await dbDeleteUsdtSellAction(dealId);
    if (res.success) {
      router.push(basePath);
      void refetchData();
    } else {
      await alert({ title: 'Delete failed', message: res.error ?? 'Could not delete deal.' });
    }
  };

  if (!deal || !type) {
    return <div className="p-8 text-center text-red-500">Deal not found.</div>;
  }

  const isSell = isUsdtSell(deal);
  const profitPositive = isSell && deal.profit > 0;
  const profitNegative = isSell && deal.profit < 0;
  const plTone = profitPositive ? 'profit' : profitNegative ? 'loss' : 'neutral';

  const dateParts = formatDateTime(deal.date).split(',');

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Link
                href={basePath}
                className="group flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                aria-label="Back to USDT"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <h2 className={pageTitle}>USDT {type === 'buy' ? 'Purchase' : 'Sale'}</h2>
            </div>
            <p className={pageSubtitle}>
              {deal.txnId ? `#${deal.txnId}` : deal.id} · {formatDateTime(deal.date)}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <DeleteButton
              onClick={() => void handleDelete()}
              label="Delete deal"
              disabled={!canWrite}
              className={`w-full sm:w-auto${!canWrite ? ' cursor-not-allowed opacity-50 hover:bg-red-50' : ''}`}
              {...wp()}
            />
          </div>
        </div>

        <DetailSummaryStack>
          <DetailSummaryCard ariaLabel="USDT deal summary">
            <DetailSummaryHeader
              badges={
                <>
                  <DetailPill tone="usdt">USDT</DetailPill>
                  <DetailPill tone={type === 'buy' ? 'buy' : 'sell'}>
                    {type === 'buy' ? 'Purchase' : 'Sale'}
                  </DetailPill>
                  {profitPositive ? <DetailPill tone="profit">In profit</DetailPill> : null}
                  {profitNegative ? <DetailPill tone="loss">Loss</DetailPill> : null}
                </>
              }
              meta={
                <DetailMetaInline
                  txnId={deal.txnId ? `#${deal.txnId}` : deal.id}
                  date={dateParts[0]?.trim()}
                />
              }
            />

            <DetailSummarySplit>
              <DetailSummaryPanel side="left">
                <DetailMetricHighlight
                  label="USDT amount"
                  value={fmtUsdt(deal.usdtAmount)}
                  unit="USDT"
                  valueClassName="text-teal-700"
                />
                <p className="mt-3 text-sm font-semibold text-slate-600">
                  ≈ {fmtAed(deal.aedTotal)} AED equivalent
                </p>
                {isSell && (
                  <div className="mt-4 flex gap-5 sm:gap-6">
                    <DetailMiniMetric label="Cost rate" value={fmtRate(deal.cost)} align="left" />
                    <DetailMiniMetric label="Margin" value={fmtRate(deal.margin)} align="left" />
                  </div>
                )}
              </DetailSummaryPanel>

              <DetailSummaryPanel side="right">
                <DetailSummarySectionTitle>Deal economics</DetailSummarySectionTitle>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-x-6">
                  <DetailUsdtMetric label="AED rate" value={fmtRate(deal.aedRate)} />
                  <DetailUsdtMetric label="AED total" value={fmtAed(deal.aedTotal)} />
                  {isSell ? (
                    <DetailUsdtMetric
                      label="Profit"
                      tone={plTone}
                      value={fmtAed(deal.profit)}
                    />
                  ) : (
                    <DetailUsdtMetric
                      label="Service charge"
                      value={deal.serviceCharge > 0 ? fmtAed(deal.serviceCharge) : '—'}
                    />
                  )}
                </div>
                <DetailCustomerChip
                  initials={(deal.customerName ?? '?').slice(0, 2)}
                  name={
                    <CustomerLink slug={branchSlug} customerId={deal.customerId} customerName={deal.customerName} />
                  }
                  sub={deal.walletId ? `Wallet ${deal.walletId}` : undefined}
                />
              </DetailSummaryPanel>
            </DetailSummarySplit>
          </DetailSummaryCard>

          <DetailSpecCard ariaLabel="USDT deal details">
            <DetailSpecPanel title="Pricing">
              <DetailSpecGrid cols={3}>
                <DetailSpecCell label="AED rate" value={fmtRate(deal.aedRate)} mono />
                <DetailSpecCell label="AED total" value={fmtAed(deal.aedTotal)} mono />
                <DetailSpecCell label="USDT amount" value={fmtUsdt(deal.usdtAmount)} mono />
                <DetailSpecCell
                  label="Service charge"
                  value={deal.serviceCharge > 0 ? fmtAed(deal.serviceCharge) : '—'}
                  mono
                />
                {isSell ? (
                  <>
                    <DetailSpecCell label="Cost rate" value={fmtRate(deal.cost)} mono />
                    <DetailSpecCell
                      label="Profit"
                      value={
                        <span className={deal.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {fmtAed(deal.profit)}
                        </span>
                      }
                      mono
                    />
                    <DetailSpecCell label="Margin" value={fmtRate(deal.margin)} mono />
                  </>
                ) : null}
              </DetailSpecGrid>
            </DetailSpecPanel>

            <DetailSpecPanel title="Record info" bordered={false}>
              <DetailSpecGrid cols={2}>
                <DetailSpecCell label="Txn ID" value={deal.txnId || '—'} mono />
                <DetailSpecCell label="Date" value={formatDateTime(deal.date)} />
                <DetailSpecCell
                  label="Opening balance"
                  value={deal.openingBalance != null ? fmtAed(deal.openingBalance) : '—'}
                  mono
                />
                <DetailSpecCell
                  label="Entered by"
                  value={<UsdtEnteredBy deal={deal} className="w-auto text-xs font-bold" />}
                />
              </DetailSpecGrid>
              {deal.notes ? (
                <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                  <DetailSpecCell label="Notes" value={deal.notes} />
                </div>
              ) : null}
            </DetailSpecPanel>
          </DetailSpecCard>
        </DetailSummaryStack>
      </div>
      <Dialog />
    </>
  );
}
