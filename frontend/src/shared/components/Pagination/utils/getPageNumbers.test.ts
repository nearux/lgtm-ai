import { describe, it, expect } from 'vitest';
import { getPageNumbers } from './getPageNumbers';

describe('getPageNumbers', () => {
  describe('when total pages <= 7', () => {
    it('returns all pages when on page 1 with more pages', () => {
      expect(getPageNumbers(1, true)).toEqual([1, 2]);
    });

    it('returns all pages when on page 3 with hasMore', () => {
      expect(getPageNumbers(3, true)).toEqual([1, 2, 3, 4]);
    });

    it('returns all pages up to 7', () => {
      expect(getPageNumbers(6, true)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns single page when no more pages', () => {
      expect(getPageNumbers(1, false)).toEqual([1]);
    });

    it('returns pages 1-5 when on page 5 with no more', () => {
      expect(getPageNumbers(5, false)).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles page 7 boundary (maxPage = 7)', () => {
      expect(getPageNumbers(7, false)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe('when total pages > 7 (near end branch)', () => {
    it('shows ellipsis after first page when maxPage=8', () => {
      // current=7, hasMore=true => maxPage=8
      // current(7) >= maxPage-2(6) => near-end: [1, '...', 4, 5, 6, 7, 8]
      expect(getPageNumbers(7, true)).toEqual([1, 'ellipsis', 4, 5, 6, 7, 8]);
    });

    it('shows first page + ellipsis + last 5 pages', () => {
      // current=8, hasMore=false => maxPage=8
      expect(getPageNumbers(8, false)).toEqual([1, 'ellipsis', 4, 5, 6, 7, 8]);
    });

    it('handles being on last page with 10 pages', () => {
      // current=10, hasMore=false => maxPage=10
      expect(getPageNumbers(10, false)).toEqual([
        1,
        'ellipsis',
        6,
        7,
        8,
        9,
        10,
      ]);
    });

    it('handles page near end with hasMore', () => {
      // current=9, hasMore=true => maxPage=10
      expect(getPageNumbers(9, true)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10]);
    });

    it('handles large page numbers', () => {
      expect(getPageNumbers(100, false)).toEqual([
        1,
        'ellipsis',
        96,
        97,
        98,
        99,
        100,
      ]);
    });
  });

  describe('middle branch analysis', () => {
    it('documents that middle branch is unreachable', () => {
      // The middle branch (lines 21-24 in getPageNumbers.ts) requires:
      //   current > 3 AND current < maxPage - 2
      //
      // But maxPage = hasMore ? current + 1 : current
      //
      // Case 1: hasMore=true => maxPage = current + 1
      //   current < (current + 1) - 2 => current < current - 1 => impossible
      //
      // Case 2: hasMore=false => maxPage = current
      //   current < current - 2 => impossible
      //
      // Therefore, this branch is dead code and can never be executed.
      // This is a design issue - the function doesn't know total pages,
      // only whether there's a next page, so it can't show middle pagination.

      // Verify near-end branch handles all maxPage > 7 cases
      expect(getPageNumbers(15, false)).toEqual([
        1,
        'ellipsis',
        11,
        12,
        13,
        14,
        15,
      ]);
    });
  });

  describe('edge cases', () => {
    it('handles page 1 with no more pages (single page)', () => {
      expect(getPageNumbers(1, false)).toEqual([1]);
    });

    it('handles page 2 scenarios', () => {
      expect(getPageNumbers(2, false)).toEqual([1, 2]);
      expect(getPageNumbers(2, true)).toEqual([1, 2, 3]);
    });

    it('shows correct sequence for consecutive pages', () => {
      expect(getPageNumbers(4, true)).toEqual([1, 2, 3, 4, 5]);
      expect(getPageNumbers(5, true)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});
