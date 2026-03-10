import { describe, it, expect } from 'vitest';
import { createEntriesFuse, filterEntries } from './filterEntries';

const entries = [
  { name: 'lgtm-ai', path: '/projects/lgtm-ai' },
  { name: 'my-app', path: '/projects/my-app' },
  { name: 'LGTM-backend', path: '/projects/LGTM-backend' },
  { name: 'alpha', path: '/projects/alpha' },
];

describe('filterEntries', () => {
  it('returns all entries when keyword is empty', () => {
    const fuse = createEntriesFuse(entries);
    expect(filterEntries(entries, '', fuse)).toEqual(entries);
  });

  it('filters by fuzzy match and sorts by relevance', () => {
    const fuse = createEntriesFuse(entries);
    expect(filterEntries(entries, 'lgmt', fuse)).toEqual([
      { name: 'lgtm-ai', path: '/projects/lgtm-ai' },
      { name: 'LGTM-backend', path: '/projects/LGTM-backend' },
    ]);
  });

  it('returns empty array when no entries match', () => {
    const fuse = createEntriesFuse(entries);
    expect(filterEntries(entries, 'zzz', fuse)).toEqual([]);
  });
});
