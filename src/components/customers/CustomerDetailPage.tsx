'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Customer } from '@/types';
import { useApp } from '@/context/AppContext';
import { getCustomerById } from '@/app/actions/customerActions';
import { getICFundAccountByCustomerIdAction } from '@/app/actions/icFundsActions';
import { getTaxInvoicesBySlug } from '@/app/actions/marketplaceActions';
import { formatMoneyLabel, formatMoneyValue } from '@/data/mockData';
import {
  computeMarketplaceStats,
  computePhysicalSalesStats,
  computeUsdtStats,
  filterByCustomerId,
  invoiceMatchesCustomer,
} from '@/lib/customerDetail';
import { CustomerModuleTabId, getEnabledCustomerModuleTabs } from '@/lib/customerModuleTabs';
import KPICard from '@/components/ui/KPICard';
import PhysicalSplitKPICard from '@/components/physical/PhysicalSplitKPICard';
import CustomerModal from './CustomerModal';
import CustomerPhysicalSalesTab from './customer-detail/CustomerPhysicalSalesTab';
import CustomerUsdtTab from './customer-detail/CustomerUsdtTab';
import CustomerMarketplaceTab from './customer-detail/CustomerMarketplaceTab';
import CustomerICFundsTab from './customer-detail/CustomerICFundsTab';
import TaxInvoiceModal from '@/components/marketplace/TaxInvoiceModal';
import USDTBuyModal from '@/components/usdt/USDTBuyModal';
import USDTSellModal from '@/components/usdt/USDTSellModal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { fmtICAmount } from '@/lib/icFunds/format';
import { kpiGrid, pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import type { ICFundAccount } from '@/types';

export default function CustomerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const customerId = params.customerId as string;
  const fromIcFunds = searchParams.get('from') === 'ic-funds';
  const backHref = fromIcFunds ? `/${slug}/ic-funds/accounts` : `/${slug}/customers`;
  const backLabel = fromIcFunds ? 'Back to IC Funds accounts' : 'Back to customers';
  const { branches, physicalBuys, physicalSells, usdtBuys, usdtSells, usdtSettings, refetchData, activeCurrency, icSales } = useApp();
  const { canWrite, writeBlockedReason, buttonProps: wp } = useWriteAccess();

  const branch = branches.find(b => b.slug === slug);
  const branchId = branch?.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isUsdtBuyModalOpen, setIsUsdtBuyModalOpen] = useState(false);
  const [isUsdtSellModalOpen, setIsUsdtSellModalOpen] = useState(false);
  const [icFundAccount, setIcFundAccount] = useState<ICFundAccount | null>(null);

  const presetMargin = usdtSettings.find(s => s.branchId === branchId)?.presetMargin ?? 0.002;

  const enabledTabs = useMemo(
    () => getEnabledCustomerModuleTabs(branch?.hiddenPages),
    [branch?.hiddenPages],
  );

  const [activeTab, setActiveTab] = useState<CustomerModuleTabId>('physical');

  useEffect(() => {
    if (enabledTabs.length > 0 && !enabledTabs.some(t => t.id === activeTab)) {
      setActiveTab(enabledTabs[0].id);
    }
  }, [enabledTabs, activeTab]);

  useEffect(() => {
    if (fromIcFunds && enabledTabs.some(t => t.id === 'ic-funds')) {
      setActiveTab('ic-funds');
    }
  }, [fromIcFunds, enabledTabs]);

  const loadCustomer = async () => {
    setLoading(true);
    const res = await getCustomerById(customerId, slug);
    if (res.success && res.customer) {
      setCustomer(res.customer);
      setError(null);
    } else {
      setCustomer(null);
      setError(res.error || 'Customer not found');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCustomer();
  }, [customerId, slug]);

  const showIcFundsKpi = enabledTabs.some(t => t.id === 'ic-funds');

  useEffect(() => {
    if (!showIcFundsKpi || !branchId) {
      setIcFundAccount(null);
      return;
    }
    void getICFundAccountByCustomerIdAction(branchId, customerId).then(setIcFundAccount);
  }, [branchId, customerId, showIcFundsKpi]);

  const showMarketplaceKpi = enabledTabs.some(t => t.id === 'marketplace');

  useEffect(() => {
    if (!showMarketplaceKpi || !slug) return;
    setInvoicesLoading(true);
    getTaxInvoicesBySlug(slug).then(res => {
      if (res.success && res.invoices) setInvoices(res.invoices);
      setInvoicesLoading(false);
    });
  }, [slug, showMarketplaceKpi]);

  const customerInvoices = useMemo(
    () => (customer ? invoices.filter(inv => invoiceMatchesCustomer(inv, customerId, customer.name)) : []),
    [invoices, customer, customerId],
  );

  const marketplaceStats = useMemo(
    () => computeMarketplaceStats(customerInvoices),
    [customerInvoices],
  );

  const customerBuys = useMemo(
    () => filterByCustomerId(physicalBuys.filter(b => b.branchId === branchId), customerId),
    [physicalBuys, branchId, customerId],
  );
  const customerSells = useMemo(
    () => filterByCustomerId(physicalSells, customerId).filter(s => {
      const buy = physicalBuys.find(b => b.id === s.buyId);
      return buy?.branchId === branchId;
    }),
    [physicalSells, physicalBuys, branchId, customerId],
  );
  const customerUsdtBuys = useMemo(
    () => filterByCustomerId(usdtBuys.filter(b => b.branchId === branchId), customerId),
    [usdtBuys, branchId, customerId],
  );
  const customerUsdtSells = useMemo(
    () => filterByCustomerId(usdtSells.filter(s => s.branchId === branchId), customerId),
    [usdtSells, branchId, customerId],
  );

  const physicalStats = useMemo(
    () => computePhysicalSalesStats(customerBuys, customerSells),
    [customerBuys, customerSells],
  );
  const usdtStats = useMemo(
    () => computeUsdtStats(customerUsdtBuys, customerUsdtSells),
    [customerUsdtBuys, customerUsdtSells],
  );

  const fmtAed = (n: number) => formatMoneyValue(n, activeCurrency);
  const fmtBalance = (n: number) => formatMoneyLabel(n, activeCurrency);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (error || !customer) {
    return <div className="p-8 text-center text-red-500">{error || 'Customer not found'}</div>;
  }

  const showPhysicalSalesKpi = enabledTabs.some(t => t.id === 'physical');
  const showUsdtKpi = enabledTabs.some(t => t.id === 'usdt');
  const showIcFundsTab = enabledTabs.some(t => t.id === 'ic-funds');

  const fmtUsd = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Link
              href={backHref}
              className="group flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              aria-label={backLabel}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className={pageTitle}>{customer.name}</h2>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusColor(customer.status)}`}>
              {customer.status}
            </span>
          </div>
          <p className={pageSubtitle}>
            {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'Customer profile & activity'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => canWrite && setIsEditOpen(true)}
          {...wp()}
          className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 sm:mt-0${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
          title={!canWrite ? writeBlockedReason : 'Edit customer'}
        >
          Edit Customer
        </button>
      </div>

      <div className={`${kpiGrid} mb-8`}>
        <KPICard
          label="Balance"
          value={fmtBalance(customer.balance)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          color="#f59e0b"
          bgColor="#fef3c7"
        />

        {showIcFundsKpi && icFundAccount ? (
          <KPICard
            label="IC Funds balance"
            value={fmtICAmount(icFundAccount.balance)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            }
            color="#0ea5e9"
            bgColor="#e0f2fe"
          />
        ) : null}

        {showPhysicalSalesKpi && (
          <PhysicalSplitKPICard
            top={{ label: 'Physical Deals · Sold to Branch', value: physicalStats.soldToBranchCount }}
            bottom={{ label: 'AED Received', value: fmtAed(physicalStats.totalReceivedFromBranch) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
        )}

        {showPhysicalSalesKpi && (
          <PhysicalSplitKPICard
            top={{ label: 'Physical Deals · Bought from Branch', value: physicalStats.boughtFromBranchCount }}
            bottom={{ label: 'AED Paid', value: fmtAed(physicalStats.totalPaidToBranch) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
            color="#6366f1"
            bgColor="#eef2ff"
          />
        )}

        {showMarketplaceKpi && (
          <PhysicalSplitKPICard
            top={{ label: 'Physical · Sold to Branch', value: invoicesLoading ? '…' : marketplaceStats.soldToBranchCount }}
            bottom={{ label: 'USD Received', value: invoicesLoading ? '…' : fmtUsd(marketplaceStats.soldToBranchAmountUsd) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
        )}

        {showMarketplaceKpi && (
          <PhysicalSplitKPICard
            top={{ label: 'Physical · Bought from Branch', value: invoicesLoading ? '…' : marketplaceStats.boughtFromBranchCount }}
            bottom={{ label: 'USD Paid', value: invoicesLoading ? '…' : fmtUsd(marketplaceStats.boughtFromBranchAmountUsd) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            }
            color="#6366f1"
            bgColor="#eef2ff"
          />
        )}

        {showUsdtKpi && (
          <PhysicalSplitKPICard
            top={{ label: 'USDT Sold to Branch', value: usdtStats.soldToBranchCount }}
            bottom={{ label: 'AED Received', value: fmtAed(usdtStats.totalAedReceived) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M8 10h8M8 14h8" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
        )}

        {showUsdtKpi && (
          <PhysicalSplitKPICard
            top={{ label: 'USDT Bought from Branch', value: usdtStats.boughtFromBranchCount }}
            bottom={{ label: 'AED Paid', value: fmtAed(usdtStats.totalAedPaid) }}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="#6366f1"
            bgColor="#eef2ff"
          />
        )}
      </div>

      {enabledTabs.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No activity modules are enabled for this branch.</p>
      ) : (
        <div className="md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface">
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 md:px-6">
            {enabledTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'marketplace' && showMarketplaceKpi && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Invoices open on the Physical page</p>
                <div className="flex gap-2">
                  <Link
                    href={`/${slug}/physical`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Open Physical
                  </Link>
                  <button
                    type="button"
                    onClick={() => canWrite && setIsInvoiceModalOpen(true)}
                    {...wp()}
                    className={`rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent/90${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
                  >
                    New Invoice
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'usdt' && showUsdtKpi && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">Deals open on the USDT page</p>
                <div className="flex gap-2">
                  <Link
                    href={`/${slug}/usdt`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Open USDT
                  </Link>
                  <button
                    type="button"
                    onClick={() => canWrite && setIsUsdtBuyModalOpen(true)}
                    {...wp()}
                    className={`rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
                  >
                    Buy USDT
                  </button>
                  <button
                    type="button"
                    onClick={() => canWrite && setIsUsdtSellModalOpen(true)}
                    {...wp()}
                    className={`rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-accent/90${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
                  >
                    Sell USDT
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'physical' && (
              <CustomerPhysicalSalesTab
                slug={slug}
                buys={customerBuys}
                sells={customerSells}
              />
            )}
            {activeTab === 'marketplace' && (
              <CustomerMarketplaceTab
                slug={slug}
                invoices={customerInvoices}
                loading={invoicesLoading}
              />
            )}
            {activeTab === 'usdt' && (
              <CustomerUsdtTab
                slug={slug}
                buys={customerUsdtBuys}
                sells={customerUsdtSells}
                activeCurrency={activeCurrency}
              />
            )}
            {activeTab === 'ic-funds' && showIcFundsTab && branchId ? (
              <CustomerICFundsTab
                slug={slug}
                branchId={branchId}
                customer={customer}
                icSales={icSales}
              />
            ) : null}
          </div>
        </div>
      )}

      {isEditOpen && (
        <CustomerModal
          slug={slug}
          open={isEditOpen}
          customer={customer}
          onClose={() => setIsEditOpen(false)}
          onSave={() => {
            setIsEditOpen(false);
            loadCustomer();
          }}
        />
      )}

      {isInvoiceModalOpen && customer && (
        <TaxInvoiceModal
          slug={slug}
          open={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          initialCustomer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          }}
          onSave={() => {
            setIsInvoiceModalOpen(false);
            getTaxInvoicesBySlug(slug).then(res => {
              if (res.success && res.invoices) setInvoices(res.invoices);
            });
          }}
        />
      )}

      {branchId && customer && (
        <>
          <USDTBuyModal
            open={isUsdtBuyModalOpen}
            slug={slug}
            branchId={branchId}
            initialCustomer={{ id: customer.id, name: customer.name, balance: customer.balance }}
            onClose={() => setIsUsdtBuyModalOpen(false)}
            onSuccess={() => {
              setIsUsdtBuyModalOpen(false);
              refetchData();
              loadCustomer();
            }}
          />
          <USDTSellModal
            open={isUsdtSellModalOpen}
            slug={slug}
            branchId={branchId}
            presetMargin={presetMargin}
            initialCustomer={{ id: customer.id, name: customer.name, balance: customer.balance }}
            onClose={() => setIsUsdtSellModalOpen(false)}
            onSuccess={() => {
              setIsUsdtSellModalOpen(false);
              refetchData();
              loadCustomer();
            }}
          />
        </>
      )}
    </div>
  );
}
