// Copied verbatim from server/modules/auth/controller.js — parseDuration is
// NOT exported, so we duplicate it here to test its behaviour in isolation.
function parseDuration(str) {
  if (typeof str !== 'string') return 0;
  const match = str.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 0;
  const num = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

describe('parseDuration', () => {
  it('parses "30m" to 1,800,000 ms', () => {
    expect(parseDuration('30m')).toBe(1800000);
  });

  it('parses "24h" to 86,400,000 ms', () => {
    expect(parseDuration('24h')).toBe(86400000);
  });

  it('parses "7d" to 604,800,000 ms', () => {
    expect(parseDuration('7d')).toBe(604800000);
  });

  it('parses "60s" to 60,000 ms', () => {
    expect(parseDuration('60s')).toBe(60000);
  });

  it('parses "1d" to 86,400,000 ms', () => {
    expect(parseDuration('1d')).toBe(86400000);
  });

  it('parses "0m" to 0 (0 * 60 * 1000 = 0)', () => {
    expect(parseDuration('0m')).toBe(0);
  });

  it('returns 0 for non-matching string "abc"', () => {
    expect(parseDuration('abc')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });

  it('returns 0 for null (typeof null !== "string")', () => {
    expect(parseDuration(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(parseDuration(undefined)).toBe(0);
  });

  it('returns 0 for numeric input (typeof number !== "string")', () => {
    expect(parseDuration(123)).toBe(0);
  });

  it('returns 0 for uppercase "30M" (regex only matches lowercase units)', () => {
    expect(parseDuration('30M')).toBe(0);
  });

  it('allows an optional space between number and unit ("30 m" → 1,800,000)', () => {
    // The regex /^(\d+)\s*(s|m|h|d)$/ contains \s* so "30 m" matches
    expect(parseDuration('30 m')).toBe(1800000);
  });
});
