'use server';

import { getCurrentUserAction } from '@/app/actions/auth';
import { query } from '@/lib/db';
import {
  addDays,
  computeKpiSnapshot,
  getOpeningSnapshotForDate,
  parseDayCloseRow,
  resolveDailyCloseContext,
} from '@/lib/dailyClose';
import { resolveBranchTimeZone, todayInTimeZone, toBusinessDate, parseCalendarDate } from '@/lib/businessTime';
import {
  SQL_BACKFILL_TRANSACTION_BUSINESS_DATES,
  SQL_BACKFILL_TRANSACTION_BUSINESS_DATES_ORPHAN,
  SQL_BRANCH_DAY_CLOSE_SELECT,
} from '@/lib/sql/businessDateSql';
import { filterBranchLedgers } from '@/lib/ledgers';
import type { DbActionResult } from '@/app/actions/dbActions';
import type { Branch, BranchDayClose, DayKpiSnapshot, Transaction } from '@/types';

function newId() {
  return `bdc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatPgError(error: unknown): string {
  return error instanceof Error ? error.message : 'Database error';
}

async function ensureDayCloseSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS branch_day_closes (
      id VARCHAR(50) PRIMARY KEY,
      branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      business_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMPTZ,
      closed_by VARCHAR(255),
      opening_snapshot JSONB NOT NULL DEFAULT '{}',
      closing_snapshot JSONB,
      UNIQUE(branch_id, business_date)
    );
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_branch_day_closes_branch_date ON branch_day_closes(branch_id, business_date DESC);`,
  );
  await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS business_date DATE;`);
  await query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dubai';`);
  await query(
    `CREATE INDEX IF NOT EXISTS idx_transactions_branch_business_date ON transactions(branch_id, business_date);`,
  );
  await backfillTransactionBusinessDates();
}

async function backfillTransactionBusinessDates() {
  // Auto-backfill is removed because it was overwriting manually corrected data on every reload.
}

function mapBranchRow(r: Record<string, unknown>): Branch {
  return {
    id: String(r.id),
    slug: String(r.slug || ''),
    name: String(r.name),
    location: String(r.location),
    managerName: String(r.manager_name),
    cashBalance: parseFloat(String(r.cash_balance)),
    goldBalance: parseFloat(String(r.gold_balance)),
    openingGoldBalance: parseFloat(String(r.opening_gold_balance || 0)),
    currentBalance: parseFloat(String(r.current_balance)),
    openingBalance: parseFloat(String(r.opening_balance)),
    closingBalance: parseFloat(String(r.closing_balance)),
    dailyPL: parseFloat(String(r.daily_pl || 0)),
    status: r.status as Branch['status'],
    timezone: resolveBranchTimeZone(r.timezone ? String(r.timezone) : null),
    lastActivity: String(r.last_activity),
    createdAt: String(r.created_at),
  };
}

function mapTxnRow(r: Record<string, unknown>, branchTimezone?: string): Transaction {
  const iso = new Date(String(r.date)).toISOString();
  const tz = resolveBranchTimeZone(branchTimezone);
  return {
    id: String(r.id),
    date: iso,
    from: String(r.from_entity),
    to: String(r.to_entity),
    amount: parseFloat(String(r.amount)),
    type: String(r.type),
    assetType: (r.asset_type as Transaction['assetType']) || 'currency',
    status: r.status as Transaction['status'],
    notes: String(r.notes || ''),
    category: r.category ? String(r.category) : undefined,
    branchId: r.branch_id ? String(r.branch_id) : undefined,
    businessDate: r.business_date ? parseCalendarDate(r.business_date) : toBusinessDate(iso, tz),
  } as Transaction;
}

export async function fetchBranchDayClosesAction(
  branchId: string,
  branchSlug?: string,
): Promise<DbActionResult<BranchDayClose[]>> {
  try {
    await ensureDayCloseSchema();
    const userRes = await getCurrentUserAction(branchSlug);
    if (!userRes.success || !userRes.data) return { success: false, error: 'You must be signed in.' };

    const { rows } = await query(
      `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 ORDER BY business_date DESC LIMIT 120`,
      [branchId],
    );
    return { success: true, data: rows.map(r => parseDayCloseRow(r as Record<string, unknown>)) };
  } catch (e) {
    return { success: false, error: formatPgError(e) };
  }
}

export async function ensureOpenDaySessionAction(
  branchId: string,
  branchSlug?: string,
): Promise<DbActionResult<{ dayCloses: BranchDayClose[]; context: import('@/types').DailyCloseContext }>> {
  try {
    await ensureDayCloseSchema();
    const userRes = await getCurrentUserAction(branchSlug);
    if (!userRes.success || !userRes.data) return { success: false, error: 'You must be signed in.' };

    const branchRes = await query(`SELECT * FROM branches WHERE id = $1`, [branchId]);
    if (!branchRes.rows[0]) return { success: false, error: 'Branch not found.' };
    const branch = mapBranchRow(branchRes.rows[0] as Record<string, unknown>);
    const today = todayInTimeZone(branch.timezone);

    const { rows: ledgerRows } = await query(`SELECT * FROM ledgers`);
    const branchLedgers = filterBranchLedgers(
      ledgerRows.map(l => ({
        id: String(l.id),
        branchId: l.branch_id ? String(l.branch_id) : undefined,
        name: String(l.name),
        impact: l.impact as import('@/types').Ledger['impact'],
        isKpi: Boolean(l.is_kpi),
        kpiInvert: Boolean(l.kpi_invert),
        sortOrder: Number(l.sort_order || 0),
      })),
      branchId,
    );

    const { rows: txnRows } = await query(
      `SELECT * FROM transactions WHERE branch_id = $1 ORDER BY date`,
      [branchId],
    );
    const txns = txnRows.map(r => mapTxnRow(r as Record<string, unknown>, branch.timezone));

    const { rows: existingRows } = await query(
      `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 ORDER BY business_date DESC LIMIT 120`,
      [branchId],
    );
    const dayCloses = existingRows.map(r => parseDayCloseRow(r as Record<string, unknown>));
    const context = resolveDailyCloseContext(dayCloses, today);
    const { workingDate } = context;

    const hasWorking = dayCloses.some(d => d.businessDate === workingDate);
    if (!hasWorking) {
      const opening = getOpeningSnapshotForDate(workingDate, dayCloses, branch, branchLedgers, txns);
      const id = newId();
      await query(
        `INSERT INTO branch_day_closes (id, branch_id, business_date, status, opening_snapshot)
         VALUES ($1, $2, $3, 'open', $4)
         ON CONFLICT (branch_id, business_date) DO NOTHING`,
        [id, branchId, workingDate, JSON.stringify(opening)],
      );
    }

    const refreshed = await query(
      `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 ORDER BY business_date DESC LIMIT 120`,
      [branchId],
    );
    const updated = refreshed.rows.map(r => parseDayCloseRow(r as Record<string, unknown>));
    return { success: true, data: { dayCloses: updated, context: resolveDailyCloseContext(updated, today) } };
  } catch (e) {
    return { success: false, error: formatPgError(e) };
  }
}

export async function closeBranchDayAction(
  branchId: string,
  businessDate: string,
  branchSlug?: string,
): Promise<DbActionResult<BranchDayClose>> {
  try {
    await ensureDayCloseSchema();
    const userRes = await getCurrentUserAction(branchSlug);
    if (!userRes.success || !userRes.data) return { success: false, error: 'You must be signed in.' };
    const user = userRes.data;

    const existing = await query(
      `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 AND business_date = $2`,
      [branchId, businessDate],
    );
    if (!existing.rows[0]) return { success: false, error: 'No open session for this date.' };
    const record = parseDayCloseRow(existing.rows[0] as Record<string, unknown>);
    if (record.status === 'closed') return { success: false, error: 'This day is already closed.' };

    const branchRes = await query(`SELECT * FROM branches WHERE id = $1`, [branchId]);
    const branch = mapBranchRow(branchRes.rows[0] as Record<string, unknown>);

    const { rows: ledgerRows } = await query(`SELECT * FROM ledgers`);
    const branchLedgers = filterBranchLedgers(
      ledgerRows.map(l => ({
        id: String(l.id),
        branchId: l.branch_id ? String(l.branch_id) : undefined,
        name: String(l.name),
        impact: l.impact as import('@/types').Ledger['impact'],
        isKpi: Boolean(l.is_kpi),
        kpiInvert: Boolean(l.kpi_invert),
        sortOrder: Number(l.sort_order || 0),
      })),
      branchId,
    );

    const { rows: txnRows } = await query(`SELECT * FROM transactions WHERE branch_id = $1`, [branchId]);
    const txns = txnRows.map(r => mapTxnRow(r as Record<string, unknown>, branch.timezone));

    const closing: DayKpiSnapshot = computeKpiSnapshot(branch, branchLedgers, txns, businessDate);

    await query(
      `UPDATE branch_day_closes
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = $3, closing_snapshot = $4
       WHERE branch_id = $1 AND business_date = $2`,
      [branchId, businessDate, user.email || user.name, JSON.stringify(closing)],
    );

    const nextDate = addDays(businessDate, 1);
    const { rows: allRows } = await query(
      `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 ORDER BY business_date DESC LIMIT 120`,
      [branchId],
    );
    const allCloses = allRows.map(r => parseDayCloseRow(r as Record<string, unknown>));
    const hasNext = allCloses.some(d => d.businessDate === nextDate);
    if (!hasNext) {
      await query(
        `INSERT INTO branch_day_closes (id, branch_id, business_date, status, opening_snapshot)
         VALUES ($1, $2, $3, 'open', $4)
         ON CONFLICT (branch_id, business_date) DO NOTHING`,
        [newId(), branchId, nextDate, JSON.stringify(closing)],
      );
    }

    const { rows } = await query(
      `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 AND business_date = $2`,
      [branchId, businessDate],
    );
    return { success: true, data: parseDayCloseRow(rows[0] as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: formatPgError(e) };
  }
}
