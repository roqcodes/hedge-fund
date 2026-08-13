'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getICFundReportBundleAction,
  getICFundStatementAction,
  listICFundAccountsAction,
} from '@/app/actions/icFundsActions';
import { accountTypeLabel, IC_FUND_VOUCHER_LABELS } from '@/lib/icFunds/constants';
import { fmtICAmount, fmtICDate } from '@/lib/icFunds/format';
import { IC_FUNDS_REPORTS, icFundsReportPath, type ICFundsReportId } from '@/lib/icFunds/nav';
import { icfCard, icfInput, icfLabel, icfTableWrap, icfTd, icfTh } from '@/components/ic-funds/ui';
import ICFundsDateFilterBar from '@/components/ic-funds/ICFundsDateFilterBar';
import { useICFundsDateFilter } from '@/components/ic-funds/useICFundsDateFilter';
import VoucherUserCell from '@/components/ic-funds/VoucherUserCell';
import { useApp } from '@/context/AppContext';
import type { ICFundAccount, ICFundStatementLine, ICFundVoucher } from '@/types';

type ReportBundle = NonNullable<
  Extract<Awaited<ReturnType<typeof getICFundReportBundleAction>>, { success: true }>['data']
>;

function AmountCell({ n, danger }: { n: number; danger?: boolean }) {
  return (
    <td className={`${icfTd} text-right font-mono tabular-nums ${danger || n < 0 ? 'text-red-600' : ''}`}>
      {n === 0 ? '—' : fmtICAmount(n)}
    </td>
  );
}

export default function BooksScreen({
  branchId,
  slug,
  reportView,
}: {
  branchId: string;
  slug: string;
  reportView: ICFundsReportId;
}) {
  const { branches } = useApp();
  const branch = branches.find(b => b.slug === slug);
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    startDate,
    endDate,
  } = useICFundsDateFilter(branch?.timezone);
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [accounts, setAccounts] = useState<ICFundAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [statement, setStatement] = useState<{
    account: ICFundAccount;
    opening: number;
    lines: ICFundStatementLine[];
    closing: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBundle = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getICFundReportBundleAction({ branchId, startDate, endDate });
    if (!result.success) {
      setError(result.error);
      setBundle(null);
    } else {
      setBundle(result.data);
    }
    setLoading(false);
  }, [branchId, startDate, endDate]);

  const loadStatement = useCallback(async () => {
    if (!accountId) {
      setStatement(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getICFundStatementAction({ branchId, accountId, startDate, endDate });
    if (!result.success) {
      setError(result.error);
      setStatement(null);
    } else {
      setStatement(result.data);
    }
    setLoading(false);
  }, [accountId, branchId, endDate, startDate]);

  useEffect(() => {
    void listICFundAccountsAction(branchId).then(setAccounts);
  }, [branchId]);

  useEffect(() => {
    if (reportView === 'statement') {
      void loadStatement();
      return;
    }
    void loadBundle();
  }, [loadBundle, loadStatement, reportView]);

  const activeLabel = IC_FUNDS_REPORTS.find(r => r.id === reportView)?.label ?? 'Reports';
  const asOfLabel = bundle?.asOfDate
    ? `Balances as of ${fmtICDate(bundle.asOfDate)}`
    : 'Balances as of today (all active vouchers)';

  const accountTable = (rows: ICFundAccount[], empty: string, showAsOf = false) => (
    <div>
      {showAsOf ? (
        <p className="border-b border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">{asOfLabel}</p>
      ) : null}
    <div className={icfTableWrap}>
      <table className="w-full min-w-[520px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={icfTh}>Account</th>
            <th className={icfTh}>Type</th>
            <th className={`${icfTh} text-right`}>Opening</th>
            <th className={`${icfTh} text-right`}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className={`${icfTd} py-6 text-center text-slate-500`}>{empty}</td></tr>
          ) : (
            rows.map(row => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className={`${icfTd} font-medium`}>{row.name}</td>
                <td className={`${icfTd} text-slate-500`}>{accountTypeLabel(row.accountType)}</td>
                <AmountCell n={row.openingBalance} />
                <AmountCell n={row.balance} />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    </div>
  );

  const voucherTable = (rows: ICFundVoucher[], empty: string) => (
    <div className={icfTableWrap}>
      <table className="w-full min-w-[680px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={icfTh}>#</th>
            <th className={icfTh}>Date</th>
            <th className={icfTh}>Type</th>
            <th className={icfTh}>Debit</th>
            <th className={icfTh}>Credit</th>
            <th className={`${icfTh} text-right`}>Amount</th>
            <th className={icfTh}>User</th>
            <th className={icfTh}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8} className={`${icfTd} py-6 text-center text-slate-500`}>{empty}</td></tr>
          ) : (
            rows.map(row => (
              <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50 ${row.status === 'void' ? 'bg-slate-50/80 text-slate-400' : ''}`}>
                <td className={`${icfTd} font-mono tabular-nums text-slate-500`}>
                  {row.voucherNo}
                  {row.status === 'void' ? <span className="ml-1 text-[10px] font-semibold uppercase text-red-500">VOID</span> : null}
                </td>
                <td className={`${icfTd} tabular-nums`}>{fmtICDate(row.voucherDate)}</td>
                <td className={icfTd}>{IC_FUND_VOUCHER_LABELS[row.voucherType]}</td>
                <td className={icfTd}>{row.debitAccountName}</td>
                <td className={icfTd}>{row.creditAccountName}</td>
                <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(row.amount)}</td>
                <td className={icfTd}><VoucherUserCell voucher={row} /></td>
                <td className={`${icfTd} max-w-[12rem] truncate text-slate-500`}>{row.notes || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const totalDr = statement?.lines.reduce((s, l) => s + l.debit, 0) ?? 0;
  const totalCr = statement?.lines.reduce((s, l) => s + l.credit, 0) ?? 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside className={`${icfCard} h-fit p-1`}>
        {IC_FUNDS_REPORTS.map(item => {
          const active = item.id === reportView;
          return (
            <Link
              key={item.id}
              href={icFundsReportPath(slug, item.id)}
              className={`block rounded-md px-2.5 py-1.5 text-sm no-underline ${
                active ? 'bg-slate-900 font-medium text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </aside>

      <div className={`${icfCard} min-w-0`}>
        <div className="border-b border-slate-200 px-3 pt-2">
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <p className="text-sm font-medium text-slate-900">{activeLabel}</p>
            {reportView === 'statement' ? (
              <div className="min-w-[12rem]">
                <label className={icfLabel} htmlFor="icf-stmt-acc">Account</label>
                <select id="icf-stmt-acc" className={icfInput} value={accountId} onChange={e => setAccountId(e.target.value)}>
                  <option value="">Select account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} · {accountTypeLabel(a.accountType)}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <ICFundsDateFilterBar
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        </div>

        {error ? <p className="px-3 py-2 text-sm text-red-600">{error}</p> : null}
        {loading && reportView !== 'statement' && !bundle ? (
          <p className={`${icfTd} py-6 text-center text-slate-500`}>Loading…</p>
        ) : null}

        {reportView === 'statement' ? (
          !accountId ? (
            <p className={`${icfTd} py-8 text-center text-slate-500`}>Choose an account to load its statement.</p>
          ) : (
            <div className={icfTableWrap}>
              <table className="w-full min-w-[760px] text-left">
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
                    <tr><td colSpan={9} className={`${icfTd} py-6 text-center text-slate-500`}>Loading…</td></tr>
                  ) : (
                    statement?.lines.map((line, i) => (
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
                            voucher={{
                              createdByName: line.userName,
                              createdAt: line.userAt ?? '',
                            }}
                          />
                        </td>
                        <td className={`${icfTd} max-w-[12rem] truncate text-slate-500`}>{line.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {statement ? (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                      <td className={icfTd} colSpan={4}>Totals</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(totalDr)}</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums text-red-600`}>{fmtICAmount(totalCr)}</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(statement.closing)}</td>
                      <td className={icfTd} />
                      <td className={icfTd} />
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )
        ) : null}

        {bundle && reportView === 'all-vouchers' ? voucherTable(bundle.allVouchers, 'No vouchers in this period.') : null}
        {bundle && reportView === 'cash-bank' ? accountTable(bundle.cashBank, 'No bank accounts yet.', true) : null}
        {bundle && reportView === 'd-expenses' ? voucherTable(bundle.dExpenses, 'No direct expenses in this period.') : null}
        {bundle && reportView === 'receivables' ? (
          <div className="grid sm:grid-cols-2">
            <p className="border-b border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 sm:col-span-2">{asOfLabel}</p>
            <div className="border-b border-slate-200 sm:border-b-0 sm:border-r">
              <p className="border-b border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">Receivables</p>
              {accountTable(bundle.receivables, 'No positive personal balances.')}
            </div>
            <div>
              <p className="border-b border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">Payables</p>
              {accountTable(bundle.payables, 'No negative personal balances.')}
            </div>
          </div>
        ) : null}
        {bundle && reportView === 'profit-loss' ? (
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Income', bundle.profitLoss.income],
                ['Profit parked', bundle.profitLoss.profit],
                ['Expense', bundle.profitLoss.expense],
                ['D-Expense', bundle.profitLoss.dExpense],
                ['Net', bundle.profitLoss.net],
              ].map(([label, value]) => (
                <tr key={String(label)} className="border-b border-slate-100">
                  <td className={`${icfTd} font-medium`}>{label}</td>
                  <td className={`${icfTd} text-right font-mono tabular-nums ${Number(value) < 0 ? 'text-red-600' : ''}`}>
                    {fmtICAmount(Number(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {bundle && reportView === 'balance-sheet' ? (
          <div>
            <p className="border-b border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">{asOfLabel}</p>
            <div className="grid md:grid-cols-2">
              <div className="border-b border-slate-200 md:border-b-0 md:border-r">
                <p className="border-b border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">Assets</p>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-slate-100"><td className={icfTd}>Cash &amp; Bank</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.bank)}</td></tr>
                    <tr className="border-b border-slate-100"><td className={icfTd}>Receivables</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.receivables)}</td></tr>
                    <tr className="bg-slate-50 font-medium"><td className={icfTd}>Total assets</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.totalAssets)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <p className="border-b border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500">Liabilities &amp; equity</p>
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-slate-100"><td className={icfTd}>Payables</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.payables)}</td></tr>
                    <tr className="border-b border-slate-100"><td className={icfTd}>Profit reserve</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.equity)}</td></tr>
                    <tr className="border-b border-slate-100"><td className={icfTd}>Accumulated P&amp;L</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.accumulatedPL)}</td></tr>
                    <tr className="bg-slate-50 font-medium"><td className={icfTd}>Total liabilities &amp; equity</td><td className={`${icfTd} text-right font-mono tabular-nums`}>{fmtICAmount(bundle.balanceSheet.totalLiabilitiesEquity)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className={`px-2.5 py-2 text-[11px] ${bundle.balanceSheet.balanced ? 'text-emerald-600' : 'text-amber-600'}`}>
              {bundle.balanceSheet.balanced
                ? 'Trial balance ties: total debits equal total credits.'
                : `Trial balance out of balance by ${fmtICAmount(
                    bundle.trialBalance.reduce((s, l) => s + l.debit, 0)
                    - bundle.trialBalance.reduce((s, l) => s + l.credit, 0),
                  )} — review opening balances or post a journal adjustment.`}
            </p>
          </div>
        ) : null}
        {bundle && reportView === 'trial-balance' ? (
          <div>
            <p className="border-b border-slate-200 px-2.5 py-1 text-[11px] text-slate-500">{asOfLabel}</p>
            <div className={icfTableWrap}>
              <table className="w-full min-w-[520px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className={icfTh}>Account</th>
                    <th className={icfTh}>Type</th>
                    <th className={`${icfTh} text-right`}>Debit</th>
                    <th className={`${icfTh} text-right`}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.trialBalance.length === 0 ? (
                    <tr><td colSpan={4} className={`${icfTd} py-6 text-center text-slate-500`}>No account balances in this snapshot.</td></tr>
                  ) : (
                    bundle.trialBalance.map(line => (
                      <tr key={line.accountId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={`${icfTd} font-medium`}>{line.accountName}</td>
                        <td className={`${icfTd} text-slate-500`}>{accountTypeLabel(line.accountType)}</td>
                        <td className={`${icfTd} text-right font-mono tabular-nums`}>{line.debit ? fmtICAmount(line.debit) : '—'}</td>
                        <td className={`${icfTd} text-right font-mono tabular-nums`}>{line.credit ? fmtICAmount(line.credit) : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {bundle.trialBalance.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                      <td className={icfTd} colSpan={2}>Totals</td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>
                        {fmtICAmount(bundle.trialBalance.reduce((s, l) => s + l.debit, 0))}
                      </td>
                      <td className={`${icfTd} text-right font-mono tabular-nums`}>
                        {fmtICAmount(bundle.trialBalance.reduce((s, l) => s + l.credit, 0))}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
