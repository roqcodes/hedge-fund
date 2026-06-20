import { Ledger, Transaction } from '@/types';

/** Ledgers shared across all branches (branch_id IS NULL in DB). */
export const GLOBAL_LEDGER_NAMES = ['Temperory Credits', 'Customer Accounts'] as const;

export type GlobalLedgerName = (typeof GLOBAL_LEDGER_NAMES)[number];

export const TEMPORARY_CREDITS_NAME = 'Temperory Credits';
export const CUSTOMER_ACCOUNTS_NAME = 'Customer Accounts';

export function isGlobalLedger(ledger: Pick<Ledger, 'branchId'>): boolean {
  return !ledger.branchId;
}

export function isTemporaryCreditsLedger(nameOrLedger: string | Pick<Ledger, 'name'>): boolean {
  const name = typeof nameOrLedger === 'string' ? nameOrLedger : nameOrLedger.name;
  return name === TEMPORARY_CREDITS_NAME;
}

export function isCustomerAccountsLedger(nameOrLedger: string | Pick<Ledger, 'name'>): boolean {
  const name = typeof nameOrLedger === 'string' ? nameOrLedger : nameOrLedger.name;
  return name === CUSTOMER_ACCOUNTS_NAME;
}

/** Global ledgers + ledgers belonging to the given branch. Global wins on name collisions. */
export function filterBranchLedgers(ledgers: Ledger[], branchId?: string): Ledger[] {
  const scoped = ledgers.filter(l => isGlobalLedger(l) || (!!branchId && l.branchId === branchId));
  const byName = new Map<string, Ledger>();

  for (const ledger of scoped) {
    const existing = byName.get(ledger.name);
    if (!existing) {
      byName.set(ledger.name, ledger);
    } else if (isGlobalLedger(ledger) && !isGlobalLedger(existing)) {
      byName.set(ledger.name, ledger);
    }
  }

  return Array.from(byName.values()).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );
}

export function ledgerScopeLabel(ledger: Pick<Ledger, 'branchId'>): 'Global' | 'Branch' {
  return isGlobalLedger(ledger) ? 'Global' : 'Branch';
}

/** Global ledgers are seeded/managed via SQL only — not through the app. */
export const GLOBAL_LEDGER_MUTATION_ERROR = 'Global ledgers are system-managed and cannot be changed from the app.';

/**
 * Ledger balance = inflows − outflows (to − from).
 * Temperory Credits: negative balance = total lent out (not in locker).
 *   Lent out: Temporary Credits → Entity. Payback: Entity → Temporary Credits.
 */
export function calculateLedgerBalance(ledger: Pick<Ledger, 'name'>, transactions: Transaction[]): number {
  const toSum = transactions
    .filter(t => t.to === ledger.name)
    .reduce((sum, t) => sum + t.amount, 0);
  const fromSum = transactions
    .filter(t => t.from === ledger.name)
    .reduce((sum, t) => sum + t.amount, 0);
  const tagSum = transactions
    .filter(t => t.type === ledger.name && t.from !== ledger.name && t.to !== ledger.name)
    .reduce((sum, t) => sum + t.amount, 0);

  return toSum - fromSum + tagSum;
}

export function calculateLedgerBalances(ledgers: Ledger[], transactions: Transaction[]): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const ledger of ledgers) {
    balances[ledger.id] = calculateLedgerBalance(ledger, transactions);
  }
  return balances;
}

/**
 * Branch Fund = opening capital + net flow through the branch account name.
 * Counts every completed currency txn where the branch is from or to — including
 * transfers to/from ledgers. Neutral ledgers are excluded from Cash In Locker but
 * money leaving Branch Fund still reduces this balance.
 */
export function calculateAvailableBranchFund(
  branchName: string,
  openingBalance: number,
  transactions: Transaction[],
): number {
  let base = openingBalance;
  for (const t of transactions) {
    if ((t.assetType || 'currency') !== 'currency' || t.status !== 'completed') continue;
    if (t.to === branchName) base += t.amount;
    if (t.from === branchName) base -= t.amount;
  }
  return base;
}

/**
 * Physical cash in locker = Branch Fund + sum of adjusting ledger balances.
 * Matches spreadsheet: Total Cash + Temporary Credit + Customer Deposits (+ other non-neutral ledgers).
 */
export function calculateCashInLocker(
  availableBranchFund: number,
  branchLedgers: Ledger[],
  ledgerBalances: Record<string, number>,
): number {
  const ledgerSum = branchLedgers
    .filter(l => l.impact !== 'neutral')
    .reduce((sum, l) => sum + (ledgerBalances[l.id] || 0), 0);
  return availableBranchFund + ledgerSum;
}

export type LedgerTabColumns = {
  outLabel: string;
  inLabel: string;
  hint?: string;
};

export function getLedgerTabColumns(ledgerName: string): LedgerTabColumns {
  if (isTemporaryCreditsLedger(ledgerName)) {
    return {
      outLabel: 'Lent Out',
      inLabel: 'Recovered',
      hint: 'Lent out: Temporary Credits → Entity. Payback: Entity → Temporary Credits. Negative balance = total outstanding credit.',
    };
  }
  if (isCustomerAccountsLedger(ledgerName)) {
    return {
      outLabel: 'Withdrawn',
      inLabel: 'Deposited',
      hint: 'Customer funds held on their behalf — not branch operating cash.',
    };
  }
  return { outLabel: 'Sent', inLabel: 'Received' };
}

/** Whether a transaction amount belongs in the ledger tab "out" column (Lent Out / Sent / Withdrawn). */
export function isLedgerTabOutAmount(t: Transaction, ledgerName: string): boolean {
  return t.from === ledgerName;
}

/** Whether a transaction amount belongs in the ledger tab "in" column (Recovered / Received / Deposited). */
export function isLedgerTabInAmount(t: Transaction, ledgerName: string): boolean {
  return t.to === ledgerName;
}

export function isEntitySentAmount(t: Transaction, entityName: string): boolean {
  return t.from === entityName;
}

export function isEntityReceivedAmount(t: Transaction, entityName: string): boolean {
  return t.to === entityName;
}

export function getLedgerKpiSubValue(ledger: Ledger): string {
  if (isTemporaryCreditsLedger(ledger)) {
    return 'Lent out — not in locker (negative = outstanding credit)';
  }
  if (isCustomerAccountsLedger(ledger)) {
    return 'Customer deposits held';
  }
  return `Impact: ${ledger.impact}`;
}

export type EntityLedgerHint = {
  label: string;
  tone: 'warning' | 'success' | 'info';
};

/** Context label for entity history rows involving global ledgers. */
export function getEntityLedgerHint(t: Transaction, entityName: string): EntityLedgerHint | null {
  if (isTemporaryCreditsLedger(t.from) && t.to === entityName) {
    return { label: 'Temp credit lent · due back to branch', tone: 'warning' };
  }
  if (t.from === entityName && isTemporaryCreditsLedger(t.to)) {
    return { label: 'Temp credit payback', tone: 'success' };
  }
  if (isCustomerAccountsLedger(t.from) && t.to === entityName) {
    return { label: 'Customer withdrawal', tone: 'info' };
  }
  if (t.from === entityName && isCustomerAccountsLedger(t.to)) {
    return { label: 'Customer deposit', tone: 'info' };
  }
  return null;
}

export function entityLedgerHintClass(tone: EntityLedgerHint['tone']): string {
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
  return 'bg-sky-50 text-sky-700 ring-sky-600/20';
}
