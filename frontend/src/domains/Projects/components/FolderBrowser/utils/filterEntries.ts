interface Entry {
  name: string;
  path: string;
}

export const filterEntries = (entries: Entry[], keyword: string): Entry[] => {
  if (!keyword) return entries;
  const lower = keyword.toLowerCase();
  return entries.filter((e) => e.name.toLowerCase().includes(lower));
};
