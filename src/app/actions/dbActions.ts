'use server';

import { prisma } from '@/lib/db';
import { Branch, Transaction, Expense, Invoice, Notification, Investor, Deal } from '@/types';
import { AddInvestorSchema, UpdateInvestorSchema, BranchSchema, TransferFundsSchema, ExpenseSchema, DealSchema, UpdateDealSchema } from '@/lib/validations';
export interface DbActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
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
 * Fetches all database records for initial dashboard hydration in a single step using Prisma.
 */
export async function fetchInitialDataAction(): Promise<DbActionResult<InitialDataPayload>> {
  try {
    const [
      hqRes,
      branchesRes,
      txRes,
      expRes,
      invRes,
      notifRes,
      invResList,
      dealsRes
    ] = await Promise.all([
      prisma.hq_balance.findUnique({ where: { id: 1 } }),
      prisma.branches.findMany({ orderBy: { id: 'asc' } }),
      prisma.transactions.findMany({ orderBy: { date: 'desc' } }),
      prisma.expenses.findMany({ orderBy: { date: 'desc' } }),
      prisma.invoices.findMany({ orderBy: { date: 'desc' } }),
      prisma.notifications.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
      prisma.investors.findMany({ include: { deposits: { orderBy: { date: 'desc' } } }, orderBy: { joined_date: 'desc' } }),
      prisma.deals.findMany({ include: { investors: true }, orderBy: { date: 'desc' } })
    ]);

    const hqBalance = hqRes ? Number(hqRes.amount) : 50000000;

    const branches: Branch[] = branchesRes.map((r: any) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      managerName: r.manager_name,
      cashBalance: Number(r.cash_balance),
      goldBalance: Number(r.gold_balance),
      currentBalance: Number(r.current_balance),
      openingBalance: Number(r.opening_balance),
      closingBalance: Number(r.closing_balance),
      dailyPL: Number(r.daily_pl),
      status: r.status as any,
      lastActivity: r.last_activity.toISOString(),
      createdAt: r.created_at.toISOString(),
    }));

    const transactions: Transaction[] = txRes.map((r: any) => ({
      id: r.id,
      date: r.date.toISOString(),
      from: r.from_entity,
      to: r.to_entity,
      amount: Number(r.amount),
      type: r.type as any,
      status: r.status as any,
      notes: r.notes || '',
      category: r.category || undefined,
    }));

    const expenses: Expense[] = expRes.map((r: any) => ({
      id: r.id,
      date: r.date.toISOString().slice(0, 10),
      branchId: r.branch_id,
      branchName: r.branch_name,
      type: r.type as any,
      category: r.category,
      description: r.description,
      amount: Number(r.amount),
    }));

    const invoices: Invoice[] = invRes.map((r: any) => ({
      id: r.id,
      clientName: r.client_name,
      branchId: r.branch_id,
      branchName: r.branch_name,
      amount: Number(r.amount),
      description: r.description,
      date: r.date.toISOString().slice(0, 10),
      status: r.status as any,
    }));

    const notifications: Notification[] = notifRes.map((r: any) => ({
      id: r.id,
      message: r.message,
      time: r.time,
      read: r.read,
      type: r.type as any,
    }));

    const investors: Investor[] = invResList.map((r: any) => ({
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
      cashDeposit: Number(r.cash_deposit),
      goldDeposit: Number(r.gold_deposit),
      goldWeightGrams: Number(r.gold_weight_grams),
      status: r.status as any,
      riskProfile: r.risk_profile as any,
      kycStatus: r.kyc_status as any,
      joinedDate: r.joined_date.toISOString().slice(0, 10),
      lastActivity: r.last_activity.toISOString(),
      assignedBranchId: r.assigned_branch_id || undefined,
      assignedBranchName: r.assigned_branch_name || undefined,
      preferredContact: r.preferred_contact as any,
      notes: r.notes || undefined,
      depositHistory: r.deposits.map((d: any) => ({
        id: d.id,
        date: d.date.toISOString().slice(0, 10),
        type: d.type as any,
        amount: Number(d.amount),
        goldGrams: d.gold_grams ? Number(d.gold_grams) : undefined,
        notes: d.notes || undefined,
      })),
    }));

    const deals: Deal[] = dealsRes.map((r: any) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      totalInvestment: Number(r.total_investment),
      balance: Number(r.balance),
      toBranchId: r.to_branch_id,
      toBranchName: r.to_branch_name,
      status: r.status as any,
      date: r.date.toISOString(),
      investors: r.investors.map((di: any) => ({
        investorId: di.investor_id,
        investorName: di.investor_name,
        amount: Number(di.amount),
        isGold: di.is_gold,
      })),
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
  } catch (error: any) {
    console.error('Failed to fetch initial data from Postgres:', error);
    return { success: false, error: `Database connection failed: ${error.message}` };
  }
}

export async function dbAddBranchAction(
  branch: Branch,
  transaction: Transaction
): Promise<DbActionResult<{ branch: Branch; transaction: Transaction }>> {
  try {
    const validatedData = BranchSchema.parse({
      id: branch.id,
      name: branch.name,
      location: branch.location,
      managerName: branch.managerName,
      openingBalance: branch.openingBalance,
    });

    const now = new Date();

    await prisma.$transaction([
      prisma.branches.create({
        data: {
          id: branch.id,
          name: branch.name,
          location: branch.location,
          manager_name: branch.managerName,
          cash_balance: branch.cashBalance,
          gold_balance: branch.goldBalance,
          current_balance: branch.currentBalance,
          opening_balance: branch.openingBalance,
          closing_balance: branch.closingBalance,
          daily_pl: branch.dailyPL,
          status: branch.status,
          last_activity: branch.lastActivity ? new Date(branch.lastActivity) : now,
          created_at: branch.createdAt ? new Date(branch.createdAt) : now,
        }
      }),
      prisma.transactions.create({
        data: {
          id: transaction.id,
          date: transaction.date ? new Date(transaction.date) : now,
          from_entity: transaction.from,
          to_entity: transaction.to,
          amount: transaction.amount,
          type: transaction.type,
          status: transaction.status,
          notes: transaction.notes,
        }
      }),
      prisma.hq_balance.upsert({
        where: { id: 1 },
        update: { amount: { decrement: validatedData.openingBalance } },
        create: { id: 1, amount: 50000000 - validatedData.openingBalance }
      })
    ]);

    return { success: true, data: { branch, transaction } };
  } catch (error: any) {
    console.error('Error adding branch to database:', error);
    return { success: false, error: error.message };
  }
}

export async function dbTransferFundsAction(
  fromId: string,
  toId: string,
  fromName: string,
  toName: string,
  amount: number,
  notes: string,
  txnId: string
): Promise<DbActionResult<{ transaction: Transaction; hqBalanceUpdate?: number }>> {
  try {
    const data = TransferFundsSchema.parse({ fromId, toId, amount, notes });
    const now = new Date();
    
    await prisma.$transaction(async (tx: any) => {
      if (data.fromId === 'HQ_TREASURY') {
        await tx.hq_balance.update({
          where: { id: 1 },
          data: { amount: { decrement: data.amount } }
        });
      } else {
        await tx.branches.update({
          where: { id: data.fromId },
          data: { 
            current_balance: { decrement: data.amount },
            closing_balance: { decrement: data.amount },
            last_activity: now
          }
        });
      }

      await tx.branches.update({
        where: { id: data.toId },
        data: { 
          current_balance: { increment: data.amount },
          closing_balance: { increment: data.amount },
          last_activity: now
        }
      });

      const txnType = data.fromId === 'HQ_TREASURY' ? 'allocation' : 'transfer';
      await tx.transactions.create({
        data: {
          id: txnId,
          date: now,
          from_entity: fromName,
          to_entity: toName,
          amount: data.amount,
          type: txnType,
          status: 'completed',
          notes: data.notes,
        }
      });
    });

    const hqRes = await prisma.hq_balance.findUnique({ where: { id: 1 } });
    const newHqBalance = hqRes ? Number(hqRes.amount) : undefined;

    const transaction: Transaction = {
      id: txnId,
      date: now.toISOString(),
      from: fromName,
      to: toName,
      amount: data.amount,
      type: data.fromId === 'HQ_TREASURY' ? 'allocation' : 'transfer',
      status: 'completed',
      notes: data.notes,
    };

    return { success: true, data: { transaction, hqBalanceUpdate: newHqBalance } };
  } catch (error: any) {
    console.error('Error executing fund transfer:', error);
    return { success: false, error: error.message };
  }
}

export async function dbAddInvoiceAction(invoice: Invoice): Promise<DbActionResult<Invoice>> {
  try {
    await prisma.invoices.create({
      data: {
        id: invoice.id,
        client_name: invoice.clientName,
        branch_id: invoice.branchId,
        branch_name: invoice.branchName,
        amount: invoice.amount,
        description: invoice.description,
        date: new Date(invoice.date),
        status: invoice.status,
      }
    });
    return { success: true, data: invoice };
  } catch (error: any) {
    console.error('Error adding invoice:', error);
    return { success: false, error: error.message };
  }
}

export async function dbAddExpenseAction(
  expense: Expense,
  txnInput: Transaction
): Promise<DbActionResult<{ expense: Expense; transaction: Transaction; hqBalanceUpdate?: number }>> {
  try {
    const val = ExpenseSchema.parse(expense);
    const now = new Date();

    await prisma.$transaction(async (tx: any) => {
      await tx.expenses.create({
        data: {
          id: expense.id,
          date: expense.date ? new Date(expense.date) : now,
          branch_id: expense.branchId,
          branch_name: expense.branchName,
          type: expense.type,
          category: expense.category,
          description: expense.description,
          amount: expense.amount,
        }
      });

      if (expense.branchId === 'HQ_TREASURY') {
        await tx.hq_balance.update({
          where: { id: 1 },
          data: { amount: { decrement: expense.amount } }
        });
      } else {
        await tx.branches.update({
          where: { id: expense.branchId },
          data: {
            current_balance: { decrement: expense.amount },
            last_activity: now
          }
        });
      }

      await tx.transactions.create({
        data: {
          id: txnInput.id,
          date: txnInput.date ? new Date(txnInput.date) : now,
          from_entity: txnInput.from,
          to_entity: txnInput.to,
          amount: txnInput.amount,
          type: txnInput.type,
          status: txnInput.status,
          notes: txnInput.notes,
        }
      });
    });

    const hqRes = await prisma.hq_balance.findUnique({ where: { id: 1 } });
    const newHqBalance = hqRes ? Number(hqRes.amount) : undefined;

    return { success: true, data: { expense, transaction: txnInput, hqBalanceUpdate: newHqBalance } };
  } catch (error: any) {
    console.error('Error adding expense:', error);
    return { success: false, error: error.message };
  }
}

export async function dbAddInvestorAction(investorInput: any): Promise<DbActionResult<Investor>> {
  try {
    const val = AddInvestorSchema.parse(investorInput);
    const now = new Date();
    const id = investorInput.id || `INV-${Date.now()}`;

    const depositHistory = investorInput.depositHistory || [];

    await prisma.investors.create({
      data: {
        id,
        name: val.name,
        email: val.email,
        phone: val.phone,
        nationality: val.nationality,
        emirates_id: val.emiratesId,
        passport_no: val.passportNo,
        address: val.address,
        city: val.city,
        country: val.country,
        cash_deposit: val.cashDeposit,
        gold_deposit: val.goldDeposit,
        gold_weight_grams: val.goldWeightGrams,
        status: investorInput.status || 'pending',
        risk_profile: val.riskProfile,
        kyc_status: investorInput.kycStatus || 'pending',
        joined_date: now,
        last_activity: now,
        assigned_branch_id: val.assignedBranchId,
        assigned_branch_name: investorInput.assignedBranchName,
        preferred_contact: val.preferredContact,
        notes: val.notes,
        deposits: {
          create: depositHistory.map((d: any) => ({
            id: d.id,
            date: new Date(d.date),
            type: d.type,
            amount: d.amount,
            gold_grams: d.goldGrams,
            notes: d.notes,
          }))
        }
      }
    });

    return { success: true, data: investorInput as Investor };
  } catch (error: any) {
    console.error('Error adding investor:', error);
    return { success: false, error: error.message };
  }
}

export async function dbUpdateInvestorAction(investorInput: Investor): Promise<DbActionResult<Investor>> {
  try {
    const val = UpdateInvestorSchema.parse(investorInput);
    const now = new Date();

    await prisma.investors.update({
      where: { id: val.id },
      data: {
        name: val.name,
        email: val.email,
        phone: val.phone,
        nationality: val.nationality,
        emirates_id: val.emiratesId,
        passport_no: val.passportNo,
        address: val.address,
        city: val.city,
        country: val.country,
        status: val.status,
        risk_profile: val.riskProfile,
        kyc_status: val.kycStatus,
        last_activity: now,
        assigned_branch_id: val.assignedBranchId,
        assigned_branch_name: val.assignedBranchName,
        preferred_contact: val.preferredContact,
        notes: val.notes,
      }
    });
    return { success: true, data: investorInput };
  } catch (error: any) {
    console.error('Error updating investor:', error);
    return { success: false, error: error.message };
  }
}

export async function dbAddDealAction(dealInput: Deal): Promise<DbActionResult<Deal>> {
  try {
    const val = DealSchema.parse(dealInput);
    const id = dealInput.id || `DL-${Date.now()}`;
    const now = new Date();

    await prisma.deals.create({
      data: {
        id,
        name: val.name,
        amount: val.amount,
        total_investment: val.totalInvestment,
        balance: val.balance,
        to_branch_id: val.toBranchId,
        to_branch_name: val.toBranchName,
        status: val.status,
        date: now,
        investors: {
          create: val.investors.map(inv => ({
            investor_id: inv.investorId,
            investor_name: inv.investorName,
            amount: inv.amount,
            is_gold: inv.isGold,
          }))
        }
      }
    });
    return { success: true, data: dealInput };
  } catch (error: any) {
    console.error('Error adding deal:', error);
    return { success: false, error: error.message };
  }
}

export async function dbUpdateDealAction(dealInput: Deal): Promise<DbActionResult<Deal>> {
  try {
    const val = UpdateDealSchema.parse(dealInput);

    await prisma.$transaction(async (tx: any) => {
      await tx.deals.update({
        where: { id: val.id },
        data: {
          name: val.name,
          amount: val.amount,
          total_investment: val.totalInvestment,
          balance: val.balance,
          to_branch_id: val.toBranchId,
          to_branch_name: val.toBranchName,
          status: val.status,
        }
      });

      await tx.deal_investors.deleteMany({
        where: { deal_id: val.id }
      });

      if (val.investors.length > 0) {
        await tx.deal_investors.createMany({
          data: val.investors.map(inv => ({
            deal_id: val.id,
            investor_id: inv.investorId,
            investor_name: inv.investorName,
            amount: inv.amount,
            is_gold: inv.isGold,
          }))
        });
      }
    });

    return { success: true, data: dealInput };
  } catch (error: any) {
    console.error('Error updating deal:', error);
    return { success: false, error: error.message };
  }
}
