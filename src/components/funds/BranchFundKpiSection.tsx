'use client';

import React, { useMemo, useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import { formatAED, formatAEDStr } from '@/data/mockData';
import { Branch, Ledger } from '@/types';
import { getLedgerKpiSubValue } from '@/lib/ledgers';
import { btnSecondary, kpiGrid } from '@/lib/ui';
import { useLedgerKpiInvert } from '@/hooks/useLedgerKpiInvert';

const PRIMARY_ROW_SIZE = 4;

const branchFundIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z" />
  </svg>
);

const goldIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const ledgerIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const lockerIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const transferIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const volumeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

const pendingIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

type KpiCardConfig = {
  key: string;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
};

function ledgerCardProps(
  ledger: Ledger,
  balance: number,
  displayAmount: (ledgerId: string, amount: number) => number,
): KpiCardConfig {
  return {
    key: ledger.id,
    label: ledger.name,
    value: formatAED(displayAmount(ledger.id, balance)),
    subValue: getLedgerKpiSubValue(ledger),
    icon: ledgerIcon,
    color: ledger.impact === 'positive' ? 'var(--success)' : ledger.impact === 'negative' ? 'var(--warning)' : 'var(--info)',
    bgColor: ledger.impact === 'positive' ? 'var(--success-light)' : ledger.impact === 'negative' ? 'var(--warning-light)' : 'var(--info-light)',
  };
}

export default function BranchFundKpiSection({
  branch,
  availableBranchFund,
  branchGoldVolume,
  branchLedgers,
  ledgerBalances,
  totalCashInLocker,
  totalVolume,
  transferCount,
  pendingCount,
}: {
  branch: Branch;
  availableBranchFund: number;
  branchGoldVolume: number;
  branchLedgers: Ledger[];
  ledgerBalances: Record<string, number>;
  totalCashInLocker: number;
  totalVolume: number;
  transferCount: number;
  pendingCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { displayAmount } = useLedgerKpiInvert(branchLedgers);

  const allCards = useMemo<KpiCardConfig[]>(() => {
    const cards: KpiCardConfig[] = [
      {
        key: 'branch-fund',
        label: 'Branch Fund',
        value: formatAED(availableBranchFund),
        subValue: `Total: ${formatAEDStr(branch.openingBalance || 0)}`,
        icon: branchFundIcon,
        color: 'var(--accent)',
        bgColor: 'var(--accent-light)',
      },
      {
        key: 'branch-gold',
        label: 'Branch Gold Volume',
        value: `${branchGoldVolume.toFixed(2)}g`,
        subValue: `Total: ${(branch.openingGoldBalance || 0).toFixed(2)}g`,
        icon: goldIcon,
        color: '#eab308',
        bgColor: '#fef08a',
      },
    ];

    branchLedgers
      .filter(l => l.isKpi)
      .forEach(ledger => {
        cards.push(ledgerCardProps(ledger, ledgerBalances[ledger.id] || 0, displayAmount));
      });

    cards.push({
      key: 'cash-locker',
      label: 'Total Cash In Locker',
      value: formatAED(totalCashInLocker),
      subValue: 'Physical cash after receivables & customer deposits',
      icon: lockerIcon,
      color: 'var(--info)',
      bgColor: 'var(--info-light)',
    });

    return cards;
  }, [branch, availableBranchFund, branchGoldVolume, branchLedgers, ledgerBalances, totalCashInLocker, displayAmount]);

  const transactionCards = useMemo<KpiCardConfig[]>(
    () => [
      {
        key: 'total-volume',
        label: 'Total Fund Volume',
        value: formatAED(totalVolume),
        subValue: 'Filtered transaction throughput',
        icon: volumeIcon,
        color: 'var(--info)',
        bgColor: 'var(--info-light)',
      },
      {
        key: 'transfers',
        label: 'Inter-branch Transfers',
        value: transferCount,
        subValue: 'In selected period',
        icon: transferIcon,
        color: 'var(--purple)',
        bgColor: 'var(--purple-light)',
      },
      {
        key: 'pending',
        label: 'Pending Approvals',
        value: pendingCount,
        subValue: 'Awaiting authorization',
        icon: pendingIcon,
        color: 'var(--warning)',
        bgColor: 'var(--warning-light)',
      },
    ],
    [totalVolume, transferCount, pendingCount],
  );

  const primaryCards = allCards.slice(0, PRIMARY_ROW_SIZE);
  const expandedCards = [...allCards.slice(PRIMARY_ROW_SIZE), ...transactionCards];
  const hasMore = expandedCards.length > 0;

  const renderCards = (cards: KpiCardConfig[]) =>
    cards.map(card => (
      <KPICard
        key={card.key}
        label={card.label}
        value={card.value}
        subValue={card.subValue}
        icon={card.icon}
        color={card.color}
        bgColor={card.bgColor}
      />
    ));

  return (
    <div className="mb-6">
      <div className={`${kpiGrid} !mb-0`}>{renderCards(primaryCards)}</div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className={`${btnSecondary} gap-2`}
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {expanded ? 'Show less' : `Show ${expandedCards.length} more KPI${expandedCards.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {hasMore && expanded && (
        <div className={`${kpiGrid} mt-4 !mb-0 animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]`}>
          {renderCards(expandedCards)}
        </div>
      )}
    </div>
  );
}
