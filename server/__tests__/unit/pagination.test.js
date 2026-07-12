const { parsePagination, MAX_LIMIT } = require('../../lib/pagination');

describe('parsePagination', () => {
  it('returns defaults {page:1, limit:20, skip:0} when given empty object', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('parses string page=2 limit=10 → {page:2, limit:10, skip:10}', () => {
    expect(parsePagination({ page: '2', limit: '10' })).toEqual({ page: 2, limit: 10, skip: 10 });
  });

  it('parses page=3 limit=5 → {page:3, limit:5, skip:10}', () => {
    expect(parsePagination({ page: '3', limit: '5' })).toEqual({ page: 3, limit: 5, skip: 10 });
  });

  it('clamps page=0 to page=1', () => {
    expect(parsePagination({ page: '0' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('clamps negative page=-5 to page=1', () => {
    expect(parsePagination({ page: '-5' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('clamps limit=0 to limit=20 (parseInt("0")||20 evaluates to 20 since 0 is falsy)', () => {
    // Actual behavior: parseInt('0') === 0, which is falsy, so the || 20
    // fallback kicks in and limit becomes 20. The `if (limit < 1) limit = 1`
    // clamp then never fires because 20 >= 1.
    expect(parsePagination({ limit: '0' })).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it('clamps limit=101 to limit=100', () => {
    expect(parsePagination({ limit: '101' })).toEqual({ page: 1, limit: 100, skip: 0 });
  });

  it('clamps limit=999 to MAX_LIMIT (100)', () => {
    const result = parsePagination({ limit: '999' });
    expect(result.limit).toBe(MAX_LIMIT);
  });

  it('MAX_LIMIT constant is 100', () => {
    expect(MAX_LIMIT).toBe(100);
  });

  it('non-numeric page "abc" falls back to default page=1', () => {
    const result = parsePagination({ page: 'abc' });
    expect(result.page).toBe(1);
  });

  it('non-numeric limit "abc" falls back to default limit=20', () => {
    const result = parsePagination({ limit: 'abc' });
    expect(result.limit).toBe(20);
  });
});
