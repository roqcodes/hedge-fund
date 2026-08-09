'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr, formatDateTime } from '@/data/mockData';
import { badgeClass } from '@/lib/badgeClass';
import KPICard from '@/components/ui/KPICard';
import EditDealModal from './EditDealModal';
import DealInvestorAssignmentModal from './DealInvestorAssignmentModal';
import DealStaffAssignmentModal from './DealStaffAssignmentModal';
import DealTransactionsTable from './DealTransactionsTable';
import CreateDealShellModal from './CreateDealShellModal';
import { useDateFilter } from '@/hooks/useDateFilter';
import { useDealWriteAccess } from '@/hooks/useDealWriteAccess';
import { useInvestorPortalView } from '@/hooks/useInvestorPortalView';
import { investorDealShareRatio, investorTotalBuyInvestment } from '@/lib/investorDealMetrics';
import ReadOnlyPill from '@/components/rbac/ReadOnlyPill';
import { hasFullBranchAccess } from '@/lib/rbac';
import DateFilterBar from '@/components/ui/DateFilterBar';
import Modal from '@/components/ui/Modal';
import { DealTransaction, type DealInvestor, type DealStaffAssignment } from '@/types';
import {
  pageHeader,
  pageSubtitle,
  pageTitle,
  btnPrimary,
  btnSecondary,
  kpiGrid,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function DealDetails({ dealId }: { dealId: string }) {
  const { deals, investors, selectInvestor, dealTransactions, deleteDealTransaction, currentSlug, isInitialLoading, updateDeal, user } = useApp();
  const params = useParams();
  const branchSlug = params?.branchSlug as string;
  const groupBasePath = useMemo(
    () => branchSlug ? `/group/${branchSlug}` : (currentSlug && currentSlug !== 'superadmin' ? `/${currentSlug}/group` : '/group'),
    [branchSlug, currentSlug],
  );
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  const [selectedTxn, setSelectedTxn] = useState<DealTransaction | null>(null);

  const deal = deals.find(d => d.id === dealId);
  const { canWrite, buttonProps: wp } = useDealWriteAccess(dealId);
  const { isInvestorView, investorId } = useInvestorPortalView();
  const canAssignStaff = hasFullBranchAccess(user);
  const branchSlugForStaff = branchSlug || (currentSlug && currentSlug !== 'superadmin' ? currentSlug : undefined);

  const handleSaveInvestors = async (nextInvestors: DealInvestor[]) => {
    if (!deal) return;
    updateDeal({
      ...deal,
      investors: nextInvestors,
      totalInvestment: deal.amount,
      balance: 0,
    });
  };

  const handleSaveStaff = async (nextStaff: DealStaffAssignment[]) => {
    if (!deal) return;
    updateDeal({
      ...deal,
      staffAssignments: nextStaff,
    });
  };

  useEffect(() => {
    if (isInitialLoading || deal) {
      redirectedRef.current = false;
      return;
    }
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(groupBasePath);
  }, [deal, isInitialLoading, router, groupBasePath]);

  const fundingPercentage = Math.min(((deal?.totalInvestment || 0) / (deal?.amount || 1)) * 100, 100);

  const transactionsForThisDeal = dealTransactions.filter(t => t.dealId === deal?.id);

  const {
    dateFilter, setDateFilter,
    customStartDate, setCustomStartDate,
    customEndDate, setCustomEndDate,
    filteredData: filteredTransactions
  } = useDateFilter(transactionsForThisDeal);

  const numberOfDeals = filteredTransactions.length;
  const completedDeals = filteredTransactions.filter(t => t.grossProfit !== undefined && t.grossProfit !== null && t.grossProfit !== 0).length;
  const onTransitDeals = numberOfDeals - completedDeals;
  const unsettledTransactions = filteredTransactions.filter(t => t.fixOrUnfix === 'unfixed');
  const dealGoldVolume = Number(unsettledTransactions.reduce((sum, t) => sum + (t.weight || 0), 0).toFixed(2)).toString();
  const dealCurrencyVolume = Number(unsettledTransactions.reduce((sum, t) => sum + (t.currencyAmount || 0), 0).toFixed(2)).toString();

  const filteredTotalPL = filteredTransactions.length > 0
    ? filteredTransactions.reduce((sum, txn) => sum + (isInvestorView ? (txn.myPayoutAmount || 0) : (txn.grossProfit || 0)), 0)
    : (isInvestorView ? 0 : (deal?.totalPL || 0));

  const filteredTotalExpense = isInvestorView
    ? 0
    : filteredTransactions.length > 0
    ? filteredTransactions.reduce((sum, txn) => sum + (Number(txn.expenses) || 0), 0)
    : 0;

  const investorShare = investorDealShareRatio(deal);
  const myBuyInvestmentTotal = isInvestorView
    ? investorTotalBuyInvestment(filteredTransactions, investorShare)
    : 0;
  const unsettledCost = unsettledTransactions.reduce((sum, t) => sum + (t.pureCostAed || 0), 0);
  const groupCapital = isInvestorView
    ? myBuyInvestmentTotal
    : (deal?.amount || 0) - unsettledCost;

  // Calculate total management profit and investor payouts dynamically using snapshot payouts
  const profitDistributions = React.useMemo(() => {
    let totalManagement = 0;
    const investorTotals: Record<string, number> = {};

    // Initialize all current deal investors with 0 to ensure they appear in the UI
    if (deal && deal.investors) {
      deal.investors.forEach(inv => {
        investorTotals[inv.investorId] = 0;
      });
    }

    filteredTransactions.forEach(txn => {
      const mProfit = txn.managementProfit || 0;
      totalManagement += mProfit;

      // Use snapshotted payouts if available (for fixed deals)
      if (txn.payouts && txn.payouts.length > 0) {
        txn.payouts.forEach(p => {
          investorTotals[p.investorId] = (investorTotals[p.investorId] || 0) + p.payoutAmount;
        });
      }
    });

    return {
      totalManagement,
      investorTotals,
    };
  }, [deal, filteredTransactions]);

  const totalAibakProfit = profitDistributions.totalManagement;

  // Build a unified list of investors: current group members + anyone who has historical payouts
  const displayInvestors = React.useMemo(() => {
    const map = new Map<string, { id: string, name: string, amount: number, isHistoricalOnly: boolean }>();
    
    // Add current investors
    if (deal && deal.investors) {
      deal.investors.forEach(inv => {
        map.set(inv.investorId, {
          id: inv.investorId,
          name: investors.find(i => i.id === inv.investorId)?.name || inv.investorName,
          amount: inv.amount,
          isHistoricalOnly: false
        });
      });
    }

    // Add historical investors who received payouts but left the group
    Object.keys(profitDistributions.investorTotals).forEach(investorId => {
      if (!map.has(investorId)) {
        // Find them in the global investors list, or use a fallback name
        const globalInv = investors.find(i => i.id === investorId);
        map.set(investorId, {
          id: investorId,
          name: globalInv?.name || 'Former Investor',
          amount: 0, // They have 0 current capital in the group
          isHistoricalOnly: true
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Sort by current capital first, then by historical only
      if (a.isHistoricalOnly && !b.isHistoricalOnly) return 1;
      if (!a.isHistoricalOnly && b.isHistoricalOnly) return -1;
      return b.amount - a.amount;
    });
  }, [deal, investors, profitDistributions.investorTotals]);

  if (isInitialLoading || !deal) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
        <p className="text-sm font-medium text-slate-500">
          {isInitialLoading ? 'Loading group…' : 'Redirecting to Groups…'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex items-start justify-between border-b border-slate-200/80 pb-5 sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <button
                onClick={() => router.push(groupBasePath)}
                className="group flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                aria-label="Back to Deals"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className={pageTitle}>{deal.groupName || deal.name}</h2>
              <span className={badgeClass(deal.status)}>{deal.status.toUpperCase()}</span>
              <ReadOnlyPill dealId={dealId} className="ml-auto" />
            </div>
            <p className={pageSubtitle}>
              Created: {formatDateTime(deal.date)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isInvestorView && (
            <>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#D11439] to-[#f02852] text-white shadow-primary transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-px motion-safe:hover:shadow-primary-hover motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99] sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:text-sm sm:gap-1.5 font-bold text-xs disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => setShowAddTxn(true)}
              {...wp()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Add Deal</span>
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:w-auto sm:h-auto sm:px-4 sm:py-2 gap-2 font-semibold text-sm disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => setShowInvestorModal(true)}
              aria-label="Manage Investors"
              {...wp()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="hidden sm:inline">Investors</span>
            </button>
            {canAssignStaff && branchSlugForStaff && (
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:w-auto sm:h-auto sm:px-4 sm:py-2 gap-2 font-semibold text-sm disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => setShowStaffModal(true)}
              aria-label="Manage Staff"
              {...wp()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span className="hidden sm:inline">Staff</span>
            </button>
            )}
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:rounded-lg sm:bg-transparent sm:text-slate-500 sm:hover:bg-slate-100 sm:hover:text-slate-900 gap-2 font-semibold text-sm disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => setShowEdit(true)}
              aria-label="Edit Group"
              {...wp()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px] sm:stroke-2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="hidden sm:inline">Edit Group</span>
            </button>
            </>
            )}
          </div>
        </div>

        {/* Date Filter Bar */}
        <DateFilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customStartDate={customStartDate}
          setCustomStartDate={setCustomStartDate}
          customEndDate={customEndDate}
          setCustomEndDate={setCustomEndDate}
        />

        <div className={`${kpiGrid} grid-cols-2`}>
          <KPICard
            label="Number of Deals"
            value={numberOfDeals}
            subValue="Total deals in group"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Settled Deals"
            value={completedDeals}
            subValue="Completed deals"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            }
            color="var(--success)"
            bgColor="var(--success-light)"
          />
          <KPICard
            label="Unsettled Deals"
            value={onTransitDeals}
            subValue="In progress"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="var(--warning)"
            bgColor="var(--warning-light)"
          />
          <KPICard
            label={isInvestorView ? 'My Investment' : 'Group Capital'}
            value={formatAED(groupCapital)}
            subValue={isInvestorView ? 'Your share in deal purchases' : 'Available Capital'}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          {!isInvestorView && (
          <KPICard
            label={deal.groupType === 'currency' ? "Currency Volume" : "Gold Volume"}
            value={deal.groupType === 'currency' ? `${dealCurrencyVolume}` : `${dealGoldVolume} g`}
            subValue={deal.groupType === 'currency' ? "Unsettled Currency" : "Group Gold Volume"}
            icon={deal.groupType === 'currency' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />
              </svg>
            )}
            color={deal.groupType === 'currency' ? "#4f46e5" : "var(--warning)"}
            bgColor={deal.groupType === 'currency' ? "#e0e7ff" : "var(--warning-light)"}
          />
          )}
          {!isInvestorView && (
          <KPICard
            label="Total Expenses"
            value={formatAED(filteredTotalExpense, true)}
            subValue="Transaction Expenses"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            }
            color="var(--action)"
            bgColor="var(--action-light)"
          />
          )}
          <KPICard
            label={isInvestorView ? 'My P&L' : 'P&L'}
            value={formatAED(filteredTotalPL, true)}
            subValue={isInvestorView ? 'Your profit share' : 'Gross Profit'}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            color={filteredTotalPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
            bgColor={filteredTotalPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
            cardClassName={filteredTotalPL >= 0 ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 border-emerald-100' : 'bg-gradient-to-br from-rose-50/50 to-rose-100/30 border-rose-100'}
          />
        </div>

        {deal.leadName && (
          <div className="mb-6 mt-8 flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-surface-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg font-black text-slate-700">
                {deal.leadName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-tight">{deal.leadName}</p>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500">Group Lead</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-x-3 gap-y-4 sm:gap-6 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50 w-full sm:w-auto">
              {deal.leadPhone && (
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 mt-0.5 truncate">{deal.leadPhone}</p>
                </div>
              )}
              {deal.leadEmail && (
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 mt-0.5 truncate">{deal.leadEmail}</p>
                </div>
              )}
              {deal.leadAddress && (
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 mt-0.5 truncate">{deal.leadAddress}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 mt-8 rounded-2xl sm:rounded-3xl border border-slate-100 bg-white p-4 sm:p-5 shadow-surface-xs">
          <div className="mb-4 sm:mb-5">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              {isInvestorView ? 'My Profit' : 'Profit Distribution'}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              {isInvestorView ? 'Your share of settled deal profits' : "Distribution of the deal's net profit"}
            </p>
          </div>

          {isInvestorView ? (
            <div className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-100/50 p-4 sm:p-5">
              <p className="text-sm font-bold text-slate-900">Total Profit Earned</p>
              <p className={`font-mono text-lg font-black ${filteredTotalPL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatAED(filteredTotalPL, true)}
              </p>
            </div>
          ) : deal.investors.length === 0 && deal.managerShare === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <p className="text-sm font-medium text-slate-500">No profit distribution available.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Manager Card */}
              <div className="relative flex items-center justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]">
                <div className="absolute right-0 top-0 h-16 w-16 overflow-hidden z-20">
                  <div className="absolute top-[8px] -right-[32px] w-[100px] rotate-45 bg-red-600 py-0.5 text-center text-[6px] font-black uppercase tracking-widest text-white shadow-sm">
                    Management
                  </div>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                  <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sm sm:text-base font-black text-slate-700">
                    M
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Management
                    </p>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-400">
                      Profit Share • {deal.managerShare ?? 20}%
                    </p>
                  </div>
                </div>
                <div className="text-right pr-6 sm:pr-8 relative z-10">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout</p>
                  <p className={`mt-0.5 font-mono text-base sm:text-lg font-black ${totalAibakProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatAED(totalAibakProfit, true)}
                  </p>
                </div>
              </div>

              {/* Investor Cards */}
              {displayInvestors
                .filter(inv => !isInvestorView || !investorId || inv.id === investorId)
                .map((inv, idx) => {
                const partnerProfit = profitDistributions.investorTotals[inv.id] ?? 0;
                
                let capitalDisplay: React.ReactNode = null;
                if (inv.isHistoricalOnly) {
                  capitalDisplay = 'Historical Investor (Left Group)';
                } else if (isInvestorView) {
                  const share = deal.amount > 0 ? inv.amount / deal.amount : 0;
                  const investment = investorTotalBuyInvestment(filteredTransactions, share);
                  const ratio = (share * 100).toFixed(1);
                  capitalDisplay = (
                    <>
                      Investment: {formatAED(investment)} • {ratio}%
                    </>
                  );
                } else {
                  const ratio = deal.amount > 0 ? ((inv.amount / deal.amount) * 100).toFixed(1) : '0.0';
                  // To keep UI consistent, if the group currently holds gold, show an approximate share
                  const groupCurrentGold = unsettledTransactions.reduce((sum, t) => sum + t.weight, 0);
                  const investorGold = groupCurrentGold > 0 && deal.amount > 0 ? (groupCurrentGold * (inv.amount / deal.amount)) : 0;
                  capitalDisplay = (
                    <>
                      Capital: {formatAED(inv.amount)} • {ratio}%
                      {investorGold > 0 && ` • Gold: ${Number(investorGold.toFixed(3))} g`}
                    </>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-100 bg-white p-2.5 sm:p-3 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-sm sm:text-base font-black text-slate-700">
                        {inv.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 uppercase">
                          {inv.name}
                          {inv.isHistoricalOnly && <span className="ml-2 text-[10px] font-medium text-slate-400 normal-case bg-slate-100 px-1.5 py-0.5 rounded">Past</span>}
                        </p>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400">
                          {capitalDisplay}
                        </p>
                      </div>
                    </div>
                    <div className="text-right pr-2">
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout</p>
                      <p className={`mt-0.5 font-mono text-base font-black ${partnerProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatAED(partnerProfit, true)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Total Row */}
              <div className="mt-1 flex items-center justify-between rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-100/50 p-3 sm:p-4">
                <p className="text-sm font-bold text-slate-900">Total Distributed Profit</p>
                <p className={`font-mono text-lg font-black ${filteredTotalPL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatAED(filteredTotalPL, true)}
                </p>
              </div>
            </div>
          )}
        </div>

        <DealTransactionsTable
          dealName={deal.name}
          groupType={deal.groupType}
          transactions={filteredTransactions}
          onEdit={(txn) => setSelectedTxn(txn)}
          onDelete={(txn) => setSelectedTxn(txn)}
        />
      </div>
      <EditDealModal open={showEdit} onClose={() => setShowEdit(false)} deal={deal} />
      <DealInvestorAssignmentModal
        open={showInvestorModal}
        onClose={() => setShowInvestorModal(false)}
        dealAmount={deal.amount}
        investors={investors}
        dealInvestors={deal.investors}
        onSave={handleSaveInvestors}
        disabled={!canWrite}
      />
      {canAssignStaff && branchSlugForStaff && (
        <DealStaffAssignmentModal
          open={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          branchSlug={branchSlugForStaff}
          assignments={deal.staffAssignments ?? []}
          onChange={() => {}}
          onSave={handleSaveStaff}
          disabled={!canWrite}
        />
      )}
      <CreateDealShellModal open={showAddTxn} onClose={() => setShowAddTxn(false)} deal={deal} />

      {selectedTxn && (
        <CreateDealShellModal
          open={!!selectedTxn}
          onClose={() => setSelectedTxn(null)}
          deal={deal}
          editTransaction={selectedTxn}
          onDelete={async (txn) => {
            await deleteDealTransaction(txn.id, dealId);
            setSelectedTxn(null);
          }}
        />
      )}

    </>
  );
}
