/**
 * Shared validation for universal journal / transfer entries.
 * Used on client (modal) and server (dbProcessLedgerTransactionAction).
 */

export type JournalEntryInput = {
  from: string;
  to: string;
  amount: number;
  assetType?: 'currency' | 'gold';
  date?: string;
};

export type JournalValidationOptions = {
  branchName?: string;
  branchFundLabel?: string;
  /** Canonical account names allowed for this branch (lowercase comparison). */
  allowedAccountNames?: string[];
};

export type JournalValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Map branch-fund display label to stored branch name for comparisons. */
export function normalizeJournalAccountName(
  name: string,
  branchName?: string,
  branchFundLabel?: string,
): string {
  const trimmed = name.trim();
  if (
    branchName &&
    branchFundLabel &&
    trimmed.toLowerCase() === branchFundLabel.trim().toLowerCase()
  ) {
    return branchName.trim().toLowerCase();
  }
  return trimmed.toLowerCase();
}

export function validateJournalEntry(
  input: JournalEntryInput,
  options: JournalValidationOptions = {},
): JournalValidationResult {
  const from = input.from?.trim() ?? '';
  const to = input.to?.trim() ?? '';

  if (!from) {
    return { ok: false, error: 'From account is required.' };
  }
  if (!to) {
    return { ok: false, error: 'To account is required.' };
  }

  const normFrom = normalizeJournalAccountName(from, options.branchName, options.branchFundLabel);
  const normTo = normalizeJournalAccountName(to, options.branchName, options.branchFundLabel);

  if (normFrom === normTo) {
    return { ok: false, error: 'From and To accounts cannot be the same.' };
  }

  if (!Number.isFinite(input.amount)) {
    return { ok: false, error: 'Amount must be a valid number.' };
  }
  if (input.amount <= 0) {
    return { ok: false, error: 'Amount must be greater than zero.' };
  }

  const assetType = input.assetType ?? 'currency';
  if (assetType === 'currency') {
    const decimals = (String(input.amount).split('.')[1] ?? '').length;
    if (decimals > 2) {
      return { ok: false, error: 'Currency amount cannot have more than 2 decimal places.' };
    }
  }

  if (input.date) {
    const parsed = new Date(input.date);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: 'Date and time is invalid.' };
    }
  }

  if (options.allowedAccountNames?.length) {
    const allowed = new Set(
      options.allowedAccountNames.map(n =>
        normalizeJournalAccountName(n, options.branchName, options.branchFundLabel),
      ),
    );
    if (!allowed.has(normFrom)) {
      return { ok: false, error: `Account "${from}" is not valid for this branch.` };
    }
    if (!allowed.has(normTo)) {
      return { ok: false, error: `Account "${to}" is not valid for this branch.` };
    }
  }

  return { ok: true };
}

/** Build allowed account keys from modal options (stored names + branch fund label). */
export function journalAllowedAccountNames(
  accountNames: string[],
  branchName?: string,
  branchFundLabel?: string,
): string[] {
  const names = [...accountNames];
  if (branchName && branchFundLabel) {
    names.push(branchFundLabel, branchName);
  }
  return names;
}
