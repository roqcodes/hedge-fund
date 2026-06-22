/**
 * Shared PostgreSQL fragments for branch business_date handling.
 * Keep backfill + reads consistent across server actions and scripts.
 */

/** Recompute transactions.business_date from timestamptz in each branch's IANA zone. */
export const SQL_BACKFILL_TRANSACTION_BUSINESS_DATES = `
  UPDATE transactions t
  SET business_date = (t.date AT TIME ZONE COALESCE(b.timezone, 'Asia/Dubai'))::date
  FROM branches b
  WHERE t.branch_id = b.id
`;

export const SQL_BACKFILL_TRANSACTION_BUSINESS_DATES_ORPHAN = `
  UPDATE transactions
  SET business_date = (date AT TIME ZONE 'Asia/Dubai')::date
  WHERE branch_id IS NULL
`;

/** SELECT list — cast DATE to text so node-pg never returns timezone-shifted Date objects. */
export const SQL_BRANCH_DAY_CLOSE_SELECT = `
  SELECT
    id,
    branch_id,
    business_date::text AS business_date,
    status,
    opened_at,
    closed_at,
    closed_by,
    opening_snapshot,
    closing_snapshot
  FROM branch_day_closes
`;
