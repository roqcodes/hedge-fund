import { roundTo14 } from '@/lib/physicalCalculations';

/** Parse numeric input; empty/invalid → 0. */
export function parseFundAmount(value: string): number {
  const trimmed = value.trim().replace(/,/g, '');
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/** Format for display inputs (up to 14 dp, trim trailing zeros). */
export function formatFundAmount(value: number, maxDecimals = 14): string {
  if (!Number.isFinite(value) || value === 0) return '';
  const rounded = roundTo14(value);
  const fixed = rounded.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, '') || '0';
}

/** 1 USDT = rate × customerCurrency */
export function convertUsdtToCustomer(usdt: number, rate: number): number {
  if (usdt <= 0 || rate <= 0) return 0;
  return roundTo14(usdt * rate);
}

export function convertCustomerToUsdt(customerAmount: number, rate: number): number {
  if (customerAmount <= 0 || rate <= 0) return 0;
  return roundTo14(customerAmount / rate);
}

export type AmountInputSide = 'usdt' | 'customer';
export type EntityTransferInputSide = 'usdt' | 'from' | 'to';

export type ResolvedJournalAmounts = {
  usdtAmount: number;
  customerAmount: number;
  customerCurrencyRate: number;
  inputCurrency: 'USDT' | string;
  inputAmount: number;
  settlementCurrency: string;
  settlementAmount: number;
};

/**
 * Resolve ledger amounts from user input.
 * Ledger books in USDT; settlement (branch cash) uses whichever side user entered.
 */
export function resolveJournalAmounts(params: {
  inputSide: AmountInputSide;
  usdtAmount: number;
  customerAmount: number;
  customerCurrency: string;
  customerCurrencyRate: number;
}): ResolvedJournalAmounts | null {
  const { inputSide, customerCurrency } = params;
  const rate = customerCurrency === 'USDT' ? 1 : roundTo14(params.customerCurrencyRate);

  if (customerCurrency !== 'USDT' && rate <= 0) return null;

  let usdtAmount = 0;
  let customerAmount = 0;

  if (customerCurrency === 'USDT') {
    usdtAmount = roundTo14(inputSide === 'usdt' ? params.usdtAmount : params.customerAmount);
    if (usdtAmount <= 0) return null;
    customerAmount = usdtAmount;
    return {
      usdtAmount,
      customerAmount,
      customerCurrencyRate: 1,
      inputCurrency: 'USDT',
      inputAmount: usdtAmount,
      settlementCurrency: 'USDT',
      settlementAmount: usdtAmount,
    };
  }

  if (inputSide === 'usdt') {
    usdtAmount = roundTo14(params.usdtAmount);
    if (usdtAmount <= 0) return null;
    customerAmount = convertUsdtToCustomer(usdtAmount, rate);
  } else {
    customerAmount = roundTo14(params.customerAmount);
    if (customerAmount <= 0) return null;
    usdtAmount = convertCustomerToUsdt(customerAmount, rate);
  }

  if (usdtAmount <= 0 || customerAmount <= 0) return null;

  const inputCurrency = inputSide === 'usdt' ? 'USDT' : customerCurrency;
  const inputAmount = inputSide === 'usdt' ? usdtAmount : customerAmount;

  return {
    usdtAmount,
    customerAmount,
    customerCurrencyRate: rate,
    inputCurrency,
    inputAmount,
    settlementCurrency: inputCurrency === 'USDT' ? 'USDT' : customerCurrency,
    settlementAmount: inputAmount,
  };
}

/** Resolve USDT leg for entity-to-entity transfer (separate from/to profile currencies). */
export function resolveEntityTransferUsdt(params: {
  inputSide: EntityTransferInputSide;
  inputAmount: number;
  fromCurrency: string;
  fromRate: number;
  toCurrency: string;
  toRate: number;
}): number | null {
  const { inputSide, inputAmount } = params;
  if (inputAmount <= 0) return null;

  if (inputSide === 'usdt') {
    return roundTo14(inputAmount);
  }

  if (inputSide === 'from') {
    const rate = params.fromCurrency === 'USDT' ? 1 : roundTo14(params.fromRate);
    if (rate <= 0) return null;
    return convertCustomerToUsdt(inputAmount, rate);
  }

  const rate = params.toCurrency === 'USDT' ? 1 : roundTo14(params.toRate);
  if (rate <= 0) return null;
  return convertCustomerToUsdt(inputAmount, rate);
}
