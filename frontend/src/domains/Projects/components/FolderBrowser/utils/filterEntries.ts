import type { DirectoryEntry } from '@lgtmai/backend/types';
import Fuse from 'fuse.js';

const fuseOptions: Fuse.IFuseOptions<DirectoryEntry> = {
  keys: ['name'],
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export const createEntriesFuse = (entries: DirectoryEntry[]) =>
  new Fuse(entries, fuseOptions);

export const filterEntries = (
  entries: DirectoryEntry[],
  keyword: string,
  fuse: Fuse<DirectoryEntry>
): DirectoryEntry[] => {
  if (!keyword) return entries;
  return fuse.search(keyword).map((result) => result.item);
};
