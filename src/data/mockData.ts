// ═══════════════════════════════════════════════════════════
// HEDGE Capital Management — Helper Functions & Branch Data
// ═══════════════════════════════════════════════════════════

import { Branch, Transaction, Expense, DailyReport, Invoice, Notification, Investor, Deal } from '@/types';



export function investorTotalExposure(inv: Pick<Investor, 'cashDeposit' | 'goldDeposit'>): number {
  return inv.cashDeposit + inv.goldDeposit;
}

import React from 'react';

export type Currency = 'AED' | 'USD' | 'INR';
let globalCurrency: Currency = 'AED';

export function getGlobalCurrency(): Currency {
  return globalCurrency;
}

export function setGlobalCurrency(c: Currency) {
  globalCurrency = c;
}

const RATES: Record<Currency, number> = {
  AED: 1,
  USD: 0.2723,
  INR: 22.68,
};

const SYMBOLS: Record<Currency, string> = {
  AED: '',
  USD: '',
  INR: '',
};

export function formatAED(amount: number, showPlus = false): React.ReactNode {
  const currency = getGlobalCurrency();
  const convertedAmount = amount * RATES[currency];
  const absAmount = Math.abs(convertedAmount);
  
  const numStr = absAmount.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  
  const sign = amount < 0 ? '-' : showPlus && amount > 0 ? '+' : '';
  const symbol = SYMBOLS[currency];
  
  return React.createElement(
    React.Fragment,
    null,
    symbol ? React.createElement('span', { className: 'text-[0.8em] font-bold leading-none mr-[2px]' }, sign ? `${sign}${symbol}` : symbol) : (sign ? `${sign}` : null),
    numStr
  );
}

export function formatAEDStr(amount: number, showPlus = false): string {
  const currency = getGlobalCurrency();
  const convertedAmount = amount * RATES[currency];
  const absAmount = Math.abs(convertedAmount);
  
  const numStr = absAmount.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  
  const sign = amount < 0 ? '-' : showPlus && amount > 0 ? '+' : '';
  const symbol = SYMBOLS[currency];
  
  return `${sign}${symbol}${numStr}`;
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
