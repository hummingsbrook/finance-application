const { roundMoney, addMoney } = require('../../lib/money');

describe('roundMoney', () => {
  it('returns 1 for roundMoney(1.005) due to V8 IEEE 754 toFixed behaviour', () => {
    // Number(1.005).toFixed(2) === '1.00' in V8, so roundMoney returns 1
    expect(roundMoney(1.005)).toBe(1);
  });

  it('rounds 1.555 to 1.55 (V8 IEEE 754: Number(1.555).toFixed(2) === "1.55")', () => {
    // Documenting actual V8 behaviour: 1.555 is stored as 1.55499999... so
    // toFixed(2) yields "1.55", not "1.56".
    expect(roundMoney(1.555)).toBe(1.55);
  });

  it('returns 0 for roundMoney(0)', () => {
    expect(roundMoney(0)).toBe(0);
  });

  it('rounds -5.555 to -5.55 (V8 IEEE 754: same edge case as 1.555)', () => {
    expect(roundMoney(-5.555)).toBe(-5.55);
  });

  it('returns 0 for NaN input', () => {
    expect(roundMoney(NaN)).toBe(0);
  });

  it('returns 0 for Infinity input', () => {
    expect(roundMoney(Infinity)).toBe(0);
  });

  it('returns 0 for -Infinity input', () => {
    expect(roundMoney(-Infinity)).toBe(0);
  });

  it('returns 0 for null input', () => {
    expect(roundMoney(null)).toBe(0);
  });

  it('returns 0 for undefined input', () => {
    expect(roundMoney(undefined)).toBe(0);
  });

  it('returns 0 for non-numeric string "abc"', () => {
    expect(roundMoney('abc')).toBe(0);
  });

  it('parses numeric string "15.50" to 15.5', () => {
    expect(roundMoney('15.50')).toBe(15.5);
  });

  it('handles large integers (1000000)', () => {
    expect(roundMoney(1000000)).toBe(1000000);
  });
});

describe('addMoney', () => {
  it('adds 0.1 + 0.2 and rounds to 0.3', () => {
    // Internally: roundMoney(0.30000000000000004) → '0.30' → 0.3
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it('adds 0 + 0 = 0', () => {
    expect(addMoney(0, 0)).toBe(0);
  });

  it('adds 100000 + 200000 = 300000', () => {
    expect(addMoney(100000, 200000)).toBe(300000);
  });

  it('handles negative + positive summing to zero (-10 + 10 = 0)', () => {
    expect(addMoney(-10, 10)).toBe(0);
  });

  it('treats null as 0 (null + 5 = 5)', () => {
    // Number(null) === 0
    expect(addMoney(null, 5)).toBe(5);
  });
});
