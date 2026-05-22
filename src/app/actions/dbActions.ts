'use server';

import { query, pool } from '@/lib/db';
import {
  Branch,
  Transaction,
  Expense,
  Invoice,
  Notification,
  Investor,
  Deal,
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

export interface DbActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isMockFallback?: boolean;
}

export interface InitialDataPayload {
  branches: Branch[];
  transactions: Transaction[];
  expenses: Expense[];
  invoices: Invoice[];
  notifications: Notification[];
  investors: Investor[];
  deals: Deal[];
  hqBalance: number;
}

/**
 * Fetches all database records for initial dashboard hydration in a single step.
 *
 * Uses JOINs + json_agg for investors/deals to eliminate N+1 queries.
 */
export async function fetchInitialDataAction(): Promise<DbActionResult<InitialDataPayload>> {
  if (!pool) {
    return { success: true, isMockFallback: true };
  }

  try {
    // 1. Fetch HQ Balance
    const hqRes = await query('SELECT amount FROM hq_balance WHERE id = 1');
    const hqBalance = hqRes.rows.length > 0 ? parseFloat(hqRes.rows[0].amount) : 50000000;

    // 2. Fetch Branches
    const branchesRes = await query('SELECT * FROM branches ORDER BY id ASC');
    const branches: Branch[] = branchesRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      managerName: r.manager_name,
      cashBalance: parseFloat(r.cash_balance),
      goldBalance: parseFloat(r.gold_balance),
      currentBalance: parseFloat(r.current_balance),
      openingBalance: parseFloat(r.opening_balance),
      closingBalance: parseFloat(r.closing_balance),
      dailyPL: parseFloat(r.daily_pl),
      status: r.status,
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));

    // 3. Fetch Transactions
    const txRes = await query('SELECT * FROM transactions ORDER BY date DESC');
    const transactions: Transaction[] = txRes.rows.map((r) => ({
      id: r.id,
      date: new Date(r.date).toISOString(),
      from: r.from_entity,
      to: r.to_entity,
      amount: parseFloat(r.amount),
      type: r.type,
      status: r.status,
      notes: r.notes,
      category: r.category || undefined,
    }));

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
      status: r.status,
      date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      data: {
        branches,
        transactions,
        expenses,
        invoices,
        notifications,
        investors,
        deals,
        hqBalance,
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
  branch: Branch,
  allocationTxn: Transaction
): Promise<DbActionResult<{ branch: Branch; transaction: Transaction }>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

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
      `INSERT INTO branches (id, name, location, manager_name, cash_balance, gold_balance, current_balance, opening_balance, closing_balance, daily_pl, status, last_activity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        branch.id,
        branch.name,
        branch.location,
        branch.managerName,
        branch.cashBalance,
        branch.goldBalance,
        branch.currentBalance,
        branch.openingBalance,
        branch.closingBalance,
        branch.dailyPL,
        branch.status,
        branch.lastActivity,
        branch.createdAt,
      ]
    );

    // 2. Insert transaction
    await client.query(
      `INSERT INTO transactions (id, date, from_entity, to_entity, amount, type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        allocationTxn.id,
        allocationTxn.date,
        allocationTxn.from,
        allocationTxn.to,
        allocationTxn.amount,
        allocationTxn.type,
        allocationTxn.status,
        allocationTxn.notes,
      ]
    );

    // 3. Deduct from HQ treasury balance
    await client.query('UPDATE hq_balance SET amount = amount - $1 WHERE id = 1', [branch.openingBalance]);

    await client.query('COMMIT');
    return { success: true, data: { branch, transaction: allocationTxn } };
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
  if (!pool) return { success: false, error: 'Database not connected.' };

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
  if (!pool) return { success: false, error: 'Database not connected.' };

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
    const message = error instanceof Error ? error.message : 'Database error.';
    console.error('Error adding invoice:', error);
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
  if (!pool) return { success: false, error: 'Database not connected.' };

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
    const message = error instanceof Error ? error.message : 'Database error.';
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
  investor: Investor
): Promise<DbActionResult<Investor>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

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
      `INSERT INTO investors (id, name, email, phone, nationality, emirates_id, passport_no, address, city, country, cash_deposit, gold_deposit, gold_weight_grams, status, risk_profile, kyc_status, joined_date, last_activity, assigned_branch_id, assigned_branch_name, preferred_contact, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
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
    const message = error instanceof Error ? error.message : 'Database error.';
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
  if (!pool) return { success: false, error: 'Database not connected.' };
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
        notes = $17
       WHERE id = $18`,
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
        investor.notes || null,
        investor.id,
      ]
    );
    return { success: true, data: investor };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Database error.';
    console.error('Error updating investor:', error);
    return { success: false, error: message };
  }
}

/**
 * Creates a deal and inserts associated participant investors.
 */
export async function dbAddDealAction(deal: Deal): Promise<DbActionResult<Deal>> {
  if (!pool) return { success: false, error: 'Database not connected.' };

  // Validate
  const validation = addDealSchema.safeParse({
    name: deal.name,
    amount: deal.amount,
    investors: deal.investors,
    totalInvestment: deal.totalInvestment,
    balance: deal.balance,
    toBranchId: deal.toBranchId,
    toBranchName: deal.toBranchName,
    status: deal.status,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((i) => i.message).join(', ') };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert deal
    await client.query(
      `INSERT INTO deals (id, name, amount, total_investment, balance, to_branch_id, to_branch_name, status, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        deal.id,
        deal.name,
        deal.amount,
        deal.totalInvestment,
        deal.balance,
        deal.toBranchId,
        deal.toBranchName,
        deal.status,
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
    const message = error instanceof Error ? error.message : 'Database error.';
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
  if (!pool) return { success: false, error: 'Database not connected.' };

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
        status = $7
       WHERE id = $8`,
      [
        deal.name,
        deal.amount,
        deal.totalInvestment,
        deal.balance,
        deal.toBranchId,
        deal.toBranchName,
        deal.status,
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
    const message = error instanceof Error ? error.message : 'Database error.';
    console.error('Error updating deal:', error);
    return { success: false, error: message };
  } finally {
    client.release();
  }
}
