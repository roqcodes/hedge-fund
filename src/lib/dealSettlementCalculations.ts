import type { DealInvestor, DealTransactionPayout } from '@/types';

export type SettlementInput = {
  salesAed: number;
  pureCostAed: number;
  expenses: number;
  weight: number;
  managerShare: number;
  dealAmount: number;
  investors: Pick<DealInvestor, 'investorId' | 'investorName' | 'amount'>[];
};

export type SettlementResult = {
  expenses: number;
  /** Stored in deal_transactions.gross_profit — net profit after expenses. */
  grossProfit: number;
  netProfitPerGram: number;
  managementProfit: number;
  investorProfitPool: number;
  payouts: Omit<DealTransactionPayout, 'id' | 'dealTransactionId'>[];
};

export function computeDealSettlement(input: SettlementInput): SettlementResult {
  const {
    salesAed,
    pureCostAed,
    expenses,
    weight,
    managerShare,
    dealAmount,
    investors,
  } = input;

  const grossBeforeExpenses = salesAed - pureCostAed;
  const netProfit = grossBeforeExpenses - expenses;
  const netProfitPerGram = weight > 0 ? netProfit / weight : 0;
  const managementProfit = netProfit > 0 ? netProfit * (managerShare / 100) : 0;
  const investorProfitPool = netProfit - managementProfit;

  const payouts = investors.map(inv => ({
    investorId: inv.investorId,
    investorName: inv.investorName,
    payoutAmount: dealAmount > 0
      ? Number((investorProfitPool * (inv.amount / dealAmount)).toFixed(7))
      : 0,
  }));

  return {
    expenses: Number(expenses.toFixed(7)),
    grossProfit: Number(netProfit.toFixed(7)),
    netProfitPerGram: Number(netProfitPerGram.toFixed(7)),
    managementProfit: Number(managementProfit.toFixed(7)),
    investorProfitPool: Number(investorProfitPool.toFixed(7)),
    payouts,
  };
}
