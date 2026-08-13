import {
  type ICFundAccountType,
  type ICFundVoucherType,
} from '@/lib/icFunds/constants';

export type VoucherPartyRole = 'debit' | 'credit';

const BANK_ONLY: ReadonlySet<ICFundAccountType> = new Set(['bank']);

const PAYMENT_DEBIT: ReadonlySet<ICFundAccountType> = new Set([
  'personal',
  'expense',
  'd_expense',
  'profit',
]);

const RECEIPT_CREDIT: ReadonlySet<ICFundAccountType> = new Set([
  'personal',
  'income',
  'profit',
]);

const ANY: ReadonlySet<ICFundAccountType> = new Set([
  'bank',
  'personal',
  'income',
  'profit',
  'expense',
  'd_expense',
]);

export function allowedAccountTypesForVoucher(
  voucherType: ICFundVoucherType,
  role: VoucherPartyRole,
): ReadonlySet<ICFundAccountType> {
  switch (voucherType) {
    case 'payment':
      return role === 'credit' ? BANK_ONLY : PAYMENT_DEBIT;
    case 'receipt':
      return role === 'debit' ? BANK_ONLY : RECEIPT_CREDIT;
    case 'contra':
      return BANK_ONLY;
    case 'journal':
      return ANY;
  }
}

export function voucherFieldLabels(voucherType: ICFundVoucherType): {
  debit: string;
  credit: string;
} {
  switch (voucherType) {
    case 'payment':
      return { credit: 'Paid from cash / bank', debit: 'Paid to' };
    case 'receipt':
      return { debit: 'Received to cash / bank', credit: 'Received from' };
    case 'contra':
      return { credit: 'From bank', debit: 'To bank' };
    case 'journal':
      return { debit: 'Debit account', credit: 'Credit account' };
  }
}

export function validateVoucherAccounts(params: {
  voucherType: ICFundVoucherType;
  debitType: ICFundAccountType;
  creditType: ICFundAccountType;
  debitId: string;
  creditId: string;
}): string | null {
  const { voucherType, debitType, creditType, debitId, creditId } = params;
  if (!debitId || !creditId) return 'Both accounts are required';
  if (debitId === creditId) return 'Debit and credit accounts must be different';

  const debitOk = allowedAccountTypesForVoucher(voucherType, 'debit').has(debitType);
  const creditOk = allowedAccountTypesForVoucher(voucherType, 'credit').has(creditType);
  if (!debitOk || !creditOk) {
    return `Invalid accounts for ${voucherType}`;
  }
  return null;
}
