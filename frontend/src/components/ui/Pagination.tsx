import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 text-sm',
        className,
      )}
    >
      {/* Showing X-Y of Z */}
      <span className="text-text-secondary">
        Showing{' '}
        <span className="font-medium text-text-primary">
          {rangeStart}&#8211;{rangeEnd}
        </span>{' '}
        of{' '}
        <span className="font-medium text-text-primary">{total}</span>
      </span>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-text-secondary">
            Rows per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              'rounded-md border border-border bg-card-bg px-2 py-1 text-sm text-text-primary',
              'focus:border-primary focus:ring-1 focus:ring-primary',
            )}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Prev/Next */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            aria-label="Previous page"
            className={cn(
              'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md',
              'border border-border text-text-secondary transition-colors duration-150',
              'hover:bg-gray-50 hover:text-text-primary',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[4rem] text-center text-text-secondary">
            {page} / {totalPages || 1}
          </span>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            aria-label="Next page"
            className={cn(
              'inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md',
              'border border-border text-text-secondary transition-colors duration-150',
              'hover:bg-gray-50 hover:text-text-primary',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
