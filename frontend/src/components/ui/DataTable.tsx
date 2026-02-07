import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
}

export type SortOrder = 'asc' | 'desc';

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
}

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy?: string; sortOrder?: SortOrder }) {
  if (sortBy !== column) {
    return <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />;
  }
  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-primary" />
  );
}

function LoadingSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-border last:border-b-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <Skeleton variant="text" className="h-4 w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T>({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  isLoading = false,
  emptyMessage = 'No data found.',
  rowKey,
  className,
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): string | number => {
    if (rowKey) return rowKey(row, index);
    const record = row as Record<string, unknown>;
    if ('id' in record) return String(record.id);
    return index;
  };

  const getCellValue = (row: T, key: string): ReactNode => {
    const record = row as Record<string, unknown>;
    const value = record[key];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-border bg-card-bg',
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary',
                  col.sortable && onSort && 'cursor-pointer select-none hover:text-text-primary',
                )}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                aria-sort={
                  sortBy === col.key
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && onSort && (
                    <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <LoadingSkeleton columns={columns.length} />
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-text-primary">
                    {col.render ? col.render(row, index) : getCellValue(row, col.key)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
