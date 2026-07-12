import { describe, it, expect } from 'vitest';
import { formatKES, formatDate, formatDateTime, getInitials, truncate } from '../../lib/utils';

describe('formatKES', () => {
  it('formats 15000 as "KES 15,000.00"', () => {
    expect(formatKES(15000)).toBe('KES 15,000.00');
  });

  it('formats 0 as "KES 0.00"', () => {
    expect(formatKES(0)).toBe('KES 0.00');
  });

  it('formats 1.5 as "KES 1.50"', () => {
    expect(formatKES(1.5)).toBe('KES 1.50');
  });

  it('formats -500 as "-KES 500.00"', () => {
    expect(formatKES(-500)).toBe('-KES 500.00');
  });

  it('returns "KES 0.00" for null', () => {
    expect(formatKES(null)).toBe('KES 0.00');
  });

  it('returns "KES 0.00" for undefined', () => {
    expect(formatKES(undefined)).toBe('KES 0.00');
  });

  it('returns "KES 0.00" for NaN', () => {
    expect(formatKES(NaN)).toBe('KES 0.00');
  });

  it('formats 1000000 as "KES 1,000,000.00"', () => {
    expect(formatKES(1000000)).toBe('KES 1,000,000.00');
  });

  it('formats 0.1 as "KES 0.10"', () => {
    expect(formatKES(0.1)).toBe('KES 0.10');
  });
});

describe('formatDate', () => {
  it('formats "2024-01-15" — result contains "Jan" AND "2024" AND "15"', () => {
    const result = formatDate('2024-01-15');
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('returns "" for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns "" for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns "" for "not-a-date"', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats "2024-01-15T10:45:00Z" — result contains "Jan" AND "2024"', () => {
    const result = formatDateTime('2024-01-15T10:45:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2024');
  });

  it('returns "" for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('returns "" for empty string', () => {
    expect(formatDateTime('')).toBe('');
  });
});

describe('getInitials', () => {
  it('returns "JD" for ("John", "Doe")', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
  });

  it('returns "ES" for ("elder", "samuel") — uppercase first chars', () => {
    expect(getInitials('elder', 'samuel')).toBe('ES');
  });

  it('returns "?" for ("", "")', () => {
    expect(getInitials('', '')).toBe('?');
  });

  it('returns "J" for ("John", "")', () => {
    expect(getInitials('John', '')).toBe('J');
  });

  it('returns "D" for ("", "Doe")', () => {
    expect(getInitials('', 'Doe')).toBe('D');
  });
});

describe('truncate', () => {
  it('truncates "Hello World" with len=5 to "Hello..."', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('returns "Hi" unchanged for len=10 (shorter than len)', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('returns "" for empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('returns "" for null', () => {
    expect(truncate(null, 5)).toBe('');
  });

  it('returns "Exactly ten" unchanged when len=11 (length === len)', () => {
    expect(truncate('Exactly ten', 11)).toBe('Exactly ten');
  });

  it('truncates "Exactly ten!" with len=11 to "Exactly ten..." (length > len)', () => {
    expect(truncate('Exactly ten!', 11)).toBe('Exactly ten...');
  });
});
