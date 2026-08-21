'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getICFundAccountDetailAction } from '@/app/actions/icFundsActions';
import ICFundAccountModal from '@/components/ic-funds/ICFundAccountModal';
import { ICFBarChart, ICFKpiGrid, ICFRankingList, ICFTrendChart } from '@/components/ic-funds/ICFCharts';
import VoucherUserCell from '@/components/ic-funds/VoucherUserCell';
import {
  icfBtnOutline,
  icfBtnPrimary,
  icfCard,
  icfTableWrap,
  icfTd,
  icfTh,
} from '@/components/ic-funds/ui';
import {
  accountDetailKpis,
  accountSourceLabel,
  type ICFundAccountDetail,
} from '@/lib/icFunds/accountDetailAnalytics';
import { accountTypeLabel, IC_FUND_VOUCHER_LABELS } from '@/lib/icFunds/constants';
import { fmtICAmount, fmtICDate } from '@/lib/icFunds/format';
import { icFundsReportPath } from '@/lib/icFunds/nav';
import { useApp } from '@/context/AppContext';
import { useWriteAccess } from '@/context/RbacWriteContext';
import type { ICFundAccountType, ICFundStatementLine } from '@/types';

type TabId = 'ledger' | 'vouchers' | 'related';

function AmountCell({ n, danger }: { n: number; danger?: boolean }) {
  return (
    <td className={`${icfTd} text-right font-mono tabular-nums ${danger || n < 0 ? 'text-red-600' : ''}`}>
      {n === 0 ? '—' : fmtICAmount(n)}
    </td>
  );
}

function trendLabels(accountType: ICFundAccountType): { title: string; debit: string; credit: string } {
  if (accountType === 'bank') {
    return { title: 'Monthly cash in vs out', debit: 'Inflow', credit: 'Outflow' };
  }
  if (accountType === 'income') {
    return { title: 'Monthly income movement', debit: 'Reversals', credit: 'Credits' };
  }
  if (accountType === 'expense' || accountType === 'd_expense') {
    return { title: 'Monthly expense movement', debit: 'Charges', credit: 'Reversals' };
  }
  return { title: 'Monthly debits vs credits', debit: 'Debit', credit: 'Credit' };
}

function voucherBreakdownTitle(accountType: ICFundAccountType): string {
  if (accountType === 'bank') return 'Voucher mix (amount)';
  return 'Entries by voucher type';
}

function StatementTable({ lines, loading }: { lines: ICFundStatementLine[]; loading?: boolean }) {
  const totalDr = lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = lines.reduce((s, l) => s + l.credit, 0);
  const closing = lines.length > 0 ? lines[lines.length - 1].balance : 0;

  return (
    <div className={icfTableWrap}>
      <table className="w-full min-w-[860px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={icfTh}>Date</th>
            <th className={icfTh}>#</th>
            <th className={icfTh}>Type</th>
            <th className={icfTh}>Particulars</th>
            <th className={`${icfTh} text-right`}>Debit</th>
            <th className={`${icfTh} text-right`}>Credit</th>
            <th className={`${icfTh} text-right`}>Balance</th>
            <th className={icfTh}>User</th>
            <th className={icfTh}>Remark</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9} className={`${icfTd} py-6 text-center text-slate-500`}>
                Loading…
              </td>
            </tr>
          ) : lines.length === 0 ? (
            <tr>
              <td colSpan={9} className={`${icfTd} py-6 text-center text-slate-500`}>
                No ledger entries yet.
              </td>
            </tr>
          ) : (
            lines.map((line, i) => (
              <tr key={`${line.voucherNo}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                <td className={`${icfTd} tabular-nums`}>{line.date ? fmtICDate(line.date) : '—'}</td>
                <td className={`${icfTd} font-mono tabular-nums text-slate-500`}>{line.voucherNo || '—'}</td>
                <td className={icfTd}>{line.voucherNo === 0 ? 'OB' : IC_FUND_VOUCHER_LABELS[line.voucherType]}</td>
                <td className={`${icfTd} font-medium`}>{line.particulars}</td>
                <AmountCell n={line.debit} />
                <AmountCell n={line.credit} danger />
                <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(line.balance)}</td>
                <td className={icfTd}>
                  <VoucherUserCell
                    voucher={{ createdByName: line.userName, createdAt: line.userAt ?? '' }}
                  />
                </td>
                <td className={`${icfTd} max-w-[12rem] truncate text-slate-500`}>{line.notes || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
        {lines.length > 0 ? (
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-medium">
              <td className={icfTd} colSpan={4}>
                Totals
              </td>
              <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(totalDr)}</td>
              <td className={`${icfTd} text-right font-mono tabular-nums text-red-600`}>{fmtICAmount(totalCr)}</td>
              <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(closing)}</td>
              <td className={icfTd} colSpan={2} />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

export default function AccountDetailScreen() {
  const params = useParams();
  const slug = params.slug as string;
  const accountId = params.accountId as string;
  const { branches, showToast } = useApp();
  const { canWrite, buttonProps } = useWriteAccess();

  const branch = branches.find(b => b.slug === slug);
  const branchId = branch?.id;

  const [detail, setDetail] = useState<ICFundAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('ledger');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    const result = await getICFundAccountDetailAction({ branchId, accountId });
    if (!result.success) {
      setDetail(null);
      setError(result.error);
    } else {
      setDetail(result.data);
    }
    setLoading(false);
  }, [branchId, accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasRelated = Boolean(detail?.relatedPurchases?.length || detail?.relatedSales?.length);

  const tabs = useMemo(() => {
    const items: Array<{ id: TabId; label: string; count?: number }> = [
      { id: 'ledger', label: 'Ledger', count: Math.max(0, (detail?.statement.lines.length ?? 1) - 1) },
      { id: 'vouchers', label: 'Vouchers', count: detail?.vouchers.length ?? 0 },
    ];
    if (hasRelated) {
      items.push({
        id: 'related',
        label: detail?.relatedPurchases ? 'Purchases' : 'Sales',
        count: (detail?.relatedPurchases?.length ?? detail?.relatedSales?.length) ?? 0,
      });
    }
    return items;
  }, [detail, hasRelated]);

  if (!branchId) {
    return <p className="text-sm text-slate-500">Branch not found.</p>;
  }

  if (loading && !detail) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="size-7 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className={icfCard}>
        <p className={`${icfTd} py-8 text-center text-red-600`}>{error || 'Account not found'}</p>
        <div className="border-t border-slate-200 px-3 py-2">
          <Link href={`/${slug}/ic-funds/accounts`} className={icfBtnOutline}>
            Back to accounts
          </Link>
        </div>
      </div>
    );
  }

  const { account, statement, stats, vouchers, relatedPurchases, relatedSales, relatedMeta } = detail;
  const sourceLabel = accountSourceLabel(account.sourceType);
  const trend = trendLabels(account.accountType);
  const kpis = accountDetailKpis(account.accountType, stats, account.balance, account.openingBalance);
  const voucherChartData = stats.voucherTypeBreakdown.map(v => ({
    label: IC_FUND_VOUCHER_LABELS[v.type].replace(/s$/, ''),
    value: v.amount,
  }));

  return (
    <div className="space-y-2">
      <div className={icfCard}>
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <div className="flex min-w-0 items-start gap-2">
            <Link
              href={`/${slug}/ic-funds/accounts`}
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Back to accounts"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-slate-900">{account.name}</h2>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  {accountTypeLabel(account.accountType)}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${
                    account.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {account.status}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {[sourceLabel, account.phone, account.email].filter(Boolean).join(' · ') || 'IC Funds account'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <Link href={icFundsReportPath(slug, 'statement')} className={icfBtnOutline}>
              Statement report
            </Link>
            {canWrite ? (
              <button
                type="button"
                className={icfBtnPrimary}
                {...buttonProps()}
                onClick={() => setIsEditOpen(true)}
              >
                Edit
              </button>
            ) : null}
          </div>
        </div>

        {(account.notes || relatedMeta?.stock != null || relatedMeta?.commission != null) && (
          <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
            {account.notes ? (
              <div className="bg-white px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">Notes</p>
                <p className="mt-0.5 text-sm text-slate-800">{account.notes}</p>
              </div>
            ) : null}
            {relatedMeta?.stock != null ? (
              <div className="bg-white px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">Warehouse stock</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{relatedMeta.stock} units</p>
              </div>
            ) : null}
            {relatedMeta?.commission != null ? (
              <div className="bg-white px-3 py-2">
                <p className="text-[11px] font-medium text-slate-500">Supplier commission</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{relatedMeta.commission}%</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <ICFKpiGrid items={kpis} />

      <div className="grid gap-2 lg:grid-cols-2">
        <ICFTrendChart
          data={stats.monthlyTrend}
          title={trend.title}
          debitLabel={trend.debit}
          creditLabel={trend.credit}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <ICFBarChart data={voucherChartData} title={voucherBreakdownTitle(account.accountType)} />
          <ICFRankingList title="Top counterparties" data={stats.topCounterparties} />
        </div>
      </div>

      <div className={icfCard}>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 pt-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tab.count != null ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>

        {activeTab === 'ledger' ? (
          <StatementTable lines={statement.lines} loading={loading} />
        ) : null}

        {activeTab === 'vouchers' ? (
          <div className={icfTableWrap}>
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={icfTh}>Date</th>
                  <th className={icfTh}>#</th>
                  <th className={icfTh}>Type</th>
                  <th className={icfTh}>Counterparty</th>
                  <th className={`${icfTh} text-right`}>Amount</th>
                  <th className={`${icfTh} text-right`}>Dr/Cr</th>
                  <th className={icfTh}>Ref</th>
                  <th className={icfTh}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`${icfTd} py-6 text-center text-slate-500`}>
                      No vouchers yet.
                    </td>
                  </tr>
                ) : (
                  vouchers.map(v => {
                    const isDebit = v.debitAccountId === account.id;
                    const counterparty = isDebit ? v.creditAccountName : v.debitAccountName;
                    return (
                      <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={`${icfTd} tabular-nums`}>{fmtICDate(v.voucherDate)}</td>
                        <td className={`${icfTd} font-mono tabular-nums text-slate-500`}>{v.voucherNo}</td>
                        <td className={icfTd}>{IC_FUND_VOUCHER_LABELS[v.voucherType]}</td>
                        <td className={`${icfTd} font-medium`}>{counterparty}</td>
                        <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(v.amount)}</td>
                        <td className={`${icfTd} text-right text-slate-500`}>{isDebit ? 'Dr' : 'Cr'}</td>
                        <td className={`${icfTd} font-mono text-[11px] text-slate-500`}>
                          {v.referenceType && v.referenceId ? `${v.referenceType}:${v.referenceId.slice(0, 8)}` : '—'}
                        </td>
                        <td className={`${icfTd} max-w-[12rem] truncate text-slate-500`}>{v.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'related' && relatedPurchases ? (
          <div className={icfTableWrap}>
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={icfTh}>Date</th>
                  <th className={icfTh}>Purchase</th>
                  <th className={icfTh}>Warehouse</th>
                  <th className={`${icfTh} text-right`}>Units</th>
                  <th className={`${icfTh} text-right`}>AED</th>
                  <th className={icfTh}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {relatedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`${icfTd} py-6 text-center text-slate-500`}>
                      No IC Transfer purchases.
                    </td>
                  </tr>
                ) : (
                  relatedPurchases.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`${icfTd} tabular-nums`}>{p.date ? fmtICDate(p.date) : '—'}</td>
                      <td className={`${icfTd} font-mono text-[11px]`}>{p.id.slice(0, 8)}…</td>
                      <td className={icfTd}>{p.warehouseName || '—'}</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>{p.units}</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(p.aedAmount)}</td>
                      <td className={`${icfTd} capitalize text-slate-500`}>{p.paymentMethod || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeTab === 'related' && relatedSales ? (
          <div className={icfTableWrap}>
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className={icfTh}>Date</th>
                  <th className={icfTh}>Order</th>
                  <th className={icfTh}>Customer</th>
                  <th className={`${icfTh} text-right`}>Units</th>
                  <th className={`${icfTh} text-right`}>AED</th>
                  <th className={icfTh}>Order</th>
                  <th className={icfTh}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {relatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`${icfTd} py-6 text-center text-slate-500`}>
                      No IC Transfer sales.
                    </td>
                  </tr>
                ) : (
                  relatedSales.map(s => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`${icfTd} tabular-nums`}>{s.date ? fmtICDate(s.date) : '—'}</td>
                      <td className={`${icfTd} font-mono text-[11px]`}>{s.id.slice(0, 8)}…</td>
                      <td className={icfTd}>{s.customerName || '—'}</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>{s.units}</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(s.aedAmount)}</td>
                      <td className={`${icfTd} capitalize text-slate-500`}>{s.orderStatus || '—'}</td>
                      <td className={`${icfTd} capitalize text-slate-500`}>{s.paymentStatus || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {isEditOpen ? (
        <ICFundAccountModal
          branchId={branchId}
          open={isEditOpen}
          account={account}
          onClose={() => setIsEditOpen(false)}
          onSave={() => {
            setIsEditOpen(false);
            showToast('Account updated', 'success');
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
