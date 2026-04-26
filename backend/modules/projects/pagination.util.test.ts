import { describe, it, expect } from 'vitest';
import {
  normalizePositiveInt,
  normalizePage,
  normalizeLimit,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from './pagination.util.js';

describe('pagination.util', () => {
  describe('normalizePositiveInt', () => {
    it('returns value as-is for a valid positive integer', () => {
      expect(normalizePositiveInt(5, 1)).toBe(5);
    });

    it('truncates decimal to integer', () => {
      expect(normalizePositiveInt(3.9, 1)).toBe(3);
    });

    it('clamps 0 up to 1', () => {
      expect(normalizePositiveInt(0, 10)).toBe(1);
    });

    it('clamps negative number up to 1', () => {
      expect(normalizePositiveInt(-5, 10)).toBe(1);
    });

    it('returns fallback for undefined', () => {
      expect(normalizePositiveInt(undefined, 42)).toBe(42);
    });

    it('returns fallback for NaN', () => {
      expect(normalizePositiveInt(NaN, 42)).toBe(42);
    });

    it('returns fallback for Infinity', () => {
      expect(normalizePositiveInt(Infinity, 42)).toBe(42);
    });

    it('returns fallback for -Infinity', () => {
      expect(normalizePositiveInt(-Infinity, 42)).toBe(42);
    });
  });

  describe('normalizePage', () => {
    it('returns value for valid page', () => {
      expect(normalizePage(3)).toBe(3);
    });

    it('returns DEFAULT_PAGE for undefined', () => {
      expect(normalizePage(undefined)).toBe(DEFAULT_PAGE);
    });

    it('clamps 0 up to 1', () => {
      expect(normalizePage(0)).toBe(1);
    });
  });

  describe('normalizeLimit', () => {
    it('returns value for valid limit within range', () => {
      expect(normalizeLimit(50)).toBe(50);
    });

    it('returns DEFAULT_LIMIT for undefined', () => {
      expect(normalizeLimit(undefined)).toBe(DEFAULT_LIMIT);
    });

    it('clamps value above MAX_LIMIT down to MAX_LIMIT', () => {
      expect(normalizeLimit(MAX_LIMIT + 1)).toBe(MAX_LIMIT);
    });

    it('clamps 0 up to 1', () => {
      expect(normalizeLimit(0)).toBe(1);
    });

    it('accepts exactly MAX_LIMIT', () => {
      expect(normalizeLimit(MAX_LIMIT)).toBe(MAX_LIMIT);
    });
  });
});
