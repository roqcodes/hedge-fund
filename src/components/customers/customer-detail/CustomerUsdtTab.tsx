'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsdtBuy, UsdtSell } from '@/types';
import { formatDateTime, formatMoneyValue } from '@/data/mockData';
import { tableWrap, dataTable } from '@/lib/ui';
import CustomerSubTabs from './CustomerSubTabs';

interface Props {
  slug: string;
  buys: UsdtBuy[];
  sells: UsdtSell[];
  activeCurrency: string;
}

export default function CustomerUsdtTab({ slug, buys, sells, activeCurrency }: Props) {
  const router = useRouter();
  const fmtAed = (n: number) => formatMoneyValue(n, activeCurrency as 'AED');
  const fmtUsdt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const fmtRate = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });

  const tabs = useMemo(
    () => [
      { id: 'sold', label: 'Sold to Branch', count: buys.length },
      { id: 'bought', label: 'Bought from Branch', count: sells.length },
    ],
    [buys.length, sells.length],
  );

  const defaultTab = buys.length > 0 ? 'sold' : 'bought';
  const [activeSubTab, setActiveSubTab] = useState(defaultTab);
  const subTab = tabs.some(t => t.id === activeSubTab) ? activeSubTab : defaultTab;

  if (buys.length === 0 && sells.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">No USDT activity for this customer.</p>;
  }

  return (
    <div>
      <CustomerSubTabs tabs={tabs} active={subTab} onChange={setActiveSubTab} />

      {subTab === 'sold' && (
        buys.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No USDT sold to the branch.</p>
        ) : (
          <div className={tableWrap}>
            <table className={`${dataTable} min-w-[640px] w-full`}>
              <thead>
                <tr>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">USDT</th>
                  <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate</th>
                  <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">AED Received</th>
                </tr>
              </thead>
              <tbody>
                {buys.map(buy => (
                  <tr key={buy.id} className="cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/${slug}/usdt/${buy.id}`)}>
                    <td className="border-y border-l border-black/5 bg-white px-3 py-3 text-xs first:rounded-l-2xl">{formatDateTime(buy.date).split(',')[0]}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3 text-center font-mono text-sm font-bold">{fmtUsdt(buy.usdtAmount)}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3 text-center font-mono text-sm">{fmtRate(buy.aedRate)}</td>
                    <td className="border-y border-r border-black/5 bg-white px-3 py-3 text-center font-mono text-sm font-bold last:rounded-r-2xl">{fmtAed(buy.aedTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {subTab === 'bought' && (
        sells.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No USDT bought from the branch.</p>
        ) : (
          <div className={tableWrap}>
            <table className={`${dataTable} min-w-[640px] w-full`}>
              <thead>
                <tr>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">USDT</th>
                  <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate</th>
                  <th className="px-3 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">AED Paid</th>
                </tr>
              </thead>
              <tbody>
                {sells.map(sell => (
                  <tr
                    key={sell.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => router.push(`/${slug}/usdt/${sell.id}`)}
                  >
                    <td className="border-y border-l border-black/5 bg-white px-3 py-3 text-xs first:rounded-l-2xl">{formatDateTime(sell.date).split(',')[0]}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3 text-center font-mono text-sm font-bold">{fmtUsdt(sell.usdtAmount)}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-3 text-center font-mono text-sm">{fmtRate(sell.aedRate)}</td>
                    <td className="border-y border-r border-black/5 bg-white px-3 py-3 text-center font-mono text-sm font-bold last:rounded-r-2xl">{fmtAed(sell.aedTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
