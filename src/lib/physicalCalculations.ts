import { getLiveCurrencyRates } from './currency';

export type PhysicalPaymentMode = 'CASH' | 'BANK_TRANSFER' | 'USDT' | 'MULTI_CURRENCY';

export const PAYMENT_MODE_OPTIONS: { value: PhysicalPaymentMode; label: string }[] = [
  { value: 'CASH', label: 'CASH' },
  { value: 'BANK_TRANSFER', label: 'BANK / TRANSFER' },
  { value: 'USDT', label: 'USDT' },
  { value: 'MULTI_CURRENCY', label: 'MULTY CURENCY' },
];

export function generatePhysicalTxnId(slug: string, type: 'BUY' | 'SELL' = 'BUY'): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const prefix = slug.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'PH';
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${type === 'BUY' ? 'B' : 'S'}${prefix}${dd}${mm}${yy}${rand}`;
}

export function roundTo14(num: number): number {
  if (!Number.isFinite(num)) return 0;
  return parseFloat(num.toFixed(14));
}

export function computePhysicalTxn(values: {
  grossWeight: number;
  touch: number;
  touchLoss?: number;
  idrGram: number;
  idrToUsdt: number;
}) {
  const touchLoss = values.touchLoss ?? 0;
  const rawPurity = Math.max(0, values.grossWeight * values.touch - touchLoss);
  const actualPurity = roundTo14(Math.round(rawPurity * 1000) / 1000);
  const totalWeight = actualPurity;
  const idrRate = values.idrToUsdt > 0 ? roundTo14(values.idrGram / values.idrToUsdt) : 0;
  const totalUsdt = roundTo14(actualPurity * idrRate);
  
  const rates = getLiveCurrencyRates();
  const usdToAedRate = rates['USD'] ? roundTo14(1 / rates['USD']) : 3.6725;
  const tltAedValue = roundTo14(totalUsdt * usdToAedRate);
  const tltIdrValue = roundTo14(actualPurity * values.idrGram);

  return {
    pureGram: actualPurity,
    pureConversion: values.touch,
    actualPurity,
    totalWeight,
    idrRate,
    total: tltAedValue,
    tltIdrValue,
    tltAedValue,
    totalUsdt,
  };
}

export function computeSellMetrics(
  calc: ReturnType<typeof computePhysicalTxn>,
  costPerGram: number,
) {
  const sellValue = calc.total;
  const costValue = roundTo14(calc.pureGram * costPerGram);
  const profit = roundTo14(sellValue - costValue);
  const margin = sellValue > 0 ? roundTo14((profit / sellValue) * 100) : 0;
  return { sellValue, costValue, profit, margin };
}

export function fmtNum(n: number, digits = 3) {
  return n.toLocaleString('en-AE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function grossWeightFromRemaining(buy: { remainingWeight: number; pureConversion: number }) {
  return buy.pureConversion > 0 ? roundTo14(buy.remainingWeight / buy.pureConversion) : buy.remainingWeight;
}

export function buildSellFormDefaultsFromBuy(buy: {
  remainingWeight: number;
  pureConversion: number;
  purity?: number;
  touchLoss?: number;
  marketUsd?: number;
  deal?: number;
  idrGram: number;
  idrToUsdt: number;
  customerId?: string;
  customerName?: string;
  openingBalance?: number;
  paymentMode?: PhysicalPaymentMode;
}) {
  const gw = grossWeightFromRemaining(buy);
  return {
    grossWeightStr: gw > 0 ? gw.toFixed(3) : '',
    touchStr: String(buy.pureConversion ?? 0.995),
    touchLossStr: buy.touchLoss != null ? String(buy.touchLoss) : '0',
    marketUsdStr: buy.marketUsd != null ? String(buy.marketUsd) : '',
    dealStr: buy.deal != null ? String(buy.deal) : '',
    idrGramStr: buy.idrGram != null ? String(buy.idrGram) : '',
    idrToUsdtStr: buy.idrToUsdt != null ? String(buy.idrToUsdt) : '17770',
    customerId: buy.customerId ?? '',
    customerName: buy.customerName ?? '',
    openingBalance: buy.openingBalance != null ? String(buy.openingBalance) : '',
    paymentMode: buy.paymentMode ?? ('CASH' as PhysicalPaymentMode),
    narration: '',
    notes: '',
  };
}

export type PhysicalSellFormFields = {
  date: string;
  time: string;
  txnId: string;
  customerId: string;
  customerName: string;
  openingBalance: string;
  narration: string;
  notes: string;
  grossWeightStr: string;
  touchStr: string;
  touchLossStr: string;
  marketUsdStr: string;
  dealStr: string;
  paymentMode: PhysicalPaymentMode;
  idrGramStr: string;
  idrToUsdtStr: string;
  usdAmountStr: string;
  aedAmountStr: string;
};

export function createPhysicalSellFormBase(): PhysicalSellFormFields {
  return {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    txnId: '',
    customerId: '',
    customerName: '',
    openingBalance: '',
    narration: '',
    notes: '',
    grossWeightStr: '',
    touchStr: '0.995',
    touchLossStr: '0',
    marketUsdStr: '',
    dealStr: '',
    paymentMode: 'CASH',
    idrGramStr: '',
    idrToUsdtStr: '17770',
    usdAmountStr: '',
    aedAmountStr: '',
  };
}

/** Keep every input value a defined string (avoids uncontrolled → controlled warnings). */
export function normalizePhysicalSellForm(form: Partial<PhysicalSellFormFields>): PhysicalSellFormFields {
  const base = createPhysicalSellFormBase();
  return {
    date: form.date ?? base.date,
    time: form.time ?? base.time,
    txnId: form.txnId ?? base.txnId,
    customerId: form.customerId ?? '',
    customerName: form.customerName ?? '',
    openingBalance: form.openingBalance ?? '',
    narration: form.narration ?? '',
    notes: form.notes ?? '',
    grossWeightStr: form.grossWeightStr ?? '',
    touchStr: form.touchStr ?? base.touchStr,
    touchLossStr: form.touchLossStr ?? base.touchLossStr,
    marketUsdStr: form.marketUsdStr ?? '',
    dealStr: form.dealStr ?? '',
    paymentMode: form.paymentMode ?? base.paymentMode,
    idrGramStr: form.idrGramStr ?? '',
    idrToUsdtStr: form.idrToUsdtStr ?? base.idrToUsdtStr,
    usdAmountStr: form.usdAmountStr ?? '',
    aedAmountStr: form.aedAmountStr ?? '',
  };
}

export function formatNumberWithCommas(value: string): string {
  const clean = value.replace(/[^\d.]/g, '');
  const parts = clean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return parts.join('.');
}

export function cleanCommaNumber(value: string): string {
  return value.replace(/,/g, '');
}
