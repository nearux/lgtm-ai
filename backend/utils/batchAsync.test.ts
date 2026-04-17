import { describe, it, expect } from 'vitest';
import { batchAsync } from './batchAsync.js';

describe('batchAsync', () => {
  it('processes all items and returns results in order', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await batchAsync(items, 2, (n) => Promise.resolve(n * 2));
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it('processes items in batches, not all at once', async () => {
    const concurrentCalls: number[] = [];
    let active = 0;
    let maxActive = 0;

    const fn = async (n: number) => {
      active++;
      maxActive = Math.max(maxActive, active);
      concurrentCalls.push(n);
      await Promise.resolve();
      active--;
      return n;
    };

    await batchAsync([1, 2, 3, 4, 5], 2, fn);

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('returns empty array for empty input', async () => {
    const results = await batchAsync([], 5, (n: number) => Promise.resolve(n));
    expect(results).toEqual([]);
  });

  it('handles batch size larger than items', async () => {
    const items = [1, 2, 3];
    const results = await batchAsync(items, 100, (n) =>
      Promise.resolve(n * 10)
    );
    expect(results).toEqual([10, 20, 30]);
  });

  it('propagates errors from the fn', async () => {
    const items = [1, 2, 3];
    await expect(
      batchAsync(items, 2, (n) => {
        if (n === 2) return Promise.reject(new Error('fail on 2'));
        return Promise.resolve(n);
      })
    ).rejects.toThrow('fail on 2');
  });
});
