import { Branch, Entity, Ledger, Transaction, TransactionTag } from '@/types';
import { filterBranchLedgers } from '@/lib/ledgers';
import { getDateFilterLabel, resolveDateFilterRange, type DateFilterRange } from '@/lib/dateFilterRange';

export const TRANSACTIONS_BACKUP_KIND = 'hedge-fund/transactions-page-backup' as const;
export const TRANSACTIONS_BACKUP_VERSION = 1 as const;
export const BACKUP_HISTORY_KEY = 'hedge_transactions_backup_history';
export const BACKUP_HISTORY_LIMIT = 50;

export type TransactionTagLinkRow = {
  transaction_id: string;
  tag_id: string;
};

export type TransactionBackupRow = {
  id: string;
  date: string;
  from_entity: string;
  to_entity: string;
  amount: number;
  type: string;
  asset_type: 'currency' | 'gold';
  status: string;
  notes: string;
  category: string | null;
  branch_id: string | null;
};

export type EntityBackupRow = {
  id: string;
  name: string;
  phone: string | null;
  branch_id: string | null;
  created_at: string | null;
};

export type LedgerBackupRow = {
  id: string;
  branch_id: string | null;
  name: string;
  impact: string;
  is_kpi: boolean;
  sort_order: number;
  created_at: string | null;
};

export type TransactionTagBackupRow = {
  id: string;
  branch_id: string | null;
  name: string;
  created_at: string | null;
};

export type BranchBackupRow = {
  id: string;
  slug: string | null;
  name: string;
  location: string;
  manager_name: string;
  status: string;
};

export type TransactionsPageBackup = {
  formatVersion: typeof TRANSACTIONS_BACKUP_VERSION;
  kind: typeof TRANSACTIONS_BACKUP_KIND;
  createdAt: string;
  scope: {
    dateFilter: string;
    dateRangeLabel: string;
    startDate: string | null;
    endDate: string | null;
    branchIds: string[] | null;
    branchNames: string[];
  };
  tables: {
    branches: BranchBackupRow[];
    entities: EntityBackupRow[];
    ledgers: LedgerBackupRow[];
    transaction_tags: TransactionTagBackupRow[];
    transactions: TransactionBackupRow[];
    transaction_tag_links: TransactionTagLinkRow[];
  };
  counts: {
    branches: number;
    entities: number;
    ledgers: number;
    transaction_tags: number;
    transactions: number;
    transaction_tag_links: number;
  };
};

export type BackupHistoryEntry = {
  id: string;
  createdAt: string;
  dateRangeLabel: string;
  startDate: string | null;
  endDate: string | null;
  branchNames: string[];
  transactionCount: number;
  filename: string;
  fileSizeBytes: number;
};

export function resolveBackupBranchIds(
  branches: Branch[],
  branchId: string | undefined,
  branchFilter: string,
): string[] | null {
  if (branchId) return [branchId];
  if (branchFilter !== 'all') {
    const match = branches.find(b => b.name === branchFilter || b.id === branchFilter);
    return match ? [match.id] : [];
  }
  return null;
}

function txnInBranchScope(t: Transaction, branchIds: string[] | null): boolean {
  if (!branchIds) return true;
  return !!t.branchId && branchIds.includes(t.branchId);
}

function entityToRow(e: Entity): EntityBackupRow {
  return {
    id: e.id,
    name: e.name,
    phone: e.phone || null,
    branch_id: e.branchId || null,
    created_at: e.createdAt || null,
  };
}

function ledgerToRow(l: Ledger): LedgerBackupRow {
  return {
    id: l.id,
    branch_id: l.branchId || null,
    name: l.name,
    impact: l.impact,
    is_kpi: l.isKpi,
    sort_order: l.sortOrder ?? 0,
    created_at: l.createdAt || null,
  };
}

function tagToRow(t: TransactionTag): TransactionTagBackupRow {
  return {
    id: t.id,
    branch_id: t.branchId || null,
    name: t.name,
    created_at: t.createdAt || null,
  };
}

function txnToRow(t: Transaction): TransactionBackupRow {
  return {
    id: t.id,
    date: t.date,
    from_entity: t.from,
    to_entity: t.to,
    amount: t.amount,
    type: t.type,
    asset_type: t.assetType || 'currency',
    status: t.status,
    notes: t.notes || '',
    category: t.category || null,
    branch_id: t.branchId || null,
  };
}

function branchToRow(b: Branch): BranchBackupRow {
  return {
    id: b.id,
    slug: b.slug || null,
    name: b.name,
    location: b.location,
    manager_name: b.managerName,
    status: b.status,
  };
}

export function buildTransactionsPageBackup(input: {
  branches: Branch[];
  entities: Entity[];
  ledgers: Ledger[];
  transactionTags: TransactionTag[];
  transactions: Transaction[];
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
  branchId?: string;
  branchFilter: string;
}): TransactionsPageBackup {
  const range = resolveDateFilterRange(input.dateFilter, input.customStartDate, input.customEndDate);
  const branchIds = resolveBackupBranchIds(input.branches, input.branchId, input.branchFilter);

  const scopedTransactions = input.transactions.filter(
    t => txnInBranchScope(t, branchIds) && isDateInRangeForBackup(t.date, range),
  );

  const scopedBranchIds = branchIds
    ?? [...new Set(scopedTransactions.map(t => t.branchId).filter(Boolean))] as string[];

  const backupBranches = input.branches
    .filter(b => scopedBranchIds.includes(b.id))
    .map(branchToRow);

  const backupEntities = input.entities
    .filter(e => !e.branchId || scopedBranchIds.includes(e.branchId))
    .map(entityToRow);

  const ledgerSet = new Map<string, Ledger>();
  for (const id of scopedBranchIds) {
    for (const l of filterBranchLedgers(input.ledgers, id)) {
      ledgerSet.set(l.id, l);
    }
  }
  const backupLedgers = [...ledgerSet.values()].map(ledgerToRow);

  const tagIds = new Set<string>();
  const backupTagLinks: TransactionTagLinkRow[] = [];
  for (const t of scopedTransactions) {
    for (const tagId of t.tagIds || []) {
      tagIds.add(tagId);
      backupTagLinks.push({ transaction_id: t.id, tag_id: tagId });
    }
  }

  const backupTags = input.transactionTags
    .filter(tag => tagIds.has(tag.id) || (tag.branchId && scopedBranchIds.includes(tag.branchId)))
    .map(tagToRow);

  const backup = {
    formatVersion: TRANSACTIONS_BACKUP_VERSION,
    kind: TRANSACTIONS_BACKUP_KIND,
    createdAt: new Date().toISOString(),
    scope: {
      dateFilter: input.dateFilter,
      dateRangeLabel: getDateFilterLabel(input.dateFilter, input.customStartDate, input.customEndDate),
      startDate: range.startDate,
      endDate: range.endDate,
      branchIds: branchIds,
      branchNames: backupBranches.map(b => b.name),
    },
    tables: {
      branches: backupBranches,
      entities: backupEntities,
      ledgers: backupLedgers,
      transaction_tags: backupTags,
      transactions: scopedTransactions.map(txnToRow),
      transaction_tag_links: backupTagLinks,
    },
    counts: {
      branches: 0,
      entities: 0,
      ledgers: 0,
      transaction_tags: 0,
      transactions: 0,
      transaction_tag_links: 0,
    },
  };

  backup.counts = {
    branches: backup.tables.branches.length,
    entities: backup.tables.entities.length,
    ledgers: backup.tables.ledgers.length,
    transaction_tags: backup.tables.transaction_tags.length,
    transactions: backup.tables.transactions.length,
    transaction_tag_links: backup.tables.transaction_tag_links.length,
  };

  return backup;
}

function isDateInRangeForBackup(dateIso: string, range: DateFilterRange): boolean {
  if (!range.startDate && !range.endDate) return true;
  const itemDate = dateIso.slice(0, 10);
  const start = range.startDate || '1970-01-01';
  const end = range.endDate || '9999-12-31';
  return itemDate >= start && itemDate <= end;
}

export function validateTransactionsPageBackup(data: unknown): data is TransactionsPageBackup {
  if (!data || typeof data !== 'object') return false;
  const b = data as TransactionsPageBackup;
  return (
    b.formatVersion === TRANSACTIONS_BACKUP_VERSION &&
    b.kind === TRANSACTIONS_BACKUP_KIND &&
    !!b.scope &&
    !!b.tables &&
    Array.isArray(b.tables.transactions) &&
    Array.isArray(b.tables.entities) &&
    Array.isArray(b.tables.ledgers) &&
    Array.isArray(b.tables.transaction_tags) &&
    Array.isArray(b.tables.transaction_tag_links)
  );
}

export function backupFilename(backup: TransactionsPageBackup): string {
  const branchPart = (backup.scope.branchNames[0] || 'all-branches')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const start = backup.scope.startDate || 'all-time';
  const end = backup.scope.endDate || 'all-time';
  const ts = backup.createdAt.slice(0, 19).replace(/[:T]/g, '-');
  return `hedge-txn-backup_${branchPart}_${start}_${end}_${ts}.json`;
}

export function downloadBackupJson(backup: TransactionsPageBackup): { filename: string; size: number } {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const filename = backupFilename(backup);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return { filename, size: blob.size };
}

export function readBackupHistory(): BackupHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendBackupHistory(entry: BackupHistoryEntry): BackupHistoryEntry[] {
  const next = [entry, ...readBackupHistory()].slice(0, BACKUP_HISTORY_LIMIT);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearBackupHistoryEntry(id: string): BackupHistoryEntry[] {
  const next = readBackupHistory().filter(e => e.id !== id);
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(next));
  return next;
}
