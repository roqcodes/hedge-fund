import {
  buyCostPerGramUsdt,
  roundTo14,
  fmtNum,
} from '@/lib/physicalCalculations';

/** One buy lot line added to a bulk sell. */
export type BulkSellLineInput = {
  buyId: string;
  buyParticulars: string;
  buyDate: string;
  sellVolumeGross: number;
  buyPurity: number;
  buyIdrGram: number;
  buyIdrToUsdt: number;
  /** Source buy pure gram total (for cost basis). */
  buyPureGram: number;
  buyTotalUsdt?: number;
  buyIdrRate?: number;
};

export type BulkSellRateOverrides = {
  /** Stored on bulk header only; does not change line pure grams. */
  purity?: number;
  idrGram?: number;
  idrToUsdt?: number;
};

export type BulkSellWeightedAverages = {
  totalGross: number;
  totalPure: number;
  avgPurity: number;
  avgIdrGram: number;
  avgIdrToUsdt: number;
  usdtPerGram: number;
};

export type BulkSellLineResult = {
  buyId: string;
  buyParticulars: string;
  buyDate: string;
  grossWeight: number;
  pureGram: number;
  pureConversion: number;
  buyPurity: number;
  /** Source buy — IDR per gram (display only). */
  buyIdrGram: number;
  /** Source buy — IDR per USDT (display only). */
  buyIdrToUsdt: number;
  /** Source buy — USDT per pure gram. */
  buyUsdtPerGram: number;
  /** Bulk sell pricing rates (stored on child sell row). */
  idrGram: number;
  idrToUsdt: number;
  idrRate: number;
  sellValueUsdt: number;
  costValueUsdt: number;
  profitUsdt: number;
  margin: number;
  tltIdrValue: number;
  /** Legacy AED fields — optional when FX rate supplied. */
  sellValueAed?: number;
  costValueAed?: number;
  profitAed?: number;
  total?: number;
  sellValue?: number;
  profit?: number;
  costValue?: number;
};

export type BulkSellTotals = {
  weighted: BulkSellWeightedAverages;
  finalPurity: number;
  finalIdrGram: number;
  finalIdrToUsdt: number;
  finalIdrRate: number;
  totalGross: number;
  totalPure: number;
  totalUsdt: number;
  totalIdr: number;
  totalCostUsdt: number;
  totalProfitUsdt: number;
  totalCostAed?: number;
  totalProfitAed?: number;
  totalAed?: number;
  lines: BulkSellLineResult[];
};

/** Weighted averages: purity by gross; IDR/USDT rates by pure gram. */
export function computeBulkSellWeightedAverages(
  items: BulkSellLineInput[],
): BulkSellWeightedAverages {
  if (items.length === 0) {
    return {
      totalGross: 0,
      totalPure: 0,
      avgPurity: 0,
      avgIdrGram: 0,
      avgIdrToUsdt: 0,
      usdtPerGram: 0,
    };
  }

  let sumGross = 0;
  let sumPure = 0;
  let weightedIdrGram = 0;
  let weightedIdrToUsdt = 0;

  for (const item of items) {
    const gross = roundTo14(item.sellVolumeGross);
    const pure = roundTo14(gross * item.buyPurity);
    sumGross = roundTo14(sumGross + gross);
    sumPure = roundTo14(sumPure + pure);
    weightedIdrGram = roundTo14(weightedIdrGram + pure * item.buyIdrGram);
    weightedIdrToUsdt = roundTo14(weightedIdrToUsdt + pure * item.buyIdrToUsdt);
  }

  const avgIdrGram = sumPure > 0 ? roundTo14(weightedIdrGram / sumPure) : 0;
  const avgIdrToUsdt = sumPure > 0 ? roundTo14(weightedIdrToUsdt / sumPure) : 0;
  const usdtPerGram = avgIdrToUsdt > 0 ? roundTo14(avgIdrGram / avgIdrToUsdt) : 0;

  return {
    totalGross: sumGross,
    totalPure: sumPure,
    avgPurity: sumGross > 0 ? roundTo14(sumPure / sumGross) : 0,
    avgIdrGram,
    avgIdrToUsdt,
    usdtPerGram,
  };
}

function resolveFinalRates(
  weighted: BulkSellWeightedAverages,
  overrides?: BulkSellRateOverrides,
) {
  const finalIdrGram = overrides?.idrGram != null && Number.isFinite(overrides.idrGram)
    ? roundTo14(overrides.idrGram)
    : weighted.avgIdrGram;
  const finalIdrToUsdt = overrides?.idrToUsdt != null && Number.isFinite(overrides.idrToUsdt)
    ? roundTo14(overrides.idrToUsdt)
    : weighted.avgIdrToUsdt;
  const finalIdrRate = finalIdrToUsdt > 0 ? roundTo14(finalIdrGram / finalIdrToUsdt) : 0;
  const finalPurity = overrides?.purity != null && Number.isFinite(overrides.purity)
    ? roundTo14(overrides.purity)
    : weighted.avgPurity;

  return { finalPurity, finalIdrGram, finalIdrToUsdt, finalIdrRate };
}

/** Full bulk sell calculation — lines first, totals = sum(lines). */
export function computeBulkSellTotals(
  items: BulkSellLineInput[],
  overrides?: BulkSellRateOverrides,
  usdToAedRate?: number,
): BulkSellTotals {
  const weighted = computeBulkSellWeightedAverages(items);
  const { finalPurity, finalIdrGram, finalIdrToUsdt, finalIdrRate } = resolveFinalRates(weighted, overrides);

  const fx = usdToAedRate != null && usdToAedRate > 0 ? roundTo14(usdToAedRate) : undefined;

  const lines: BulkSellLineResult[] = items.map(item => {
    const grossWeight = roundTo14(item.sellVolumeGross);
    const pureGram = roundTo14(grossWeight * item.buyPurity);
    const costPerGramUsdt = buyCostPerGramUsdt({
      pureGram: item.buyPureGram,
      totalUsdt: item.buyTotalUsdt,
      idrGram: item.buyIdrGram,
      idrToUsdt: item.buyIdrToUsdt,
      idrRate: item.buyIdrRate,
    });
    const sellValueUsdt = roundTo14(pureGram * finalIdrRate);
    const costValueUsdt = roundTo14(pureGram * costPerGramUsdt);
    const profitUsdt = roundTo14(sellValueUsdt - costValueUsdt);
    const margin = sellValueUsdt > 0 ? roundTo14((profitUsdt / sellValueUsdt) * 100) : 0;
    const tltIdrValue = roundTo14(pureGram * finalIdrGram);

    const sellValueAed = fx ? roundTo14(sellValueUsdt * fx) : undefined;
    const costValueAed = fx ? roundTo14(costValueUsdt * fx) : undefined;
    const profitAed = fx ? roundTo14(profitUsdt * fx) : undefined;

    const buyUsdtPerGram = item.buyIdrToUsdt > 0
      ? roundTo14(item.buyIdrGram / item.buyIdrToUsdt)
      : (item.buyIdrRate ?? 0);

    return {
      buyId: item.buyId,
      buyParticulars: item.buyParticulars,
      buyDate: item.buyDate,
      grossWeight,
      pureGram,
      pureConversion: item.buyPurity,
      buyPurity: item.buyPurity,
      buyIdrGram: item.buyIdrGram,
      buyIdrToUsdt: item.buyIdrToUsdt,
      buyUsdtPerGram,
      idrGram: finalIdrGram,
      idrToUsdt: finalIdrToUsdt,
      idrRate: finalIdrRate,
      sellValueUsdt,
      costValueUsdt,
      profitUsdt,
      margin,
      tltIdrValue,
      sellValueAed,
      costValueAed,
      profitAed,
      total: sellValueAed ?? sellValueUsdt,
      sellValue: sellValueAed ?? sellValueUsdt,
      profit: profitAed ?? profitUsdt,
      costValue: costValueAed ?? costValueUsdt,
    };
  });

  const totalGross = roundTo14(lines.reduce((s, l) => roundTo14(s + l.grossWeight), 0));
  const totalPure = roundTo14(lines.reduce((s, l) => roundTo14(s + l.pureGram), 0));
  const totalUsdt = roundTo14(lines.reduce((s, l) => roundTo14(s + l.sellValueUsdt), 0));
  const totalIdr = roundTo14(lines.reduce((s, l) => roundTo14(s + l.tltIdrValue), 0));
  const totalCostUsdt = roundTo14(lines.reduce((s, l) => roundTo14(s + l.costValueUsdt), 0));
  const totalProfitUsdt = roundTo14(totalUsdt - totalCostUsdt);

  const totalAed = fx ? roundTo14(totalUsdt * fx) : undefined;
  const totalCostAed = fx ? roundTo14(totalCostUsdt * fx) : undefined;
  const totalProfitAed = fx ? roundTo14(totalProfitUsdt * fx) : undefined;

  return {
    weighted,
    finalPurity,
    finalIdrGram,
    finalIdrToUsdt,
    finalIdrRate,
    totalGross,
    totalPure,
    totalUsdt,
    totalIdr,
    totalCostUsdt,
    totalProfitUsdt,
    totalCostAed,
    totalProfitAed,
    totalAed,
    lines,
  };
}

/** Display helpers — calculations stay at 14 dp; UI shows up to 3. */
export function fmtBulkWeight(n: number) {
  return fmtNum(n, 3);
}

export function fmtBulkRate(n: number) {
  return fmtNum(n, 3);
}

export function fmtBulkUsdt(n: number) {
  return fmtNum(n, 3);
}

export function fmtBulkPurity(n: number) {
  return fmtNum(n, 3);
}

export function fmtBulkIdr(n: number) {
  return fmtNum(n, 0);
}
