// ═══════════════════════════════════════════════════════════
// HEDGE Capital Management — Helper Functions & Branch Data
// ═══════════════════════════════════════════════════════════

import { Branch, Transaction, Expense, DailyReport, Invoice, Notification, Investor, Deal } from '@/types';
import {
  convertFromAed,
  getLiveCurrencyRates,
  type CurrencyCode,
} from '@/lib/currency';



export function investorTotalExposure(inv: Pick<Investor, 'cashDeposit' | 'goldDeposit'>): number {
  return inv.cashDeposit + inv.goldDeposit;
}

import React from 'react';

export type Currency = CurrencyCode;
let globalCurrency: Currency = 'AED';

export function getGlobalCurrency(): Currency {
  return globalCurrency;
}

export function setGlobalCurrency(c: Currency) {
  globalCurrency = c;
}

function getRate(currency: Currency): number {
  const rates = getLiveCurrencyRates();
  return rates[currency] ?? 1;
}

export function formatAED(amount: number, showPlus = false): React.ReactNode {
  const currency = getGlobalCurrency();
  const convertedAmount = convertFromAed(amount, currency);
  const absAmount = Math.abs(convertedAmount);
  
  const numStr = absAmount.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  
  const sign = amount < 0 ? '-' : showPlus && amount > 0 ? '+' : '';
  
  return React.createElement(
    React.Fragment,
    null,
    sign ? `${sign}` : null,
    numStr,
  );
}

export function formatAEDStr(amount: number, showPlus = false): string {
  const currency = getGlobalCurrency();
  const convertedAmount = convertFromAed(amount, currency);
  const absAmount = Math.abs(convertedAmount);
  
  const numStr = absAmount.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  
  const sign = amount < 0 ? '-' : showPlus && amount > 0 ? '+' : '';
  
  return `${sign}${numStr}`;
}

/** Convert AED-base amount to display currency — number only, no code suffix. */
export function formatMoneyValue(amount: number, currency?: Currency, showPlus = false): string {
  const curr = currency ?? getGlobalCurrency();
  const convertedAmount = convertFromAed(amount, curr);
  const absAmount = Math.abs(convertedAmount);
  const numStr = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : showPlus && amount > 0 ? '+' : '';
  return `${sign}${numStr}`;
}

/** Format AED-base amount with active currency code suffix. */
export function formatMoneyLabel(amount: number, currency?: Currency, showPlus = false): string {
  const curr = currency ?? getGlobalCurrency();
  return `${formatMoneyValue(amount, curr, showPlus)} ${curr}`;
}



export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-AE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(prefix: string): string {
  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
}
