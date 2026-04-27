import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatDateTime, formatRelativeDate } from './date';

describe('formatDate', () => {
  it('formats ISO date string to readable date', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('handles different months correctly', () => {
    expect(formatDate('2024-06-01T00:00:00Z')).toMatch(/Jun 1, 2024/);
    expect(formatDate('2024-12-25T00:00:00Z')).toMatch(/Dec 25, 2024/);
  });

  it('handles year boundaries', () => {
    expect(formatDate('2023-12-31T23:59:59Z')).toMatch(/2023|2024/);
    expect(formatDate('2025-01-01T00:00:00Z')).toMatch(/2025/);
  });
});

describe('formatDateTime', () => {
  it('formats ISO date string to readable date and time', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z');
    expect(result).toMatch(/Jan 15, 2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('includes time component', () => {
    const result = formatDateTime('2024-06-15T14:45:00Z');
    expect(result).toMatch(/Jun 15, 2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('handles midnight', () => {
    const result = formatDateTime('2024-01-01T00:00:00Z');
    expect(result).toMatch(/Jan 1, 2024|Dec 31, 2023/);
  });

  it('handles end of day', () => {
    const result = formatDateTime('2024-01-01T23:59:59Z');
    expect(result).toMatch(/Jan \d{1,2}, 2024/);
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2024-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for under a minute', () => {
    const date = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelativeDate(date)).toBe('just now');
  });

  it('returns minutes for under an hour', () => {
    const date = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(formatRelativeDate(date)).toBe('5 minutes ago');
  });

  it('uses singular for 1 minute', () => {
    const date = new Date(now.getTime() - 60_000).toISOString();
    expect(formatRelativeDate(date)).toBe('1 minute ago');
  });

  it('returns hours for under a day', () => {
    const date = new Date(now.getTime() - 3 * 3_600_000).toISOString();
    expect(formatRelativeDate(date)).toBe('3 hours ago');
  });

  it('uses singular for 1 hour', () => {
    const date = new Date(now.getTime() - 3_600_000).toISOString();
    expect(formatRelativeDate(date)).toBe('1 hour ago');
  });

  it('falls back to formatted date past 24 hours', () => {
    const date = new Date(now.getTime() - 2 * 24 * 3_600_000).toISOString();
    expect(formatRelativeDate(date)).toMatch(/Jun 13, 2024/);
  });

  it('falls back to formatted date for future timestamps', () => {
    const date = new Date(now.getTime() + 60_000).toISOString();
    expect(formatRelativeDate(date)).toMatch(/Jun 15, 2024/);
  });
});
