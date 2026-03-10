import type { DirectoryEntry } from '@lgtmai/backend/types';

export const filterEntries = (
  entries: DirectoryEntry[],
  keyword: string
): DirectoryEntry[] => {
  if (!keyword) return entries;
  const lower = keyword.toLowerCase();
  return entries.filter((e) => e.name.toLowerCase().includes(lower));
};
