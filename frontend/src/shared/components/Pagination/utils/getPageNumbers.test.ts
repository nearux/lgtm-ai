import { describe, it, expect } from 'vitest';
import { getPageNumbers, getPageGroup } from './getPageNumbers';

describe('getPageNumbers', () => {
  it('returns all pages when totalPages <= 10', () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns first 10 pages when on page 1', () => {
    expect(getPageNumbers(1, 25)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('returns first group when on page 7', () => {
    expect(getPageNumbers(7, 25)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('returns second group when on page 11', () => {
    expect(getPageNumbers(11, 25)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it('returns last partial group', () => {
    expect(getPageNumbers(21, 25)).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns single page', () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });
});

describe('getPageGroup', () => {
  it('has no prev group on first group', () => {
    const result = getPageGroup(1, 25);
    expect(result.hasPrevGroup).toBe(false);
    expect(result.hasNextGroup).toBe(true);
    expect(result.nextGroupPage).toBe(11);
  });

  it('has both groups in middle', () => {
    const result = getPageGroup(15, 25);
    expect(result.hasPrevGroup).toBe(true);
    expect(result.hasNextGroup).toBe(true);
    expect(result.prevGroupPage).toBe(10);
    expect(result.nextGroupPage).toBe(21);
  });

  it('has no next group on last group', () => {
    const result = getPageGroup(22, 25);
    expect(result.hasPrevGroup).toBe(true);
    expect(result.hasNextGroup).toBe(false);
    expect(result.prevGroupPage).toBe(20);
  });

  it('has no groups when totalPages <= 10', () => {
    const result = getPageGroup(3, 7);
    expect(result.hasPrevGroup).toBe(false);
    expect(result.hasNextGroup).toBe(false);
  });
});
