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
  DetailHero,
  DetailBadge,
  DetailSection,
  DetailField,
  DetailMetaRow,
  DetailPartyCard,
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
  const heroAccent = type === 'buy' ? 'indigo' : profitPositive ? 'emerald' : profitNegative ? 'red' : 'slate';

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
              <h2 className={pageTitle}>
                USDT {type === 'buy' ? 'Purchase' : 'Sale'}
              </h2>
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
              className={`w-full sm:w-auto rounded-full${!canWrite ? ' cursor-not-allowed opacity-50 hover:bg-red-50' : ''}`}
              {...wp()}
            />
          </div>
        </div>

        <div className="space-y-5">
          <DetailHero
            eyebrow="USDT amount"
            title={`${fmtUsdt(deal.usdtAmount)} USDT`}
            subtitle={fmtAed(deal.aedTotal)}
            badge={
              <DetailBadge tone={type === 'buy' ? 'info' : profitPositive ? 'success' : profitNegative ? 'danger' : 'neutral'}>
                {type === 'buy' ? 'Buy' : profitPositive ? 'In profit' : profitNegative ? 'Loss' : 'Sell'}
              </DetailBadge>
            }
            accent={heroAccent}
          />

          <DetailPartyCard
            label="Customer"
            name={
              <CustomerLink
                slug={branchSlug}
                customerId={deal.customerId}
                customerName={deal.customerName}
              />
            }
            sub={deal.walletId ? `Wallet ${deal.walletId}` : undefined}
          />

          {isSell && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className={`rounded-xl border p-4 ${deal.profit >= 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60'}`}>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Profit</p>
                <p className={`mt-1 font-mono text-xl font-black tabular-nums ${deal.profit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                  {deal.profit > 0 ? '+' : ''}{fmtAed(deal.profit)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cost rate</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-800">{fmtRate(deal.cost)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Margin</p>
                <p className="mt-1 font-mono text-lg font-bold text-slate-800">{fmtRate(deal.margin)}</p>
              </div>
            </div>
          )}

          <DetailSection title="Pricing">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-surface-xs sm:grid-cols-3 md:grid-cols-4">
              <DetailField label="AED rate" value={fmtRate(deal.aedRate)} mono />
              <DetailField label="AED total" value={fmtAed(deal.aedTotal)} mono />
              <DetailField label="USDT amount" value={fmtUsdt(deal.usdtAmount)} mono />
              <DetailField
                label="Service charge"
                value={deal.serviceCharge > 0 ? fmtAed(deal.serviceCharge) : '—'}
                mono
              />
              {type === 'buy' ? null : isSell ? (
                <DetailField
                  label="Profit"
                  value={
                    <span className={deal.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                      {fmtAed(deal.profit)}
                    </span>
                  }
                  mono
                />
              ) : null}
            </div>
          </DetailSection>

          <DetailSection title="Record info">
            <DetailMetaRow
              items={[
                { label: 'Txn ID', value: deal.txnId || '—', mono: true },
                { label: 'Date', value: formatDateTime(deal.date) },
                {
                  label: 'Opening balance',
                  value: deal.openingBalance != null ? fmtAed(deal.openingBalance) : '—',
                  mono: true,
                },
                {
                  label: 'Entered by',
                  value: <UsdtEnteredBy deal={deal} className="w-auto text-xs font-bold" />,
                },
              ]}
            />
          </DetailSection>

          {deal.notes ? (
            <DetailSection title="Notes">
              <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {deal.notes}
              </p>
            </DetailSection>
          ) : null}
        </div>
      </div>
      <Dialog />
    </>
  );
}
