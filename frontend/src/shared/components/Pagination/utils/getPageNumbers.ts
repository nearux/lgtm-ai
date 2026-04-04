export function getPageNumbers(
  current: number,
  hasMore: boolean
): (number | 'ellipsis')[] {
  const maxPage = hasMore ? current + 1 : current;
  const pages: (number | 'ellipsis')[] = [];

  if (maxPage <= 7) {
    for (let i = 1; i <= maxPage; i++) pages.push(i);
  } else {
    pages.push(1);

    if (current <= 3) {
      for (let i = 2; i <= 5; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(maxPage);
    } else if (current >= maxPage - 2) {
      pages.push('ellipsis');
      for (let i = maxPage - 4; i <= maxPage; i++) pages.push(i);
    } else {
      pages.push('ellipsis');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(maxPage);
    }
  }

  return pages;
}
