'use server';

import { query, pool } from '@/lib/db';
import { Branch, Transaction, Expense, Invoice, Notification, Investor, Deal, UserRole } from '@/types';
import { AddInvestorInput } from '@/context/AppContext';

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

    // 7. Fetch Investors & Deposits
    const invResList = await query('SELECT * FROM investors ORDER BY joined_date DESC');
    const investors: Investor[] = [];
    for (const r of invResList.rows) {
      const depRes = await query('SELECT * FROM investor_deposits WHERE investor_id = $1 ORDER BY date DESC', [r.id]);
      const depositHistory = depRes.rows.map((d) => ({
        id: d.id,
        date: new Date(d.date).toISOString().slice(0, 10),
        type: d.type as 'cash' | 'gold',
        amount: parseFloat(d.amount),
        goldGrams: d.gold_grams ? parseFloat(d.gold_grams) : undefined,
        notes: d.notes || undefined,
      }));

      investors.push({
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
        depositHistory,
      });
    }

    // 8. Fetch Deals & Deal Investors
    const dealsRes = await query('SELECT * FROM deals ORDER BY date DESC');
    const deals: Deal[] = [];
    for (const r of dealsRes.rows) {
      const diRes = await query('SELECT * FROM deal_investors WHERE deal_id = $1', [r.id]);
      const diList = diRes.rows.map((di) => ({
        investorId: di.investor_id,
        investorName: di.investor_name,
        amount: parseFloat(di.amount),
        isGold: di.is_gold,
      }));

      deals.push({
        id: r.id,
        name: r.name,
        amount: parseFloat(r.amount),
        investors: diList,
        totalInvestment: parseFloat(r.total_investment),
        balance: parseFloat(r.balance),
        toBranchId: r.to_branch_id,
        toBranchName: r.to_branch_name,
        status: r.status,
        date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
      });
    }

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
  } catch (error: any) {
    console.error('Failed to fetch initial data from Postgres:', error);
    return { success: false, error: error.message || 'Failed to fetch dashboard data.' };
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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding branch to database:', error);
    return { success: false, error: error.message || 'Database error occurred while adding branch.' };
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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error executing fund transfer:', error);
    return { success: false, error: error.message || 'Database error occurred during transfer.' };
  } finally {
    client.release();
  }
}

/**
 * Creates an invoice.
 */
export async function dbAddInvoiceAction(invoice: Invoice): Promise<DbActionResult<Invoice>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
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
  } catch (error: any) {
    console.error('Error adding invoice:', error);
    return { success: false, error: error.message };
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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding expense:', error);
    return { success: false, error: error.message };
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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding investor:', error);
    return { success: false, error: error.message };
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
  } catch (error: any) {
    console.error('Error updating investor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a deal and inserts associated participant investors.
 */
export async function dbAddDealAction(deal: Deal): Promise<DbActionResult<Deal>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error adding deal:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Updates an existing deal and replaces its associated participant investors.
 */
export async function dbUpdateDealAction(deal: Deal): Promise<DbActionResult<Deal>> {
  if (!pool) return { success: false, error: 'Database not connected.' };
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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating deal:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

