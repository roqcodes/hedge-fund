'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tableWrap, dataTable } from '@/lib/ui';
import CustomerSubTabs from './CustomerSubTabs';

interface Props {
  slug: string;
  invoices: any[];
  loading?: boolean;
}

function invoiceTradeType(inv: any): 'buy' | 'sell' {
  return inv.trade_type === 'buy' ? 'buy' : 'sell';
}

function fmtInvoiceAmount(inv: { net_amt_dc?: string | number; currency?: string }) {
  const amount = parseFloat(String(inv.net_amt_dc ?? 0)) || 0;
  const currency = inv.currency || 'USD';
  if (currency === 'AED') {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function amountColumnLabel(subTab: string, rows: { currency?: string }[]) {
  const currencies = new Set(rows.map(inv => inv.currency || 'USD'));
  const currency = currencies.size === 1 ? [...currencies][0] : 'USD';
  return subTab === 'sold' ? `${currency} Received` : `${currency} Paid`;
}

export default function CustomerMarketplaceTab({ slug, invoices, loading = false }: Props) {
  const router = useRouter();

  const soldToBranch = useMemo(() => invoices.filter(inv => invoiceTradeType(inv) === 'buy'), [invoices]);
  const boughtFromBranch = useMemo(() => invoices.filter(inv => invoiceTradeType(inv) === 'sell'), [invoices]);

  const tabs = useMemo(
    () => [
      { id: 'sold', label: 'Sold to Branch', count: soldToBranch.length },
      { id: 'bought', label: 'Bought from Branch', count: boughtFromBranch.length },
    ],
    [soldToBranch.length, boughtFromBranch.length],
  );

  const defaultTab = soldToBranch.length > 0 ? 'sold' : 'bought';
  const [activeSubTab, setActiveSubTab] = useState(defaultTab);
  const subTab = tabs.some(t => t.id === activeSubTab) ? activeSubTab : defaultTab;

  const visible = subTab === 'sold' ? soldToBranch : boughtFromBranch;
  const amountLabel = amountColumnLabel(subTab, visible);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No physical invoices for this customer.</p>;
  }

  return (
    <div>
      <CustomerSubTabs tabs={tabs} active={subTab} onChange={setActiveSubTab} />

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {subTab === 'sold' ? 'No invoices where customer sold to the branch.' : 'No invoices where customer bought from the branch.'}
        </p>
      ) : (
        <div className={tableWrap}>
          <table className={`${dataTable} min-w-[720px] w-full`}>
            <thead>
              <tr>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Doc No</th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Order Type</th>
                <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">{amountLabel}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(inv => (
                <tr
                  key={inv.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/${slug}/physical?invoice=${inv.id}`)}
                >
                  <td className="border-y border-l border-black/5 bg-white px-3 py-3 text-xs font-semibold first:rounded-l-2xl">{inv.doc_no}</td>
                  <td className="border-y border-black/5 bg-white px-3 py-3 text-sm text-slate-600">
                    {inv.doc_date ? new Date(inv.doc_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="border-y border-black/5 bg-white px-3 py-3 text-center">
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{inv.order_type || '—'}</span>
                  </td>
                  <td className="border-y border-r border-black/5 bg-white px-3 py-3 text-right font-mono text-sm font-bold last:rounded-r-2xl">
                    {fmtInvoiceAmount(inv)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
