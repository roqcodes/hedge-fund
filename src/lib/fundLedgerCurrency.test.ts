import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeCustomerAverageUsdtRate, getEntryWalletDisplay } from './fundLedgerCurrency';
import type { FundEntityLedgerEntry } from '@/types';

function entry(partial: Partial<FundEntityLedgerEntry> & Pick<FundEntityLedgerEntry, 'id' | 'customerId'>): FundEntityLedgerEntry {
  return {
    branchId: 'b1',
    entryDate: '2026-01-01',
    description: 'Test',
    debit: 0,
    credit: 0,
    referenceType: 'manual',
    ...partial,
  };
}

describe('computeCustomerAverageUsdtRate', () => {
  it('returns USDT-weighted average for profile currency entries', () => {
    const entries: FundEntityLedgerEntry[] = [
      entry({ id: '1', customerId: 'c1', debit: 100, credit: 0, customerCurrency: 'AED', customerCurrencyRate: 3.6 }),
      entry({ id: '2', customerId: 'c1', debit: 0, credit: 200, customerCurrency: 'AED', customerCurrencyRate: 3.8 }),
      entry({ id: '3', customerId: 'c2', debit: 50, credit: 0, customerCurrency: 'AED', customerCurrencyRate: 9 }),
    ];
    const result = computeCustomerAverageUsdtRate(entries, 'c1', 'AED');
    assert.ok(result);
    // (100*3.6 + 200*3.8) / 300 = 3.733...
    assert.ok(Math.abs(result!.rate - 3.733333333333333) < 0.0001);
    assert.equal(result!.sampleCount, 2);
  });

  it('skips pending USDT-only rows for AED profile', () => {
    const entries: FundEntityLedgerEntry[] = [
      entry({ id: '1', customerId: 'c1', debit: 100, credit: 0, customerCurrency: 'USDT' }),
      entry({ id: '2', customerId: 'c1', debit: 0, credit: 50, customerCurrency: 'AED', customerCurrencyRate: 3.67 }),
    ];
    const result = computeCustomerAverageUsdtRate(entries, 'c1', 'AED');
    assert.ok(result);
    assert.equal(result!.rate, 3.67);
    assert.equal(result!.sampleCount, 1);
  });

  it('returns null when no rated history', () => {
    const entries: FundEntityLedgerEntry[] = [
      entry({ id: '1', customerId: 'c1', debit: 100, credit: 0, customerCurrency: 'USDT' }),
    ];
    assert.equal(computeCustomerAverageUsdtRate(entries, 'c1', 'AED'), null);
    assert.equal(computeCustomerAverageUsdtRate(entries, 'c1', 'USDT'), null);
  });
});

describe('getEntryWalletDisplay', () => {
  it('uses settlement wallet when present', () => {
    const wallet = getEntryWalletDisplay(entry({
      id: '1',
      customerId: 'c1',
      credit: 100,
      debit: 0,
      customerCurrency: 'AED',
      customerCurrencyRate: 3.67,
      settlementCurrency: 'USDT',
      settlementAmount: 100,
    }));
    assert.equal(wallet.walletCurrency, 'USDT');
    assert.equal(wallet.walletAmount, 100);
    assert.equal(wallet.usdtAmount, 100);
  });

  it('falls back to customer currency wallet', () => {
    const wallet = getEntryWalletDisplay(entry({
      id: '1',
      customerId: 'c1',
      credit: 0,
      debit: 50,
      customerCurrency: 'AED',
      customerCurrencyRate: 3.67,
      settlementCurrency: 'AED',
      settlementAmount: 183.5,
    }));
    assert.equal(wallet.walletCurrency, 'AED');
    assert.equal(wallet.walletAmount, 183.5);
    assert.equal(wallet.usdtAmount, 50);
  });
});
