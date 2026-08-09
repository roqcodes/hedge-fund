import type { DealInvestor, Investor } from '@/types';

export type DealInvestorRow = {
  investorId: string;
  percentageStr: string;
  amountStr: string;
  inputMode: 'percentage' | 'amount';
};

export function parseSafeDealNumber(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const parsed = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

export function dealInvestorsToRows(
  dealInvestors: DealInvestor[],
  dealAmount: number,
): DealInvestorRow[] {
  return dealInvestors.map(inv => ({
    investorId: inv.investorId,
    percentageStr: dealAmount > 0
      ? ((inv.amount / dealAmount) * 100).toFixed(6).replace(/\.?0+$/, '')
      : '',
    amountStr: inv.amount.toString(),
    inputMode: 'amount' as const,
  }));
}

export function computeInvestorRowTotal(rows: DealInvestorRow[], dealAmount: number): number {
  return rows.reduce((acc, inv) => {
    if (!inv.investorId) return acc;
    if (inv.inputMode === 'amount') {
      return acc + parseSafeDealNumber(inv.amountStr);
    }
    return acc + (parseSafeDealNumber(inv.percentageStr) / 100) * dealAmount;
  }, 0);
}

export function countFilledInvestorRows(rows: DealInvestorRow[]): number {
  return rows.filter(r => r.investorId).length;
}

export function parseDealInvestorRows(
  rows: DealInvestorRow[],
  dealAmount: number,
  investors: Pick<Investor, 'id' | 'name'>[],
): { error?: string; validInvestors: DealInvestor[] } {
  const validInvestors: DealInvestor[] = [];
  let sumPercentage = 0;

  for (let i = 0; i < rows.length; i++) {
    const { investorId, percentageStr, amountStr, inputMode } = rows[i];
    if (!investorId) continue;

    let invAmount: number;
    if (inputMode === 'amount') {
      invAmount = parseSafeDealNumber(amountStr);
      if (invAmount <= 0) {
        return { error: `Amount for investor row ${i + 1} must be greater than zero.`, validInvestors: [] };
      }
      sumPercentage += dealAmount > 0 ? (invAmount / dealAmount) * 100 : 0;
    } else {
      const invPercentage = parseSafeDealNumber(percentageStr);
      if (invPercentage <= 0 || invPercentage > 100) {
        return { error: `Percentage for investor row ${i + 1} must be between 0 and 100.`, validInvestors: [] };
      }
      invAmount = (invPercentage / 100) * dealAmount;
      sumPercentage += invPercentage;
    }

    const investor = investors.find(inv => inv.id === investorId);
    if (!investor) {
      return { error: `Investor not found for row ${i + 1}.`, validInvestors: [] };
    }

    validInvestors.push({
      investorId,
      investorName: investor.name,
      amount: invAmount,
      isGold: false,
      goldVolume: 0,
    });
  }

  if (validInvestors.length > 0) {
    if (Math.abs(sumPercentage - 100) > 0.01) {
      return {
        error: `Total investor share must equal exactly 100%. Currently it is ${sumPercentage.toFixed(2)}%.`,
        validInvestors: [],
      };
    }
    const uniqueIds = new Set(validInvestors.map(v => v.investorId));
    if (uniqueIds.size !== validInvestors.length) {
      return { error: 'Duplicate investors are not allowed.', validInvestors: [] };
    }
  }

  return { validInvestors };
}
