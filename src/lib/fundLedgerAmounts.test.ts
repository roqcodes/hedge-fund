import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertCustomerToUsdt,
  convertUsdtToCustomer,
  parseFundAmount,
  resolveJournalAmounts,
} from './fundLedgerAmounts';

describe('fundLedgerAmounts', () => {
  it('parseFundAmount handles commas and invalid', () => {
    assert.equal(parseFundAmount(''), 0);
    assert.equal(parseFundAmount('1,234.5'), 1234.5);
    assert.equal(parseFundAmount('abc'), 0);
  });

  it('convertUsdtToCustomer and inverse at 14 dp', () => {
    const rate = 3.6725;
    const usdt = 100;
    const customer = convertUsdtToCustomer(usdt, rate);
    assert.equal(customer, 367.25);
    const back = convertCustomerToUsdt(customer, rate);
    assert.ok(Math.abs(back - usdt) < 1e-10);
  });

  it('resolveJournalAmounts from USDT side', () => {
    const r = resolveJournalAmounts({
      inputSide: 'usdt',
      usdtAmount: 50,
      customerAmount: 0,
      customerCurrency: 'AED',
      customerCurrencyRate: 3.67,
    });
    assert.ok(r);
    assert.equal(r!.usdtAmount, 50);
    assert.equal(r!.inputCurrency, 'USDT');
    assert.equal(r!.settlementCurrency, 'USDT');
  });

  it('resolveJournalAmounts from customer side', () => {
    const r = resolveJournalAmounts({
      inputSide: 'customer',
      usdtAmount: 0,
      customerAmount: 367,
      customerCurrency: 'AED',
      customerCurrencyRate: 3.67,
    });
    assert.ok(r);
    assert.equal(r!.inputCurrency, 'AED');
    assert.equal(r!.settlementCurrency, 'AED');
    assert.equal(r!.settlementAmount, 367);
    assert.ok(r!.usdtAmount > 0);
  });

  it('USDT customer skips rate requirement', () => {
    const r = resolveJournalAmounts({
      inputSide: 'usdt',
      usdtAmount: 25,
      customerAmount: 0,
      customerCurrency: 'USDT',
      customerCurrencyRate: 0,
    });
    assert.ok(r);
    assert.equal(r!.customerCurrencyRate, 1);
  });
});
