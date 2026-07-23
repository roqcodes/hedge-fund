import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBulkSellWeightedAverages,
  computeBulkSellTotals,
  type BulkSellLineInput,
} from './bulkSellCalculations.ts';

const lineA: BulkSellLineInput = {
  buyId: 'buy-a',
  buyParticulars: 'Lot A',
  buyDate: '2026-01-01',
  sellVolumeGross: 10,
  buyPurity: 0.995,
  buyIdrGram: 2000000,
  buyIdrToUsdt: 17770,
  buyPureGram: 100,
  buyTotalUsdt: 112.55,
};

const lineB: BulkSellLineInput = {
  buyId: 'buy-b',
  buyParticulars: 'Lot B',
  buyDate: '2026-01-02',
  sellVolumeGross: 5,
  buyPurity: 0.99,
  buyIdrGram: 2100000,
  buyIdrToUsdt: 18000,
  buyPureGram: 50,
  buyTotalUsdt: 58.33,
};

describe('computeBulkSellWeightedAverages', () => {
  it('weights purity by gross and rates by pure', () => {
    const w = computeBulkSellWeightedAverages([lineA, lineB]);
    assert.equal(w.totalGross, 15);
    assert.equal(w.totalPure, 14.9);
    assert.ok(Math.abs(w.avgPurity - 14.9 / 15) < 1e-12);
    const expectedIdr = (9.95 * 2_000_000 + 4.95 * 2_100_000) / 14.9;
    assert.ok(Math.abs(w.avgIdrGram - expectedIdr) < 1e-6);
    const expectedUsdtRate = (9.95 * 17770 + 4.95 * 18000) / 14.9;
    assert.ok(Math.abs(w.avgIdrToUsdt - expectedUsdtRate) < 1e-6);
    assert.ok(Math.abs(w.usdtPerGram - w.avgIdrGram / w.avgIdrToUsdt) < 1e-12);
  });
});

describe('computeBulkSellTotals', () => {
  it('derives USDT/gram from averaged IDR rates', () => {
    const t = computeBulkSellTotals([lineA, lineB]);
    assert.ok(Math.abs(t.finalIdrRate - t.finalIdrGram / t.finalIdrToUsdt) < 1e-12);
  });

  it('sums line USDT into bulk total', () => {
    const t = computeBulkSellTotals([lineA, lineB]);
    const lineSum = t.lines.reduce((s, l) => s + l.sellValueUsdt, 0);
    assert.ok(Math.abs(t.totalUsdt - lineSum) < 1e-12);
    const pureSum = t.lines.reduce((s, l) => s + l.pureGram, 0);
    assert.ok(Math.abs(t.totalPure - pureSum) < 1e-10);
  });

  it('applies rate overrides without changing line purity', () => {
    const base = computeBulkSellTotals([lineA, lineB]);
    const over = computeBulkSellTotals([lineA, lineB], { idrGram: 2050000, idrToUsdt: 17800 });
    assert.notEqual(over.finalIdrGram, base.finalIdrGram);
    assert.equal(over.lines[0].pureGram, base.lines[0].pureGram);
    assert.ok(over.totalUsdt > 0);
  });

  it('profit equals sell minus cost in USDT', () => {
    const t = computeBulkSellTotals([lineA, lineB]);
    assert.ok(Math.abs(t.totalProfitUsdt - (t.totalUsdt - t.totalCostUsdt)) < 1e-12);
    for (const line of t.lines) {
      assert.ok(Math.abs(line.profitUsdt - (line.sellValueUsdt - line.costValueUsdt)) < 1e-12);
    }
  });
});
