import { describe, it, expect } from 'vitest';
import { filterEntries } from './filterEntries';

const entries = [
  { name: 'lgtm-ai', path: '/projects/lgtm-ai' },
  { name: 'my-app', path: '/projects/my-app' },
  { name: 'LGTM-backend', path: '/projects/LGTM-backend' },
];

describe('filterEntries', () => {
  it('returns all entries when keyword is empty', () => {
    expect(filterEntries(entries, '')).toEqual(entries);
  });

  it('filters by case-insensitive substring match', () => {
    expect(filterEntries(entries, 'lgtm')).toEqual([
      { name: 'lgtm-ai', path: '/projects/lgtm-ai' },
      { name: 'LGTM-backend', path: '/projects/LGTM-backend' },
    ]);
  });

  it('returns empty array when no entries match', () => {
    expect(filterEntries(entries, 'zzz')).toEqual([]);
  });
});
