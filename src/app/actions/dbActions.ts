'use server';

import { getCurrentUserAction } from '@/app/actions/auth';
import { assertStaffWriteAccess, assertStaffDealWriteAccess } from '@/app/actions/permissionActions';
import { replaceDealStaffAssignments, fetchDealStaffAssignmentsBatch } from '@/lib/dealPermissions';
import type { BranchPageId } from '@/lib/branchPages';
import { hasFullBranchAccess, isBranchScopedUser, isCustomerRole, isInvestorRole } from '@/lib/rbac';
import { query, pool } from '@/lib/db';
import { ensureDbSchema } from '@/lib/dbSchema';
import { DEFAULT_BRANCH_TIMEZONE, resolveBranchTimeZone, toBusinessDate, parseCalendarDate, todayInTimeZone } from '@/lib/businessTime';
import {
  canModifyTransactionsOnDate,
  LOCKED_TRANSACTION_ERROR,
  parseDayCloseRow,
  resolveDailyCloseContext,
} from '@/lib/dailyClose';
import {
  SQL_BACKFILL_TRANSACTION_BUSINESS_DATES,
  SQL_BACKFILL_TRANSACTION_BUSINESS_DATES_ORPHAN,
  SQL_BRANCH_DAY_CLOSE_SELECT,
} from '@/lib/sql/businessDateSql';
import { filterBranchLedgers } from '@/lib/ledgers';
import { computeDealBuyAggregates, type DealBuyAggregates } from '@/lib/dealCalculations';
import { computeDealSettlement } from '@/lib/dealSettlementCalculations';
import { mapPhysicalBuyRow, mapPhysicalSellRow, mapPhysicalBulkSellRow } from '@/lib/physicalMappers';
import { mapUsdtBuyRow, mapUsdtSellRow, mapUsdtSettingsRow } from '@/lib/usdtMappers';
import {
  mapICRegionRow,
  mapICSupplierRow,
  mapICWarehouseRow,
  mapICRateGroupRow,
  mapICPurchaseRow,
  mapICSaleRow,
  mapICWarehouseTransactionRow,
} from '@/lib/icTransferMappers';
import { filterRateGroupsForCustomerPortal,
  stripAdminRatesFromSale,
} from '@/lib/icTransfer/customerPortalScope';
import { mapICTransferSettingsRow } from '@/lib/icTransfer/settings';
import { logger } from '@/lib/logger';
import { SQL_INVESTOR_DEALS, SQL_INVESTOR_DEAL_TRANSACTIONS, SQL_INVESTOR_DEAL_TRANSACTION_DETAIL } from '@/lib/investorPortalSql';
import { createInvestorCognitoUser, deleteInvestorCognitoUser } from '@/app/actions/cognitoActions';
import { SQL_DEALS_WITH_INVESTORS, SQL_DEAL_TRANSACTIONS_LIST, SQL_DEAL_TRANSACTION_DETAIL } from '@/lib/initialDataSql';
import {
  mapDealTransactionDetailRow,
  mapDealTransactionListRow,
} from '@/lib/dealTransactionMappers';

import type { User } from '@/types';
import { sanitizeEnabledCurrencies } from '@/lib/currency';
import { normalizeHiddenPages } from '@/lib/branchPages';
import { validateJournalEntry } from '@/lib/journalEntry';
import {
  Branch,
  BranchDayClose,
  Transaction,
  Expense,
  Invoice,
  Notification,
  Investor,
  Deal,
  DealTransaction,
  DealTransactionBuy,
  DealTransactionExpense,
  Entity,
  PhysicalBalance,
  PhysicalBuy,
  PhysicalBulkSell,
  PhysicalSell,
  UsdtBranchSettings,
  UsdtBuy,
  UsdtSell,
  ICRegion,
  ICSupplier,
  ICWarehouse,
  ICRateGroup,
  ICTransferSettings,
  ICPurchase,
  ICSale,
  ICWarehouseTransaction,
} from '@/types';
import {
  addBranchSchema,
  transferFundsSchema,
  addInvoiceSchema,
  addExpenseSchema,
  addInvestorSchema,
  addDealSchema,
  updateDealSchema,
} from '@/lib/validations';
import {
  validateTransactionsPageBackup,
  type TransactionsPageBackup,
} from '@/lib/transactionsBackup';

export interface DbActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Helper to convert raw Postgres errors into human-readable messages.
 */
function formatPgError(error: unknown): string {
  if (error instanceof Error) {
    const pgError = error as { code?: string; constraint?: string; message?: string };
    // Check for foreign key constraint violations
    if (pgError.code === '23503') {
      if (pgError.constraint === 'deal_investors_investor_id_fkey') {
        return 'Selected investor does not exist in the database. Please refresh the page to sync your data.';
      }
      return 'A related record does not exist in the database.';
    }
    // Check for unique constraint violations
    if (pgError.code === '23505') {
      if (pgError.constraint?.includes('email')) return 'An investor with this email already exists.';
      if (pgError.constraint?.includes('branches_name')) return 'A branch with this name already exists.';
      return 'A record with these details already exists.';
    }
    return error.message;
  }
  return 'An unknown database error occurred.';
}

type PgQueryClient = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

async function assertLedgerTransactionModifiable(
  client: PgQueryClient,
  txnId: string,
): Promise<DbActionResult<void>> {
  const txnRes = await client.query(
    'SELECT branch_id, business_date::text AS business_date, date FROM transactions WHERE id = $1',
    [txnId],
  );
  if (!txnRes.rows.length) return { success: false, error: 'Transaction not found.' };

  const row = txnRes.rows[0];
  const branchId = row.branch_id ? String(row.branch_id) : null;
  if (!branchId) return { success: true, data: undefined };

  const tzRes = await client.query('SELECT timezone FROM branches WHERE id = $1', [branchId]);
  const branchTz = resolveBranchTimeZone(
    tzRes.rows[0]?.timezone ? String(tzRes.rows[0].timezone) : null,
  );
  const businessDate = row.business_date
    ? parseCalendarDate(row.business_date)
    : toBusinessDate(new Date(String(row.date)).toISOString(), branchTz);

  const closesRes = await client.query(
    `${SQL_BRANCH_DAY_CLOSE_SELECT} WHERE branch_id = $1 ORDER BY business_date DESC LIMIT 120`,
    [branchId],
  );
  const dayCloses: BranchDayClose[] = closesRes.rows.map(r =>
    parseDayCloseRow(r as Record<string, unknown>),
  );
  const today = todayInTimeZone(branchTz);
  const { workingDate } = resolveDailyCloseContext(dayCloses, today);

  if (!canModifyTransactionsOnDate(businessDate, dayCloses, workingDate)) {
    return { success: false, error: LOCKED_TRANSACTION_ERROR };
  }
  return { success: true, data: undefined };
}

export interface InitialDataPayload {
  globalBranches: Branch[];
  globalEntities: Entity[];
  branches: Branch[];
  transactions: Transaction[];
  expenses: Expense[];
  invoices: Invoice[];
  notifications: Notification[];
  investors: Investor[];
  deals: Deal[];
  hqBalance: number;
  dealTransactions: DealTransaction[];
  entities: Entity[];
  ledgers: import('@/types').Ledger[];
  transactionTags: import('@/types').TransactionTag[];
  physicalBalances: PhysicalBalance[];
  physicalBuys: PhysicalBuy[];
  physicalSells: PhysicalSell[];
  physicalBulkSells: PhysicalBulkSell[];
  usdtBuys: UsdtBuy[];
  usdtSells: UsdtSell[];
  usdtSettings: UsdtBranchSettings[];
  icRegions: ICRegion[];
  icSuppliers: ICSupplier[];
  icWarehouses: ICWarehouse[];
  icRateGroups: ICRateGroup[];
  icTransferSettings: ICTransferSettings;
  icPurchases: ICPurchase[];
  icSales: ICSale[];
  icWarehouseTransactions: ICWarehouseTransaction[];
}

type DbGuardFail = { success: false; error: string };

async function resolveBranchSlug(branchId?: string): Promise<string | undefined> {
  if (!branchId) return undefined;
  const res = await query('SELECT slug FROM branches WHERE id = $1 LIMIT 1', [branchId]);
  return res.rows[0]?.slug as string | undefined;
}

/** Read session from branch portal cookie first, then superadmin fallback. */
async function resolveCurrentUser(
  branchSlug?: string,
  branchId?: string,
): Promise<User | null> {
  const slug = branchSlug ?? (branchId ? await resolveBranchSlug(branchId) : undefined);
  if (slug) {
    const branchUser = (await getCurrentUserAction(slug)).data;
    if (branchUser) return branchUser;
  }
  return (await getCurrentUserAction()).data ?? null;
}

async function resolveDealBranchIdFromTransaction(transactionId: string): Promise<string | undefined> {
  const res = await query(
    `SELECT d.managing_branch_id
     FROM deal_transactions dt
     INNER JOIN deals d ON d.id = dt.deal_id
     WHERE dt.id = $1
     LIMIT 1`,
    [transactionId],
  );
  const branchId = res.rows[0]?.managing_branch_id;
  return branchId ? String(branchId) : undefined;
}

async function guardStaffWrite(
  pageId: BranchPageId,
  branchSlug?: string,
  branchId?: string,
): Promise<DbGuardFail | null> {
  const user = await resolveCurrentUser(branchSlug, branchId);
  const err = await assertStaffWriteAccess(user, pageId, branchId ?? user?.branchId);
  return err ? { success: false, error: err } : null;
}

async function guardStaffDealWrite(
  dealId: string,
  branchSlug?: string,
  branchId?: string,
): Promise<DbGuardFail | null> {
  const user = await resolveCurrentUser(branchSlug, branchId);
  const err = await assertStaffDealWriteAccess(user, dealId, branchId ?? user?.branchId);
  return err ? { success: false, error: err } : null;
}

async function resolveDealBranchId(dealId: string): Promise<string | undefined> {
  const res = await query(`SELECT managing_branch_id FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
  return res.rows[0]?.managing_branch_id as string | undefined;
}

async function guardStaffDealWriteByTxn(dealTransactionId: string): Promise<DbGuardFail | null> {
  const res = await query(`SELECT deal_id FROM deal_transactions WHERE id = $1 LIMIT 1`, [dealTransactionId]);
  const dealId = res.rows[0]?.deal_id as string | undefined;
  if (!dealId) return { success: false, error: 'Deal transaction not found.' };
  const branchId = await resolveDealBranchId(dealId);
  return guardStaffDealWrite(dealId, undefined, branchId);
}

async function requireStaffOrManagerRead(
  branchSlug?: string,
  branchId?: string,
): Promise<{ user: User } | DbGuardFail> {
  const user = await resolveCurrentUser(branchSlug, branchId);
  if (!user) return { success: false, error: 'You must be signed in.' };
  if (isInvestorRole(user.role) || isCustomerRole(user.role)) {
    return { success: false, error: 'Access denied.' };
  }
  return { user };
}

async function requireInvestorSession(
  investorId: string,
  branchId: string,
): Promise<{ user: User } | DbGuardFail> {
  const branchSlug = await resolveBranchSlug(branchId);
  if (!branchSlug) {
    return { success: false, error: 'Branch not found.' };
  }
  const userRes = await getCurrentUserAction(branchSlug);
  const user = userRes.success ? userRes.data : null;
  if (!user || !isInvestorRole(user.role)) {
    return { success: false, error: 'Unauthorized.' };
  }
  if (!user.investorId || user.investorId !== investorId) {
    return { success: false, error: 'Access denied.' };
  }
  if (!user.branchId || user.branchId !== branchId) {
    return { success: false, error: 'Access denied.' };
  }
  return { user };
}

async function requireInvestorSessionForTxn(
  investorId: string,
): Promise<{ user: User } | DbGuardFail> {
  const branchRes = await query(
    'SELECT assigned_branch_id FROM investors WHERE id = $1 LIMIT 1',
    [investorId],
  );
  const branchId = branchRes.rows[0]?.assigned_branch_id as string | undefined;
  if (!branchId) {
    return { success: false, error: 'Unauthorized.' };
  }
  return requireInvestorSession(investorId, branchId);
}

function mapInvestorPortalBranch(r: Record<string, unknown>): Branch {
  return {
    id: String(r.id),
    slug: (r.slug as string) || String(r.name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: String(r.name),
    logo_url: r.logo_url as string | undefined,
    address: r.address as string | undefined,
    city: r.city as string | undefined,
    country: r.country as string | undefined,
    trn: r.trn as string | undefined,
    phone: r.phone as string | undefined,
    email: r.email as string | undefined,
    website: r.website as string | undefined,
    location: r.location ? String(r.location) : '',
    managerName: r.manager_name ? String(r.manager_name) : '',
    cashBalance: 0,
    goldBalance: 0,
    currentBalance: 0,
    openingBalance: 0,
    openingGoldBalance: 0,
    closingBalance: 0,
    dailyPL: 0,
    status: r.status as Branch['status'],
    timezone: resolveBranchTimeZone(r.timezone ? String(r.timezone) : null),
    hiddenPages: normalizeHiddenPages(Array.isArray(r.hidden_pages) ? (r.hidden_pages as string[]).map(String) : []),
    enabledCurrencies: sanitizeEnabledCurrencies(r.enabled_currencies),
    lastActivity: r.last_activity ? new Date(r.last_activity as string).toISOString() : new Date().toISOString(),
    createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : new Date().toISOString(),
  };
}

/**
 * Fetches all database records for initial dashboard hydration in a single step.
 *
 * Uses JOINs + json_agg for investors/deals to eliminate N+1 queries.
 */
export async function fetchInitialDataAction(branchSlug?: string): Promise<DbActionResult<InitialDataPayload>> {
  try {
    await ensureDbSchema();

    const userRes = await getCurrentUserAction(branchSlug);
    const currentUser = userRes.success ? userRes.data : null;

    if (currentUser && isInvestorRole(currentUser.role)) {
      return { success: false, error: 'Investor portal users cannot access manager data.' };
    }

    const isBranchScoped =
      !!currentUser && isBranchScopedUser(currentUser) && !!currentUser.branchId;
    const branchId = isBranchScoped ? currentUser!.branchId! : null;
    const isStaff = currentUser?.role === 'staff';
    const staffUserId = isStaff && currentUser?.id ? currentUser.id : null;

    const [hqRes, branchesRes, staffPermRes] = await Promise.all([
      query('SELECT amount FROM hq_balance WHERE id = 1'),
      query('SELECT * FROM branches ORDER BY id ASC'),
      staffUserId
        ? query('SELECT deal_id FROM user_deal_permissions WHERE user_id = $1', [staffUserId])
        : Promise.resolve({ rows: [] as { deal_id: string }[] }),
    ]);

    const hqBalance = hqRes.rows.length > 0 ? parseFloat(hqRes.rows[0].amount) : 50000000;

    const branches: Branch[] = branchesRes.rows.map((r) => ({
      id: r.id,
      slug: r.slug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: r.name,
      logo_url: r.logo_url,
      address: r.address,
      city: r.city,
      country: r.country,
      trn: r.trn,
      phone: r.phone,
      email: r.email,
      website: r.website,
      location: r.location,
      managerName: r.manager_name,
      cashBalance: parseFloat(r.cash_balance),
      goldBalance: parseFloat(r.gold_balance || '0'),
      currentBalance: parseFloat(r.current_balance),
      openingBalance: parseFloat(r.opening_balance),
      openingGoldBalance: parseFloat(r.opening_gold_balance || '0'),
      closingBalance: parseFloat(r.closing_balance),
      dailyPL: parseFloat(r.daily_pl),
      status: r.status,
      timezone: resolveBranchTimeZone(r.timezone ? String(r.timezone) : null),
      hiddenPages: normalizeHiddenPages(Array.isArray(r.hidden_pages) ? r.hidden_pages.map(String) : []),
      enabledCurrencies: sanitizeEnabledCurrencies(r.enabled_currencies),
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    const branchName = branchId ? branches.find((b) => b.id === branchId)?.name ?? branchId : null;
    const staffDealIds = staffUserId ? staffPermRes.rows.map((r) => r.deal_id as string) : [];
    const staffFilterActive = !!staffUserId;

    const branchTzById = Object.fromEntries(
      branches.map((b) => [b.id, resolveBranchTimeZone(b.timezone)]),
    );

    const customerSession =
      !!currentUser && isCustomerRole(currentUser.role) && !!currentUser.customerId;

    const [
      txRes,
      tagLinksRes,
      expRes,
      invRes,
      notifRes,
      investorsRes,
      dealsRes,
      dealTxRes,
      entitiesRes,
      ledgersRes,
      transactionTagsRes,
      physicalBalancesRes,
      physicalBuysRes,
      physicalSellsRes,
      physicalBulkSellsRes,
      usdtBuysRes,
      usdtSellsRes,
      usdtSettingsRes,
      icRegionsRes,
      icSuppliersRes,
      icWarehousesRes,
      icTransferSettingsRes,
      icRateGroupsRes,
      icPurchasesRes,
      icSalesRes,
      icWarehouseTxRes,
    ] = await Promise.all([
      branchId
        ? query(
            `SELECT * FROM transactions
             WHERE branch_id = $1 OR from_entity = $2 OR to_entity = $2
             ORDER BY date DESC`,
            [branchId, branchName],
          )
        : query('SELECT * FROM transactions ORDER BY date DESC'),
      query(`
        SELECT ttl.transaction_id, tt.id, tt.name
        FROM transaction_tag_links ttl
        JOIN transaction_tags tt ON tt.id = ttl.tag_id
        ${branchId ? `WHERE tt.branch_id = $1 OR tt.branch_id IS NULL` : ''}
      `, branchId ? [branchId] : []).catch(() => ({ rows: [] as { transaction_id: string; id: string; name: string }[] })),
      branchId
        ? query('SELECT * FROM expenses WHERE branch_id = $1 ORDER BY date DESC', [branchId])
        : query('SELECT * FROM expenses ORDER BY date DESC'),
      branchId
        ? query('SELECT * FROM invoices WHERE branch_id = $1 ORDER BY date DESC', [branchId])
        : query('SELECT * FROM invoices ORDER BY date DESC'),
      query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50'),
      branchId
        ? query(
            `SELECT i.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', d.id,
                    'date', d.date,
                    'type', d.type,
                    'amount', d.amount,
                    'goldGrams', d.gold_grams,
                    'notes', d.notes
                  )
                ) FILTER (WHERE d.id IS NOT NULL),
                '[]'::json
              ) AS deposits
            FROM investors i
            LEFT JOIN investor_deposits d ON d.investor_id = i.id
            WHERE i.assigned_branch_id = $1 OR i.is_global = true
            GROUP BY i.id
            ORDER BY i.joined_date DESC`,
            [branchId],
          )
        : query(`
            SELECT i.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', d.id,
                    'date', d.date,
                    'type', d.type,
                    'amount', d.amount,
                    'goldGrams', d.gold_grams,
                    'notes', d.notes
                  )
                ) FILTER (WHERE d.id IS NOT NULL),
                '[]'::json
              ) AS deposits
            FROM investors i
            LEFT JOIN investor_deposits d ON d.investor_id = i.id
            GROUP BY i.id
            ORDER BY i.joined_date DESC
          `),
      query(SQL_DEALS_WITH_INVESTORS, [branchId, staffFilterActive, staffDealIds]),
      query(SQL_DEAL_TRANSACTIONS_LIST, [branchId, staffFilterActive, staffDealIds]),
      branchId
        ? query('SELECT * FROM entities WHERE branch_id IS NULL OR branch_id = $1 ORDER BY created_at DESC', [branchId])
        : query('SELECT * FROM entities ORDER BY created_at DESC'),
      query('SELECT * FROM ledgers ORDER BY sort_order ASC, created_at ASC'),
      query(
        branchId
          ? 'SELECT * FROM transaction_tags WHERE branch_id IS NULL OR branch_id = $1 ORDER BY name ASC'
          : 'SELECT * FROM transaction_tags ORDER BY name ASC',
        branchId ? [branchId] : [],
      ).catch(() => ({ rows: [] })),
      branchId
        ? query('SELECT * FROM physical_balances WHERE branch_id = $1', [branchId])
        : query('SELECT * FROM physical_balances'),
      branchId
        ? query('SELECT * FROM physical_buys WHERE branch_id = $1 ORDER BY date DESC', [branchId])
        : query('SELECT * FROM physical_buys ORDER BY date DESC'),
      branchId
        ? query(
            `SELECT ps.* FROM physical_sells ps
             INNER JOIN physical_buys pb ON pb.id = ps.buy_id
             WHERE pb.branch_id = $1
             ORDER BY ps.date DESC`,
            [branchId],
          )
        : query('SELECT * FROM physical_sells ORDER BY date DESC'),
      branchId
        ? query('SELECT * FROM physical_bulk_sells WHERE branch_id = $1 ORDER BY date DESC', [branchId])
        : query('SELECT * FROM physical_bulk_sells ORDER BY date DESC'),
      branchId
        ? query('SELECT * FROM usdt_buys WHERE branch_id = $1 ORDER BY date DESC', [branchId])
        : query('SELECT * FROM usdt_buys ORDER BY date DESC'),
      branchId
        ? query('SELECT * FROM usdt_sells WHERE branch_id = $1 ORDER BY date DESC', [branchId])
        : query('SELECT * FROM usdt_sells ORDER BY date DESC'),
      branchId
        ? query('SELECT * FROM usdt_branch_settings WHERE branch_id = $1', [branchId])
        : query('SELECT * FROM usdt_branch_settings'),
      query('SELECT * FROM ic_regions'),
      query('SELECT * FROM ic_suppliers'),
      query('SELECT * FROM ic_warehouses'),
      query(
        `SELECT sales_enabled, auto_rate_reset_enabled, updated_at, updated_by
         FROM ic_transfer_settings WHERE id = 'global' LIMIT 1`,
      ),
      query(`
        SELECT g.*,
          COALESCE((SELECT array_agg(customer_id) FROM ic_rate_group_customers WHERE group_id = g.id), ARRAY[]::varchar[]) as customer_ids,
          COALESCE((SELECT array_agg(branch_id) FROM ic_rate_group_branches WHERE group_id = g.id), ARRAY[]::varchar[]) as branch_ids
        FROM ic_rate_groups g
      `),
      query('SELECT * FROM ic_purchases ORDER BY created_at DESC'),
      customerSession
        ? query(
            `SELECT s.*, a.name as delivery_agent_name
             FROM ic_sales s
             LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
             WHERE s.order_customer_id = $1
             ORDER BY s.created_at DESC`,
            [currentUser!.customerId],
          )
        : query(
            `SELECT s.*, a.name as delivery_agent_name
             FROM ic_sales s
             LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
             ORDER BY s.created_at DESC`,
          ),
      query('SELECT * FROM ic_warehouse_transactions ORDER BY created_at DESC'),
    ]);

    const staffAssignmentsPromise = fetchDealStaffAssignmentsBatch(
      dealsRes.rows.map((r) => r.id as string),
    );

    const tagsByTxnId: Record<string, { id: string; name: string }[]> = {};
    for (const row of tagLinksRes.rows) {
      if (!tagsByTxnId[row.transaction_id]) tagsByTxnId[row.transaction_id] = [];
      tagsByTxnId[row.transaction_id].push({ id: row.id, name: row.name });
    }

    const transactions: Transaction[] = txRes.rows.map((r) => {
      const linked = tagsByTxnId[r.id] || [];
      const branchTz = r.branch_id ? branchTzById[String(r.branch_id)] : DEFAULT_BRANCH_TIMEZONE;
      const isoDate = new Date(r.date).toISOString();
      return {
        id: r.id,
        date: isoDate,
        from: r.from_entity,
        to: r.to_entity,
        amount: parseFloat(r.amount),
        type: r.type,
        assetType: r.asset_type || 'currency',
        status: r.status,
        notes: r.notes,
        category: r.category || undefined,
        branchId: r.branch_id || undefined,
        businessDate: r.business_date ? parseCalendarDate(r.business_date) : toBusinessDate(isoDate, branchTz),
        enteredByUsername: r.entered_by ? String(r.entered_by) : undefined,
        enteredByName: r.entered_by_name ? String(r.entered_by_name) : undefined,
        tags: linked.map((t) => t.name),
        tagIds: linked.map((t) => t.id),
      };
    });

    const expenses: Expense[] = expRes.rows.map((r) => ({
      id: r.id,
      date: new Date(r.date).toISOString().slice(0, 10),
      branchId: r.branch_id,
      branchName: r.branch_name,
      type: r.type,
      category: r.category,
      description: r.description,
      amount: parseFloat(r.amount),
      paymentMethod: r.payment_method ?? undefined,
    }));

    const invoices: Invoice[] = invRes.rows.map((r) => ({
      id: r.id,
      clientName: r.client_name,
      branchId: r.branch_id,
      branchName: r.branch_name,
      amount: parseFloat(r.amount),
      description: r.description,
      date: new Date(r.date).toISOString().slice(0, 10),
      status: r.status,
    }));

    const notifications: Notification[] = notifRes.rows.map((r) => ({
      id: r.id,
      message: r.message,
      time: r.time,
      read: r.read,
      type: r.type,
    }));

    const investors: Investor[] = investorsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      nationality: r.nationality,
      emiratesId: r.emirates_id || undefined,
      passportNo: r.passport_no || undefined,
      address: r.address,
      city: r.city,
      country: r.country,
      cashDeposit: parseFloat(r.cash_deposit),
      goldDeposit: parseFloat(r.gold_deposit),
      goldWeightGrams: parseFloat(r.gold_weight_grams),
      status: r.status,
      riskProfile: r.risk_profile,
      kycStatus: r.kyc_status,
      joinedDate: new Date(r.joined_date).toISOString().slice(0, 10),
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : new Date().toISOString(),
      assignedBranchId: r.assigned_branch_id || undefined,
      assignedBranchName: r.assigned_branch_name || undefined,
      isGlobal: r.is_global,
      preferredContact: r.preferred_contact,
      notes: r.notes || undefined,
      depositHistory: (r.deposits as Array<{
        id: string;
        date: string;
        type: 'cash' | 'gold';
        amount: string;
        goldGrams: string | null;
        notes: string | null;
      }>).map((d) => ({
        id: d.id,
        date: new Date(d.date).toISOString().slice(0, 10),
        type: d.type,
        amount: parseFloat(d.amount),
        goldGrams: d.goldGrams ? parseFloat(d.goldGrams) : undefined,
        notes: d.notes || undefined,
      })),
    }));

    const deals: Deal[] = dealsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: parseFloat(r.amount),
      investors: (r.deal_investors_json as Array<{
        investorId: string;
        investorName: string;
        amount: string;
        isGold: boolean;
      }>).map((di) => ({
        investorId: di.investorId,
        investorName: di.investorName,
        amount: parseFloat(di.amount),
        isGold: di.isGold,
      })),
      totalInvestment: parseFloat(r.total_investment),
      balance: parseFloat(r.balance),
      toBranchId: r.to_branch_id,
      toBranchName: r.to_branch_name,
      groupName: r.group_name,
      groupType: r.group_type,
      totalPL: parseFloat(r.total_pl),
      expense: parseFloat(r.expense),
      managerShare: parseFloat(r.manager_share || '20.00'),
      goldVolume: parseFloat(r.gold_volume || '0.00'),
      managingBranchId: r.managing_branch_id || undefined,
      status: r.status,
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
    }));

    try {
      const staffAssignmentsByDeal = await staffAssignmentsPromise;
      for (const deal of deals) {
        deal.staffAssignments = staffAssignmentsByDeal[deal.id] ?? [];
      }
    } catch (staffPermError) {
      logger.warn({ error: staffPermError }, 'Could not load deal staff assignments');
      for (const deal of deals) {
        deal.staffAssignments = [];
      }
    }

    const dealTransactions: DealTransaction[] = dealTxRes.rows.map((r) =>
      mapDealTransactionListRow(r as Record<string, unknown>),
    );

    const entities: Entity[] = entitiesRes.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || undefined,
      branchId: r.branch_id || undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    const ledgers: import('@/types').Ledger[] = ledgersRes.rows.map((r: any) => ({
      id: r.id,
      branchId: r.branch_id || undefined,
      name: r.name,
      impact: r.impact,
      isKpi: r.is_kpi,
      kpiInvert: Boolean(r.kpi_invert),
      sortOrder: r.sort_order,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    const transactionTags: import('@/types').TransactionTag[] = transactionTagsRes.rows.map((r: any) => ({
      id: r.id,
      branchId: r.branch_id || undefined,
      name: r.name,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    const physicalBalances = physicalBalancesRes.rows.map((r) => ({
      branchId: r.branch_id,
      initialCapital: parseFloat(r.initial_capital),
      initialVolume: parseFloat(r.initial_volume),
      availableFund: parseFloat(r.available_fund),
      availableVolume: parseFloat(r.available_volume),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));

    const physicalBuys = physicalBuysRes.rows.map((r) => mapPhysicalBuyRow(r));
    const physicalSells = physicalSellsRes.rows.map((r) => mapPhysicalSellRow(r));
    const physicalBulkSells = physicalBulkSellsRes.rows.map((r) => mapPhysicalBulkSellRow(r));
    const usdtBuys = usdtBuysRes.rows.map((r) => mapUsdtBuyRow(r));
    const usdtSells = usdtSellsRes.rows.map((r) => mapUsdtSellRow(r));
    const usdtSettings = usdtSettingsRes.rows.map((r) => mapUsdtSettingsRow(r));

    const icRegions = icRegionsRes.rows.map((r) => mapICRegionRow(r));
    const icSuppliers = icSuppliersRes.rows.map((r) => mapICSupplierRow(r));
    const icWarehouses = icWarehousesRes.rows.map((r) => mapICWarehouseRow(r));
    const icTransferSettings = mapICTransferSettingsRow(icTransferSettingsRes.rows[0]);
    const icPurchases = icPurchasesRes.rows.map((r) => mapICPurchaseRow(r));
    let icSales = icSalesRes.rows.map((r) => mapICSaleRow(r));
    const icWarehouseTransactions = icWarehouseTxRes.rows.map((r) => mapICWarehouseTransactionRow(r));
    let icRateGroups = icRateGroupsRes.rows.map((r) => mapICRateGroupRow(r));

    if (customerSession && currentUser?.customerId) {
      const parentId = currentUser.customerId;
      let custBranchId = currentUser.branchId || '';
      if (!custBranchId) {
        const custBranchRes = await query(
          `SELECT branch_id FROM customers WHERE id = $1 LIMIT 1`,
          [parentId],
        );
        custBranchId = custBranchRes.rows[0]?.branch_id
          ? String(custBranchRes.rows[0].branch_id)
          : '';
      }
      icSales = icSales.map(stripAdminRatesFromSale);
      icRateGroups = filterRateGroupsForCustomerPortal(icRateGroups, parentId, custBranchId || undefined);
    } else {
      icSales = icSales.map((sale) => {
        const { subCustomerId: _id, subCustomerName: _name, ...rest } = sale;
        return rest;
      });
    }

    const finalBranches = branchId ? branches.filter((b) => b.id === branchId) : branches;
    const finalLedgers = branchId ? filterBranchLedgers(ledgers, branchId) : ledgers;

    return {
      success: true,
      data: {
        globalBranches: branches,
        globalEntities: entities,
        branches: finalBranches,
        transactions,
        expenses,
        invoices,
        notifications,
        investors,
        deals,
        hqBalance,
        dealTransactions,
        entities,
        ledgers: finalLedgers,
        transactionTags,
        physicalBalances,
        physicalBuys,
        physicalSells,
        physicalBulkSells,
        usdtBuys,
        usdtSells,
        usdtSettings,
        icRegions,
        icSuppliers,
        icWarehouses,
        icRateGroups,
        icTransferSettings,
        icPurchases,
        icSales,
        icWarehouseTransactions,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data.';
    logger.error({ error, branchSlug }, 'Failed to fetch initial data from Postgres');
    return { success: false, error: message };
  }
}

export interface DealsDataPayload {
  globalBranches: Branch[];
  branches: Branch[];
  investors: Investor[];
  deals: Deal[];
  dealTransactions: DealTransaction[];
  hqBalance: number;
}

/**
 * Lightweight fetch for Groups & Deals pages — avoids IC/physical/USDT/ledger queries.
 * Use for polling and manual refresh while on group routes.
 */
export async function fetchDealsDataAction(branchSlug?: string): Promise<DbActionResult<DealsDataPayload>> {
  try {
    const userRes = await getCurrentUserAction(branchSlug);
    const currentUser = userRes.success ? userRes.data : null;

    if (currentUser && isInvestorRole(currentUser.role)) {
      return { success: false, error: 'Investor portal users cannot access manager data.' };
    }

    const isBranchScoped =
      !!currentUser && isBranchScopedUser(currentUser) && !!currentUser.branchId;
    const branchId = isBranchScoped ? currentUser!.branchId! : null;
    const isStaff = currentUser?.role === 'staff';
    const staffUserId = isStaff && currentUser?.id ? currentUser.id : null;

    const [hqRes, branchesRes, staffPermRes] = await Promise.all([
      query('SELECT amount FROM hq_balance WHERE id = 1'),
      query('SELECT * FROM branches ORDER BY id ASC'),
      staffUserId
        ? query('SELECT deal_id FROM user_deal_permissions WHERE user_id = $1', [staffUserId])
        : Promise.resolve({ rows: [] as { deal_id: string }[] }),
    ]);

    const staffDealIds = staffUserId ? staffPermRes.rows.map((r) => r.deal_id as string) : [];
    const staffFilterActive = !!staffUserId;

    const [investorsRes, dealsRes, dealTxRes] = await Promise.all([
      branchId
        ? query(
            `SELECT i.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', d.id,
                    'date', d.date,
                    'type', d.type,
                    'amount', d.amount,
                    'goldGrams', d.gold_grams,
                    'notes', d.notes
                  )
                ) FILTER (WHERE d.id IS NOT NULL),
                '[]'::json
              ) AS deposits
            FROM investors i
            LEFT JOIN investor_deposits d ON d.investor_id = i.id
            WHERE i.assigned_branch_id = $1 OR i.is_global = true
            GROUP BY i.id
            ORDER BY i.joined_date DESC`,
            [branchId],
          )
        : query(`
            SELECT i.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', d.id,
                    'date', d.date,
                    'type', d.type,
                    'amount', d.amount,
                    'goldGrams', d.gold_grams,
                    'notes', d.notes
                  )
                ) FILTER (WHERE d.id IS NOT NULL),
                '[]'::json
              ) AS deposits
            FROM investors i
            LEFT JOIN investor_deposits d ON d.investor_id = i.id
            GROUP BY i.id
            ORDER BY i.joined_date DESC
          `),
      query(SQL_DEALS_WITH_INVESTORS, [branchId, staffFilterActive, staffDealIds]),
      query(SQL_DEAL_TRANSACTIONS_LIST, [branchId, staffFilterActive, staffDealIds]),
    ]);

    const hqBalance = hqRes.rows.length > 0 ? parseFloat(hqRes.rows[0].amount) : 50000000;

    const branches: Branch[] = branchesRes.rows.map((r) => ({
      id: r.id,
      slug: r.slug || r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: r.name,
      logo_url: r.logo_url,
      address: r.address,
      city: r.city,
      country: r.country,
      trn: r.trn,
      phone: r.phone,
      email: r.email,
      website: r.website,
      location: r.location,
      managerName: r.manager_name,
      cashBalance: parseFloat(r.cash_balance),
      goldBalance: parseFloat(r.gold_balance || '0'),
      currentBalance: parseFloat(r.current_balance),
      openingBalance: parseFloat(r.opening_balance),
      openingGoldBalance: parseFloat(r.opening_gold_balance || '0'),
      closingBalance: parseFloat(r.closing_balance),
      dailyPL: parseFloat(r.daily_pl),
      status: r.status,
      timezone: resolveBranchTimeZone(r.timezone ? String(r.timezone) : null),
      hiddenPages: normalizeHiddenPages(Array.isArray(r.hidden_pages) ? r.hidden_pages.map(String) : []),
      enabledCurrencies: sanitizeEnabledCurrencies(r.enabled_currencies),
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    const investors: Investor[] = investorsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      nationality: r.nationality,
      emiratesId: r.emirates_id || undefined,
      passportNo: r.passport_no || undefined,
      address: r.address,
      city: r.city,
      country: r.country,
      cashDeposit: parseFloat(r.cash_deposit),
      goldDeposit: parseFloat(r.gold_deposit),
      goldWeightGrams: parseFloat(r.gold_weight_grams),
      status: r.status,
      riskProfile: r.risk_profile,
      kycStatus: r.kyc_status,
      joinedDate: new Date(r.joined_date).toISOString().slice(0, 10),
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : new Date().toISOString(),
      assignedBranchId: r.assigned_branch_id || undefined,
      assignedBranchName: r.assigned_branch_name || undefined,
      isGlobal: r.is_global,
      preferredContact: r.preferred_contact,
      notes: r.notes || undefined,
      depositHistory: (r.deposits as Array<{
        id: string;
        date: string;
        type: 'cash' | 'gold';
        amount: string;
        goldGrams: string | null;
        notes: string | null;
      }>).map((d) => ({
        id: d.id,
        date: new Date(d.date).toISOString().slice(0, 10),
        type: d.type,
        amount: parseFloat(d.amount),
        goldGrams: d.goldGrams ? parseFloat(d.goldGrams) : undefined,
        notes: d.notes || undefined,
      })),
    }));

    const deals: Deal[] = dealsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: parseFloat(r.amount),
      investors: (r.deal_investors_json as Array<{
        investorId: string;
        investorName: string;
        amount: string;
        isGold: boolean;
      }>).map((di) => ({
        investorId: di.investorId,
        investorName: di.investorName,
        amount: parseFloat(di.amount),
        isGold: di.isGold,
      })),
      totalInvestment: parseFloat(r.total_investment),
      balance: parseFloat(r.balance),
      toBranchId: r.to_branch_id,
      toBranchName: r.to_branch_name,
      groupName: r.group_name,
      groupType: r.group_type,
      totalPL: parseFloat(r.total_pl),
      expense: parseFloat(r.expense),
      managerShare: parseFloat(r.manager_share || '20.00'),
      goldVolume: parseFloat(r.gold_volume || '0.00'),
      managingBranchId: r.managing_branch_id || undefined,
      status: r.status,
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
    }));

    try {
      const staffAssignmentsByDeal = await fetchDealStaffAssignmentsBatch(deals.map((d) => d.id));
      for (const deal of deals) {
        deal.staffAssignments = staffAssignmentsByDeal[deal.id] ?? [];
      }
    } catch {
      for (const deal of deals) {
        deal.staffAssignments = [];
      }
    }

    const dealTransactions: DealTransaction[] = dealTxRes.rows.map((r) =>
      mapDealTransactionListRow(r as Record<string, unknown>),
    );

    return {
      success: true,
      data: {
        globalBranches: branches,
        branches,
        investors,
        deals,
        dealTransactions,
        hqBalance,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deals data.';
    logger.error({ error, branchSlug }, 'Failed to fetch deals data from Postgres');
    return { success: false, error: message };
  }
}

/** Load full nested details for a single deal transaction (buys, payouts, expenses). */
export async function fetchDealTransactionDetailAction(
  transactionId: string,
  branchSlug?: string,
): Promise<DbActionResult<DealTransaction>> {
  try {
    const branchId = await resolveDealBranchIdFromTransaction(transactionId);
    const auth = await requireStaffOrManagerRead(branchSlug, branchId);
    if ('success' in auth) return auth;

    const res = await query(SQL_DEAL_TRANSACTION_DETAIL, [transactionId]);
    if (!res.rows.length) {
      return { success: false, error: 'Deal transaction not found.' };
    }
    return {
      success: true,
      data: mapDealTransactionDetailRow(res.rows[0] as Record<string, unknown>),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deal transaction.';
    logger.error({ error, transactionId }, 'Failed to fetch deal transaction detail');
    return { success: false, error: message };
  }
}

/** Investor-scoped transaction detail — buys + own payout only. */
export async function fetchInvestorDealTransactionDetailAction(
  transactionId: string,
  investorId: string,
): Promise<DbActionResult<DealTransaction>> {
  try {
    const auth = await requireInvestorSessionForTxn(investorId);
    if ('success' in auth) return auth;
    const sessionInvestorId = auth.user.investorId!;

    const res = await query(SQL_INVESTOR_DEAL_TRANSACTION_DETAIL, [transactionId, sessionInvestorId]);
    if (!res.rows.length) {
      return { success: false, error: 'Deal transaction not found or access denied.' };
    }
    const txn = mapDealTransactionDetailRow(res.rows[0] as Record<string, unknown>);
    txn.myPayoutAmount = parseFloat(String(res.rows[0].my_payout_amount || '0'));
    txn.payouts = txn.payouts?.filter(p => p.investorId === sessionInvestorId) ?? [];
    return { success: true, data: txn };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deal transaction.';
    logger.error({ error, transactionId, investorId }, 'Failed to fetch investor deal transaction detail');
    return { success: false, error: message };
  }
}

export interface InvestorPortalPayload {
  branches: Branch[];
  deals: Deal[];
  dealTransactions: DealTransaction[];
}

/** Minimal fetch for investor portal — only groups they participate in and their payouts. */
export async function fetchInvestorPortalDataAction(
  investorId: string,
  branchId: string,
): Promise<DbActionResult<InvestorPortalPayload>> {
  try {
    const auth = await requireInvestorSession(investorId, branchId);
    if ('success' in auth) return auth;
    const sessionInvestorId = auth.user.investorId!;

    const [branchesRes, dealsRes, dealTxRes] = await Promise.all([
      query('SELECT * FROM branches WHERE id = $1', [branchId]),
      query(SQL_INVESTOR_DEALS, [sessionInvestorId, branchId]),
      query(SQL_INVESTOR_DEAL_TRANSACTIONS, [sessionInvestorId, branchId]),
    ]);

    const branches: Branch[] = branchesRes.rows.map((r) => mapInvestorPortalBranch(r as Record<string, unknown>));

    const deals: Deal[] = dealsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      amount: parseFloat(r.amount),
      investors: (r.deal_investors_json as Array<{
        investorId: string;
        investorName: string;
        amount: string;
        isGold: boolean;
      }>).map((di) => ({
        investorId: di.investorId,
        investorName: di.investorName,
        amount: parseFloat(di.amount),
        isGold: di.isGold,
      })),
      totalInvestment: parseFloat(r.total_investment),
      balance: 0,
      toBranchId: r.to_branch_id,
      toBranchName: r.to_branch_name,
      groupName: r.group_name,
      groupType: r.group_type,
      totalPL: 0,
      expense: 0,
      managerShare: parseFloat(r.manager_share || '20.00'),
      goldVolume: parseFloat(r.gold_volume || '0.00'),
      managingBranchId: r.managing_branch_id || undefined,
      status: r.status,
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      myInvestmentAmount: parseFloat(r.my_investment_amount),
      myIsGold: Boolean(r.my_is_gold),
    }));

    const dealTransactions: DealTransaction[] = dealTxRes.rows.map((r) => {
      const txn = mapDealTransactionListRow(r as Record<string, unknown>);
      txn.myPayoutAmount = parseFloat(String(r.my_payout_amount || '0'));
      txn.grossProfit = 0;
      txn.managementProfit = 0;
      txn.expenses = 0;
      txn.salesAed = 0;
      txn.netProfitPerGram = 0;
      return txn;
    });

    return { success: true, data: { branches, deals, dealTransactions } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch investor portal data.';
    logger.error({ error, investorId, branchId }, 'Failed to fetch investor portal data');
    return { success: false, error: message };
  }
}

/**
 * Creates a new branch and records a capital allocation transaction in an atomic SQL transaction.
 */
export async function dbAddBranchAction(
  branch: Branch
): Promise<DbActionResult<{ branch: Branch }>> {
  // Validate core fields
  const validation = addBranchSchema.safeParse({
    name: branch.name,
    location: branch.location,
    managerName: branch.managerName,
    openingBalance: branch.openingBalance,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert branch
    await client.query(
      `INSERT INTO branches (id, slug, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, opening_gold_balance, closing_balance, daily_pl, status, timezone, hidden_pages, last_activity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        branch.id,
        branch.slug,
        branch.name,
        branch.location,
        branch.managerName,
        branch.cashBalance,
        branch.goldBalance,
        branch.currentBalance,
        branch.openingBalance,
        branch.openingGoldBalance || 0,
        branch.closingBalance,
        branch.dailyPL,
        branch.status,
        resolveBranchTimeZone(branch.timezone),
        branch.hiddenPages ?? [],
        branch.lastActivity,
        branch.createdAt,
      ]
    );

    // 2. Deduct from HQ treasury balance
    await client.query('UPDATE hq_balance SET amount = amount - $1 WHERE id = 1', [branch.openingBalance]);

    await client.query('COMMIT');
    return { success: true, data: { branch } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error occurred while adding branch.';
    logger.error({ error, branch }, 'Error adding branch to database');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Transfers funds between branches or HQ in an atomic transaction.
 */
export async function dbTransferFundsAction(
  fromId: string,
  toId: string,
  fromName: string,
  toName: string,
  amount: number,
  notes: string,
  txnId: string
): Promise<DbActionResult<{ transaction: Transaction; hqBalanceUpdate?: number }>> {
  // Validate inputs
  const validation = transferFundsSchema.safeParse({ fromId, toId, amount, notes });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const timestamp = new Date().toISOString();

    // 1. Deduct from source
    if (fromId === 'HQ_TREASURY') {
      await client.query('UPDATE hq_balance SET amount = amount - $1 WHERE id = 1', [amount]);
    } else {
      await client.query(
        `UPDATE branches 
         SET current_balance = current_balance - $1, closing_balance = closing_balance - $1, last_activity = $2
         WHERE id = $3`,
        [amount, timestamp, fromId]
      );
    }

    // 2. Add to destination
    await client.query(
      `UPDATE branches 
       SET current_balance = current_balance + $1, closing_balance = closing_balance + $1, last_activity = $2
       WHERE id = $3`,
      [amount, timestamp, toId]
    );

    // 3. Insert transaction
    const txnType = fromId === 'HQ_TREASURY' ? 'allocation' : 'transfer';
    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [txnId, timestamp, fromName, toName, amount, txnType, 'completed', notes]
    );

    // Fetch updated HQ balance
    const hqRes = await client.query('SELECT amount FROM hq_balance WHERE id = 1');
    const newHqBalance = parseFloat(hqRes.rows[0].amount);

    await client.query('COMMIT');

    const transaction: Transaction = {
      id: txnId,
      date: timestamp,
      from: fromName,
      to: toName,
      amount,
      type: txnType,
      assetType: 'currency',
      status: 'completed',
      notes,
    };

    return { success: true, data: { transaction, hqBalanceUpdate: newHqBalance } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : 'Database error occurred during transfer.';
    logger.error({ error, fromId, toId, amount }, 'Error executing fund transfer');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Creates an invoice.
 */
export async function dbAddInvoiceAction(invoice: Invoice): Promise<DbActionResult<Invoice>> {
  // Validate
  const validation = addInvoiceSchema.safeParse({
    clientName: invoice.clientName,
    branchId: invoice.branchId,
    branchName: invoice.branchName,
    amount: invoice.amount,
    description: invoice.description,
    date: invoice.date,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  try {
    await query(
      `INSERT INTO invoices (id, client_name, branch_id, branch_name, amount, description, date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        invoice.id,
        invoice.clientName,
        invoice.branchId,
        invoice.branchName,
        invoice.amount,
        invoice.description,
        invoice.date,
        invoice.status,
      ]
    );
    return { success: true, data: invoice };
  } catch (error: unknown) {
    const message = formatPgError(error);
    logger.error({ error, invoice }, 'Error adding invoice');
    return { success: false, error: message };
  }
}

/**
 * Updates the HQ treasury balance directly.
 */
export async function dbUpdateHqBalanceAction(amount: number): Promise<DbActionResult<{ hqBalance: number }>> {
  try {
    const res = await query(
      `UPDATE hq_balance SET amount = $1 WHERE id = 1 RETURNING amount`,
      [amount]
    );
    if (res.rows.length === 0) {
      const insertRes = await query(
        `INSERT INTO hq_balance (id, amount) VALUES (1, $1) RETURNING amount`,
        [amount]
      );
      return { success: true, data: { hqBalance: parseFloat(insertRes.rows[0].amount) } };
    }
    return { success: true, data: { hqBalance: parseFloat(res.rows[0].amount) } };
  } catch (error: unknown) {
    const message = formatPgError(error);
    logger.error({ error, amount }, 'Error updating HQ balance');
    return { success: false, error: message };
  }
}

/**
 * Creates an expense and adjusts the corresponding branch/HQ balances atomically.
 */
export async function dbAddExpenseAction(
  expense: Expense,
  txn: Transaction
): Promise<DbActionResult<{ expense: Expense; transaction: Transaction; hqBalanceUpdate?: number }>> {
  // Validate
  const validation = addExpenseSchema.safeParse({
    date: expense.date,
    branchId: expense.branchId,
    branchName: expense.branchName,
    type: expense.type,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentMethod = expense.paymentMethod ?? 'AED';

    // 1. Insert expense
    await client.query(
      `INSERT INTO expenses (id, date, branch_id, branch_name, type, category, description, amount, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        expense.id,
        expense.date,
        expense.branchId,
        expense.branchName,
        expense.type,
        expense.category,
        expense.description,
        expense.amount,
        paymentMethod,
      ]
    );

    // 2. Adjust balance
    const timestamp = new Date().toISOString();
    if (expense.branchId === 'HQ_TREASURY') {
      await client.query('UPDATE hq_balance SET amount = amount - $1 WHERE id = 1', [expense.amount]);
    } else {
      await client.query(
        `INSERT INTO branch_usdt_balances (branch_id, initial_capital, available_fund, aed_balance, idr_balance)
         VALUES ($1, 0, 0, 0, 0) ON CONFLICT (branch_id) DO NOTHING`,
        [expense.branchId],
      );
      const balanceCol = paymentMethod === 'AED' ? 'aed_balance' : paymentMethod === 'IDR' ? 'idr_balance' : 'available_fund';
      await client.query(
        `UPDATE branch_usdt_balances SET ${balanceCol} = ${balanceCol} - $1, updated_at = CURRENT_TIMESTAMP WHERE branch_id = $2`,
        [expense.amount, expense.branchId],
      );
      if (paymentMethod === 'AED') {
        await client.query(
          `UPDATE branches 
           SET current_balance = current_balance - $1, last_activity = $2
           WHERE id = $3`,
          [expense.amount, timestamp, expense.branchId]
        );
      } else {
        await client.query(
          `UPDATE branches SET last_activity = $1 WHERE id = $2`,
          [timestamp, expense.branchId]
        );
      }
    }

    // 3. Insert transaction
    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [txn.id, timestamp, txn.from, txn.to, txn.amount, txn.type, txn.status, txn.notes]
    );

    const hqRes = await client.query('SELECT amount FROM hq_balance WHERE id = 1');
    const newHqBalance = parseFloat(hqRes.rows[0].amount);

    await client.query('COMMIT');
    return { success: true, data: { expense, transaction: txn, hqBalanceUpdate: newHqBalance } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, expense }, 'Error adding expense');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Creates an investor profile and logs their initial deposits.
 */
export async function dbAddInvestorAction(
  investor: Investor,
  portalAccess?: { password: string; branchId: string },
): Promise<DbActionResult<Investor>> {
  const denied = await guardStaffWrite('investors', undefined, investor.assignedBranchId);
  if (denied) return denied;

  if (!portalAccess?.password || !portalAccess.branchId) {
    return { success: false, error: 'Email login password and branch are required for investor portal access.' };
  }
  if (portalAccess.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  // Validate
  const validation = addInvestorSchema.safeParse({
    name: investor.name,
    email: investor.email,
    phone: investor.phone,
    nationality: investor.nationality,
    emiratesId: investor.emiratesId,
    passportNo: investor.passportNo,
    address: investor.address,
    city: investor.city,
    country: investor.country,
    cashDeposit: investor.cashDeposit,
    goldDeposit: investor.goldDeposit,
    goldWeightGrams: investor.goldWeightGrams,
    riskProfile: investor.riskProfile,
    preferredContact: investor.preferredContact,
    assignedBranchId: investor.assignedBranchId,
    notes: investor.notes,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const cognitoRes = await createInvestorCognitoUser({
    email: investor.email,
    name: investor.name,
    branchId: portalAccess.branchId,
    password: portalAccess.password,
  });
  if (!cognitoRes.success || !cognitoRes.userId) {
    return { success: false, error: cognitoRes.error || 'Failed to create investor login.' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert investor
    await client.query(
      `INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, is_global, notes, cognito_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
      [
        investor.id,
        investor.name,
        investor.email,
        investor.phone,
        investor.nationality,
        investor.emiratesId || null,
        investor.passportNo || null,
        investor.address,
        investor.city,
        investor.country,
        investor.cashDeposit,
        investor.goldDeposit,
        investor.goldWeightGrams,
        investor.status,
        investor.riskProfile,
        investor.kycStatus,
        investor.joinedDate,
        investor.lastActivity,
        investor.assignedBranchId || portalAccess.branchId,
        investor.assignedBranchName || null,
        investor.preferredContact,
        investor.isGlobal || false,
        investor.notes || null,
        cognitoRes.userId,
      ]
    );

    // 2. Insert deposits
    if (investor.depositHistory && investor.depositHistory.length > 0) {
      for (const d of investor.depositHistory) {
        await client.query(
          `INSERT INTO investor_deposits (id, investor_id, date, type, amount, gold_grams, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [d.id, investor.id, d.date, d.type, d.amount, d.goldGrams || null, d.notes || null]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, data: investor };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    await deleteInvestorCognitoUser(investor.email);
    const message = formatPgError(error);
    logger.error({ error, investor }, 'Error adding investor');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Updates an existing investor profile in the database.
 */
export async function dbUpdateInvestorAction(
  investor: Investor
): Promise<DbActionResult<Investor>> {
  const denied = await guardStaffWrite('investors', undefined, investor.assignedBranchId);
  if (denied) return denied;

  try {
    await query(
      `UPDATE investors SET
        name = $1,
        email = $2,
        phone = $3,
        nationality = $4,
        emirates_id = $5,
        passport_no = $6,
        address = $7,
        city = $8,
        country = $9,
        status = $10,
        risk_profile = $11,
        kyc_status = $12,
        last_activity = $13,
        assigned_branch_id = $14,
        assigned_branch_name = $15,
        preferred_contact = $16,
        is_global = $17,
        notes = $18
       WHERE id = $19`,
      [
        investor.name,
        investor.email,
        investor.phone,
        investor.nationality,
        investor.emiratesId || null,
        investor.passportNo || null,
        investor.address,
        investor.city,
        investor.country,
        investor.status,
        investor.riskProfile,
        investor.kycStatus,
        investor.lastActivity,
        investor.assignedBranchId || null,
        investor.assignedBranchName || null,
        investor.preferredContact,
        investor.isGlobal || false,
        investor.notes || null,
        investor.id,
      ]
    );
    return { success: true, data: investor };
  } catch (error: unknown) {
    const message = formatPgError(error);
    logger.error({ error, investor }, 'Error updating investor');
    return { success: false, error: message };
  }
}

/**
 * Deletes an investor. Fails if the investor is linked to deals.
 */
export async function dbDeleteInvestorAction(
  id: string
): Promise<DbActionResult<{ id: string }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const guard = await guardStaffWrite('investors');
  if (guard) return guard;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if investor is part of any deal
    const checkRes = await client.query(
      `SELECT COUNT(*) FROM deal_investors WHERE investor_id = $1`,
      [id]
    );
    if (parseInt(checkRes.rows[0].count, 10) > 0) {
      throw new Error('Cannot delete investor because they are involved in active deals or groups.');
    }

    // Delete the investor
    await client.query(`DELETE FROM investors WHERE id = $1`, [id]);

    await client.query('COMMIT');
    return { success: true, data: { id } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, id }, 'Error deleting investor');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}


/**
 * Creates a deal and inserts associated participant investors.
 */
export async function dbAddDealAction(deal: Deal): Promise<DbActionResult<Deal>> {
  const denied = await guardStaffWrite('deals', undefined, deal.managingBranchId);
  if (denied) return denied;

  // Validate
  const validation = addDealSchema.safeParse({
    name: deal.name,
    groupName: deal.groupName,
    groupType: deal.groupType,
    amount: deal.amount,
    investors: deal.investors,
    totalInvestment: deal.totalInvestment,
    balance: deal.balance,
    toBranchId: deal.toBranchId,
    toBranchName: deal.toBranchName,
    status: deal.status,
    date: deal.date,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert deal
    await client.query(
      `INSERT INTO deals (id, name, amount, total_investment, balance, to_branch_id, to_branch_name, status, group_name, group_type, total_pl, expense, manager_share, gold_volume, managing_branch_id, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        deal.id,
        deal.name,
        deal.amount,
        deal.totalInvestment,
        deal.balance,
        deal.toBranchId || null,
        deal.toBranchName || 'Group Entity',
        deal.status,
        deal.groupName || 'General',
        deal.groupType || 'gold',
        deal.totalPL || 0,
        deal.expense || 0,
        deal.managerShare ?? 20,
        deal.goldVolume || 0,
        deal.managingBranchId || null,
        deal.date,
      ]
    );

    // 2. Insert deal-investors
    if (deal.investors && deal.investors.length > 0) {
      for (const di of deal.investors) {
        await client.query(
          `INSERT INTO deal_investors (deal_id, investor_id, investor_name, amount, is_gold)
           VALUES ($1, $2, $3, $4, $5)`,
          [deal.id, di.investorId, di.investorName, di.amount, di.isGold]
        );
      }
    }

    const slug = await resolveBranchSlug(deal.managingBranchId);
    let user = slug ? (await getCurrentUserAction(slug)).data : null;
    if (!user) user = (await getCurrentUserAction()).data ?? null;
    if (hasFullBranchAccess(user) && deal.staffAssignments && deal.staffAssignments.length > 0) {
      await replaceDealStaffAssignments(deal.id, deal.staffAssignments, user?.email ?? 'system');
    }

    await client.query('COMMIT');
    return { success: true, data: deal };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, deal }, 'Error adding deal');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Updates an existing deal and replaces its associated participant investors.
 */
export async function dbUpdateDealAction(deal: Deal): Promise<DbActionResult<Deal>> {
  const branchId = await resolveDealBranchId(deal.id);
  const denied = await guardStaffDealWrite(deal.id, undefined, branchId);
  if (denied) return denied;

  // Validate
  const validation = updateDealSchema.safeParse(deal);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update deal details
    await client.query(
      `UPDATE deals SET 
        name = $1, 
        amount = $2, 
        total_investment = $3, 
        balance = $4, 
        to_branch_id = $5, 
        to_branch_name = $6, 
        status = $7,
        group_name = $8,
        group_type = $9,
        total_pl = $10,
        expense = $11,
        manager_share = $12,
        gold_volume = $13,
        date = $14
       WHERE id = $15`,
      [
        deal.name,
        deal.amount,
        deal.totalInvestment,
        deal.balance,
        deal.toBranchId || null,
        deal.toBranchName || 'Group Entity',
        deal.status,
        deal.groupName || 'General',
        deal.groupType || 'gold',
        deal.totalPL || 0,
        deal.expense || 0,
        deal.managerShare ?? 20,
        deal.goldVolume || 0,
        deal.date,
        deal.id,
      ]
    );

    // 2. Delete existing deal-investors
    await client.query('DELETE FROM deal_investors WHERE deal_id = $1', [deal.id]);

    // 3. Re-insert deal-investors
    if (deal.investors && deal.investors.length > 0) {
      for (const di of deal.investors) {
        await client.query(
          `INSERT INTO deal_investors (deal_id, investor_id, investor_name, amount, is_gold)
           VALUES ($1, $2, $3, $4, $5)`,
          [deal.id, di.investorId, di.investorName, di.amount, di.isGold]
        );
      }
    }

    const slug = await resolveBranchSlug(branchId);
    let user = slug ? (await getCurrentUserAction(slug)).data : null;
    if (!user) user = (await getCurrentUserAction()).data ?? null;
    if (hasFullBranchAccess(user)) {
      await replaceDealStaffAssignments(deal.id, deal.staffAssignments ?? [], user?.email ?? 'system');
    }

    await client.query('COMMIT');
    return { success: true, data: deal };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, deal }, 'Error updating deal');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Recomputes aggregated buy totals on the parent deal_transaction row.
 */
async function syncDealTransactionAggregatesFromBuys(
  client: import('pg').PoolClient,
  dealTransactionId: string,
  groupType: 'gold' | 'currency' = 'gold',
): Promise<DealBuyAggregates> {
  const buysRes = await client.query(
    `SELECT id, deal_transaction_id, txn_id, date, time, weight, purity, pure_cost_aed, currency_amount, purchase_rate, created_at
     FROM deal_transaction_buys WHERE deal_transaction_id = $1 ORDER BY created_at ASC`,
    [dealTransactionId],
  );
  const buys: DealTransactionBuy[] = buysRes.rows.map((r) => ({
    id: r.id,
    dealTransactionId: r.deal_transaction_id,
    txnId: r.txn_id,
    date: r.date ? new Date(r.date).toISOString().slice(0, 10) : '',
    time: r.time || undefined,
    weight: parseFloat(r.weight || '0'),
    purity: r.purity != null ? parseFloat(r.purity) : undefined,
    pureCostAed: parseFloat(r.pure_cost_aed || '0'),
    currencyAmount: r.currency_amount != null ? parseFloat(r.currency_amount) : undefined,
    purchaseRate: r.purchase_rate != null ? parseFloat(r.purchase_rate) : undefined,
    createdAt: r.created_at,
  }));

  const agg = computeDealBuyAggregates(buys, groupType);

  await client.query(
    `UPDATE deal_transactions SET
      weight = $1,
      pure_cost_aed = $2,
      currency_amount = $3,
      purchase_rate = $4
     WHERE id = $5`,
    [
      agg.totalWeight,
      agg.totalCost,
      agg.totalCurrencyAmount,
      agg.avgPurchaseRate ?? 0,
      dealTransactionId,
    ],
  );

  return agg;
}

/**
 * Creates a new deal transaction record in the database.
 */
export async function dbAddDealTransactionAction(
  txn: DealTransaction
): Promise<DbActionResult<DealTransaction>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  if (txn.dealId) {
    const branchId = await resolveDealBranchId(txn.dealId);
    const denied = await guardStaffDealWrite(txn.dealId, undefined, branchId);
    if (denied) return denied;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert deal shell (buy legs added separately)
    await client.query(
      `INSERT INTO deal_transactions (
        id, deal_number, date, time, deal_id, weight, rate, pure_cost_aed, currency_amount, purchase_rate,
        live_sell_rate, sell_premium_discount, sales_aed, expenses,
        gross_profit, net_profit_per_gram, management_profit, fix_or_unfix, margin_deposit, premium_discount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        txn.id,
        txn.deal,
        txn.date,
        txn.time || null,
        txn.dealId,
        txn.weight ?? 0,
        txn.rate ?? 0,
        txn.pureCostAed ?? 0,
        txn.currencyAmount ?? 0,
        txn.purchaseRate ?? 0,
        txn.liveSellRate ?? 0,
        txn.sellPremiumDiscount ?? 0,
        txn.salesAed ?? 0,
        txn.expenses ?? 0,
        txn.grossProfit ?? 0,
        txn.netProfitPerGram ?? 0,
        txn.managementProfit ?? 0,
        txn.fixOrUnfix ?? 'unfixed',
        txn.marginDeposit ?? 0,
        txn.premiumDiscount ?? 0,
      ]
    );

    // Also update the parent deal's totalPL by summing all its deal_transactions gross_profit!
    const plRes = await client.query(
      `SELECT COALESCE(SUM(gross_profit), 0) as total_pl FROM deal_transactions WHERE deal_id = $1`,
      [txn.dealId]
    );
    const totalPL = parseFloat(plRes.rows[0].total_pl);

    await client.query(
      `UPDATE deals SET total_pl = $1 WHERE id = $2`,
      [totalPL, txn.dealId]
    );

    await client.query('COMMIT');
    return { success: true, data: txn };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, txn }, 'Error adding deal transaction');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Updates a deal transaction record in the database and recomputes the parent deal's P&L.
 */
export async function dbUpdateDealTransactionAction(
  txn: DealTransaction
): Promise<DbActionResult<DealTransaction>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  if (txn.dealId) {
    const branchId = await resolveDealBranchId(txn.dealId);
    const denied = await guardStaffDealWrite(txn.dealId, undefined, branchId);
    if (denied) return denied;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE deal_transactions SET
        deal_number = $1, date = $2, time = $3, weight = $4, rate = $5, pure_cost_aed = $6,
        currency_amount = $7, purchase_rate = $8, conversion_rate = $9, avg_purity = $10,
        live_sell_rate = $11, sell_premium_discount = $12,
        sales_aed = $13, expenses = $14, gross_profit = $15, net_profit_per_gram = $16, management_profit = $17,
        fix_or_unfix = $18, margin_deposit = $19, premium_discount = $20
      WHERE id = $21 AND deal_id = $22`,
      [
        txn.deal,
        txn.date,
        txn.time || null,
        txn.weight,
        txn.rate,
        txn.pureCostAed,
        txn.currencyAmount ?? 0,
        txn.purchaseRate ?? 0,
        txn.conversionRate ?? 0,
        txn.avgPurity ?? null,
        txn.liveSellRate,
        txn.sellPremiumDiscount,
        txn.salesAed,
        txn.expenses,
        txn.grossProfit,
        txn.netProfitPerGram,
        txn.managementProfit,
        txn.fixOrUnfix,
        txn.marginDeposit,
        txn.premiumDiscount,
        txn.id,
        txn.dealId,
      ]
    );

    // Recompute totalPL
    const plRes = await client.query(
      `SELECT COALESCE(SUM(gross_profit), 0) as total_pl FROM deal_transactions WHERE deal_id = $1`,
      [txn.dealId]
    );
    const totalPL = parseFloat(plRes.rows[0].total_pl);

    await client.query(
      `UPDATE deals SET total_pl = $1 WHERE id = $2`,
      [totalPL, txn.dealId]
    );

    // If there are payouts provided and the deal is fixed, insert them
    if (txn.fixOrUnfix === 'fixed' && txn.payouts && txn.payouts.length > 0) {
      // Clear any existing payouts for this transaction
      await client.query(
        `DELETE FROM deal_transaction_payouts WHERE deal_transaction_id = $1`,
        [txn.id]
      );
      
      for (const p of txn.payouts) {
        await client.query(
          `INSERT INTO deal_transaction_payouts (id, deal_transaction_id, investor_id, investor_name, payout_amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [p.id, p.dealTransactionId, p.investorId, p.investorName, p.payoutAmount]
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, data: txn };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, txn }, 'Error updating deal transaction');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Deletes a deal transaction record and recomputes the parent deal's P&L.
 */
export async function dbDeleteDealTransactionAction(
  id: string,
  dealId: string
): Promise<DbActionResult<{ id: string; dealId: string }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const branchId = await resolveDealBranchId(dealId);
  const denied = await guardStaffDealWrite(dealId, undefined, branchId);
  if (denied) return denied;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM deal_transactions WHERE id = $1 AND deal_id = $2`,
      [id, dealId]
    );

    // Recompute totalPL
    const plRes = await client.query(
      `SELECT COALESCE(SUM(gross_profit), 0) as total_pl FROM deal_transactions WHERE deal_id = $1`,
      [dealId]
    );
    const totalPL = parseFloat(plRes.rows[0].total_pl);

    await client.query(
      `UPDATE deals SET total_pl = $1 WHERE id = $2`,
      [totalPL, dealId]
    );

    await client.query('COMMIT');
    return { success: true, data: { id, dealId } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, id, dealId }, 'Error deleting deal transaction');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Adds a buy leg to an unfixed deal transaction and syncs parent aggregates.
 */
export async function dbAddDealTransactionBuyAction(
  buy: DealTransactionBuy,
  groupType: 'gold' | 'currency' = 'gold',
): Promise<DbActionResult<{ buy: DealTransactionBuy; aggregates: DealBuyAggregates }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const denied = await guardStaffDealWriteByTxn(buy.dealTransactionId);
  if (denied) return denied;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const parentRes = await client.query(
      `SELECT fix_or_unfix FROM deal_transactions WHERE id = $1`,
      [buy.dealTransactionId],
    );
    if (parentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Deal not found.' };
    }
    if (parentRes.rows[0].fix_or_unfix === 'fixed') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Cannot add buys to a settled deal.' };
    }

    await client.query(
      `INSERT INTO deal_transaction_buys (
        id, deal_transaction_id, txn_id, date, time, weight, purity, pure_cost_aed, currency_amount, purchase_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        buy.id,
        buy.dealTransactionId,
        buy.txnId,
        buy.date,
        buy.time || null,
        buy.weight ?? 0,
        buy.purity ?? null,
        buy.pureCostAed,
        buy.currencyAmount ?? 0,
        buy.purchaseRate ?? 0,
      ],
    );

    const aggregates = await syncDealTransactionAggregatesFromBuys(client, buy.dealTransactionId, groupType);

    await client.query('COMMIT');
    return { success: true, data: { buy, aggregates } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, buy }, 'Error adding deal transaction buy');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Updates a buy leg on an unfixed deal transaction and syncs parent aggregates.
 */
export async function dbUpdateDealTransactionBuyAction(
  buy: DealTransactionBuy,
  groupType: 'gold' | 'currency' = 'gold',
): Promise<DbActionResult<{ buy: DealTransactionBuy; aggregates: DealBuyAggregates }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const denied = await guardStaffDealWriteByTxn(buy.dealTransactionId);
  if (denied) return denied;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const parentRes = await client.query(
      `SELECT dt.fix_or_unfix FROM deal_transactions dt
       JOIN deal_transaction_buys dtb ON dtb.deal_transaction_id = dt.id
       WHERE dtb.id = $1`,
      [buy.id],
    );
    if (parentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Buy not found.' };
    }
    if (parentRes.rows[0].fix_or_unfix === 'fixed') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Cannot edit buys on a settled deal.' };
    }

    await client.query(
      `UPDATE deal_transaction_buys SET
        txn_id = $1, date = $2, time = $3, weight = $4, purity = $5,
        pure_cost_aed = $6, currency_amount = $7, purchase_rate = $8
       WHERE id = $9 AND deal_transaction_id = $10`,
      [
        buy.txnId,
        buy.date,
        buy.time || null,
        buy.weight ?? 0,
        buy.purity ?? null,
        buy.pureCostAed,
        buy.currencyAmount ?? 0,
        buy.purchaseRate ?? 0,
        buy.id,
        buy.dealTransactionId,
      ],
    );

    const aggregates = await syncDealTransactionAggregatesFromBuys(client, buy.dealTransactionId, groupType);

    await client.query('COMMIT');
    return { success: true, data: { buy, aggregates } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, buy }, 'Error updating deal transaction buy');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Deletes a buy leg from an unfixed deal transaction and syncs parent aggregates.
 */
export async function dbDeleteDealTransactionBuyAction(
  buyId: string,
  dealTransactionId: string,
  groupType: 'gold' | 'currency' = 'gold',
): Promise<DbActionResult<{ aggregates: DealBuyAggregates }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const denied = await guardStaffDealWriteByTxn(dealTransactionId);
  if (denied) return denied;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const parentRes = await client.query(
      `SELECT fix_or_unfix FROM deal_transactions WHERE id = $1`,
      [dealTransactionId],
    );
    if (parentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Deal not found.' };
    }
    if (parentRes.rows[0].fix_or_unfix === 'fixed') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Cannot delete buys from a settled deal.' };
    }

    await client.query(
      `DELETE FROM deal_transaction_buys WHERE id = $1 AND deal_transaction_id = $2`,
      [buyId, dealTransactionId],
    );

    const aggregates = await syncDealTransactionAggregatesFromBuys(client, dealTransactionId, groupType);

    await client.query('COMMIT');
    return { success: true, data: { aggregates } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, buyId, dealTransactionId }, 'Error deleting deal transaction buy');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

async function loadDealTransactionDetailRow(
  dealTransactionId: string,
): Promise<DealTransaction | null> {
  const res = await query(SQL_DEAL_TRANSACTION_DETAIL, [dealTransactionId]);
  if (!res.rows.length) return null;
  return mapDealTransactionDetailRow(res.rows[0] as Record<string, unknown>);
}

/** Sync expense total and, for settled deals, recalculate profit and investor payouts. */
async function syncDealTransactionAfterExpenseChange(
  client: import('pg').PoolClient,
  dealTransactionId: string,
): Promise<void> {
  const expenseSumRes = await client.query(
    `SELECT COALESCE(SUM(value), 0) AS total FROM deal_transaction_expenses WHERE deal_transaction_id = $1`,
    [dealTransactionId],
  );
  const expenses = parseFloat(expenseSumRes.rows[0].total);

  const txnRes = await client.query(
    `SELECT dt.id, dt.deal_id, dt.fix_or_unfix, dt.sales_aed, dt.pure_cost_aed, dt.weight,
            d.amount AS deal_amount, COALESCE(d.manager_share, 20) AS manager_share
     FROM deal_transactions dt
     JOIN deals d ON d.id = dt.deal_id
     WHERE dt.id = $1`,
    [dealTransactionId],
  );
  if (!txnRes.rows.length) return;

  const row = txnRes.rows[0];
  const fixOrUnfix = row.fix_or_unfix as string;
  const salesAed = parseFloat(row.sales_aed || '0');
  const pureCostAed = parseFloat(row.pure_cost_aed || '0');
  const weight = parseFloat(row.weight || '0');
  const dealId = row.deal_id as string;
  const dealAmount = parseFloat(row.deal_amount || '0');
  const managerShare = parseFloat(row.manager_share || '20');

  if (fixOrUnfix === 'fixed' && salesAed > 0) {
    const investorsRes = await client.query(
      `SELECT investor_id, investor_name, amount FROM deal_investors WHERE deal_id = $1`,
      [dealId],
    );
    const investors = investorsRes.rows.map((r) => ({
      investorId: r.investor_id as string,
      investorName: r.investor_name as string,
      amount: parseFloat(r.amount || '0'),
    }));

    const settlement = computeDealSettlement({
      salesAed,
      pureCostAed,
      expenses,
      weight,
      managerShare,
      dealAmount,
      investors,
    });

    await client.query(
      `UPDATE deal_transactions SET
        expenses = $1, gross_profit = $2, net_profit_per_gram = $3, management_profit = $4
       WHERE id = $5`,
      [
        settlement.expenses,
        settlement.grossProfit,
        settlement.netProfitPerGram,
        settlement.managementProfit,
        dealTransactionId,
      ],
    );

    await client.query(
      `DELETE FROM deal_transaction_payouts WHERE deal_transaction_id = $1`,
      [dealTransactionId],
    );

    for (const p of settlement.payouts) {
      const payoutId = `payout-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      await client.query(
        `INSERT INTO deal_transaction_payouts (id, deal_transaction_id, investor_id, investor_name, payout_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [payoutId, dealTransactionId, p.investorId, p.investorName, p.payoutAmount],
      );
    }

    const plRes = await client.query(
      `SELECT COALESCE(SUM(gross_profit), 0) AS total_pl FROM deal_transactions WHERE deal_id = $1`,
      [dealId],
    );
    await client.query(
      `UPDATE deals SET total_pl = $1 WHERE id = $2`,
      [parseFloat(plRes.rows[0].total_pl), dealId],
    );
  } else {
    await client.query(
      `UPDATE deal_transactions SET expenses = $1 WHERE id = $2`,
      [expenses, dealTransactionId],
    );
  }
}

/**
 * Adds a batch of key-value expense entries for a deal transaction.
 * Uses ON CONFLICT to upsert so re-saving the same items is safe.
 */
export async function dbAddDealExpensesAction(
  expenses: DealTransactionExpense[]
): Promise<DbActionResult<{ expenses: DealTransactionExpense[]; transaction: DealTransaction }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  if (!expenses.length) return { success: false, error: 'No expenses provided.' };

  const dealTransactionId = expenses[0].dealTransactionId;
  const denied = await guardStaffDealWriteByTxn(dealTransactionId);
  if (denied) return denied;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted: DealTransactionExpense[] = [];
    for (const exp of expenses) {
      await client.query(
        `INSERT INTO deal_transaction_expenses (id, deal_transaction_id, key, value, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET key = EXCLUDED.key, value = EXCLUDED.value, timestamp = EXCLUDED.timestamp`,
        [exp.id, exp.dealTransactionId, exp.key, exp.value, exp.timestamp ? new Date(exp.timestamp).toISOString() : new Date().toISOString()]
      );
      inserted.push(exp);
    }

    await syncDealTransactionAfterExpenseChange(client, dealTransactionId);
    await client.query('COMMIT');

    const transaction = await loadDealTransactionDetailRow(dealTransactionId);
    if (!transaction) {
      return { success: false, error: 'Failed to load updated deal transaction.' };
    }

    return { success: true, data: { expenses: inserted, transaction } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, expenses }, 'Error adding deal transaction expenses');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Fetches all expense items for a given deal transaction.
 */
export async function dbFetchDealExpensesAction(
  dealTransactionId: string
): Promise<DbActionResult<DealTransactionExpense[]>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  try {
    const res = await query(
      `SELECT id, deal_transaction_id, key, value, timestamp, created_at
       FROM deal_transaction_expenses
       WHERE deal_transaction_id = $1
       ORDER BY created_at ASC`,
      [dealTransactionId]
    );

    const data: DealTransactionExpense[] = res.rows.map((r) => ({
      id: r.id,
      dealTransactionId: r.deal_transaction_id,
      key: r.key,
      value: Number(r.value),
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    return { success: true, data };
  } catch (error: unknown) {
    const message = formatPgError(error);
    logger.error({ error, dealTransactionId }, 'Error fetching deal transaction expenses');
    return { success: false, error: message };
  }
}

/**
 * Deletes a single expense entry by id.
 */
export async function dbDeleteDealExpenseAction(
  id: string
): Promise<DbActionResult<{ id: string; transaction?: DealTransaction }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const client = await pool.connect();
  try {
    const txnRes = await client.query(
      `SELECT deal_transaction_id FROM deal_transaction_expenses WHERE id = $1 LIMIT 1`,
      [id],
    );
    const dealTransactionId = txnRes.rows[0]?.deal_transaction_id as string | undefined;
    if (!dealTransactionId) {
      return { success: false, error: 'Expense not found.' };
    }

    const denied = await guardStaffDealWriteByTxn(dealTransactionId);
    if (denied) return denied;

    await client.query('BEGIN');
    await client.query(`DELETE FROM deal_transaction_expenses WHERE id = $1`, [id]);
    await syncDealTransactionAfterExpenseChange(client, dealTransactionId);
    await client.query('COMMIT');

    const transaction = await loadDealTransactionDetailRow(dealTransactionId);
    return { success: true, data: { id, transaction: transaction ?? undefined } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, id }, 'Error deleting deal transaction expense');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Deletes a deal completely, cascading deletes to transactions, expenses, and investors.
 */
export async function dbDeleteDealAction(
  id: string
): Promise<DbActionResult<{ id: string }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const branchId = await resolveDealBranchId(id);
  const denied = await guardStaffDealWrite(id, undefined, branchId);
  if (denied) return denied;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Deleting the deal cascades to deal_transactions, deal_transaction_expenses, and deal_investors.
    await client.query(`DELETE FROM deals WHERE id = $1`, [id]);
    
    await client.query('COMMIT');
    return { success: true, data: { id } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    logger.error({ error, id }, 'Error deleting deal');
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

export async function dbAddEntityAction(entity: Entity): Promise<DbActionResult<Entity>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  try {
    await query(
      `INSERT INTO entities (id, name, phone, branch_id, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [entity.id, entity.name, entity.phone || null, entity.branchId || null, entity.createdAt || new Date().toISOString()]
    );
    return { success: true, data: entity };
  } catch (error: unknown) {
    logger.error({ error, entity }, 'Error adding entity');
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbUpdateEntityAction(entity: Entity): Promise<DbActionResult<Entity>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  try {
    const existing = await query('SELECT name FROM entities WHERE id = $1', [entity.id]);
    if (!existing.rows.length) return { success: false, error: 'Entity not found.' };

    const oldName: string = existing.rows[0].name;
    if (entity.name.trim() !== oldName) {
      const txRes = await query(
        'SELECT 1 FROM transactions WHERE from_entity = $1 OR to_entity = $1 OR type = $1 LIMIT 1',
        [oldName],
      );
      if (txRes.rowCount && txRes.rowCount > 0) {
        return {
          success: false,
          error: 'Name cannot be changed because this entity has at least one transaction.',
        };
      }
    }

    await query(
      `UPDATE entities SET name = $1, phone = $2, branch_id = $3 WHERE id = $4`,
      [entity.name, entity.phone || null, entity.branchId || null, entity.id]
    );
    return { success: true, data: entity };
  } catch (error: unknown) {
    logger.error({ error, entity }, 'Error updating entity');
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbFetchEntitiesAction(): Promise<DbActionResult<Entity[]>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  try {
    const res = await query(`SELECT * FROM entities ORDER BY created_at DESC`);
    const data: Entity[] = res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || undefined,
      branchId: r.branch_id || undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));
    return { success: true, data };
  } catch (error: unknown) {
    logger.error({ error }, 'Error fetching entities');
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbProcessLedgerTransactionAction(
  txn: Transaction,
  deltaCash: number,
  deltaGold: number,
  branchId: string,
  tagIds: string[] = [],
  branchSlug?: string,
): Promise<DbActionResult<Transaction>> {
  const denied = await guardStaffWrite('funds', branchSlug, branchId);
  if (denied) return denied;

  if (!pool) return { success: false, error: 'Database not connected.' };

  let user = branchSlug ? (await getCurrentUserAction(branchSlug)).data : null;
  if (!user) {
    user = (await getCurrentUserAction()).data ?? null;
  }
  if (!user) {
    return { success: false, error: 'You must be signed in.' };
  }
  if (!user.id) {
    return { success: false, error: 'Please sign out and sign in again to post entries.' };
  }
  const enteredBy = user.email;
  const enteredByName = user.name;
  const enteredByUserId = user.id;

  const coreValidation = validateJournalEntry(
    {
      from: txn.from,
      to: txn.to,
      amount: txn.amount,
      assetType: (txn.assetType as 'currency' | 'gold') || 'currency',
      date: txn.date,
    },
  );
  if (!coreValidation.ok) {
    return { success: false, error: coreValidation.error };
  }
  if (!branchId?.trim()) {
    return { success: false, error: 'Branch is required for this transaction.' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const branchRes = await client.query('SELECT name, timezone FROM branches WHERE id = $1', [branchId]);
    if (!branchRes.rows.length) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Branch not found.' };
    }
    const branchName: string = branchRes.rows[0].name;
    const branchTz = resolveBranchTimeZone(branchRes.rows[0].timezone);
    const businessDate = txn.businessDate ?? toBusinessDate(txn.date, branchTz);
    const branchFundLabel = `${branchName} (Branch Fund)`;

    const branchValidation = validateJournalEntry(
      {
        from: txn.from,
        to: txn.to,
        amount: txn.amount,
        assetType: (txn.assetType as 'currency' | 'gold') || 'currency',
        date: txn.date,
      },
      { branchName, branchFundLabel },
    );
    if (!branchValidation.ok) {
      await client.query('ROLLBACK');
      return { success: false, error: branchValidation.error };
    }

    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, asset_type, status, notes, category, branch_id, business_date, entered_by, entered_by_name, entered_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [txn.id, txn.date, txn.from, txn.to, txn.amount, txn.type, txn.assetType || 'currency', txn.status, txn.notes || '', txn.category, txn.branchId || branchId, businessDate, enteredBy, enteredByName, enteredByUserId]
    );
    const tagNames: string[] = [];
    for (const tagId of tagIds) {
      await client.query(
        `INSERT INTO transaction_tag_links (transaction_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [txn.id, tagId]
      );
      const tagRes = await client.query('SELECT name FROM transaction_tags WHERE id = $1', [tagId]);
      if (tagRes.rows[0]?.name) tagNames.push(tagRes.rows[0].name);
    }
    if (deltaCash !== 0 && txn.status === 'completed') {
      await client.query(`UPDATE branches SET current_balance = current_balance + $1, cash_balance = cash_balance + $1 WHERE id = $2`, [deltaCash, branchId]);
    }
    if (deltaGold !== 0 && txn.status === 'completed') {
      await client.query(`UPDATE branches SET gold_balance = gold_balance + $1 WHERE id = $2`, [deltaGold, branchId]);
    }
    await client.query('COMMIT');
    return {
      success: true,
      data: {
        ...txn,
        branchId: txn.branchId || branchId,
        businessDate,
        enteredByUsername: enteredBy,
        enteredByName,
        tagIds,
        tags: tagNames,
      },
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}

export async function dbCreateTransactionTagAction(tag: import('@/types').TransactionTag): Promise<DbActionResult<import('@/types').TransactionTag>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  try {
    await query(
      `INSERT INTO transaction_tags (id, branch_id, name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (branch_id, name) DO NOTHING`,
      [tag.id, tag.branchId || null, tag.name, tag.createdAt || new Date().toISOString()]
    );
    const existing = await query(
      'SELECT * FROM transaction_tags WHERE branch_id IS NOT DISTINCT FROM $1 AND name = $2',
      [tag.branchId || null, tag.name]
    );
    const row = existing.rows[0];
    return {
      success: true,
      data: {
        id: row.id,
        branchId: row.branch_id || undefined,
        name: row.name,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbUpdateBranchAction(id: string, slug: string, name: string, location: string, managerName: string): Promise<DbActionResult<void>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  try {
    await query('UPDATE branches SET slug = $1, name = $2, location = $3, manager_name = $4 WHERE id = $5', [slug, name, location, managerName, id]);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbUpdateBranchInitialFundAction(id: string, name: string, newFund: number, newCurrentBalance?: number): Promise<DbActionResult<{ delta: number }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldRes = await client.query('SELECT opening_balance, current_balance FROM branches WHERE id = $1', [id]);
    const oldFund = parseFloat(oldRes.rows[0].opening_balance || 0);
    const oldCurrent = parseFloat(oldRes.rows[0].current_balance || 0);
    const delta = newFund - oldFund;
    
    let targetCurrentBalance = oldCurrent + delta;
    if (newCurrentBalance !== undefined && !isNaN(newCurrentBalance)) {
      targetCurrentBalance = newCurrentBalance;
    }

    await client.query('UPDATE branches SET opening_balance = $1, current_balance = $2, cash_balance = $2 WHERE id = $3', [newFund, targetCurrentBalance, id]);
    
    // Create transaction log for the opening balance change (HQ allocation)
    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, status, category, notes) VALUES ($1, CURRENT_DATE, 'HQ Treasury', $2, $3, 'allocation', 'completed', 'capital_allocation', 'Capital adjustment')`,
      [`TXN-${Date.now()}`, name, Math.abs(delta)]
    );
    
    // Create transaction log if current balance was overridden manually
    if (newCurrentBalance !== undefined && !isNaN(newCurrentBalance) && newCurrentBalance !== (oldCurrent + delta)) {
      const overrideDelta = targetCurrentBalance - (oldCurrent + delta);
      await client.query(
        `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, status, category, notes) VALUES ($1, CURRENT_DATE, 'System', $2, $3, 'allocation', 'completed', 'manual_override', 'Manual balance override')`,
        [`TXNOVR-${Date.now()}`, name, Math.abs(overrideDelta)]
      );
    }
    
    await client.query('COMMIT');
    return { success: true, data: { delta } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}

export async function dbUpdateTransactionMetaAction(
  txnId: string,
  date: string,
  notes: string,
  tagIds: string[] = [],
): Promise<DbActionResult<Transaction>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockCheck = await assertLedgerTransactionModifiable(client, txnId);
    if (!lockCheck.success) {
      await client.query('ROLLBACK');
      return { success: false, error: lockCheck.error };
    }
    const txMeta = await client.query('SELECT branch_id FROM transactions WHERE id = $1', [txnId]);
    const branchId = txMeta.rows[0]?.branch_id as string | undefined;
    let branchTz = DEFAULT_BRANCH_TIMEZONE;
    let businessDate: string | undefined;
    if (branchId) {
      const tzRes = await client.query('SELECT timezone FROM branches WHERE id = $1', [branchId]);
      branchTz = resolveBranchTimeZone(tzRes.rows[0]?.timezone);
      businessDate = toBusinessDate(date, branchTz);
      await client.query(
        `UPDATE transactions SET date = $1, notes = $2, business_date = $3 WHERE id = $4`,
        [date, notes || '', businessDate, txnId],
      );
    } else {
      await client.query(
        `UPDATE transactions SET date = $1, notes = $2 WHERE id = $3`,
        [date, notes || '', txnId],
      );
    }
    await client.query(`DELETE FROM transaction_tag_links WHERE transaction_id = $1`, [txnId]);
    const tagNames: string[] = [];
    for (const tagId of tagIds) {
      await client.query(
        `INSERT INTO transaction_tag_links (transaction_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [txnId, tagId]
      );
      const tagRes = await client.query('SELECT name FROM transaction_tags WHERE id = $1', [tagId]);
      if (tagRes.rows[0]?.name) tagNames.push(tagRes.rows[0].name);
    }
    const txRes = await client.query('SELECT * FROM transactions WHERE id = $1', [txnId]);
    if (!txRes.rows.length) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Transaction not found.' };
    }
    const r = txRes.rows[0];
    await client.query('COMMIT');
    return {
      success: true,
      data: {
        id: r.id,
        date: new Date(r.date).toISOString(),
        from: r.from_entity,
        to: r.to_entity,
        amount: parseFloat(r.amount),
        type: r.type,
        assetType: r.asset_type || 'currency',
        status: r.status,
        notes: r.notes,
        category: r.category || undefined,
        branchId: r.branch_id || undefined,
        businessDate: businessDate ?? toBusinessDate(new Date(r.date).toISOString(), branchTz),
        tags: tagNames,
        tagIds,
      },
    };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}

export async function dbUpdateLedgerTransactionAction(txn: Transaction, oldAmount: number, oldCategory: string | undefined, deltaCash: number, deltaGold: number, branchId: string): Promise<DbActionResult<Transaction>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockCheck = await assertLedgerTransactionModifiable(client, txn.id);
    if (!lockCheck.success) {
      await client.query('ROLLBACK');
      return { success: false, error: lockCheck.error };
    }
    await client.query(
      `UPDATE transactions SET from_entity = $1, to_entity = $2, amount = $3, notes = $4, category = $5, status = $6, asset_type = $7 WHERE id = $8`,
      [txn.from, txn.to, txn.amount, txn.notes || '', txn.category || null, txn.status, txn.assetType || 'currency', txn.id]
    );
    if (deltaCash !== 0) {
      await client.query(`UPDATE branches SET current_balance = current_balance + $1, cash_balance = cash_balance + $1 WHERE id = $2`, [deltaCash, branchId]);
    }
    if (deltaGold !== 0) {
      await client.query(`UPDATE branches SET gold_balance = gold_balance + $1 WHERE id = $2`, [deltaGold, branchId]);
    }
    await client.query('COMMIT');
    return { success: true, data: txn };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}

export async function dbDeleteLedgerTransactionAction(id: string, deltaCash: number, deltaGold: number, branchId: string): Promise<DbActionResult<{ id: string }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockCheck = await assertLedgerTransactionModifiable(client, id);
    if (!lockCheck.success) {
      await client.query('ROLLBACK');
      return { success: false, error: lockCheck.error };
    }
    await client.query(`DELETE FROM transactions WHERE id = $1`, [id]);
    if (deltaCash !== 0) {
      await client.query(`UPDATE branches SET current_balance = current_balance + $1, cash_balance = cash_balance + $1 WHERE id = $2`, [deltaCash, branchId]);
    }
    if (deltaGold !== 0) {
      await client.query(`UPDATE branches SET gold_balance = gold_balance + $1 WHERE id = $2`, [deltaGold, branchId]);
    }
    await client.query('COMMIT');
    return { success: true, data: { id } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}

export async function dbUpdateBranchInitialGoldAction(id: string, name: string, newFund: number, newCurrentBalance?: number): Promise<DbActionResult<{ delta: number }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const oldRes = await client.query('SELECT opening_gold_balance, gold_balance FROM branches WHERE id = $1', [id]);
    const oldFund = parseFloat(oldRes.rows[0].opening_gold_balance || 0);
    const oldCurrent = parseFloat(oldRes.rows[0].gold_balance || 0);
    const delta = newFund - oldFund;
    
    let targetCurrentBalance = oldCurrent + delta;
    if (newCurrentBalance !== undefined && !isNaN(newCurrentBalance)) {
      targetCurrentBalance = newCurrentBalance;
    }

    await client.query('UPDATE branches SET opening_gold_balance = $1, gold_balance = $2 WHERE id = $3', [newFund, targetCurrentBalance, id]);
    
    // Create transaction log for the opening balance change (HQ allocation)
    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, asset_type, status, category, notes) VALUES ($1, CURRENT_DATE, 'HQ Treasury', $2, $3, 'allocation', 'gold', 'completed', 'capital_allocation', 'Gold Capital adjustment')`,
      [`TXN-${Date.now()}`, name, Math.abs(delta)]
    );
    
    // Create transaction log if current balance was overridden manually
    if (newCurrentBalance !== undefined && !isNaN(newCurrentBalance) && newCurrentBalance !== (oldCurrent + delta)) {
      const overrideDelta = targetCurrentBalance - (oldCurrent + delta);
      await client.query(
        `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, asset_type, status, category, notes) VALUES ($1, CURRENT_DATE, 'System', $2, $3, 'allocation', 'gold', 'completed', 'manual_override', 'Manual gold balance override')`,
        [`TXNOVR-${Date.now()}`, name, Math.abs(overrideDelta)]
      );
    }
    
    await client.query('COMMIT');
    return { success: true, data: { delta } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}

export async function dbDeleteBranchAction(id: string): Promise<DbActionResult<void>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  try {
    const dealsRes = await query('SELECT 1 FROM deals WHERE managing_branch_id = $1 LIMIT 1', [id]);
    if (dealsRes.rowCount && dealsRes.rowCount > 0) return { success: false, error: 'Cannot delete branch because it has associated deals.' };
    const expensesRes = await query('SELECT 1 FROM expenses WHERE branch_id = $1 LIMIT 1', [id]);
    if (expensesRes.rowCount && expensesRes.rowCount > 0) return { success: false, error: 'Cannot delete branch because it has associated expenses.' };
    const invoicesRes = await query('SELECT 1 FROM invoices WHERE branch_id = $1 LIMIT 1', [id]);
    if (invoicesRes.rowCount && invoicesRes.rowCount > 0) return { success: false, error: 'Cannot delete branch because it has associated invoices.' };
    await query('DELETE FROM branches WHERE id = $1', [id]);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbDeleteEntityAction(entityName: string, entityId: string): Promise<DbActionResult<void>> {
  try {
    const txRes = await query('SELECT 1 FROM transactions WHERE from_entity = $1 OR to_entity = $1 LIMIT 1', [entityName]);
    if (txRes.rowCount && txRes.rowCount > 0) return { success: false, error: 'Cannot delete entity because it is part of a ledger transaction.' };
    
    await query('DELETE FROM entities WHERE id = $1', [entityId]);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

// ── Ledger Actions ─────────────────────────────────────────────────────────

export async function dbAddLedgerAction(ledger: import('@/types').Ledger): Promise<DbActionResult<import('@/types').Ledger>> {
  if (!ledger.branchId) {
    return { success: false, error: 'Global ledgers are system-managed and cannot be created from the app.' };
  }
  try {
    await query(
      'INSERT INTO ledgers (id, branch_id, name, impact, is_kpi, kpi_invert, sort_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [ledger.id, ledger.branchId || null, ledger.name, ledger.impact, ledger.isKpi, ledger.kpiInvert ?? false, ledger.sortOrder || 0, ledger.createdAt || new Date().toISOString()]
    );
    return { success: true, data: ledger };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbUpdateLedgerAction(ledger: import('@/types').Ledger): Promise<DbActionResult<import('@/types').Ledger>> {
  try {
    const existing = await query('SELECT branch_id, name FROM ledgers WHERE id = $1', [ledger.id]);
    if (!existing.rows.length) return { success: false, error: 'Ledger not found.' };
    if (!existing.rows[0].branch_id) {
      await query(
        'UPDATE ledgers SET is_kpi = $1, kpi_invert = $2 WHERE id = $3',
        [ledger.isKpi, ledger.kpiInvert ?? false, ledger.id],
      );
      return { success: true, data: ledger };
    }

    const oldName: string = existing.rows[0].name;
    if (ledger.name.trim() !== oldName) {
      const txRes = await query(
        'SELECT 1 FROM transactions WHERE from_entity = $1 OR to_entity = $1 OR type = $1 LIMIT 1',
        [oldName],
      );
      if (txRes.rowCount && txRes.rowCount > 0) {
        return {
          success: false,
          error: 'Name cannot be changed because this ledger has at least one transaction.',
        };
      }
    }

    await query(
      'UPDATE ledgers SET name = $1, impact = $2, is_kpi = $3, kpi_invert = $4, sort_order = $5 WHERE id = $6',
      [ledger.name, ledger.impact, ledger.isKpi, ledger.kpiInvert ?? false, ledger.sortOrder || 0, ledger.id],
    );
    return { success: true, data: ledger };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

export async function dbDeleteLedgerAction(id: string, name: string): Promise<DbActionResult<void>> {
  try {
    const existing = await query('SELECT branch_id FROM ledgers WHERE id = $1', [id]);
    if (!existing.rows.length) return { success: false, error: 'Ledger not found.' };
    if (!existing.rows[0].branch_id) {
      return { success: false, error: 'Global ledgers are system-managed and cannot be deleted from the app.' };
    }

    const txRes = await query('SELECT 1 FROM transactions WHERE from_entity = $1 OR to_entity = $1 OR type = $1 LIMIT 1', [name]);
    if (txRes.rowCount && txRes.rowCount > 0) return { success: false, error: 'Cannot delete ledger because it is part of a transaction.' };
    
    await query('DELETE FROM ledgers WHERE id = $1', [id]);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return { success: false, error: formatPgError(error) };
  }
}

export async function restoreTransactionsBackupAction(
  backup: TransactionsPageBackup,
  branchSlug?: string,
): Promise<DbActionResult<{ restored: Record<string, number> }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const userRes = await getCurrentUserAction(branchSlug);
  if (!userRes.success || !userRes.data) {
    return { success: false, error: 'You must be signed in to restore a backup.' };
  }

  if (!validateTransactionsPageBackup(backup)) {
    return { success: false, error: 'Invalid backup file format.' };
  }

  const client = await pool.connect();
  const restored: Record<string, number> = {
    branches: 0,
    entities: 0,
    ledgers: 0,
    transaction_tags: 0,
    transactions: 0,
    transaction_tag_links: 0,
  };

  try {
    await client.query('BEGIN');

    for (const b of backup.tables.branches) {
      await client.query(
        `INSERT INTO branches (id, slug, name, location, manager_name, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           name = EXCLUDED.name,
           location = EXCLUDED.location,
           manager_name = EXCLUDED.manager_name,
           status = EXCLUDED.status`,
        [b.id, b.slug, b.name, b.location, b.manager_name, b.status],
      );
      restored.branches += 1;
    }

    for (const e of backup.tables.entities) {
      await client.query(
        `INSERT INTO entities (id, name, phone, branch_id, created_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, CURRENT_TIMESTAMP))
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           branch_id = EXCLUDED.branch_id`,
        [e.id, e.name, e.phone, e.branch_id, e.created_at],
      );
      restored.entities += 1;
    }

    for (const l of backup.tables.ledgers) {
      await client.query(
        `INSERT INTO ledgers (id, branch_id, name, impact, is_kpi, kpi_invert, sort_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, CURRENT_TIMESTAMP))
         ON CONFLICT (id) DO UPDATE SET
           branch_id = EXCLUDED.branch_id,
           name = EXCLUDED.name,
           impact = EXCLUDED.impact,
           is_kpi = EXCLUDED.is_kpi,
           kpi_invert = EXCLUDED.kpi_invert,
           sort_order = EXCLUDED.sort_order`,
        [l.id, l.branch_id, l.name, l.impact, l.is_kpi, l.kpi_invert ?? false, l.sort_order, l.created_at],
      );
      restored.ledgers += 1;
    }

    for (const tag of backup.tables.transaction_tags) {
      await client.query(
        `INSERT INTO transaction_tags (id, branch_id, name, created_at)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, CURRENT_TIMESTAMP))
         ON CONFLICT (id) DO UPDATE SET
           branch_id = EXCLUDED.branch_id,
           name = EXCLUDED.name`,
        [tag.id, tag.branch_id, tag.name, tag.created_at],
      );
      restored.transaction_tags += 1;
    }

    const { startDate, endDate, branchIds } = backup.scope;
    const scopedBranchIds =
      branchIds ??
      [...new Set(backup.tables.transactions.map(t => t.branch_id).filter(Boolean))] as string[];

    if (startDate && endDate) {
      if (scopedBranchIds.length === 0) {
        await client.query(
          `DELETE FROM transactions
           WHERE date::date >= $1::date AND date::date <= $2::date`,
          [startDate, endDate],
        );
      } else {
        await client.query(
          `DELETE FROM transactions
           WHERE branch_id = ANY($1::varchar[])
             AND date::date >= $2::date AND date::date <= $3::date`,
          [scopedBranchIds, startDate, endDate],
        );
      }
    } else if (scopedBranchIds.length > 0) {
      await client.query(`DELETE FROM transactions WHERE branch_id = ANY($1::varchar[])`, [
        scopedBranchIds,
      ]);
    } else {
      await client.query(`DELETE FROM transactions WHERE id = ANY($1::varchar[])`, [
        backup.tables.transactions.map(t => t.id),
      ]);
    }

    for (const t of backup.tables.transactions) {
      await client.query(
        `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, asset_type, status, notes, category, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           date = EXCLUDED.date,
           from_entity = EXCLUDED.from_entity,
           to_entity = EXCLUDED.to_entity,
           amount = EXCLUDED.amount,
           type = EXCLUDED.type,
           asset_type = EXCLUDED.asset_type,
           status = EXCLUDED.status,
           notes = EXCLUDED.notes,
           category = EXCLUDED.category,
           branch_id = EXCLUDED.branch_id`,
        [
          t.id,
          t.date,
          t.from_entity,
          t.to_entity,
          t.amount,
          t.type,
          t.asset_type,
          t.status,
          t.notes,
          t.category,
          t.branch_id,
        ],
      );
      restored.transactions += 1;
    }

    for (const link of backup.tables.transaction_tag_links) {
      await client.query(
        `INSERT INTO transaction_tag_links (transaction_id, tag_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [link.transaction_id, link.tag_id],
      );
      restored.transaction_tag_links += 1;
    }

    await client.query('COMMIT');
    return { success: true, data: { restored } };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    return { success: false, error: formatPgError(error) };
  } finally {
    client.release();
  }
}
