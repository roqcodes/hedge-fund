import { z } from 'zod';

// ── Shared primitives ────────────────────────────────────────────────

const positiveAmount = z.number().positive('Amount must be positive');
const nonEmptyString = z.string().min(1, 'This field is required');

// ── Auth ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  securityKey: z.string().min(4, 'Security key must be at least 4 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── Branch ───────────────────────────────────────────────────────────

export const addBranchSchema = z.object({
  name: nonEmptyString,
  location: nonEmptyString,
  managerName: nonEmptyString,
  openingBalance: positiveAmount,
});

export type AddBranchInput = z.infer<typeof addBranchSchema>;

// ── Fund Transfer ────────────────────────────────────────────────────

export const transferFundsSchema = z.object({
  fromId: nonEmptyString,
  toId: nonEmptyString,
  amount: positiveAmount,
  notes: z.string().default(''),
});

export type TransferFundsInput = z.infer<typeof transferFundsSchema>;

// ── Invoice ──────────────────────────────────────────────────────────

export const addInvoiceSchema = z.object({
  clientName: nonEmptyString,
  branchId: nonEmptyString,
  branchName: nonEmptyString,
  amount: positiveAmount,
  description: nonEmptyString,
  date: nonEmptyString,
});

export type AddInvoiceInput = z.infer<typeof addInvoiceSchema>;

// ── Expense ──────────────────────────────────────────────────────────

export const addExpenseSchema = z.object({
  date: nonEmptyString,
  branchId: nonEmptyString,
  branchName: nonEmptyString,
  type: z.enum(['capex', 'opex']),
  category: nonEmptyString,
  description: nonEmptyString,
  amount: positiveAmount,
});

export type AddExpenseInput = z.infer<typeof addExpenseSchema>;

// ── Investor ─────────────────────────────────────────────────────────

export const addInvestorSchema = z.object({
  name: nonEmptyString,
  email: z.string().email('Please enter a valid email address'),
  phone: nonEmptyString,
  nationality: nonEmptyString,
  emiratesId: z.string().optional(),
  passportNo: z.string().optional(),
  address: nonEmptyString,
  city: nonEmptyString,
  country: nonEmptyString,
  cashDeposit: z.number().min(0),
  goldDeposit: z.number().min(0),
  goldWeightGrams: z.number().min(0),
  riskProfile: z.enum(['conservative', 'balanced', 'aggressive']),
  preferredContact: z.enum(['email', 'phone', 'whatsapp']),
  assignedBranchId: z.string().optional(),
  notes: z.string().optional(),
});

export type ValidatedAddInvestorInput = z.infer<typeof addInvestorSchema>;

// ── Deal ─────────────────────────────────────────────────────────────

const dealInvestorSchema = z.object({
  investorId: nonEmptyString,
  investorName: nonEmptyString,
  amount: positiveAmount,
  isGold: z.boolean(),
});

export const addDealSchema = z.object({
  name: nonEmptyString,
  amount: positiveAmount,
  investors: z.array(dealInvestorSchema).min(1, 'At least one investor is required'),
  totalInvestment: z.number().min(0),
  balance: z.number(),
  toBranchId: nonEmptyString,
  toBranchName: nonEmptyString,
  status: z.enum(['active', 'pending', 'completed', 'cancelled']),
});

export type AddDealInput = z.infer<typeof addDealSchema>;

export const updateDealSchema = addDealSchema.extend({
  id: nonEmptyString,
  date: nonEmptyString,
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;
