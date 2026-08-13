export type ICFundsSectionId =
  | 'payments'
  | 'receipts'
  | 'contra'
  | 'journal'
  | 'accounts'
  | 'reports';

export type ICFundsReportId =
  | 'all-vouchers'
  | 'cash-bank'
  | 'statement'
  | 'd-expenses'
  | 'profit-loss'
  | 'balance-sheet'
  | 'receivables'
  | 'trial-balance';

export type ICFundsNavItem = {
  id: ICFundsSectionId;
  label: string;
};

export const IC_FUNDS_NAV: readonly ICFundsNavItem[] = [
  { id: 'payments', label: 'Payments' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'contra', label: 'Contra' },
  { id: 'journal', label: 'Journal' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'reports', label: 'Reports' },
];

export const IC_FUNDS_REPORTS: ReadonlyArray<{ id: ICFundsReportId; label: string }> = [
  { id: 'all-vouchers', label: 'All entries' },
  { id: 'cash-bank', label: 'Cash & Bank' },
  { id: 'statement', label: 'Statement detailed' },
  { id: 'd-expenses', label: 'D-Expenses' },
  { id: 'receivables', label: 'Receivables & Payables' },
  { id: 'profit-loss', label: 'Profit-Loss' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'trial-balance', label: 'Trial Balance' },
];

const SECTION_IDS = new Set(IC_FUNDS_NAV.map(item => item.id));
const REPORT_IDS = new Set(IC_FUNDS_REPORTS.map(item => item.id));

const LEGACY_REPORT_PATHS: Record<string, ICFundsReportId> = {
  'cash-bank': 'cash-bank',
  statement: 'statement',
  'd-expenses': 'd-expenses',
  'profit-loss': 'profit-loss',
  'balance-sheet': 'balance-sheet',
};

export function isICFundsSection(value: string): value is ICFundsSectionId {
  return SECTION_IDS.has(value as ICFundsSectionId);
}

export function isICFundsReportId(value: string | null | undefined): value is ICFundsReportId {
  return !!value && REPORT_IDS.has(value as ICFundsReportId);
}

export function legacyReportPathToView(section: string): ICFundsReportId | null {
  return LEGACY_REPORT_PATHS[section] ?? null;
}

export function icFundsPath(slug: string, section: ICFundsSectionId): string {
  return `/${slug}/ic-funds/${section}`;
}

export function icFundsReportPath(slug: string, view: ICFundsReportId): string {
  return `/${slug}/ic-funds/reports?view=${view}`;
}
