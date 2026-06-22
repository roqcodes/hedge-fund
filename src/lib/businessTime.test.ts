import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addCalendarDays,
  formatBusinessDate,
  parseCalendarDate,
  toBusinessDate,
  txnDay,
} from './businessTime';
import { isDateInRange } from './dateFilterRange';

describe('parseCalendarDate / formatBusinessDate', () => {
  it('returns plain YYYY-MM-DD strings unchanged', () => {
    assert.equal(parseCalendarDate('2026-06-20'), '2026-06-20');
  });

  it('parses PG ::text DATE before any ISO coercion', () => {
    assert.equal(formatBusinessDate('2026-06-20'), '2026-06-20');
  });

  it('uses local calendar parts for node-pg DATE Date objects (not UTC)', () => {
    const pgDate = new Date(2026, 5, 20);
    assert.equal(parseCalendarDate(pgDate), '2026-06-20');
    assert.equal(formatBusinessDate(pgDate), '2026-06-20');
  });

  it('does not treat Date.toISOString() prefix as authoritative', () => {
    const pgDate = new Date(2026, 5, 21);
    assert.equal(parseCalendarDate(pgDate), '2026-06-21');
  });
});

describe('toBusinessDate', () => {
  it('maps instants to branch calendar date', () => {
    // 2026-06-19 21:03 Dubai = 17:03 UTC
    assert.equal(toBusinessDate('2026-06-19T17:03:00.000Z', 'Asia/Dubai'), '2026-06-19');
    // Same instant is next calendar day in India
    assert.equal(toBusinessDate('2026-06-19T17:03:00.000Z', 'Asia/Kolkata'), '2026-06-19');
    // Late UTC evening → next day in Dubai
    assert.equal(toBusinessDate('2026-06-19T21:00:00.000Z', 'Asia/Dubai'), '2026-06-20');
  });
});

describe('addCalendarDays', () => {
  it('adds days without timezone drift', () => {
    assert.equal(addCalendarDays('2026-06-20', -1), '2026-06-19');
    assert.equal(addCalendarDays('2026-06-20', 1), '2026-06-21');
  });
});

describe('txnDay', () => {
  it('prefers hydrated businessDate', () => {
    assert.equal(
      txnDay({ date: '2026-06-19T21:30:00.000Z', businessDate: '2026-06-19' }, 'Asia/Dubai'),
      '2026-06-19',
    );
  });

  it('falls back to branch timezone from instant', () => {
    assert.equal(txnDay({ date: '2026-06-19T21:30:00.000Z' }, 'Asia/Dubai'), '2026-06-20');
    assert.equal(txnDay({ date: '2026-06-19T21:30:00.000Z' }, 'UTC'), '2026-06-19');
  });

  it('supports inclusive calendar range filtering', () => {
    const txns = [
      { date: '2026-06-18T12:00:00.000Z', businessDate: '2026-06-18' },
      { date: '2026-06-19T17:03:00.000Z', businessDate: '2026-06-19' },
      { date: '2026-06-20T15:33:00.000Z', businessDate: '2026-06-20' },
    ];
    const jun19 = txns.filter(t =>
      isDateInRange(txnDay(t, 'Asia/Dubai'), { startDate: '2026-06-19', endDate: '2026-06-19' }),
    );
    assert.deepEqual(jun19.map(t => t.businessDate), ['2026-06-19']);
  });
});
