const GROUP_SIZE = 10;

export function getPageNumbers(current: number, totalPages: number): number[] {
  const groupIndex = Math.floor((current - 1) / GROUP_SIZE);
  const start = groupIndex * GROUP_SIZE + 1;
  const end = Math.min(start + GROUP_SIZE - 1, totalPages);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

interface PageGroup {
  hasPrevGroup: boolean;
  hasNextGroup: boolean;
  prevGroupPage: number;
  nextGroupPage: number;
}

export function getPageGroup(current: number, totalPages: number): PageGroup {
  const groupIndex = Math.floor((current - 1) / GROUP_SIZE);
  const groupStart = groupIndex * GROUP_SIZE + 1;
  const groupEnd = Math.min(groupStart + GROUP_SIZE - 1, totalPages);

  return {
    hasPrevGroup: groupStart > 1,
    hasNextGroup: groupEnd < totalPages,
    prevGroupPage: groupStart - 1,
    nextGroupPage: groupEnd + 1,
  };
}
