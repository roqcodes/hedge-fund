'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getICFundAccountByCustomerIdAction,
  getICFundStatementAction,
} from '@/app/actions/icFundsActions';
import VoucherUserCell from '@/components/ic-funds/VoucherUserCell';
import { IC_FUND_VOUCHER_LABELS } from '@/lib/icFunds/constants';
import { fmtICAmount, fmtICDate } from '@/lib/icFunds/format';
import { icFundsReportPath } from '@/lib/icFunds/nav';
import { dataTable, tableWrap } from '@/lib/ui';
import type { Customer, ICSale, ICFundAccount, ICFundStatementLine } from '@/types';
import CustomerSubTabs from './CustomerSubTabs';

interface Props {
  slug: string;
  branchId: string;
  customer: Customer;
  icSales: ICSale[];
}

function AmountCell({ n, danger }: { n: number; danger?: boolean }) {
  return (
    <td className={`px-3 py-2 text-right font-mono tabular-nums text-sm ${danger || n < 0 ? 'text-red-600' : ''}`}>
      {n === 0 ? '—' : fmtICAmount(n)}
    </td>
  );
}

function matchCustomerSale(sale: ICSale, customerId: string, customerName: string): boolean {
  if (sale.orderCustomerId === customerId) return true;
  if (!sale.orderCustomerId && sale.orderCustomerName?.trim() === customerName.trim()) return true;
  return false;
}

export default function CustomerICFundsTab({ slug, branchId, customer, icSales }: Props) {
  const [account, setAccount] = useState<ICFundAccount | null>(null);
  const [statement, setStatement] = useState<{
    opening: number;
    lines: ICFundStatementLine[];
    closing: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'ic-transfer'>('ledger');

  const customerSales = useMemo(
    () => icSales.filter(s => matchCustomerSale(s, customer.id, customer.name)),
    [icSales, customer.id, customer.name],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fundAccount = await getICFundAccountByCustomerIdAction(branchId, customer.id);
    setAccount(fundAccount);
    if (!fundAccount) {
      setStatement(null);
      setLoading(false);
      return;
    }
    const result = await getICFundStatementAction({ branchId, accountId: fundAccount.id });
    if (!result.success) {
      setError(result.error);
      setStatement(null);
    } else {
      setStatement({
        opening: result.data.opening,
        lines: result.data.lines,
        closing: result.data.closing,
      });
    }
    setLoading(false);
  }, [branchId, customer.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const subTabs = useMemo(
    () => [
      { id: 'ledger', label: 'Ledger', count: statement ? Math.max(0, statement.lines.length - 1) : 0 },
      { id: 'ic-transfer', label: 'IC Transfer orders', count: customerSales.length },
    ],
    [customerSales.length, statement],
  );

  const totalDr = statement?.lines.reduce((s, l) => s + l.debit, 0) ?? 0;
  const totalCr = statement?.lines.reduce((s, l) => s + l.credit, 0) ?? 0;

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="size-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!account) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        No IC Funds account linked to this customer yet.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IC Funds balance</p>
            <p className={`mt-1 font-mono text-lg font-semibold tabular-nums ${account.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {fmtICAmount(account.balance)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {account.balance > 0 ? 'Receivable from customer' : account.balance < 0 ? 'Payable to customer' : 'Settled'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Opening balance</p>
            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
              {fmtICAmount(account.openingBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account status</p>
            <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{account.status}</p>
            {account.notes ? <p className="mt-0.5 truncate text-[11px] text-slate-500">{account.notes}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={icFundsReportPath(slug, 'statement')}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Full statement report
          </Link>
          <Link
            href={icFundsReportPath(slug, 'receivables')}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Receivables & payables
          </Link>
          <Link
            href={`/${slug}/ic-funds/accounts`}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent/90"
          >
            Open IC Funds
          </Link>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

      <CustomerSubTabs
        tabs={subTabs}
        active={activeSubTab}
        onChange={id => setActiveSubTab(id as 'ledger' | 'ic-transfer')}
      />

      {activeSubTab === 'ledger' ? (
        !statement || statement.lines.length <= 1 ? (
          <p className="py-8 text-center text-sm text-slate-400">No ledger entries for this account yet.</p>
        ) : (
          <div className={tableWrap}>
            <table className={`${dataTable} min-w-[860px] w-full`}>
              <thead>
                <tr>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">#</th>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Particulars</th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Debit</th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit</th>
                  <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</th>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">User</th>
                  <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Remark</th>
                </tr>
              </thead>
              <tbody>
                {statement.lines.map((line, i) => (
                  <tr key={`${line.voucherNo}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-sm tabular-nums text-slate-600">
                      {line.date ? fmtICDate(line.date) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm tabular-nums text-slate-500">
                      {line.voucherNo || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {line.voucherNo === 0 ? 'OB' : IC_FUND_VOUCHER_LABELS[line.voucherType]}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-slate-800">{line.particulars}</td>
                    <AmountCell n={line.debit} />
                    <AmountCell n={line.credit} danger />
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-slate-800">
                      {fmtICAmount(line.balance)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <VoucherUserCell
                        voucher={{
                          createdByName: line.userName,
                          createdAt: line.userAt ?? '',
                        }}
                      />
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-sm text-slate-500">{line.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                  <td className="px-3 py-2 text-sm" colSpan={4}>
                    Totals
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{fmtICAmount(totalDr)}</td>
                  <td className="px-3 py-2 text-right font-mono text-sm tabular-nums text-red-600">
                    {fmtICAmount(totalCr)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
                    {fmtICAmount(statement.closing)}
                  </td>
                  <td className="px-3 py-2" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )
      ) : customerSales.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No IC Transfer orders for this customer.</p>
      ) : (
        <div className={tableWrap}>
          <table className={`${dataTable} min-w-[720px] w-full`}>
            <thead>
              <tr>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Order</th>
                <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Units</th>
                <th className="px-3 pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">AED</th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Order status</th>
                <th className="px-3 pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment</th>
              </tr>
            </thead>
            <tbody>
              {[...customerSales]
                .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
                .map(sale => (
                  <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-sm tabular-nums text-slate-600">
                      {sale.createdAt ? fmtICDate(sale.createdAt) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm text-slate-700">{sale.id}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">{sale.units}</td>
                    <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
                      {sale.aedAmount != null ? fmtICAmount(sale.aedAmount) : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm capitalize text-slate-600">{sale.orderStatus ?? '—'}</td>
                    <td className="px-3 py-2 text-sm capitalize text-slate-600">{sale.paymentStatus ?? '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
