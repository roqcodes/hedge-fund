'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UsdtBuy, UsdtSell } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatDateTime, formatMoneyValue } from '@/data/mockData';
import { dbDeleteUsdtBuyAction, dbDeleteUsdtSellAction } from '@/app/actions/usdtActions';
import UsdtEnteredBy from './UsdtEnteredBy';
import { pageHeader, pageTitle, pageSubtitle, btnSecondary } from '@/lib/ui';

interface Props {
  branchSlug: string;
  dealId: string;
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function isUsdtSell(deal: UsdtBuy | UsdtSell | null): deal is UsdtSell {
  return deal != null && 'profit' in deal;
}

export default function UsdtDealDetailPage({ branchSlug, dealId }: Props) {
  const router = useRouter();
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
    if (!deal || !type) return;
    const label = type === 'buy' ? 'purchase' : 'sale';
    if (!confirm(`Delete this USDT ${label}?`)) return;
    const res = type === 'buy'
      ? await dbDeleteUsdtBuyAction(dealId)
      : await dbDeleteUsdtSellAction(dealId);
    if (res.success) {
      await refetchData();
      router.push(basePath);
    } else {
      alert(res.error);
    }
  };

  if (!deal || !type) {
    return <div className="p-8 text-center text-red-500">Deal not found.</div>;
  }

  const title = type === 'buy'
    ? `Buy · ${deal.txnId || deal.id}`
    : `Sell · ${deal.txnId || deal.id}`;

  return (
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
            <h2 className={pageTitle}>{title}</h2>
          </div>
          <p className={pageSubtitle}>
            {type === 'buy' ? 'USDT purchase' : 'USDT sale'} — full deal details
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 sm:w-auto"
          >
            Delete Deal
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-surface-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">USDT Amount</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{fmtUsdt(deal.usdtAmount)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-surface-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AED Total</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{fmtAed(deal.aedTotal)}</p>
        </div>
        {isUsdtSell(deal) && (
          <div className={`rounded-2xl border p-4 shadow-surface-xs ${deal.profit >= 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Profit</p>
            <p className={`mt-1 text-xl font-extrabold tabular-nums ${deal.profit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
              {deal.profit > 0 ? '+' : ''}{fmtAed(deal.profit)}
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-surface-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</p>
          <p className="mt-1 text-xl font-extrabold capitalize text-slate-900">{type}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-surface-xs">
        <h3 className="mb-4 text-sm font-bold text-slate-800">Deal Details</h3>
        <div className="grid grid-cols-2 gap-y-4 gap-x-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <DetailField label="Txn ID" value={deal.txnId || '—'} />
          <DetailField label="Date & Time" value={formatDateTime(deal.date)} />
          <DetailField label="Customer" value={deal.customerName || '—'} />
          <DetailField label="Wallet ID" value={deal.walletId ? <span className="font-mono">{deal.walletId}</span> : '—'} />
          <DetailField
            label="Opening Balance"
            value={deal.openingBalance != null ? fmtAed(deal.openingBalance) : '—'}
          />
          <DetailField label="USDT Amount" value={fmtUsdt(deal.usdtAmount)} />
          {type === 'buy' ? (
            <>
              <DetailField label="AED Rate" value={fmtRate(deal.aedRate)} />
              <DetailField label="Ser Charge" value={deal.serviceCharge > 0 ? fmtAed(deal.serviceCharge) : '—'} />
            </>
          ) : isUsdtSell(deal) ? (
            <>
              <DetailField label="Cost" value={fmtRate(deal.cost)} />
              <DetailField label="Margin" value={fmtRate(deal.margin)} />
              <DetailField label="AED Rate" value={fmtRate(deal.aedRate)} />
              <DetailField label="Ser Charge" value={deal.serviceCharge > 0 ? fmtAed(deal.serviceCharge) : '—'} />
              <DetailField
                label="Profit"
                value={<span className={deal.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{fmtAed(deal.profit)}</span>}
              />
            </>
          ) : null}
          <DetailField label="AED Total" value={fmtAed(deal.aedTotal)} />
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Entered By</p>
            <UsdtEnteredBy deal={deal} className="w-auto" />
          </div>
          {deal.notes ? (
            <div className="col-span-2 sm:col-span-3 lg:col-span-5">
              <DetailField label="Notes" value={deal.notes} />
            </div>
          ) : null}
        </div>
      </div>


    </div>
  );
}
