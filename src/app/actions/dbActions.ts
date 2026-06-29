'use server';

import { getCurrentUserAction } from '@/app/actions/auth';
import { assertStaffWriteAccess } from '@/app/actions/permissionActions';
import type { BranchPageId } from '@/lib/branchPages';
import { isBranchScopedUser } from '@/lib/rbac';
import { query, pool } from '@/lib/db';
import { DEFAULT_BRANCH_TIMEZONE, resolveBranchTimeZone, toBusinessDate, parseCalendarDate } from '@/lib/businessTime';
import {
  SQL_BACKFILL_TRANSACTION_BUSINESS_DATES,
  SQL_BACKFILL_TRANSACTION_BUSINESS_DATES_ORPHAN,
} from '@/lib/sql/businessDateSql';
import { SQL_ENSURE_USDT_SCHEMA } from '@/lib/sql/usdtSchemaSql';
import { filterBranchLedgers } from '@/lib/ledgers';
import { mapPhysicalBuyRow, mapPhysicalSellRow } from '@/lib/physicalMappers';
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

import { sanitizeEnabledCurrencies } from '@/lib/currency';
import { validateJournalEntry } from '@/lib/journalEntry';
import {
  Branch,
  Transaction,
  Expense,
  Invoice,
  Notification,
  Investor,
  Deal,
  DealTransaction,
  DealTransactionExpense,
  Entity,
  PhysicalBalance,
  PhysicalBuy,
  PhysicalSell,
  UsdtBranchSettings,
  UsdtBuy,
  UsdtSell,
  ICRegion,
  ICSupplier,
  ICWarehouse,
  ICRateGroup,
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
  usdtBuys: UsdtBuy[];
  usdtSells: UsdtSell[];
  usdtSettings: UsdtBranchSettings[];
  icRegions: ICRegion[];
  icSuppliers: ICSupplier[];
  icWarehouses: ICWarehouse[];
  icRateGroups: ICRateGroup[];
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

async function guardStaffWrite(
  pageId: BranchPageId,
  branchSlug?: string,
  branchId?: string,
): Promise<DbGuardFail | null> {
  const slug = branchSlug ?? (await resolveBranchSlug(branchId));
  let user = slug ? (await getCurrentUserAction(slug)).data : null;
  if (!user) user = (await getCurrentUserAction()).data ?? null;
  const err = await assertStaffWriteAccess(user, pageId, branchId ?? user?.branchId);
  return err ? { success: false, error: err } : null;
}

/**
 * Fetches all database records for initial dashboard hydration in a single step.
 *
 * Uses JOINs + json_agg for investors/deals to eliminate N+1 queries.
 */
export async function fetchInitialDataAction(branchSlug?: string): Promise<DbActionResult<InitialDataPayload>> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_page_permissions (
        user_id VARCHAR(128) NOT NULL,
        branch_id VARCHAR(50) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        page_id VARCHAR(50) NOT NULL,
        access_level VARCHAR(10) NOT NULL DEFAULT 'none' CHECK (access_level IN ('none', 'read', 'write')),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255),
        PRIMARY KEY (user_id, branch_id, page_id)
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_page_permissions_branch ON user_page_permissions(branch_id);`);

    // ── AUTO-MIGRATION: Fix branch ID length (Max 10 chars for Cognito) ──
    await query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM branches WHERE id = 'br-aibak-office') THEN
          UPDATE branches SET name = 'Aibak Office Old' WHERE id = 'br-aibak-office';
          INSERT INTO branches (id, name, location, manager_name, status)
          VALUES ('BRAIBAKOFF', 'Aibak Office', 'Dubai', 'Aibak', 'active')
          ON CONFLICT (id) DO NOTHING;
          
          UPDATE deals SET managing_branch_id = 'BRAIBAKOFF', to_branch_id = 'BRAIBAKOFF' WHERE managing_branch_id = 'br-aibak-office' OR to_branch_id = 'br-aibak-office';
          UPDATE investors SET assigned_branch_id = 'BRAIBAKOFF' WHERE assigned_branch_id = 'br-aibak-office';
          UPDATE entities SET branch_id = 'BRAIBAKOFF' WHERE branch_id = 'br-aibak-office';
          
          DELETE FROM branches WHERE id = 'br-aibak-office';
        END IF;
      END $$;
    `);
    // ─────────────────────────────────────────────────────────────────────

    await query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dubai';`);
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS business_date DATE;`);
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by VARCHAR(255);`);
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by_name VARCHAR(255);`);
    await query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS entered_by_user_id VARCHAR(255);`);
    // Auto-backfill is removed because it was overwriting manually corrected data on every reload.
    await query(SQL_ENSURE_USDT_SCHEMA);

    // 1. Fetch HQ Balance
    const hqRes = await query('SELECT amount FROM hq_balance WHERE id = 1');
    const hqBalance = hqRes.rows.length > 0 ? parseFloat(hqRes.rows[0].amount) : 50000000;

    // 2. Fetch Branches
    const branchesRes = await query('SELECT * FROM branches ORDER BY id ASC');
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
      hiddenPages: Array.isArray(r.hidden_pages) ? r.hidden_pages.map(String) : [],
      enabledCurrencies: sanitizeEnabledCurrencies(r.enabled_currencies),
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    // 3. Fetch Transactions
    const txRes = await query('SELECT * FROM transactions ORDER BY date DESC');
    const tagLinksRes = await query(`
      SELECT ttl.transaction_id, tt.id, tt.name
      FROM transaction_tag_links ttl
      JOIN transaction_tags tt ON tt.id = ttl.tag_id
    `).catch(() => ({ rows: [] as { transaction_id: string; id: string; name: string }[] }));
    const tagsByTxnId: Record<string, { id: string; name: string }[]> = {};
    for (const row of tagLinksRes.rows) {
      if (!tagsByTxnId[row.transaction_id]) tagsByTxnId[row.transaction_id] = [];
      tagsByTxnId[row.transaction_id].push({ id: row.id, name: row.name });
    }
    const branchTzById = Object.fromEntries(
      branches.map(b => [b.id, resolveBranchTimeZone(b.timezone)]),
    );
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
        tags: linked.map(t => t.name),
        tagIds: linked.map(t => t.id),
      };
    });

    // 4. Fetch Expenses
    const expRes = await query('SELECT * FROM expenses ORDER BY date DESC');
    const expenses: Expense[] = expRes.rows.map((r) => ({
      id: r.id,
      date: new Date(r.date).toISOString().slice(0, 10),
      branchId: r.branch_id,
      branchName: r.branch_name,
      type: r.type,
      category: r.category,
      description: r.description,
      amount: parseFloat(r.amount),
    }));

    // 5. Fetch Invoices
    const invRes = await query('SELECT * FROM invoices ORDER BY date DESC');
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

    // 6. Fetch Notifications
    const notifRes = await query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    const notifications: Notification[] = notifRes.rows.map((r) => ({
      id: r.id,
      message: r.message,
      time: r.time,
      read: r.read,
      type: r.type,
    }));

    // 7. Fetch Investors with deposits (single query via LEFT JOIN + json_agg)
    const investorsRes = await query(`
      SELECT
        i.*,
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
    `);

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

    // 8. Fetch Deals with investors (single query via LEFT JOIN + json_agg)
    const dealsRes = await query(`
      SELECT
        dl.*,
        COALESCE(
          json_agg(
            json_build_object(
              'investorId', di.investor_id,
              'investorName', di.investor_name,
              'amount', di.amount,
              'isGold', di.is_gold
            )
          ) FILTER (WHERE di.deal_id IS NOT NULL),
          '[]'::json
        ) AS deal_investors_json
      FROM deals dl
      LEFT JOIN deal_investors di ON di.deal_id = dl.id
      GROUP BY dl.id
      ORDER BY dl.date DESC
    `);

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

    const dealTxRes = await query(`
      SELECT dt.*,
        (SELECT COALESCE(json_agg(
            json_build_object(
              'id', dtp.id,
              'dealTransactionId', dtp.deal_transaction_id,
              'investorId', dtp.investor_id,
              'investorName', dtp.investor_name,
              'payoutAmount', dtp.payout_amount,
              'createdAt', dtp.created_at
            )
          ), '[]'::json)
         FROM deal_transaction_payouts dtp 
         WHERE dtp.deal_transaction_id = dt.id
        ) as payouts,
        (SELECT COALESCE(json_agg(
            json_build_object(
              'id', dte.id,
              'dealTransactionId', dte.deal_transaction_id,
              'key', dte.key,
              'value', dte.value,
              'timestamp', dte.timestamp,
              'createdAt', dte.created_at
            )
          ), '[]'::json)
         FROM deal_transaction_expenses dte 
         WHERE dte.deal_transaction_id = dt.id
        ) as expenses_details
      FROM deal_transactions dt
      ORDER BY dt.date DESC
    `);
    const dealTransactions: DealTransaction[] = dealTxRes.rows.map((r) => ({
      id: r.id,
      date: r.date ? new Date(r.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      time: r.time || undefined,
      dealId: r.deal_id || undefined,
      deal: r.deal_number || (r.id.startsWith('txn-') ? r.id.substring(4) : (r.id.split('-').pop() || '1')),
      weight: parseFloat(r.weight),
      rate: parseFloat(r.rate),
      pureCostAed: parseFloat(r.pure_cost_aed),
      liveSellRate: parseFloat(r.live_sell_rate || '0'),
      sellPremiumDiscount: parseFloat(r.sell_premium_discount || '0'),
      salesAed: parseFloat(r.sales_aed || '0'),
      expenses: parseFloat(r.expenses || '0'),
      grossProfit: parseFloat(r.gross_profit || '0'),
      netProfitPerGram: parseFloat(r.net_profit_per_gram || '0'),
      managementProfit: parseFloat(r.management_profit || '0'),
      fixOrUnfix: r.fix_or_unfix,
      marginDeposit: parseFloat(r.margin_deposit || '0'),
      premiumDiscount: parseFloat(r.premium_discount || '0'),
      payouts: (r.payouts as Array<any>).map((p: any) => ({
        id: p.id,
        dealTransactionId: p.dealTransactionId,
        investorId: p.investorId,
        investorName: p.investorName,
        payoutAmount: parseFloat(p.payoutAmount),
        createdAt: p.createdAt,
      })),
      expensesDetails: (r.expenses_details as Array<any>).map((e: any) => ({
        id: e.id,
        dealTransactionId: e.dealTransactionId,
        key: e.key,
        value: parseFloat(e.value),
        timestamp: e.timestamp,
        createdAt: e.createdAt,
      })),
    }));

    // Fetch Entities
    const entitiesRes = await query('SELECT * FROM entities ORDER BY created_at DESC');
    const entities: Entity[] = entitiesRes.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      phone: r.phone || undefined,
      branchId: r.branch_id || undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    // Fetch Ledgers
    const ledgersRes = await query('SELECT * FROM ledgers ORDER BY sort_order ASC, created_at ASC');
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

    const transactionTagsRes = await query('SELECT * FROM transaction_tags ORDER BY name ASC').catch(() => ({ rows: [] }));
    const transactionTags: import('@/types').TransactionTag[] = transactionTagsRes.rows.map((r: any) => ({
      id: r.id,
      branchId: r.branch_id || undefined,
      name: r.name,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    const userRes = await getCurrentUserAction(branchSlug);
    const currentUser = userRes.success ? userRes.data : null;

    // Fetch Physical Data
    const physicalBalancesRes = await query('SELECT * FROM physical_balances');
    const physicalBalances = physicalBalancesRes.rows.map(r => ({
      branchId: r.branch_id,
      initialCapital: parseFloat(r.initial_capital),
      initialVolume: parseFloat(r.initial_volume),
      availableFund: parseFloat(r.available_fund),
      availableVolume: parseFloat(r.available_volume),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    }));

    const physicalBuysRes = await query('SELECT * FROM physical_buys ORDER BY date DESC');
    const physicalBuys = physicalBuysRes.rows.map(r => mapPhysicalBuyRow(r));

    const physicalSellsRes = await query('SELECT * FROM physical_sells ORDER BY date DESC');
    const physicalSells = physicalSellsRes.rows.map(r => mapPhysicalSellRow(r));

    const usdtBuysRes = await query('SELECT * FROM usdt_buys ORDER BY date DESC');
    const usdtBuys = usdtBuysRes.rows.map(r => mapUsdtBuyRow(r));
    const usdtSellsRes = await query('SELECT * FROM usdt_sells ORDER BY date DESC');
    const usdtSells = usdtSellsRes.rows.map(r => mapUsdtSellRow(r));
    const usdtSettingsRes = await query('SELECT * FROM usdt_branch_settings');
    const usdtSettings = usdtSettingsRes.rows.map(r => mapUsdtSettingsRow(r));

    // Fetch IC Transfer Data
    const icRegionsRes = await query('SELECT * FROM ic_regions');
    const icRegions = icRegionsRes.rows.map(r => mapICRegionRow(r));
    const icSuppliersRes = await query('SELECT * FROM ic_suppliers');
    const icSuppliers = icSuppliersRes.rows.map(r => mapICSupplierRow(r));
    const icWarehousesRes = await query('SELECT * FROM ic_warehouses');
    const icWarehouses = icWarehousesRes.rows.map(r => mapICWarehouseRow(r));
    const icRateGroupsRes = await query(`
      SELECT g.*, 
             COALESCE((SELECT array_agg(customer_id) FROM ic_rate_group_customers WHERE group_id = g.id), ARRAY[]::varchar[]) as customer_ids,
             COALESCE((SELECT array_agg(branch_id) FROM ic_rate_group_branches WHERE group_id = g.id), ARRAY[]::varchar[]) as branch_ids
      FROM ic_rate_groups g
    `);
    const icRateGroups = icRateGroupsRes.rows.map(r => mapICRateGroupRow(r));
    const icPurchasesRes = await query('SELECT * FROM ic_purchases ORDER BY created_at DESC');
    const icPurchases = icPurchasesRes.rows.map(r => mapICPurchaseRow(r));
    const icSalesRes = await query('SELECT s.*, a.name as delivery_agent_name FROM ic_sales s LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id ORDER BY s.created_at DESC');
    const icSales = icSalesRes.rows.map(r => mapICSaleRow(r));
    const icWarehouseTxRes = await query('SELECT * FROM ic_warehouse_transactions ORDER BY created_at DESC');
    const icWarehouseTransactions = icWarehouseTxRes.rows.map(r => mapICWarehouseTransactionRow(r));


    let finalBranches = branches;
    let finalTransactions = transactions;
    let finalExpenses = expenses;
    let finalInvoices = invoices;
    let finalInvestors = investors;
    let finalDeals = deals;
    let finalDealTransactions = dealTransactions;
    let finalEntities = entities;
    let finalLedgers = ledgers;
    let finalTransactionTags = transactionTags;
    let finalPhysicalBalances = physicalBalances;
    let finalPhysicalBuys = physicalBuys;
    let finalPhysicalSells = physicalSells;
    let finalUsdtBuys = usdtBuys;
    let finalUsdtSells = usdtSells;
    let finalUsdtSettings = usdtSettings;

    if (currentUser && isBranchScopedUser(currentUser) && currentUser.branchId) {
      const bId = currentUser.branchId;
      const branchName = branches.find(b => b.id === bId)?.name || bId;
      
      finalBranches = branches.filter(b => b.id === bId);
      finalTransactions = transactions.filter(t => t.to === branchName || t.from === branchName || t.branchId === bId);
      finalExpenses = expenses.filter(e => e.branchId === bId);
      finalInvoices = invoices.filter(i => i.branchId === bId);
      finalInvestors = investors.filter(i => i.assignedBranchId === bId || i.isGlobal);
      finalDeals = deals.filter(d => d.managingBranchId === bId);
      
      const dealIds = new Set(finalDeals.map(d => d.id));
      finalDealTransactions = dealTransactions.filter(dt => dealIds.has(dt.dealId || ''));
      finalEntities = entities.filter(e => !e.branchId || e.branchId === bId);
      finalLedgers = filterBranchLedgers(ledgers, bId);
      finalTransactionTags = transactionTags.filter(t => !t.branchId || t.branchId === bId);
      finalPhysicalBalances = physicalBalances.filter(b => b.branchId === bId);
      finalPhysicalBuys = physicalBuys.filter(b => b.branchId === bId);
      const buyIds = new Set(finalPhysicalBuys.map(b => b.id));
      finalPhysicalSells = physicalSells.filter(s => buyIds.has(s.buyId));
      finalUsdtBuys = usdtBuys.filter(b => b.branchId === bId);
      finalUsdtSells = usdtSells.filter(s => s.branchId === bId);
      finalUsdtSettings = usdtSettings.filter(s => s.branchId === bId);
    }

    return {
      success: true,
      data: {
        globalBranches: branches,
        globalEntities: entities,
        branches: finalBranches,
        transactions: finalTransactions,
        expenses: finalExpenses,
        invoices: finalInvoices,
        notifications,
        investors: finalInvestors,
        deals: finalDeals,
        hqBalance,
        dealTransactions: finalDealTransactions,
        entities: finalEntities,
        ledgers: finalLedgers,
        transactionTags: finalTransactionTags,
        physicalBalances: finalPhysicalBalances,
        physicalBuys: finalPhysicalBuys,
        physicalSells: finalPhysicalSells,
        usdtBuys: finalUsdtBuys,
        usdtSells: finalUsdtSells,
        usdtSettings: finalUsdtSettings,
        icRegions,
        icSuppliers,
        icWarehouses,
        icRateGroups,
        icPurchases,
        icSales,
        icWarehouseTransactions,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard data.';
    console.error('Failed to fetch initial data from Postgres:', error);
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
    console.error('Error adding branch to database:', error);
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
    console.error('Error executing fund transfer:', error);
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
    console.error('Error adding invoice:', error);
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
    console.error('Error updating HQ balance:', error);
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
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert expense
    await client.query(
      `INSERT INTO expenses (id, date, branch_id, branch_name, type, category, description, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        expense.id,
        expense.date,
        expense.branchId,
        expense.branchName,
        expense.type,
        expense.category,
        expense.description,
        expense.amount,
      ]
    );

    // 2. Adjust balance
    const timestamp = new Date().toISOString();
    if (expense.branchId === 'HQ_TREASURY') {
      await client.query('UPDATE hq_balance SET amount = amount - $1 WHERE id = 1', [expense.amount]);
    } else {
      await client.query(
        `UPDATE branches 
         SET current_balance = current_balance - $1, last_activity = $2
         WHERE id = $3`,
        [expense.amount, timestamp, expense.branchId]
      );
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
    console.error('Error adding expense:', error);
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
): Promise<DbActionResult<Investor>> {
  const denied = await guardStaffWrite('investors', undefined, investor.assignedBranchId);
  if (denied) return denied;

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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert investor
    await client.query(
      `INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, is_global, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
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
        investor.assignedBranchId || null,
        investor.assignedBranchName || null,
        investor.preferredContact,
        investor.isGlobal || false,
        investor.notes || null,
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
    const message = formatPgError(error);
    console.error('Error adding investor:', error);
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
    console.error('Error updating investor:', error);
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
    console.error('Error deleting investor:', error);
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

    await client.query('COMMIT');
    return { success: true, data: deal };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    console.error('Error adding deal:', error);
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Updates an existing deal and replaces its associated participant investors.
 */
export async function dbUpdateDealAction(deal: Deal): Promise<DbActionResult<Deal>> {
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

    await client.query('COMMIT');
    return { success: true, data: deal };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    console.error('Error updating deal:', error);
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Creates a new deal transaction record in the database.
 */
export async function dbAddDealTransactionAction(
  txn: DealTransaction
): Promise<DbActionResult<DealTransaction>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert deal transaction
    await client.query(
      `INSERT INTO deal_transactions (
        id, deal_number, date, time, deal_id, weight, rate, pure_cost_aed, live_sell_rate, sell_premium_discount, sales_aed, expenses, 
        gross_profit, net_profit_per_gram, management_profit, fix_or_unfix, margin_deposit, premium_discount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        txn.id,
        txn.deal,
        txn.date,
        txn.time || null,
        txn.dealId,
        txn.weight,
        txn.rate,
        txn.pureCostAed,
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
    console.error('Error adding deal transaction:', error);
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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE deal_transactions SET
        deal_number = $1, date = $2, time = $3, weight = $4, rate = $5, pure_cost_aed = $6, live_sell_rate = $7, sell_premium_discount = $8,
        sales_aed = $9, expenses = $10, gross_profit = $11, net_profit_per_gram = $12, management_profit = $13,
        fix_or_unfix = $14, margin_deposit = $15, premium_discount = $16
      WHERE id = $17 AND deal_id = $18`,
      [
        txn.deal,
        txn.date,
        txn.time || null,
        txn.weight,
        txn.rate,
        txn.pureCostAed,
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
    console.error('Error updating deal transaction:', error);
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
    console.error('Error deleting deal transaction:', error);
    return { success: false, error: message };
  } finally {
    client.release();
  }
}

/**
 * Adds a batch of key-value expense entries for a deal transaction.
 * Uses ON CONFLICT to upsert so re-saving the same items is safe.
 */
export async function dbAddDealExpensesAction(
  expenses: DealTransactionExpense[]
): Promise<DbActionResult<DealTransactionExpense[]>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
  if (!expenses.length) return { success: true, data: [] };

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

    await client.query('COMMIT');
    return { success: true, data: inserted };
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const message = formatPgError(error);
    console.error('Error adding deal transaction expenses:', error);
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
    console.error('Error fetching deal transaction expenses:', error);
    return { success: false, error: message };
  }
}

/**
 * Deletes a single expense entry by id.
 */
export async function dbDeleteDealExpenseAction(
  id: string
): Promise<DbActionResult<{ id: string }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  try {
    await query(`DELETE FROM deal_transaction_expenses WHERE id = $1`, [id]);
    return { success: true, data: { id } };
  } catch (error: unknown) {
    const message = formatPgError(error);
    console.error('Error deleting deal transaction expense:', error);
    return { success: false, error: message };
  }
}

/**
 * Deletes a deal completely, cascading deletes to transactions, expenses, and investors.
 */
export async function dbDeleteDealAction(
  id: string
): Promise<DbActionResult<{ id: string }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

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
    console.error('Error deleting deal:', error);
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
    console.error('Error adding entity:', error);
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
    console.error('Error updating entity:', error);
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
    console.error('Error fetching entities:', error);
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
