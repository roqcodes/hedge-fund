'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import ReadOnlyPill from '@/components/rbac/ReadOnlyPill';
import ICFundsToolbar from '@/components/ic-funds/ICFundsToolbar';
import VoucherScreen from '@/components/ic-funds/VoucherScreen';
import AccountsScreen from '@/components/ic-funds/AccountsScreen';
import BooksScreen from '@/components/ic-funds/BooksScreen';
import type { ICFundsReportId, ICFundsSectionId } from '@/lib/icFunds/nav';
import type { ICFundVoucherType } from '@/lib/icFunds/constants';

const VOUCHER_SECTIONS: Record<string, ICFundVoucherType> = {
  payments: 'payment',
  receipts: 'receipt',
  journal: 'journal',
  contra: 'contra',
};

export default function ICFundsApp({
  section,
  reportView,
}: {
  section: ICFundsSectionId;
  reportView?: ICFundsReportId;
}) {
  const { currentSlug, branches } = useApp();
  const branch = branches.find(b => b.slug === currentSlug);
  const branchId = branch?.id;

  if (!currentSlug || currentSlug === 'superadmin' || !branchId) {
    return <p className="text-sm text-slate-500">IC Funds is available on a branch workspace.</p>;
  }

  const voucherType = VOUCHER_SECTIONS[section];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight text-slate-900">IC Funds</h1>
        <ReadOnlyPill />
      </div>
      <ICFundsToolbar slug={currentSlug} section={section} />
      {voucherType ? (
        <VoucherScreen branchId={branchId} voucherType={voucherType} />
      ) : section === 'accounts' ? (
        <AccountsScreen branchId={branchId} />
      ) : (
        <BooksScreen branchId={branchId} slug={currentSlug} reportView={reportView ?? 'all-vouchers'} />
      )}
    </div>
  );
}
