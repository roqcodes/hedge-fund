import { z } from 'zod';

export const InvestorRiskProfileSchema = z.enum(['conservative', 'balanced', 'aggressive']);
export const PreferredContactSchema = z.enum(['email', 'phone', 'whatsapp']);
export const InvestorStatusSchema = z.enum(['active', 'inactive', 'pending']);
export const KycStatusSchema = z.enum(['verified', 'pending', 'expired']);

export const AddInvestorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(5, "Phone number is too short"),
  nationality: z.string().min(2, "Nationality must be provided"),
  emiratesId: z.string().optional(),
  passportNo: z.string().optional(),
  address: z.string().min(5, "Address must be provided"),
  city: z.string().min(2, "City must be provided"),
  country: z.string().min(2, "Country must be provided"),
  cashDeposit: z.number().min(0, "Deposit cannot be negative").default(0),
  goldDeposit: z.number().min(0, "Deposit cannot be negative").default(0),
  goldWeightGrams: z.number().min(0, "Weight cannot be negative").default(0),
  riskProfile: InvestorRiskProfileSchema,
  preferredContact: PreferredContactSchema,
  assignedBranchId: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateInvestorSchema = AddInvestorSchema.extend({
  id: z.string().min(1, "Investor ID is required"),
  status: InvestorStatusSchema,
  kycStatus: KycStatusSchema,
  assignedBranchName: z.string().optional(),
});

export const BranchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  managerName: z.string().min(1),
  openingBalance: z.number().min(0),
});

export const TransferFundsSchema = z.object({
  fromId: z.string().min(1),
  toId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().max(255),
});

export const ExpenseSchema = z.object({
  branchId: z.string().min(1),
  branchName: z.string().min(1),
  type: z.enum(['capex', 'opex']),
  category: z.string().min(1),
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
});

export const DealInvestorSchema = z.object({
  investorId: z.string().min(1),
  investorName: z.string().min(1),
  amount: z.number().positive(),
  isGold: z.boolean(),
});

export const DealSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  investors: z.array(DealInvestorSchema),
  totalInvestment: z.number().positive(),
  balance: z.number().min(0),
  toBranchId: z.string().min(1),
  toBranchName: z.string().min(1),
  status: z.enum(['active', 'pending', 'completed', 'cancelled']),
});

export const UpdateDealSchema = DealSchema.extend({
  id: z.string().min(1),
});
