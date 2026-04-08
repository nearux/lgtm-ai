import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getPageNumbers, getPageGroup } from './utils/getPageNumbers';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, onPageChange }: Props) => {
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers(page, totalPages);
  const { hasPrevGroup, hasNextGroup, prevGroupPage, nextGroupPage } =
    getPageGroup(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(prevGroupPage)}
        disabled={!hasPrevGroup}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Previous page group"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {pageNumbers.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
            p === page
              ? 'bg-indigo-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(nextGroupPage)}
        disabled={!hasNextGroup}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Next page group"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};
