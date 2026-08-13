import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { allowedAccountTypesForVoucher, validateVoucherAccounts } from './voucherRules';

describe('icFunds voucherRules', () => {
  it('payment credits bank only and debits personal/expense types', () => {
    assert.deepEqual([...allowedAccountTypesForVoucher('payment', 'credit')], ['bank']);
    assert.ok(allowedAccountTypesForVoucher('payment', 'debit').has('d_expense'));
    assert.equal(
      validateVoucherAccounts({
        voucherType: 'payment',
        debitType: 'd_expense',
        creditType: 'bank',
        debitId: 'a',
        creditId: 'b',
      }),
      null,
    );
    assert.ok(
      validateVoucherAccounts({
        voucherType: 'payment',
        debitType: 'income',
        creditType: 'bank',
        debitId: 'a',
        creditId: 'b',
      }),
    );
  });

  it('receipt debits bank and credits personal/income', () => {
    assert.equal(
      validateVoucherAccounts({
        voucherType: 'receipt',
        debitType: 'bank',
        creditType: 'personal',
        debitId: 'a',
        creditId: 'b',
      }),
      null,
    );
  });

  it('contra requires two different banks', () => {
    assert.equal(
      validateVoucherAccounts({
        voucherType: 'contra',
        debitType: 'bank',
        creditType: 'bank',
        debitId: 'a',
        creditId: 'b',
      }),
      null,
    );
    assert.equal(
      validateVoucherAccounts({
        voucherType: 'contra',
        debitType: 'bank',
        creditType: 'bank',
        debitId: 'a',
        creditId: 'a',
      }),
      'Debit and credit accounts must be different',
    );
  });
});
